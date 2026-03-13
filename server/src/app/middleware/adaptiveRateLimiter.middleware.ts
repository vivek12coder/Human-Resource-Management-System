/**
 * Adaptive Rate Limiting System
 * Dynamically adjusts rate limits based on user roles, usage patterns, and system load
 */

import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { metricsService } from '../utils/metrics';
import { securityLogger } from '../utils/logger';

/**
 * Rate limit configuration per user role
 */
export interface RoleLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  concurrentRequests: number;
  burstSize: number;
}

/**
 * Adaptive limit configuration
 */
export interface AdaptiveLimitConfig {
  baseConfig: Map<string, RoleLimitConfig>;
  systemLoadThresholds: {
    low: number;      // CPU/Memory usage %, scale down limits
    high: number;     // CPU/Memory usage %, increase limits
  };
  enableDynamicScaling: boolean;
  enableConcurrentTracking: boolean;
}

/**
 * User rate limit state
 */
interface UserLimitState {
  userId: string;
  requests: number[];          // Timestamp of each request
  concurrentRequests: number;
  blockedUntil?: number;
  violations: number;
  lastViolation?: number;
  requestLog: Array<{ timestamp: number; endpoint: string }>;
}

/**
 * IP rate limit state
 */
interface IpLimitState {
  ip: string;
  requests: number[];
  blockedUntil?: number;
  violations: number;
  lastViolation?: number;
  suspiciousActivity: boolean;
}

class AdaptiveRateLimiter {
  private userStates: Map<string, UserLimitState> = new Map();
  private ipStates: Map<string, IpLimitState> = new Map();
  private config: AdaptiveLimitConfig;
  private cleanupInterval: NodeJS.Timeout;
  private maxStatesSize: number = 10000;

  constructor(config: Partial<AdaptiveLimitConfig> = {}) {
    this.config = {
      baseConfig: this.getDefaultConfig(),
      systemLoadThresholds: {
        low: 30,      // Scale down at 30% usage
        high: 70,     // Scale up at 70% usage
      },
      enableDynamicScaling: true,
      enableConcurrentTracking: true,
      ...config,
    };

    // Cleanup old states every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Get default rate limit configuration by role
   */
  private getDefaultConfig(): Map<string, RoleLimitConfig> {
    return new Map([
      [
        'ADMIN',
        {
          requestsPerMinute: 300,
          requestsPerHour: 5000,
          concurrentRequests: 50,
          burstSize: 100,
        },
      ],
      [
        'MANAGER',
        {
          requestsPerMinute: 150,
          requestsPerHour: 2500,
          concurrentRequests: 25,
          burstSize: 50,
        },
      ],
      [
        'USER',
        {
          requestsPerMinute: 60,
          requestsPerHour: 1000,
          concurrentRequests: 10,
          burstSize: 20,
        },
      ],
      [
        'GUEST',
        {
          requestsPerMinute: 20,
          requestsPerHour: 200,
          concurrentRequests: 3,
          burstSize: 5,
        },
      ],
    ]);
  }

  /**
   * Get current system load (0-100%)
   */
  private getSystemLoad(): number {
    const metrics = metricsService.getMetrics();
    const errorRate = metrics.requestsTotal > 0
      ? (metrics.errorRequests / metrics.requestsTotal) * 100
      : 0;
    const memoryUsage = metrics.memoryUsage.percentUsed;

    // Combine error rate and memory usage
    return Math.max(memoryUsage, Math.min(errorRate * 1.5, 100));
  }

  /**
   * Get adaptive limit multiplier based on system load
   */
  private getLoadMultiplier(): number {
    const load = this.getSystemLoad();

    if (load > this.config.systemLoadThresholds.high) {
      // System overloaded - reduce limits
      return 0.5; // 50% of normal
    } else if (load < this.config.systemLoadThresholds.low) {
      // System underutilized - increase limits
      return 1.5; // 150% of normal
    }
    return 1.0; // Normal limits
  }

  /**
   * Get adjusted rate limit config for user
   */
  private getAdjustedConfig(baseConfig: RoleLimitConfig): RoleLimitConfig {
    if (!this.config.enableDynamicScaling) {
      return baseConfig;
    }

    const multiplier = this.getLoadMultiplier();

    return {
      requestsPerMinute: Math.floor(baseConfig.requestsPerMinute * multiplier),
      requestsPerHour: Math.floor(baseConfig.requestsPerHour * multiplier),
      concurrentRequests: Math.floor(baseConfig.concurrentRequests * multiplier),
      burstSize: Math.floor(baseConfig.burstSize * multiplier),
    };
  }

  /**
   * Check if user has exceeded rate limit
   */
  checkUserLimit(userId: string, role: string): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    reason?: string;
  } {
    const baseConfig = this.config.baseConfig.get(role) ||
      this.config.baseConfig.get('USER')!;
    const config = this.getAdjustedConfig(baseConfig);

    let state = this.userStates.get(userId);
    if (!state) {
      state = {
        userId,
        requests: [],
        concurrentRequests: 0,
        violations: 0,
        requestLog: [],
      };
      this.userStates.set(userId, state);
    }

    // Check if user is blocked
    if (state.blockedUntil && state.blockedUntil > Date.now()) {
      const resetTime = Math.ceil((state.blockedUntil - Date.now()) / 1000);
      return {
        allowed: false,
        remaining: 0,
        resetTime,
        reason: `Rate limit exceeded. Try again in ${resetTime}s`,
      };
    }

    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;

    // Clean old requests
    state.requests = state.requests.filter(t => t > oneHourAgo);

    // Count requests in time windows
    const requestsInMinute = state.requests.filter(t => t > oneMinuteAgo).length;
    const requestsInHour = state.requests.length;

    // Check limits
    if (requestsInMinute >= config.requestsPerMinute) {
      state.violations++;
      state.lastViolation = now;

      // Progressive backoff
      const blockDuration = Math.min(
        60000 * Math.pow(2, state.violations - 1),
        3600000 // Max 1 hour
      );
      state.blockedUntil = now + blockDuration;

      logger.warn('User rate limit exceeded (per minute)', {
        userId,
        role,
        requests: requestsInMinute,
        limit: config.requestsPerMinute,
        violations: state.violations,
      });

      return {
        allowed: false,
        remaining: 0,
        resetTime: Math.ceil(blockDuration / 1000),
        reason: 'Per-minute rate limit exceeded',
      };
    }

    if (requestsInHour >= config.requestsPerHour) {
      state.violations++;
      state.lastViolation = now;

      const blockDuration = 3600000; // 1 hour
      state.blockedUntil = now + blockDuration;

      logger.warn('User rate limit exceeded (per hour)', {
        userId,
        role,
        requests: requestsInHour,
        limit: config.requestsPerHour,
        violations: state.violations,
      });

      return {
        allowed: false,
        remaining: 0,
        resetTime: 3600,
        reason: 'Per-hour rate limit exceeded',
      };
    }

    // Record request
    state.requests.push(now);

    const remaining = Math.max(
      config.requestsPerMinute - requestsInMinute - 1,
      config.requestsPerHour - requestsInHour - 1
    );

    const nextResetTime = Math.ceil(
      (state.requests[0] + 60 * 60 * 1000 - now) / 1000
    );

    return {
      allowed: true,
      remaining,
      resetTime: nextResetTime,
    };
  }

