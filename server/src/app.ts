import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import router from "./app/routes";
import AppError from "./app/errors/AppError";
import { RateLimiters } from "./app/middleware/rateLimiter.middleware";
import { adaptiveRateLimitMiddleware } from "./app/middleware/adaptiveRateLimiter.middleware";
import { globalErrorHandler } from "./app/middleware/errorHandler.middleware";
import { requestIdMiddleware, httpLogger, appLogger } from "./app/utils/logger";
import swaggerSpec from "./app/config/swagger";
import { metricsMiddleware, metricsService } from "./app/utils/metrics";
import { apmService } from "./app/utils/apm";

const app = express();

/* ============================= */
/*         MIDDLEWARE            */
/* ============================= */

// Request ID tracking (must be first)
app.use(requestIdMiddleware);

// Metrics tracking (after request ID)
app.use(metricsMiddleware);

// HTTP request logging (must be early)
app.use(httpLogger);

// Enhanced request logger with more context
app.use((req: Request, res: Response, next: NextFunction) => {
  appLogger.info('Request received', {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent')
  });
  next();
});

// CORS Configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  // Add your production domains here
  // 'https://yourdomain.com',
  // 'https://www.yourdomain.com'
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or Postman)
      if (!origin) return callback(null, true);

      // Check if the origin is in the allowed list
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Allow localhost during development
      if (process.env.NODE_ENV === 'development' && origin?.includes('localhost')) {
        return callback(null, true);
      }

      // Reject all other origins
      appLogger.warn('CORS policy violation', {
        origin,
        message: `Origin ${origin} not allowed by CORS policy`
      });
      return callback(new Error(`Origin ${origin} not allowed by CORS policy`), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  })
);

// Cookie Parser
app.use(cookieParser());

// Body Parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Input Sanitization (must come after body parsing)
import { sanitizeInput } from "./app/middleware/sanitize.middleware";
app.use(sanitizeInput);

/* ============================= */
/*          ROUTES               */
/* ============================= */

// Welcome Route
app.get("/", (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Welcome to HRM Admin Panel API 🚀",
    version: "1.0.0",
    documentation: "/docs",
  });
});

// Health Check Route
app.get("/api/health", async (_req: Request, res: Response) => {
  const health = await apmService.getHealthStatus();

  res.json({
    success: true,
    message: "API is healthy",
    status: health.status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: "1.0.0",
    database: health.database,
    cache: health.cache,
    memory: health.memory,
  });
});

/* ============================= */
/*     MONITORING ENDPOINTS       */
/* ============================= */

/**
 * @swagger
 * /api/monitoring/health:
 *   get:
 *     summary: Comprehensive health check
 *     description: Get detailed system health status including database, cache, memory, and performance metrics
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: Health status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [healthy, degraded, unhealthy]
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 database:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                     latency:
 *                       type: number
 *                 cache:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                     hitRatio:
 *                       type: number
 *                 memory:
 *                   type: object
 *                   properties:
 *                     percentUsed:
 *                       type: number
 *                     warning:
 *                       type: boolean
 */
app.get("/api/monitoring/health", async (_req: Request, res: Response) => {
  try {
    const health = await apmService.getHealthStatus();
    res.json({
      success: true,
      data: health,
    });
  } catch (error) {
    appLogger.error('Health check failed', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({
      success: false,
      message: "Health check failed",
    });
  }
});

/**
 * @swagger
 * /api/monitoring/metrics:
 *   get:
 *     summary: Get all system metrics
 *     description: Retrieve comprehensive metrics including requests, database queries, cache operations, and system resources
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: Metrics retrieved successfully
 */
app.get("/api/monitoring/metrics", (_req: Request, res: Response) => {
  try {
    const metrics = metricsService.getMetrics();
    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve metrics",
    });
  }
});

/**
 * @swagger
 * /api/monitoring/performance:
 *   get:
 *     summary: Get performance insights
 *     description: Retrieve detailed performance insights including database, cache, and API performance analysis
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: Performance insights retrieved successfully
 */
app.get("/api/monitoring/performance", (_req: Request, res: Response) => {
  try {
    const insights = apmService.getPerformanceInsights();
    res.json({
      success: true,
      data: insights,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve performance insights",
    });
  }
});

/**
 * @swagger
 * /api/monitoring/prometheus:
 *   get:
 *     summary: Get Prometheus metrics format
 *     description: Export metrics in Prometheus exposition format for integration with monitoring systems
 *     tags: [Monitoring]
 *     produces:
 *       - text/plain
 *     responses:
 *       200:
 *         description: Prometheus metrics in text format
 */
app.get("/api/monitoring/prometheus", (_req: Request, res: Response) => {
  try {
    const metrics = metricsService.getPrometheusMetrics();
    res.setHeader('Content-Type', 'text/plain');
    res.send(metrics);
  } catch (error) {
    res.status(500).send('Failed to generate Prometheus metrics');
  }
});

/**
 * @swagger
 * /api/monitoring/errors:
 *   get:
 *     summary: Get error statistics
 *     description: Get recent error tracking and statistics (Admin only)
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: Error statistics retrieved successfully
 */
app.get("/api/monitoring/errors", (_req: Request, res: Response) => {
  try {
    const { errorBoundary } = require("./app/errors/errorBoundary");
    const stats = errorBoundary.getErrorStats();
    const recent = errorBoundary.getRecentErrors(20);

    res.json({
      success: true,
      data: {
        statistics: stats,
        recentErrors: recent,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve error statistics",
    });
  }
});

/**
 * @swagger
 * /api/monitoring/rate-limits:
 *   get:
 *     summary: Get adaptive rate limiting statistics
 *     description: Get current rate limit status, system load, and top violators (Admin only)
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: Rate limit statistics retrieved successfully
 */
app.get("/api/monitoring/rate-limits", (_req: Request, res: Response) => {
  try {
    const { adaptiveRateLimiter } = require("./app/middleware/adaptiveRateLimiter.middleware");
    const stats = adaptiveRateLimiter.getStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve rate limit statistics",
    });
  }
});

// Swagger UI Documentation
const swaggerUiOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'HRM API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true,
    requestSnippetsEnabled: true,
    requestSnippets: {
      generators: {
        curl_bash: {
          title: "cURL (bash)",
          syntax: "bash"
        },
        javascript_fetch: {
          title: "JavaScript (fetch)",
          syntax: "javascript"
        }
      }
    }
  }
};

// Setup Swagger UI
app.use('/docs', swaggerUi.serve);
app.get('/docs', swaggerUi.setup(swaggerSpec, swaggerUiOptions));

// Swagger JSON endpoint for tools integration
app.get('/docs.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// API Routes with general rate limiting and adaptive limiting
// In development, disable heavy adaptive rate limiting to avoid
// local testing issues like "user rate limit exceeded" when the
// frontend fires many parallel requests.
if (process.env.NODE_ENV === 'production') {
  app.use("/api", RateLimiters.apiLimiter, adaptiveRateLimitMiddleware, router);
} else {
  app.use("/api", router);
}

/* ============================= */
/*       404 HANDLER             */
/* ============================= */

app.use((req: Request, res: Response) => {
  appLogger.warn('Route not found', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    requestId: req.requestId
  });

  res.status(404).json({
    success: false,
    message: "Route not found",
    error: "The requested endpoint does not exist",
    requestId: req.requestId
  });
});

/* ============================= */
/*     GLOBAL ERROR HANDLER      */
/* ============================= */

app.use(globalErrorHandler);

export default app;
