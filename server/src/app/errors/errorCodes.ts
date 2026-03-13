/**
 * Enhanced Error Code System
 * Comprehensive error codes for all application scenarios
 */

export enum ErrorCode {
  // Authentication & Authorization (1000-1099)
  AUTH_REQUIRED = 'AUTH_001',
  INVALID_CREDENTIALS = 'AUTH_002',
  TOKEN_EXPIRED = 'AUTH_003',
  TOKEN_INVALID = 'AUTH_004',
  PERMISSION_DENIED = 'AUTH_005',
  INSUFFICIENT_PERMISSIONS = 'AUTH_006',
  UNAUTHORIZED_RESOURCE = 'AUTH_007',
  SESSION_EXPIRED = 'AUTH_008',

  // Validation Errors (2000-2099)
  VALIDATION_ERROR = 'VAL_001',
  INVALID_INPUT = 'VAL_002',
  MISSING_FIELD = 'VAL_003',
  INVALID_FORMAT = 'VAL_004',
  INVALID_ENUM = 'VAL_005',
  DUPLICATE_ENTRY = 'VAL_006',
  CONSTRAINT_VIOLATION = 'VAL_007',

  // Resource Errors (3000-3099)
  RESOURCE_NOT_FOUND = 'RES_001',
  RESOURCE_DELETED = 'RES_002',
  RESOURCE_LOCKED = 'RES_003',
  RESOURCE_CONFLICT = 'RES_004',
  RESOURCE_ALREADY_EXISTS = 'RES_005',

  // Database Errors (4000-4099)
  DATABASE_ERROR = 'DB_001',
  DATABASE_CONNECTION_ERROR = 'DB_002',
  DATABASE_QUERY_ERROR = 'DB_003',
  DATABASE_TRANSACTION_ERROR = 'DB_004',
  DATABASE_TIMEOUT = 'DB_005',

  // Business Logic Errors (5000-5099)
  BUSINESS_LOGIC_ERROR = 'BUS_001',
  INVALID_STATE = 'BUS_002',
  OPERATION_NOT_ALLOWED = 'BUS_003',
  INSUFFICIENT_BALANCE = 'BUS_004',
  QUOTA_EXCEEDED = 'BUS_005',
  RATE_LIMIT_EXCEEDED = 'BUS_006',

  // External Service Errors (6000-6099)
  EXTERNAL_SERVICE_ERROR = 'EXT_001',
  SERVICE_UNAVAILABLE = 'EXT_002',
  SERVICE_TIMEOUT = 'EXT_003',
  SERVICE_API_ERROR = 'EXT_004',

  // System Errors (7000-7099)
  INTERNAL_SERVER_ERROR = 'SYS_001',
  NOT_IMPLEMENTED = 'SYS_002',
  SERVICE_UNAVAILABLE_ERROR = 'SYS_003',
  CONFIGURATION_ERROR = 'SYS_004',

  // File & Upload Errors (8000-8099)
  FILE_NOT_FOUND = 'FILE_001',
  FILE_TOO_LARGE = 'FILE_002',
  INVALID_FILE_TYPE = 'FILE_003',
  FILE_UPLOAD_ERROR = 'FILE_004',

  // Network Errors (9000-9099)
  NETWORK_ERROR = 'NET_001',
  TIMEOUT = 'NET_002',
  GATEWAY_TIMEOUT = 'NET_003',
}

export enum ErrorCategory {
  AUTHENTICATION = 'AUTHENTICATION',
  VALIDATION = 'VALIDATION',
  RESOURCE = 'RESOURCE',
  DATABASE = 'DATABASE',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  SYSTEM = 'SYSTEM',
  FILE = 'FILE',
  NETWORK = 'NETWORK',
}

export interface ErrorMetadata {
  code: ErrorCode;
  category: ErrorCategory;
  timestamp: Date;
  requestId?: string;
  userId?: string;
  endpoint?: string;
  method?: string;
  details?: Record<string, any>;
  stack?: string;
  retryable: boolean;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    category: string;
    timestamp: string;
    requestId?: string;
    details?: Record<string, any>;
  };
}

/**
 * Get category from error code
 */
export function getErrorCategory(code: ErrorCode): ErrorCategory {
  if (code.startsWith('AUTH')) return ErrorCategory.AUTHENTICATION;
  if (code.startsWith('VAL')) return ErrorCategory.VALIDATION;
  if (code.startsWith('RES')) return ErrorCategory.RESOURCE;
  if (code.startsWith('DB')) return ErrorCategory.DATABASE;
  if (code.startsWith('BUS')) return ErrorCategory.BUSINESS_LOGIC;
  if (code.startsWith('EXT')) return ErrorCategory.EXTERNAL_SERVICE;
  if (code.startsWith('SYS')) return ErrorCategory.SYSTEM;
  if (code.startsWith('FILE')) return ErrorCategory.FILE;
  if (code.startsWith('NET')) return ErrorCategory.NETWORK;
  return ErrorCategory.SYSTEM;
}

/**
 * Determine if error is retryable
 */
export function isRetryableError(code: ErrorCode): boolean {
  const retryableCodes = [
    ErrorCode.DATABASE_TIMEOUT,
    ErrorCode.DATABASE_CONNECTION_ERROR,
    ErrorCode.SERVICE_TIMEOUT,
    ErrorCode.EXTERNAL_SERVICE_ERROR,
    ErrorCode.TIMEOUT,
    ErrorCode.NETWORK_ERROR,
    ErrorCode.GATEWAY_TIMEOUT,
  ];
  return retryableCodes.includes(code);
}

/**
 * Get HTTP status code from error code
 */
export function getHttpStatusCode(code: ErrorCode): number {
  if (code.startsWith('AUTH')) return 401; // Unauthorized
  if (code === ErrorCode.PERMISSION_DENIED || code === ErrorCode.INSUFFICIENT_PERMISSIONS)
    return 403; // Forbidden
  if (code.startsWith('VAL')) return 400; // Bad Request
  if (code.startsWith('RES')) {
    if (code === ErrorCode.RESOURCE_NOT_FOUND) return 404;
    if (code === ErrorCode.RESOURCE_CONFLICT) return 409;
    return 404;
  }
  if (code.startsWith('DB')) return 500; // Internal Server Error
  if (code.startsWith('BUS')) {
    if (code === ErrorCode.RATE_LIMIT_EXCEEDED) return 429;
    return 400;
  }
  if (code.startsWith('EXT')) return 502; // Bad Gateway
  if (code.startsWith('FILE')) {
    if (code === ErrorCode.FILE_NOT_FOUND) return 404;
    if (code === ErrorCode.FILE_TOO_LARGE) return 413;
    return 400;
  }
  if (code === ErrorCode.TIMEOUT || code === ErrorCode.GATEWAY_TIMEOUT)
    return 504;
  if (code.startsWith('NET')) return 503; // Service Unavailable
  return 500; // Internal Server Error
}

export default {
  ErrorCode,
  ErrorCategory,
  getErrorCategory,
  isRetryableError,
  getHttpStatusCode,
};
