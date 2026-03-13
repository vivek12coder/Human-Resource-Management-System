import { Router } from "express";
import { AuthController } from "./auth.controller";
import {
  loginValidationSchema,
  refreshTokenValidationSchema,
  changePasswordValidationSchema,
} from "./auth.validation";
import { validateRequest } from "../../middleware/validateRequest";  // Fixed import path
import { authorizeRoles, verifyToken } from "../../middleware/jwtAuth.middleware";
import { RateLimiters } from "../../middleware/rateLimiter.middleware";
import UserModel from "../user/user.model";

const router = Router();

/**
 * @swagger
 * /api/auth/check:
 *   get:
 *     summary: Health check for authentication service
 *     description: Simple endpoint to verify authentication service is running
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Authentication service is working
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: "Auth API working"
 */
router.get("/check", (_req, res) => res.send("Auth API working"));

/**
 * @swagger
 * /api/auth/debug/users:
 *   get:
 *     summary: Debug endpoint to list all users (Development only)
 *     description: Returns basic information about all users in the system. This endpoint should only be available in development environments.
 *     tags: [Authentication, Debug]
 *     responses:
 *       200:
 *         description: List of all users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 5
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: "507f1f77bcf86cd799439011"
 *                       name:
 *                         type: string
 *                         example: "John Doe"
 *                       email:
 *                         type: string
 *                         example: "john.doe@example.com"
 *                       role:
 *                         type: string
 *                         example: "ADMIN"
 *                       isActive:
 *                         type: boolean
 *                         example: true
 *                       isDeleted:
 *                         type: boolean
 *                         example: false
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *     security: []
 */