  /**
   * Check concurrent request limit
   */
  checkConcurrentLimit(userId: string, role: string): boolean {
    if (!this.config.enableConcurrentTracking) {
      return true;
    }

    const baseConfig = this.config.baseConfig.get(role) ||
      this.config.baseConfig.get('USER')!;
    const config = this.getAdjustedConfig(baseConfig);

    let state = this.userStates.get(userId);
    if (!state) {
      state = {
        userId,
        requests: [],
        concurrentRequests: 0,
        violations: 0,
        requestLog: [],
      };
      this.userStates.set(userId, state);
    }

    if (state.concurrentRequests >= config.concurrentRequests) {
      logger.warn('Concurrent request limit exceeded', {
        userId,
        role,
        concurrent: state.concurrentRequests,
        limit: config.concurrentRequests,
      });
      return false;
    }

    state.concurrentRequests++;
    return true;
  }

  /**
   * Release concurrent request
   */
  releaseConcurrentRequest(userId: string): void {
    const state = this.userStates.get(userId);
    if (state && state.concurrentRequests > 0) {
      state.concurrentRequests--;
    }
  }

  /**
   * Check IP-based rate limiting (for DDoS protection)
   */
  checkIpLimit(ip: string): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
  } {
    // IP-based limits are stricter
    const ipLimitPerMinute = 200;
    const ipLimitPerHour = 5000;

    let state = this.ipStates.get(ip);
    if (!state) {
      state = {
        ip,
        requests: [],
        violations: 0,
        suspiciousActivity: false,
      };
      this.ipStates.set(ip, state);
    }

    // Check if IP is blocked
    if (state.blockedUntil && state.blockedUntil > Date.now()) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: Math.ceil((state.blockedUntil - Date.now()) / 1000),
      };
    }

    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;

    // Clean old requests
    state.requests = state.requests.filter(t => t > oneHourAgo);

    const requestsInMinute = state.requests.filter(t => t > oneMinuteAgo).length;
    const requestsInHour = state.requests.length;

    if (requestsInMinute > ipLimitPerMinute) {
      state.violations++;
      state.suspiciousActivity = true;
      state.blockedUntil = now + 3600000; // Block for 1 hour

      securityLogger.suspiciousActivity(
        'High request rate from IP',
        undefined,
        ip,
        undefined
      );

      return {
        allowed: false,
        remaining: 0,
        resetTime: 3600,
      };
    }

    if (requestsInHour > ipLimitPerHour) {
      state.violations++;
      state.blockedUntil = now + 3600000;

      securityLogger.suspiciousActivity(
        'Excessive requests from IP',
        undefined,
        ip,
        undefined
      );

      return {
        allowed: false,
        remaining: 0,
        resetTime: 3600,
      };
    }

    state.requests.push(now);

    return {
      allowed: true,
      remaining: Math.max(
        ipLimitPerMinute - requestsInMinute,
        ipLimitPerHour - requestsInHour
      ),
      resetTime: Math.ceil(
        (state.requests[0] + 60 * 60 * 1000 - now) / 1000
      ),
    };
  }

  /**
   * Get current statistics
   */
  getStats() {
    return {
      systemLoad: this.getSystemLoad(),
      loadMultiplier: this.getLoadMultiplier(),
      activeUsers: this.userStates.size,
      activeIPs: this.ipStates.size,
      totalViolations: Array.from(this.userStates.values()).reduce(
        (sum, state) => sum + state.violations,
        0
      ),
      topViolators: Array.from(this.userStates.values())
        .sort((a, b) => b.violations - a.violations)
        .slice(0, 10)
        .map(state => ({
          userId: state.userId,
          violations: state.violations,
          blocked: state.blockedUntil ? state.blockedUntil > Date.now() : false,
        })),
    };
  }

  /**
   * Reset user limit state
   */
  resetUserLimit(userId: string): void {
    this.userStates.delete(userId);
  }

  /**
   * Cleanup old states
   */
  private cleanup(): void {
    const now = Date.now();

    // Remove unblocked users with no recent requests
    for (const [userId, state] of this.userStates.entries()) {
      if (
        state.requests.length === 0 &&
        (!state.blockedUntil || state.blockedUntil < now)
      ) {
        this.userStates.delete(userId);
      }
    }

    // Remove unblocked IPs
    for (const [ip, state] of this.ipStates.entries()) {
      if (
        state.requests.length === 0 &&
        (!state.blockedUntil || state.blockedUntil < now)
      ) {
        this.ipStates.delete(ip);
      }
    }

    // Log cleanup stats
    if (this.userStates.size > this.maxStatesSize) {
      logger.warn('Rate limiter state cache exceeded max size', {
        size: this.userStates.size,
        maxSize: this.maxStatesSize,
      });
    }
  }

  /**
   * Destroy the rate limiter
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

export const adaptiveRateLimiter = new AdaptiveRateLimiter();

/**
 * Adaptive rate limiting middleware
 */
