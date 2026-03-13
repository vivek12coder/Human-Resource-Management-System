import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env";
import User from "../modules/user/user.model";

/* ============================= */
/*     JWT AUTH MIDDLEWARE       */
/* ============================= */

export interface JwtPayload {
  id: string;
  role: string;
  iat: number;
  exp: number;
}

/**
 * Verify JWT Token and attach user to res.locals.user
 */
export const verifyToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: No token provided",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    // Fetch user from DB
    const user = await User.findById(decoded.id)
      .select("-password -__v")
      .lean();

    if (!user || user.isDeleted) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: User not found",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Your account is deactivated",
      });
    }

    // Attach user to res.locals
    res.locals.user = user;
    next();
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Token expired",
      });
    }
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid token",
    });
  }
};

/**
 * Role-based authorization middleware
 * @param allowedRoles - Array of roles allowed to access the route
 */
export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = res.locals.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Please login first",
      });
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Only ${allowedRoles.join(", ")} can access this resource`,
      });
    }

    next();
  };
};

/**
 * Check if user has specific permission (for JUNIOR_ADMIN)
 * @param requiredPermission - Permission required to access the route
 */
export const checkPermission = (requiredPermission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = res.locals.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Please login first",
      });
    }

    // SUPER_ADMIN, ADMIN, BRANCH_ADMIN, and HR have all permissions
    if (
      user.role === "SUPER_ADMIN" ||
      user.role === "ADMIN" ||
      user.role === "BRANCH_ADMIN" ||
      user.role === "HR"
    ) {
      return next();
    }

    // Backward compatibility:
    // Treat JUNIOR_ADMIN as branch-level admin for employee list view.
    // This prevents UI breakage for old accounts where EMPLOYEE_VIEW was not assigned.
    if (
      user.role === "JUNIOR_ADMIN" &&
      requiredPermission === "EMPLOYEE_VIEW"
    ) {
      return next();
    }

    // Check specific permission for JUNIOR_ADMIN
    if (
      user.permissions &&
      (user.permissions.includes("ALL") ||
        user.permissions.includes(requiredPermission))
    ) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Forbidden: You don't have '${requiredPermission}' permission`,
    });
  };
};