// DEBUG route: keep only for dev environments.
router.get("/debug/users", async (_req, res) => {
  try {
    const users = await UserModel.find({})
      .select("name email role isActive isDeleted")
      .lean();
    res.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User authentication
 *     description: Authenticate user with email and password. Returns access and refresh tokens on successful login. Protected by rate limiting (10 requests per 15 minutes).
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           examples:
 *             admin:
 *               summary: Admin user login
 *               value:
 *                 email: "admin@example.com"
 *                 password: "password123"
 *             employee:
 *               summary: Employee user login
 *               value:
 *                 email: "employee@example.com"
 *                 password: "password123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *         headers:
 *           Set-Cookie:
 *             description: Refresh token in httpOnly cookie
 *             schema:
 *               type: string
 *               example: "refreshToken=eyJhbGciOiJIUzI1NiIs...; Path=/; HttpOnly; Secure; SameSite=Strict"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Invalid credentials"
 *               error: "Email or password is incorrect"
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Login with strict rate limiting
router.post(
  "/login",
  RateLimiters.authLimiter,
  validateRequest(loginValidationSchema),
  AuthController.login
);

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     description: Generate new access and refresh tokens using the refresh token from httpOnly cookie. Old refresh token is invalidated. Protected by rate limiting.
 *     tags: [Authentication]
 *     security:
 *       - RefreshToken: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Optional refresh token in request body (cookie is preferred)
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Token refreshed successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     tokens:
 *                       type: object
 *                       properties:
 *                         accessToken:
 *                           type: string
 *                           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                         refreshToken:
 *                           type: string
 *                           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *         headers:
 *           Set-Cookie:
 *             description: New refresh token in httpOnly cookie
 *             schema:
 *               type: string
 *       401:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Invalid refresh token"
 *               error: "Refresh token is invalid or expired"
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Refresh token with auth rate limiting
router.post(
  "/refresh-token",
  RateLimiters.authLimiter,
  validateRequest(refreshTokenValidationSchema),
  AuthController.refreshToken
);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     description: Retrieve the profile information of the currently authenticated user. Includes user details, role, permissions, and associated company/branch information.
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "User profile retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *             examples:
 *               admin:
 *                 summary: Admin user profile
 *                 value:
 *                   success: true
 *                   message: "User profile retrieved successfully"
 *                   data:
 *                     user:
 *                       _id: "507f1f77bcf86cd799439011"
 *                       name: "System Admin"
 *                       email: "admin@example.com"
 *                       role: "ADMIN"
 *                       permissions: ["EMPLOYEE_VIEW", "EMPLOYEE_CREATE", "PAYROLL_GENERATE"]
 *                       company:
 *                         _id: "507f1f77bcf86cd799439012"
 *                         name: "Acme Corporation"
 *                       isActive: true
 *               employee:
 *                 summary: Employee user profile
 *                 value:
 *                   success: true
 *                   message: "User profile retrieved successfully"
 *                   data:
 *                     user:
 *                       _id: "507f1f77bcf86cd799439013"
 *                       name: "John Employee"
 *                       email: "john@example.com"
 *                       role: "EMPLOYEE"
 *                       permissions: ["ATTENDANCE_VIEW"]
 *                       employee:
 *                         _id: "507f1f77bcf86cd799439014"
 *                         employeeId: "EMP2024001"
 *                         firstName: "John"
 *                         lastName: "Employee"
 *                       isActive: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  "/me",
  verifyToken,
  AuthController.getMe
);

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Change user password
 *     description: Change the password for the currently authenticated user. Requires current password for verification. Protected by very strict rate limiting (5 requests per 15 minutes).
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword, confirmPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 minLength: 6
 *                 description: User's current password
 *                 example: "oldPassword123"
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *                 description: New password (minimum 6 characters)
 *                 example: "newPassword123"
 *               confirmPassword:
 *                 type: string
 *                 minLength: 6
 *                 description: Confirmation of new password (must match newPassword)
 *                 example: "newPassword123"
 *           example:
 *             currentPassword: "oldPassword123"
 *             newPassword: "newPassword123"
 *             confirmPassword: "newPassword123"
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: "Password changed successfully"
 *               data: {}
 *       400:
 *         description: Validation error or password mismatch
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               validation:
 *                 summary: Validation error
 *                 value:
 *                   success: false
 *                   message: "Validation failed"
 *                   errors: [
 *                     {
 *                       path: "newPassword",
 *                       message: "New password must be at least 6 characters"
 *                     }
 *                   ]
 *               mismatch:
 *                 summary: Password confirmation mismatch
 *                 value:
 *                   success: false
 *                   message: "Password confirmation does not match"
 *                   error: "newPassword and confirmPassword must be identical"
 *       401:
 *         description: Unauthorized or current password incorrect
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               unauthorized:
 *                 $ref: '#/components/responses/UnauthorizedError'
 *               wrongPassword:
 *                 summary: Current password incorrect
 *                 value:
 *                   success: false
 *                   message: "Current password is incorrect"
 *                   error: "Please verify your current password"
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Password change with very strict rate limiting
router.post(
  "/change-password",
  verifyToken,
  RateLimiters.passwordLimiter,
  validateRequest(changePasswordValidationSchema),
  AuthController.changePassword
);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: User logout
 *     description: Log out the currently authenticated user. Invalidates the refresh token and clears the httpOnly cookie.
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: "Logged out successfully"
 *               data: {}
 *         headers:
 *           Set-Cookie:
 *             description: Clears the refresh token cookie
 *             schema:
 *               type: string
 *               example: "refreshToken=; Path=/; HttpOnly; Secure; SameSite=Strict; Expires=Thu, 01 Jan 1970 00:00:00 GMT"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  "/logout",
  verifyToken,
  AuthController.logout
);

/**
 * @swagger
 * /api/auth/switch-user/{userId}:
 *   post:
 *     summary: Switch to another user account (Admin only)
 *     description: |
 *       Admin users (SUPER_ADMIN or ADMIN roles) can switch to view the system from another user's perspective.
 *       This is useful for troubleshooting and support purposes. The original admin context is preserved
 *       and can be restored. Protected by rate limiting.
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: MongoDB ObjectId of the user to switch to
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Successfully switched to target user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Successfully switched to user"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     originalUser:
 *                       $ref: '#/components/schemas/User'
 *                     tokens:
 *                       type: object
 *                       properties:
 *                         accessToken:
 *                           type: string
 *                           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                         refreshToken:
 *                           type: string
 *                           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *             example:
 *               success: true
 *               message: "Successfully switched to user"
 *               data:
 *                 user:
 *                   _id: "507f1f77bcf86cd799439011"
 *                   name: "John Employee"
 *                   email: "john@example.com"
 *                   role: "EMPLOYEE"
 *                 originalUser:
 *                   _id: "507f1f77bcf86cd799439012"
 *                   name: "Admin User"
 *                   email: "admin@example.com"
 *                   role: "ADMIN"
 *                 tokens:
 *                   accessToken: "eyJhbGciOiJIUzI1NiIs..."
 *                   refreshToken: "eyJhbGciOiJIUzI1NiIs..."
 *         headers:
 *           Set-Cookie:
 *             description: New refresh token in httpOnly cookie
 *             schema:
 *               type: string
 *       400:
 *         description: Invalid user ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Invalid user ID"
 *               error: "User ID must be a valid MongoDB ObjectId"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         description: Target user not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "User not found"
 *               error: "The specified user does not exist or is not active"
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// User switching for admins (with auth rate limiting)
router.post(
  "/switch-user/:userId",
  verifyToken,
  RateLimiters.authLimiter,
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  AuthController.switchUser
);

export default router;
