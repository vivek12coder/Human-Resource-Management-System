/**
 * Application Metrics Tracking
 * Collects and exposes performance metrics, APM data, and system health indicators
 */

import { Request, Response } from 'express';
import logger from './logger';

interface MetricsData {
  requestsTotal: number;
  requestsActive: number;
  requestsByMethod: Record<string, number>;
  requestsByStatus: Record<number, number>;
  averageResponseTime: number;
  totalResponseTime: number;
  slowRequests: number;
  errorRequests: number;

  // Database metrics
  databaseQueries: number;
  databaseAvgTime: number;
  databaseErrors: number;
  databaseSlowest: Array<{ query: string; time: number; timestamp: Date }>;

  // Cache metrics
  cacheHits: number;
  cacheMisses: number;
  cacheHitRatio: number;
  cacheAvgTime: number;

  // System metrics
  uptime: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    percentUsed: number;
  };
  cpuUsage: {
    user: number;
    system: number;
  };

  // Business metrics
  activeUsers: number;
  lastUpdated: Date;
}

interface RequestMetrics {
  method: string;
  url: string;
  statusCode: number;
  duration: number;
  timestamp: Date;
  userId?: string;
}

interface QueryMetrics {
  collection: string;
  operation: string;
  duration: number;
  timestamp: Date;
  slow: boolean;
}

interface CacheMetrics {
  operation: 'hit' | 'miss' | 'set' | 'delete';
  key: string;
  duration: number;
  timestamp: Date;
}

class MetricsService {
  private metricsData: MetricsData;
  private requestMetricsBuffer: RequestMetrics[] = [];
  private queryMetricsBuffer: QueryMetrics[] = [];
  private cacheMetricsBuffer: CacheMetrics[] = [];
  private maxBufferSize: number = 1000;
  private activeRequests: Map<string, { started: number; method: string; url: string }> = new Map();

  constructor() {
    this.metricsData = this.initializeMetrics();
    this.startMetricsRotation();
  }

  /**
   * Initialize metrics object
   */
  private initializeMetrics(): MetricsData {
    return {
      requestsTotal: 0,
      requestsActive: 0,
      requestsByMethod: {},
      requestsByStatus: {},
      averageResponseTime: 0,
      totalResponseTime: 0,
      slowRequests: 0,
      errorRequests: 0,

      databaseQueries: 0,
      databaseAvgTime: 0,
      databaseErrors: 0,
      databaseSlowest: [],

      cacheHits: 0,
      cacheMisses: 0,
      cacheHitRatio: 0,
      cacheAvgTime: 0,

      uptime: 0,
      memoryUsage: {
        heapUsed: 0,
        heapTotal: 0,
        percentUsed: 0,
      },
      cpuUsage: {
        user: 0,
        system: 0,
      },

      activeUsers: 0,
      lastUpdated: new Date(),
    };
  }

  /**
   * Track incoming HTTP request
   */
  trackRequestStart(requestId: string, method: string, url: string): void {
    this.activeRequests.set(requestId, {
      started: Date.now(),
      method,
      url,
    });
    this.metricsData.requestsActive = this.activeRequests.size;
  }

  /**
   * Track completed HTTP request
   */
  trackRequestEnd(
    requestId: string,
    statusCode: number,
    userId?: string
  ): void {
    const requestData = this.activeRequests.get(requestId);
    if (!requestData) return;

    const duration = Date.now() - requestData.started;
    const metric: RequestMetrics = {
      method: requestData.method,
      url: requestData.url,
      statusCode,
      duration,
      timestamp: new Date(),
      userId,
    };

    this.requestMetricsBuffer.push(metric);
    this.activeRequests.delete(requestId);

    // Update metrics
    this.metricsData.requestsTotal++;
    this.metricsData.requestsActive = this.activeRequests.size;
    this.metricsData.requestsByMethod[requestData.method] =
      (this.metricsData.requestsByMethod[requestData.method] || 0) + 1;
    this.metricsData.requestsByStatus[statusCode] =
      (this.metricsData.requestsByStatus[statusCode] || 0) + 1;

    this.metricsData.totalResponseTime += duration;
    this.metricsData.averageResponseTime =
      this.metricsData.totalResponseTime / this.metricsData.requestsTotal;

    if (duration > 3000) {
      this.metricsData.slowRequests++;
    }

    if (statusCode >= 400) {
      this.metricsData.errorRequests++;
    }

    // Cleanup buffer if too large
    if (this.requestMetricsBuffer.length > this.maxBufferSize) {
      this.requestMetricsBuffer = this.requestMetricsBuffer.slice(-500);
    }
  }

