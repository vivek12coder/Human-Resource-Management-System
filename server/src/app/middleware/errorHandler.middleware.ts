import { Request, Response, NextFunction } from 'express';
import AppError from '../errors/AppError';
import { errorBoundary } from '../errors/errorBoundary';
import { ErrorCode, getErrorCategory, getHttpStatusCode } from '../errors/errorCodes';
import logger from '../utils/logger';
import { appLogger, securityLogger } from '../utils/logger';

// Enhanced error interface
interface EnhancedError extends Error {
  statusCode?: number;
  status?: string;
  isOperational?: boolean;
  code?: number;
  keyPattern?: any;
  keyValue?: any;
  value?: any;
  path?: string;
}

// Send error response in development
const sendErrorDev = (err: EnhancedError | AppError, req: Request, res: Response) => {
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : (err.statusCode || 500);

  logger.error('Development Error', {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    error: err.message,
    code: isAppError ? err.code : undefined,
    stack: err.stack,
  });

  res.status(statusCode).json({
    success: false,
    error: isAppError ? err.toJSON() : {
      message: err.message,
      stack: err.stack,
      name: err.name,
    },
    requestId: req.requestId,
  });
};

// Send error response in production
const sendErrorProd = (err: EnhancedError | AppError, req: Request, res: Response) => {
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : (err.statusCode || 500);

  if (isAppError || err.isOperational) {
    // Operational, trusted error: send message to client
    logger.warn('Operational Error', {
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      code: isAppError ? err.code : undefined,
      message: err.message,
      statusCode,
    });

    res.status(statusCode).json(
      isAppError ? {
        success: false,
        error: {
          code: err.code,
          message: err.message,
          category: getErrorCategory(err.code),
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
          retryable: err.retryable,
        },
      } : {
        success: false,
        message: err.message,
        requestId: req.requestId,
      }
    );
  } else {
    // Programming or unknown error: log error and send generic message
    logger.error('Programming Error', {
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      message: err.message,
      stack: err.stack,
    });

    res.status(500).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'An internal server error occurred',
        category: getErrorCategory(ErrorCode.INTERNAL_SERVER_ERROR),
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      },
    });
  }
};

// Handle MongoDB cast errors
const handleCastErrorDB = (err: EnhancedError): AppError => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(
    400,
    'Invalid data format',
    message,
    ErrorCode.INVALID_FORMAT
  );
};

// Handle MongoDB duplicate field errors
const handleDuplicateFieldsDB = (err: EnhancedError): AppError => {
  const field = err.keyValue ? Object.keys(err.keyValue)[0] : 'field';
  const value = err.keyValue ? err.keyValue[field] : 'value';
  return new AppError(
    409,
    `${field} already exists`,
    `A record with this ${field} (${value}) already exists. Please use a different value.`,
    ErrorCode.RESOURCE_CONFLICT,
    { field, value }
  );
};

// Handle MongoDB validation errors
const handleValidationErrorDB = (err: EnhancedError): AppError => {
  const errorMessages = Object.values(err)
    .map((el: any) => el?.message || JSON.stringify(el))
    .filter(Boolean);
  const message = `Validation failed: ${errorMessages.join(', ')}`;
  return new AppError(
    400,
    'Validation error',
    message,
    ErrorCode.VALIDATION_ERROR,
    { errors: errorMessages }
  );
};

// Handle JWT errors
const handleJWTError = (req: Request): AppError => {
  securityLogger.loginAttempt(
    'unknown',
    false,
    req.ip || req.connection.remoteAddress || 'unknown',
    req.requestId
  );
  return new AppError(
    401,
    'Invalid authentication token',
    'Your authentication token is invalid or malformed. Please log in again.',
    ErrorCode.TOKEN_INVALID
  );
};

// Handle JWT expired error
const handleJWTExpiredError = (req: Request): AppError => {
  securityLogger.loginAttempt(
    'unknown',
    false,
    req.ip || req.connection.remoteAddress || 'unknown',
    req.requestId
  );
  return new AppError(
    401,
    'Authentication token expired',
    'Your authentication token has expired. Please log in again.',
    ErrorCode.TOKEN_EXPIRED
  );
};

// Handle rate limiting errors
const handleRateLimitError = (req: Request): AppError => {
  securityLogger.suspiciousActivity(
    'Rate limit exceeded',
    (req as any).user?.id,
    req.ip || req.connection.remoteAddress,
    req.requestId
  );

  return new AppError(
    429,
    'Too many requests',
    'You have sent too many requests in a short period. Please try again later.',
    ErrorCode.RATE_LIMIT_EXCEEDED
  );
};

// Main error handling middleware
export const globalErrorHandler = (
  err: EnhancedError | AppError | Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Track error in boundary
    const errorId = errorBoundary.trackError(err, errorBoundary.createRequestContext(req));

    // Initialize error properties
    if (!res.locals) res.locals = {};
    if (!res.locals.errorId) res.locals.errorId = errorId;

    // Default error handling
    if (!(err instanceof AppError)) {
      const newErr: EnhancedError = err as any;
      newErr.statusCode = newErr.statusCode || 500;
      newErr.status = newErr.status || 'error';

      // Parse and transform different error types
      if (newErr.name === 'CastError') {
        err = handleCastErrorDB(newErr);
      } else if ((newErr as any).code === 11000) {
        err = handleDuplicateFieldsDB(newErr);
      } else if (newErr.name === 'ValidationError') {
        err = handleValidationErrorDB(newErr);
      } else if (newErr.name === 'JsonWebTokenError') {
        err = handleJWTError(req);
      } else if (newErr.name === 'TokenExpiredError') {
        err = handleJWTExpiredError(req);
      } else if (newErr.statusCode === 429) {
        err = handleRateLimitError(req);
      }
    }

    // Log security-relevant errors
    if ((err as any).statusCode === 401 || (err as any).statusCode === 403) {
      securityLogger.accessDenied(
        (req as any).user?.id || 'anonymous',
        req.originalUrl,
        req.ip || req.connection.remoteAddress || 'unknown',
        req.requestId
      );
    }

    // Send appropriate response
    if (process.env.NODE_ENV === 'development') {
      sendErrorDev(err, req, res);
    } else {
      sendErrorProd(err, req, res);
    }
  } catch (handlerError) {
    // Fallback error handling
    logger.error('Error handler failed', {
      originalError: String(err),
      handlerError: String(handlerError),
      requestId: req.requestId,
    });

    res.status(500).json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'An internal server error occurred',
        timestamp: new Date().toISOString(),
        requestId: req.requestId,
      },
    });
  }
};

// Async error wrapper
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
