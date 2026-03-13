/**
 * Application Performance Monitoring (APM) Utility
 * Provides health checks, performance insights, and system diagnostics
 */

import mongoose from 'mongoose';
import cacheService from './cache';
import { metricsService } from './metrics';
import logger from './logger';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  uptime: number;
  version: string;

  // Component health
  database: {
    status: 'connected' | 'disconnected';
    latency: number;
    collections: number;
  };

  cache: {
    status: 'connected' | 'disconnected' | 'disabled';
    latency: number;
    hitRatio: number;
  };

  memory: {
    heapUsed: number;
    heapTotal: number;
    percentUsed: number;
    warning: boolean;
  };

  // Performance indicators
  performance: {
    averageResponseTime: number;
    requestsPerSecond: number;
    slowRequests: number;
    errorRate: number;
  };

  // API health
  api: {
    totalRequests: number;
    activeRequests: number;
    errorRequests: number;
  };
}

export interface PerformanceInsights {
  databasePerformance: {
    totalQueries: number;
    averageQueryTime: number;
    slowQueries: number;
    queryDistribution: Record<string, number>;
  };

  cachePerformance: {
    hitRatio: number;
    totalOperations: number;
    averageAccessTime: number;
  };

  apiPerformance: {
    totalRequests: number;
    averageResponseTime: number;
    slowRequests: number;
    requests: Array<{
      method: string;
      url: string;
      averageTime: number;
      requestCount: number;
    }>;
  };

  systemMetrics: {
    cpuUsage: number;
    memoryUsage: number;
    uptime: number;
  };
}

class APMService {
  private startTime: number;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private lastDatabaseCheck: { time: number; latency: number } | null = null;
  private lastCacheCheck: { time: number; latency: number } | null = null;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Check database connection health
   */
  async checkDatabaseHealth(): Promise<{ status: boolean; latency: number }> {
    const startTime = Date.now();

    try {
      // Check MongoDB connection state
      if (mongoose.connection.readyState !== 1) {
        return { status: false, latency: 0 };
      }

      // Perform a simple database query to measure latency
      const testCollection = mongoose.connection.db;
      if (testCollection) {
        const adminDb = testCollection.admin();
        await adminDb.ping();
      }

      const latency = Date.now() - startTime;
      this.lastDatabaseCheck = { time: Date.now(), latency };
      return { status: true, latency };
    } catch (error) {
      logger.error('Database health check failed', error instanceof Error ? error : new Error(String(error)));
      return { status: false, latency: -1 };
    }
  }

  /**
   * Check cache connection health
   */
  async checkCacheHealth(): Promise<{ status: boolean; latency: number }> {
    const startTime = Date.now();

    try {
      // Cache service is optional, check if enabled
      const stats = await cacheService.getStats();
      if (!stats) {
        return { status: false, latency: 0 };
      }

      const latency = Date.now() - startTime;
      this.lastCacheCheck = { time: Date.now(), latency };
      return { status: true, latency };
    } catch (error) {
      logger.warn('Cache health check failed', error instanceof Error ? error.message : String(error));
      return { status: false, latency: -1 };
    }
  }

  /**
   * Get comprehensive health status
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const metrics = metricsService.getMetrics();
    const dbHealth = await this.checkDatabaseHealth();
    const cacheHealth = await this.checkCacheHealth();
    const cacheMetrics = metricsService.getCacheMetrics();
    const requestMetrics = metricsService.getRequestMetrics();

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (!dbHealth.status) {
      status = 'unhealthy';
    } else if (metrics.memoryUsage.percentUsed > 90 || !cacheHealth.status) {
      status = 'degraded';
    }

    // Calculate error rate
    const errorRate = metrics.requestsTotal > 0
      ? (metrics.errorRequests / metrics.requestsTotal) * 100
      : 0;

    // Calculate RPS (requests per second)
    const uptime = process.uptime();
    const rps = uptime > 0 ? Math.round((metrics.requestsTotal / uptime) * 100) / 100 : 0;

    return {
      status,
      timestamp: new Date(),
      uptime: Math.round(uptime),
      version: "1.0.0",

      database: {
        status: dbHealth.status ? 'connected' : 'disconnected',
        latency: dbHealth.latency,
        collections: 0, // Could be enhanced to count actual collections
      },

      cache: {
        status: cacheHealth.status ? 'connected' : cacheHealth.status === false ? 'disconnected' : 'disabled',
        latency: cacheHealth.latency,
        hitRatio: cacheMetrics.hitRatio,
      },

      memory: {
        heapUsed: metrics.memoryUsage.heapUsed,
        heapTotal: metrics.memoryUsage.heapTotal,
        percentUsed: metrics.memoryUsage.percentUsed,
        warning: metrics.memoryUsage.percentUsed > 80,
      },

      performance: {
        averageResponseTime: Math.round(metrics.averageResponseTime),
        requestsPerSecond: rps,
        slowRequests: metrics.slowRequests,
        errorRate: Math.round(errorRate * 100) / 100,
      },

      api: {
        totalRequests: metrics.requestsTotal,
        activeRequests: metrics.requestsActive,
        errorRequests: metrics.errorRequests,
      },
    };
  }

  /**
   * Get detailed performance insights
   */
  getPerformanceInsights(): PerformanceInsights {
    const dbMetrics = metricsService.getDatabaseMetrics();
    const cacheMetrics = metricsService.getCacheMetrics();
    const requestMetrics = metricsService.getRequestMetrics();
    const metrics = metricsService.getMetrics();

    // Group requests by endpoint
    const requestsByEndpoint: Record<string, { times: number[]; count: number }> = {};
    requestMetrics.recentRequests.forEach(req => {
      if (!requestsByEndpoint[req.url]) {
        requestsByEndpoint[req.url] = { times: [], count: 0 };
      }
      requestsByEndpoint[req.url].times.push(req.duration);
      requestsByEndpoint[req.url].count++;
    });

    const apiRequests = Object.entries(requestsByEndpoint).map(([url, data]) => {
      const avgTime = data.times.length > 0
        ? Math.round(data.times.reduce((a, b) => a + b, 0) / data.times.length)
        : 0;
      return {
        method: 'GET', // Could enhance to track actual method
        url,
        averageTime: avgTime,
        requestCount: data.count,
      };
    });

    // Group database queries
    const queryDistribution: Record<string, number> = {};
    dbMetrics.recentQueries.forEach(q => {
      const key = `${q.operation}:${q.collection}`;
      queryDistribution[key] = (queryDistribution[key] || 0) + 1;
    });

    return {
      databasePerformance: {
        totalQueries: dbMetrics.totalQueries,
        averageQueryTime: dbMetrics.averageQueryTime,
        slowQueries: dbMetrics.slowest.length,
        queryDistribution,
      },

      cachePerformance: {
        hitRatio: cacheMetrics.hitRatio,
        totalOperations: cacheMetrics.hits + cacheMetrics.misses,
        averageAccessTime: cacheMetrics.averageTime,
      },

      apiPerformance: {
        totalRequests: metrics.requestsTotal,
        averageResponseTime: Math.round(metrics.averageResponseTime),
        slowRequests: metrics.slowRequests,
        requests: apiRequests.slice(0, 10), // Top 10 endpoints
      },

      systemMetrics: {
        cpuUsage: Math.round((metrics.cpuUsage.user + metrics.cpuUsage.system) * 100) / 100,
        memoryUsage: metrics.memoryUsage.percentUsed,
        uptime: Math.round(process.uptime()),
      },
    };
  }

