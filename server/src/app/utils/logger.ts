import winston from 'winston';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Define log levels and colors
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'cyan',
  http: 'magenta',
  debug: 'green',
};

winston.addColors(logColors);

// Create logger format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    if (info.stack) {
      return `${info.timestamp} ${info.level}: ${info.message}\n${info.stack}`;
    }
    return `${info.timestamp} ${info.level}: ${info.message}`;
  })
);

// Create the logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'warn',
  levels: logLevels,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'hrm-api' },
  transports: [
    // Write to all logs with level 'info' and below to 'app.log'
    new winston.transports.File({
      filename: 'logs/app.log',
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),

    // Write all logs with level 'error' and below to 'error.log'
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),

    // Write HTTP requests to separate file
    new winston.transports.File({
      filename: 'logs/http.log',
      level: 'http',
      maxsize: 5242880, // 5MB
      maxFiles: 3,
    })
  ],
});

// Add console logging in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: logFormat
  }));
}

// Extend Request interface to include requestId
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
    }
  }
}

// Request ID middleware to track requests
export const requestIdMiddleware = (req: Request, res: Response, next: Function) => {
  req.requestId = uuidv4();
  req.startTime = Date.now();

  // Add request ID to response headers
  res.setHeader('X-Request-ID', req.requestId);

  next();
};

// HTTP request logger middleware
export const httpLogger = (req: Request, res: Response, next: Function) => {
  res.on('finish', () => {
    const duration = Date.now() - (req.startTime || Date.now());

    logger.http('HTTP Request', {
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      userId: (res.locals.user as any)?.id || 'anonymous'
    });

    // Log slow requests as warnings
    if (duration > 3000) { // 3 seconds
      logger.warn('Slow Request Detected', {
        requestId: req.requestId,
        method: req.method,
        url: req.originalUrl,
        duration: `${duration}ms`,
        statusCode: res.statusCode
      });
    }
  });

  next();
};

// Security logger for sensitive operations
export const securityLogger = {
  loginAttempt: (email: string, success: boolean, ip: string, requestId?: string) => {
    logger.warn('Login Attempt', {
      requestId,
      email,
      success,
      ip,
      type: 'authentication'
    });
  },

  passwordChange: (userId: string, ip: string, requestId?: string) => {
    logger.warn('Password Change', {
      requestId,
      userId,
      ip,
      type: 'security'
    });
  },

  accessDenied: (userId: string, resource: string, ip: string, requestId?: string) => {
    logger.warn('Access Denied', {
      requestId,
      userId,
      resource,
      ip,
      type: 'authorization'
    });
  },

  suspiciousActivity: (description: string, userId?: string, ip?: string, requestId?: string) => {
    logger.error('Suspicious Activity', {
      requestId,
      description,
      userId,
      ip,
      type: 'security_threat'
    });
  }
};

// Application logger with context
export const appLogger = {
  info: (message: string, meta?: any) => {
    logger.info(message, meta);
  },

  warn: (message: string, meta?: any) => {
    logger.warn(message, meta);
  },

  error: (message: string, error?: Error | any, meta?: any) => {
    logger.error(message, {
      ...meta,
      error: error?.message,
      stack: error?.stack,
    });
  },

  debug: (message: string, meta?: any) => {
    logger.debug(message, meta);
  }
};

export default logger;