export const adaptiveRateLimitMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Skip adaptive rate limiting for auth endpoints (they have their own limiter)
    if (req.path.startsWith('/auth/')) {
      return next();
    }

    const userId = (req as any).user?.id || 'anonymous';
    const userRole = (req as any).user?.role || 'GUEST';
    const ip = req.ip || req.connection.remoteAddress || 'unknown';

    // Check IP-based limit first (DDoS protection)
    const ipLimitCheck = adaptiveRateLimiter.checkIpLimit(ip);
    if (!ipLimitCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests from this IP address',
          retryAfter: ipLimitCheck.resetTime,
        },
      });
    }

    // Check user-based limit
    const userLimitCheck = adaptiveRateLimiter.checkUserLimit(userId, userRole);
    if (!userLimitCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: userLimitCheck.reason || 'Rate limit exceeded',
          retryAfter: userLimitCheck.resetTime,
        },
      });
    }

    // Check concurrent requests
    if (!adaptiveRateLimiter.checkConcurrentLimit(userId, userRole)) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many concurrent requests',
        },
      });
    }

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', userLimitCheck.remaining + 1);
    res.setHeader('X-RateLimit-Remaining', userLimitCheck.remaining);
    res.setHeader('X-RateLimit-Reset', userLimitCheck.resetTime);

    // Release concurrent request on response finish
    res.on('finish', () => {
      adaptiveRateLimiter.releaseConcurrentRequest(userId);
    });

    next();
  } catch (error) {
    logger.error('Error in adaptive rate limiting', error instanceof Error ? error : new Error(String(error)));
    next(); // Allow request if rate limiter fails
  }
};

export default adaptiveRateLimiter;