  /**
   * Generate health report
   */
  async generateHealthReport(): Promise<string> {
    const health = await this.getHealthStatus();
    const insights = this.getPerformanceInsights();

    const report = `
╔════════════════════════════════════════════════════════════════╗
║           HR Management System - Health Report                 ║
╚════════════════════════════════════════════════════════════════╝

📊 OVERALL STATUS: ${health.status.toUpperCase()}
⏱️  Timestamp: ${health.timestamp.toISOString()}
⏳  Uptime: ${Math.floor(health.uptime / 3600)}h ${Math.floor((health.uptime % 3600) / 60)}m

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🗄️  DATABASE
   Status: ${health.database.status.toUpperCase()}
   Latency: ${health.database.latency}ms
   Total Queries: ${insights.databasePerformance.totalQueries}
   Avg Query Time: ${insights.databasePerformance.averageQueryTime}ms
   Slow Queries: ${insights.databasePerformance.slowQueries}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚡ CACHE
   Status: ${health.cache.status.toUpperCase()}
   Latency: ${health.cache.latency}ms
   Hit Ratio: ${health.cache.hitRatio.toFixed(2)}%
   Total Operations: ${insights.cachePerformance.totalOperations}
   Avg Access Time: ${insights.cachePerformance.averageAccessTime}ms

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💾 MEMORY
   Heap Used: ${health.memory.heapUsed}MB / ${health.memory.heapTotal}MB
   Percentage: ${health.memory.percentUsed}%
   Warning: ${health.memory.warning ? '⚠️  YES' : '✅ NO'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📡 API PERFORMANCE
   Total Requests: ${health.api.totalRequests}
   Active Requests: ${health.api.activeRequests}
   Error Requests: ${health.api.errorRequests}
   Avg Response Time: ${health.performance.averageResponseTime}ms
   Requests/Second: ${health.performance.requestsPerSecond}
   Slow Requests: ${health.performance.slowRequests}
   Error Rate: ${health.performance.errorRate.toFixed(2)}%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💻 SYSTEM
   CPU Usage: ${insights.systemMetrics.cpuUsage}ms
   Memory Usage: ${insights.systemMetrics.memoryUsage}%
   Uptime: ${Math.floor(insights.systemMetrics.uptime / 3600)}h

╔════════════════════════════════════════════════════════════════╗
║                     Generated at ${new Date().toISOString()}
╚════════════════════════════════════════════════════════════════╝
    `.trim();

    return report;
  }

  /**
   * Start periodic health checks
   */
  startHealthChecks(intervalMs: number = 60000): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.getHealthStatus();
        if (health.status === 'unhealthy') {
          logger.error('System health: UNHEALTHY', health);
        } else if (health.status === 'degraded') {
          logger.warn('System health: DEGRADED', health);
        } else {
          logger.debug('System health: HEALTHY', health);
        }
      } catch (error) {
        logger.error('Failed to perform health check', error instanceof Error ? error : new Error(String(error)));
      }
    }, intervalMs);

    logger.info(`Health checks started with interval: ${intervalMs}ms`);
  }

  /**
   * Stop periodic health checks
   */
  stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      logger.info('Health checks stopped');
    }
  }
}

export const apmService = new APMService();

export default apmService;
