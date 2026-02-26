// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import { z } from "zod";

/* Validate request using Zod schema */
export const validateRequest = (schema: z.ZodTypeAny) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.errors || error.message,
      });
    }
  };
};

/* Authenticate user */
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const user = res.locals.user; 
  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Please login",
    });
  }
  next();
};

/* Authorize SUPER_ADMIN only */
export const authorizeSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = res.locals.user;
  if (!user || user.role !== "SUPER_ADMIN") {
    return res.status(403).json({
      success: false,
      message: "Forbidden: Only SUPER_ADMIN can perform this action",
    });
  }
  next();
};
