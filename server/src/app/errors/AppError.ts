import { ErrorCode, getErrorCategory, isRetryableError, getHttpStatusCode } from './errorCodes';

class AppError extends Error {
  public code: ErrorCode;
  public statusCode: number;
  public message: string;
  public errorMessage: string;
  public details?: Record<string, any>;
  public requestId?: string;
  public timestamp: Date;
  public retryable: boolean;

  constructor(
    statusCode: number,
    message: string,
    errorMessage?: string,
    code: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR,
    details?: Record<string, any>,
    stack?: string
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode || getHttpStatusCode(code);
    this.message = message;
    this.errorMessage = errorMessage || message;
    this.details = details;
    this.timestamp = new Date();
    this.retryable = isRetryableError(code);

    // Set stack trace
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }

    // Set name for better error identification
    this.name = `AppError[${code}]`;
  }

  /**
   * Create validation error
   */
  static validation(message: string, details?: Record<string, any>, requestId?: string): AppError {
    const error = new AppError(
      400,
      message,
      'Validation error',
      ErrorCode.VALIDATION_ERROR,
      details
    );
    error.requestId = requestId;
    return error;
  }

  /**
   * Create not found error
   */
  static notFound(resource: string, requestId?: string): AppError {
    const error = new AppError(
      404,
      `${resource} not found`,
      `The requested ${resource} does not exist`,
      ErrorCode.RESOURCE_NOT_FOUND
    );
    error.requestId = requestId;
    return error;
  }

  /**
   * Create authentication error
   */
  static unauthorized(message: string = 'Authentication required', requestId?: string): AppError {
    const error = new AppError(
      401,
      message,
      'Invalid or missing authentication credentials',
      ErrorCode.AUTH_REQUIRED
    );
    error.requestId = requestId;
    return error;
  }

  /**
   * Create forbidden error
   */
  static forbidden(message: string = 'Access denied', requestId?: string): AppError {
    const error = new AppError(
      403,
      message,
      'You do not have permission to perform this action',
      ErrorCode.INSUFFICIENT_PERMISSIONS
    );
    error.requestId = requestId;
    return error;
  }

  /**
   * Create conflict error
   */
  static conflict(message: string, details?: Record<string, any>, requestId?: string): AppError {
    const error = new AppError(
      409,
      message,
      'Resource conflict or already exists',
      ErrorCode.RESOURCE_CONFLICT,
      details
    );
    error.requestId = requestId;
    return error;
  }

  /**
   * Create rate limit error
   */
  static rateLimitExceeded(message: string = 'Too many requests', requestId?: string): AppError {
    const error = new AppError(
      429,
      message,
      'Rate limit exceeded. Please try again later',
      ErrorCode.RATE_LIMIT_EXCEEDED
    );
    error.requestId = requestId;
    return error;
  }

  /**
   * Create database error
   */
  static database(message: string, details?: Record<string, any>, requestId?: string): AppError {
    const error = new AppError(
      500,
      message,
      'Database operation failed',
      ErrorCode.DATABASE_ERROR,
      details
    );
    error.requestId = requestId;
    return error;
  }

  /**
   * Create timeout error
   */
  static timeout(message: string = 'Request timeout', requestId?: string): AppError {
    const error = new AppError(
      504,
      message,
      'Operation took too long to complete',
      ErrorCode.TIMEOUT
    );
    error.requestId = requestId;
    return error;
  }

  /**
   * Get error as JSON response
   */
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      errorMessage: this.errorMessage,
      category: getErrorCategory(this.code),
      statusCode: this.statusCode,
      details: this.details,
      retryable: this.retryable,
      timestamp: this.timestamp,
      requestId: this.requestId,
    };
  }
}

export default AppError;
