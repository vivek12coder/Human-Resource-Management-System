import rateLimit from "express-rate-limit";

/* ============================= */
/*      RATE LIMITING CONFIG     */
/* ============================= */

// General API rate limiter - applies to all API routes
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: {
    success: false,
    message: "Too many requests from this IP",
    error: "Please try again after 15 minutes"
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for health checks
  skip: (req) => req.path === '/api/health',
});

// Strict rate limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit auth attempts to 30 per 15 minutes per IP (supports token refresh)
  message: {
    success: false,
    message: "Too many authentication attempts",
    error: "Please try again after 15 minutes. For security, auth attempts are limited."
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Apply to login, register, and token refresh endpoints
  skipSuccessfulRequests: false, // Count all attempts to prevent token refresh abuse
});

// Very strict limiter for password change/reset
export const passwordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Only 5 password changes per hour per IP
  message: {
    success: false,
    message: "Too many password change attempts",
    error: "For security reasons, password changes are limited to 5 per hour"
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Moderate limiter for data creation operations
export const createLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20, // 20 create operations per 10 minutes
  message: {
    success: false,
    message: "Too many create operations",
    error: "Please wait before creating more records"
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limiter for search/query operations
export const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 searches per minute per IP
  message: {
    success: false,
    message: "Too many search requests",
    error: "Please slow down your search requests"
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limiter for file uploads (if any)
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 file uploads per 15 minutes
  message: {
    success: false,
    message: "Too many file uploads",
    error: "Please wait before uploading more files"
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limiter for face recognition endpoints (computationally expensive)
export const faceLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // 5 face operations per minute (face enrollment/recognition)
  message: {
    success: false,
    message: "Too many face recognition requests",
    error: "Face recognition operations are limited for performance reasons"
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Export all limiters
export const RateLimiters = {
  apiLimiter,
  authLimiter,
  passwordLimiter,
  createLimiter,
  searchLimiter,
  uploadLimiter,
  faceLimiter
};