  /**
   * Track database query
   */
  trackDatabaseQuery(collection: string, operation: string, duration: number): void {
    const slow = duration > 1000; // > 1 second is slow

    const metric: QueryMetrics = {
      collection,
      operation,
      duration,
      timestamp: new Date(),
      slow,
    };

    this.queryMetricsBuffer.push(metric);
    this.metricsData.databaseQueries++;
    this.metricsData.databaseAvgTime =
      (this.metricsData.databaseAvgTime * (this.metricsData.databaseQueries - 1) + duration) /
      this.metricsData.databaseQueries;

    if (slow) {
      // Keep track of slowest queries
      this.metricsData.databaseSlowest.push({
        query: `${operation} on ${collection}`,
        time: duration,
        timestamp: new Date(),
      });

      // Keep only top 10 slowest
      if (this.metricsData.databaseSlowest.length > 10) {
        this.metricsData.databaseSlowest = this.metricsData.databaseSlowest
          .sort((a, b) => b.time - a.time)
          .slice(0, 10);
      }
    }

    // Cleanup buffer if too large
    if (this.queryMetricsBuffer.length > this.maxBufferSize) {
      this.queryMetricsBuffer = this.queryMetricsBuffer.slice(-500);
    }
  }

  /**
   * Track database error
   */
  trackDatabaseError(): void {
    this.metricsData.databaseErrors++;
  }

  /**
   * Track cache operation
   */
  trackCacheOperation(operation: 'hit' | 'miss' | 'set' | 'delete', key: string, duration: number = 0): void {
    const metric: CacheMetrics = {
      operation,
      key,
      duration,
      timestamp: new Date(),
    };

    this.cacheMetricsBuffer.push(metric);

    if (operation === 'hit') {
      this.metricsData.cacheHits++;
    } else if (operation === 'miss') {
      this.metricsData.cacheMisses++;
    }

    const totalCacheOperations = this.metricsData.cacheHits + this.metricsData.cacheMisses;
    if (totalCacheOperations > 0) {
      this.metricsData.cacheHitRatio =
        (this.metricsData.cacheHits / totalCacheOperations) * 100;
    }

    if (duration > 0) {
      this.metricsData.cacheAvgTime =
        (this.metricsData.cacheAvgTime + duration) / 2;
    }

    // Cleanup buffer if too large
    if (this.cacheMetricsBuffer.length > this.maxBufferSize) {
      this.cacheMetricsBuffer = this.cacheMetricsBuffer.slice(-500);
    }
  }

  /**
   * Track active users (approximate based on unique user IDs in recent requests)
   */
  updateActiveUsers(): void {
    const recentRequests = this.requestMetricsBuffer.slice(-100);
    const uniqueUsers = new Set(recentRequests.map(r => r.userId).filter(Boolean));
    this.metricsData.activeUsers = uniqueUsers.size;
  }

  /**
   * Update system metrics
   */
  updateSystemMetrics(): void {
    this.metricsData.uptime = process.uptime();

    // Memory usage
    const memoryUsage = process.memoryUsage();
    this.metricsData.memoryUsage = {
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
      percentUsed: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
    };

    // CPU usage
    const cpuUsage = process.cpuUsage();
    this.metricsData.cpuUsage = {
      user: Math.round(cpuUsage.user / 1000), // Convert to ms
      system: Math.round(cpuUsage.system / 1000), // Convert to ms
    };

    this.metricsData.lastUpdated = new Date();
  }

  /**
   * Get current metrics
   */
  getMetrics(): MetricsData {
    this.updateSystemMetrics();
    this.updateActiveUsers();
    return this.metricsData;
  }

  /**
   * Get detailed request metrics
   */
  getRequestMetrics(): {
    total: number;
    active: number;
    byMethod: Record<string, number>;
    byStatus: Record<number, number>;
    averageResponseTime: number;
    slowRequests: number;
    errorRequests: number;
    recentRequests: RequestMetrics[];
  } {
    return {
      total: this.metricsData.requestsTotal,
      active: this.metricsData.requestsActive,
      byMethod: this.metricsData.requestsByMethod,
      byStatus: this.metricsData.requestsByStatus,
      averageResponseTime: Math.round(this.metricsData.averageResponseTime),
      slowRequests: this.metricsData.slowRequests,
      errorRequests: this.metricsData.errorRequests,
      recentRequests: this.requestMetricsBuffer.slice(-20),
    };
  }

  /**
   * Get detailed database metrics
   */
  getDatabaseMetrics(): {
    totalQueries: number;
    averageQueryTime: number;
    errors: number;
    slowest: Array<{ query: string; time: number; timestamp: Date }>;
    recentQueries: QueryMetrics[];
  } {
    return {
      totalQueries: this.metricsData.databaseQueries,
      averageQueryTime: Math.round(this.metricsData.databaseAvgTime),
      errors: this.metricsData.databaseErrors,
      slowest: this.metricsData.databaseSlowest,
      recentQueries: this.queryMetricsBuffer.slice(-20),
    };
  }

