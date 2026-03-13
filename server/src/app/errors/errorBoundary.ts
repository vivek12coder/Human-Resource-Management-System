/**
 * Error Boundary & Error Tracking
 * Provides error wrapping, tracking, and recovery mechanisms
 */

import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import AppError from './AppError';
import { ErrorCode, getErrorCategory, getHttpStatusCode } from './errorCodes';

interface ErrorBoundaryConfig {
  captureStack: boolean;
  logErrors: boolean;
  sendStackTrace: boolean;
  errorContext?: Record<string, any>;
}

interface ErrorTrackingEntry {
  id: string;
  code: ErrorCode;
  message: string;
  timestamp: Date;
  context: Record<string, any>;
  resolved: boolean;
  resolution?: string;
}

class ErrorBoundaryService {
  private config: ErrorBoundaryConfig;
  private errorTracker: Map<string, ErrorTrackingEntry> = new Map();
  private maxTrackedErrors: number = 1000;

  constructor(config: Partial<ErrorBoundaryConfig> = {}) {
    this.config = {
      captureStack: true,
      logErrors: true,
      sendStackTrace: process.env.NODE_ENV === 'development',
      ...config,
    };
  }

  /**
   * Wrap async function with error handling
   */
  async wrap<T>(fn: () => Promise<T>, context?: Record<string, any>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      this.trackError(error, context);
      throw error;
    }
  }

  /**
   * Wrap sync function with error handling
   */
  wrapSync<T>(fn: () => T, context?: Record<string, any>): T {
    try {
      return fn();
    } catch (error) {
      this.trackError(error, context);
      throw error;
    }
  }

  /**
   * Create error boundary middleware
   */
  middleware(config?: Partial<ErrorBoundaryConfig>) {
    return (req: Request, res: Response, next: NextFunction) => {
      // Wrap send method to track responses
      const originalSend = res.send;
      res.send = function (data: any) {
        if (res.statusCode >= 400) {
          const errorData = typeof data === 'string' ? data : JSON.stringify(data);
          // Error tracking happens in error handler
        }
        return originalSend.call(res, data);
      };

      next();
    };
  }

  /**
   * Track error occurrence
   */
  trackError(error: any, context?: Record<string, any>): string {
    const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    let appError: AppError;
    if (error instanceof AppError) {
      appError = error;
    } else if (error instanceof Error) {
      appError = new AppError(
        500,
        error.message,
        error.message,
        ErrorCode.INTERNAL_SERVER_ERROR,
        context,
        error.stack
      );
    } else {
      appError = new AppError(
        500,
        'Unknown error occurred',
        String(error),
        ErrorCode.INTERNAL_SERVER_ERROR,
        context
      );
    }

    const entry: ErrorTrackingEntry = {
      id: errorId,
      code: appError.code,
      message: appError.message,
      timestamp: new Date(),
      context: {
        ...context,
        errorName: error.name,
        errorStack: this.config.captureStack ? error.stack : undefined,
      },
      resolved: false,
    };

    this.errorTracker.set(errorId, entry);

    // Log error
    if (this.config.logErrors) {
      logger.error(`Error tracked: ${errorId}`, {
        code: appError.code,
        message: appError.message,
        category: getErrorCategory(appError.code),
        context,
      });
    }

    // Cleanup old errors if tracker exceeds max size
    if (this.errorTracker.size > this.maxTrackedErrors) {
      const oldestKey = Array.from(this.errorTracker.keys())[0];
      this.errorTracker.delete(oldestKey);
    }

    return errorId;
  }

  /**
   * Mark error as resolved
   */
  resolveError(errorId: string, resolution: string): boolean {
    const entry = this.errorTracker.get(errorId);
    if (entry) {
      entry.resolved = true;
      entry.resolution = resolution;
      return true;
    }
    return false;
  }

  /**
   * Get error details
   */
  getError(errorId: string): ErrorTrackingEntry | undefined {
    return this.errorTracker.get(errorId);
  }

  /**
   * Get recent errors (unresolved)
   */
  getRecentErrors(limit: number = 50): ErrorTrackingEntry[] {
    return Array.from(this.errorTracker.values())
      .filter(e => !e.resolved)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    const entries = Array.from(this.errorTracker.values());
    const byCasCode: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    entries.forEach(entry => {
      byCasCode[entry.code] = (byCasCode[entry.code] || 0) + 1;
      const category = getErrorCategory(entry.code);
      byCategory[category] = (byCategory[category] || 0) + 1;
    });

    return {
      totalTracked: entries.length,
      resolved: entries.filter(e => e.resolved).length,
      unresolved: entries.filter(e => !e.resolved).length,
      byCode: byCasCode,
      byCategory,
    };
  }

  /**
   * Clear all tracked errors
   */
  clearErrors(): void {
    this.errorTracker.clear();
  }

  /**
   * Create error context from request
   */
  createRequestContext(req: Request): Record<string, any> {
    return {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      url: req.originalUrl,
      userId: (req as any).user?.id,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      timestamp: new Date(),
    };
  }

  /**
   * Convert error to response
   */
  errorToResponse(error: any, requestId?: string) {
    let appError: AppError;

    if (error instanceof AppError) {
      appError = error;
      appError.requestId = requestId;
    } else if (error instanceof Error) {
      appError = new AppError(
        500,
        error.message,
        'An unexpected error occurred',
        ErrorCode.INTERNAL_SERVER_ERROR,
        undefined,
        error.stack
      );
      appError.requestId = requestId;
    } else {
      appError = new AppError(
        500,
        'Unknown error',
        'An unknown error occurred',
        ErrorCode.INTERNAL_SERVER_ERROR
      );
      appError.requestId = requestId;
    }

    return {
      success: false,
      error: {
        code: appError.code,
        message: appError.message,
        category: getErrorCategory(appError.code),
        statusCode: appError.statusCode,
        timestamp: appError.timestamp.toISOString(),
        requestId: requestId,
        details: process.env.NODE_ENV === 'development' ? appError.details : undefined,
        stack: this.config.sendStackTrace ? appError.stack : undefined,
        retryable: appError.retryable,
      },
    };
  }
}

export const errorBoundary = new ErrorBoundaryService({
  captureStack: true,
  logErrors: true,
  sendStackTrace: process.env.NODE_ENV === 'development',
});

export default errorBoundary;
