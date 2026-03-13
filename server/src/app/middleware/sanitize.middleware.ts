import { Request, Response, NextFunction } from "express";

/**
 * Middleware to sanitize request data and prevent NoSQL injection attacks
 * Removes or escapes MongoDB query operators from user input
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Recursively sanitize objects
    const sanitizeObject = (obj: any): any => {
      if (obj === null || typeof obj !== "object") {
        return obj;
      }

      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }

      const sanitized: any = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          // Remove keys that start with $ (MongoDB operators)
          if (typeof key === "string" && key.startsWith("$")) {
            console.warn(`Potential NoSQL injection attempt detected: ${key}`);
            continue; // Skip this key entirely
          }

          // Recursively sanitize nested objects
          sanitized[key] = sanitizeObject(obj[key]);

          // Additional string sanitization
          if (typeof sanitized[key] === "string") {
            // Remove null bytes that could be used for injection
            sanitized[key] = sanitized[key].replace(/\0/g, "");

            // Escape regex special characters if it looks like a regex attempt
            if (sanitized[key].includes(".*") || sanitized[key].includes("$")) {
              sanitized[key] = sanitized[key].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            }
          }
        }
      }
      return sanitized;
    };

    // Sanitize request body
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters (modify in place since query is read-only)
    if (req.query) {
      const sanitizedQuery = sanitizeObject(req.query);
      // Clear existing properties and set sanitized ones
      for (const key in req.query) {
        if (Object.prototype.hasOwnProperty.call(req.query, key)) {
          delete (req.query as any)[key];
        }
      }
      // Add sanitized properties
      for (const key in sanitizedQuery) {
        if (Object.prototype.hasOwnProperty.call(sanitizedQuery, key)) {
          (req.query as any)[key] = sanitizedQuery[key];
        }
      }
    }

    // Sanitize URL parameters
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }

    next();
  } catch (error) {
    console.error("Error in sanitizeInput middleware:", error);
    return res.status(400).json({
      success: false,
      message: "Invalid request data",
      error: "Request contains potentially malicious content"
    });
  }
};

/**
 * Stricter sanitization for search queries
 * Use this for search endpoints that are more vulnerable to injection
 */
export const sanitizeSearchInput = (req: Request, res: Response, next: NextFunction) => {
  try {
    const sanitizeSearchString = (str: string): string => {
      if (typeof str !== "string") return str;

      // Remove MongoDB operators
      str = str.replace(/\$[a-zA-Z]+/g, "");

      // Remove regex operators
      str = str.replace(/[.*+?^${}()|[\]\\]/g, "");

      // Remove null bytes and control characters
      str = str.replace(/[\x00-\x1F\x7F]/g, "");

      // Limit length to prevent buffer overflow
      str = str.substring(0, 100);

      return str;
    };

    // Apply strict sanitization to search-related query params
    if (req.query.search) {
      (req.query as any).search = sanitizeSearchString(req.query.search as string);
    }

    if (req.query.q) {
      (req.query as any).q = sanitizeSearchString(req.query.q as string);
    }

    if (req.body?.search) {
      req.body.search = sanitizeSearchString(req.body.search);
    }

    next();
  } catch (error) {
    console.error("Error in sanitizeSearchInput middleware:", error);
    return res.status(400).json({
      success: false,
      message: "Invalid search parameters",
      error: "Search contains invalid characters"
    });
  }
};