  /**
   * Get detailed cache metrics
   */
  getCacheMetrics(): {
    hits: number;
    misses: number;
    hitRatio: number;
    averageTime: number;
    recentOperations: CacheMetrics[];
  } {
    return {
      hits: this.metricsData.cacheHits,
      misses: this.metricsData.cacheMisses,
      hitRatio: Math.round(this.metricsData.cacheHitRatio * 100) / 100,
      averageTime: Math.round(this.metricsData.cacheAvgTime),
      recentOperations: this.cacheMetricsBuffer.slice(-20),
    };
  }

  /**
   * Get Prometheus-compatible metrics format
   */
  getPrometheusMetrics(): string {
    const metrics = this.getMetrics();
    const lines: string[] = [];

    lines.push('# HELP requests_total Total HTTP requests');
    lines.push(`# TYPE requests_total counter`);
    lines.push(`requests_total ${metrics.requestsTotal}`);

    lines.push('# HELP requests_active Active HTTP requests');
    lines.push(`# TYPE requests_active gauge`);
    lines.push(`requests_active ${metrics.requestsActive}`);

    lines.push('# HELP response_time_ms Average response time in milliseconds');
    lines.push(`# TYPE response_time_ms gauge`);
    lines.push(`response_time_ms ${Math.round(metrics.averageResponseTime)}`);

    lines.push('# HELP database_queries_total Total database queries');
    lines.push(`# TYPE database_queries_total counter`);
    lines.push(`database_queries_total ${metrics.databaseQueries}`);

    lines.push('# HELP database_query_time_ms Average database query time in milliseconds');
    lines.push(`# TYPE database_query_time_ms gauge`);
    lines.push(`database_query_time_ms ${Math.round(metrics.databaseAvgTime)}`);

    lines.push('# HELP cache_hits_total Total cache hits');
    lines.push(`# TYPE cache_hits_total counter`);
    lines.push(`cache_hits_total ${metrics.cacheHits}`);

    lines.push('# HELP cache_hit_ratio Cache hit ratio percentage');
    lines.push(`# TYPE cache_hit_ratio gauge`);
    lines.push(`cache_hit_ratio ${Math.round(metrics.cacheHitRatio * 100) / 100}`);

    lines.push('# HELP memory_heap_used_mb Heap memory used in MB');
    lines.push(`# TYPE memory_heap_used_mb gauge`);
    lines.push(`memory_heap_used_mb ${metrics.memoryUsage.heapUsed}`);

    lines.push('# HELP memory_heap_percent_used Heap memory percentage used');
    lines.push(`# TYPE memory_heap_percent_used gauge`);
    lines.push(`memory_heap_percent_used ${metrics.memoryUsage.percentUsed}`);

    lines.push('# HELP uptime_seconds Process uptime in seconds');
    lines.push(`# TYPE uptime_seconds gauge`);
    lines.push(`uptime_seconds ${Math.round(metrics.uptime)}`);

    return lines.join('\n');
  }

  /**
   * Reset metrics (useful for testing)
   */
  reset(): void {
    this.metricsData = this.initializeMetrics();
    this.requestMetricsBuffer = [];
    this.queryMetricsBuffer = [];
    this.cacheMetricsBuffer = [];
    this.activeRequests.clear();
  }

  /**
   * Start periodic metrics rotation
   */
  private startMetricsRotation(): void {
    // Clear old metrics every hour
    setInterval(() => {
      if (this.requestMetricsBuffer.length > 500) {
        this.requestMetricsBuffer = this.requestMetricsBuffer.slice(-100);
      }
      if (this.queryMetricsBuffer.length > 500) {
        this.queryMetricsBuffer = this.queryMetricsBuffer.slice(-100);
      }
      if (this.cacheMetricsBuffer.length > 500) {
        this.cacheMetricsBuffer = this.cacheMetricsBuffer.slice(-100);
      }
    }, 3600000); // Every hour
  }
}

export const metricsService = new MetricsService();

/**
 * Middleware to track HTTP requests
 */
export const metricsMiddleware = (
  req: Request,
  res: Response,
  next: Function
): void => {
  const requestId = req.requestId || 'unknown';
  metricsService.trackRequestStart(requestId, req.method, req.originalUrl);

  // Track response
  const originalSend = res.send;
  res.send = function (data: any) {
    const userId = (res.locals.user as any)?.id;
    metricsService.trackRequestEnd(requestId, res.statusCode, userId);
    return originalSend.call(res, data);
  };

  next();
};

export default metricsService;
