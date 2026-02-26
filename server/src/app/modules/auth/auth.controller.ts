import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { IUserLogin, IUserRegister, IChangePassword } from "./auth.types";

/* ============================= */
/*     COOKIE CONFIG             */
/* ============================= */

const REFRESH_TOKEN_COOKIE = "hrm_refresh_token";

const cookieOptions = {
  httpOnly: true,           // not accessible via JS — blocks XSS
  sameSite: "strict" as const, // CSRF protection
  secure: process.env.NODE_ENV === "production", // HTTPS only in prod
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: "/",
};

export class AuthController {
  /* =============================
          REGISTER USER
     ============================= */
  static async register(req: Request, res: Response) {
    try {
      const payload: IUserRegister = req.body;
      const { user, accessToken, refreshToken } = await AuthService.registerUser(payload);

      // Set refresh token as httpOnly cookie
      res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, cookieOptions);

      res.status(201).json({
        success: true,
        message: "Registration successful ✅",
        data: {
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            permissions: (user as any).permissions,
          },
          tokens: { accessToken }, // refreshToken only in cookie, NOT in body
        },
      });
    } catch (err: any) {
      const statusCode = err.statusCode || 400;
      res.status(statusCode).json({
        success: false,
        message: err.errorMessage || err.message || "Registration failed",
      });
    }
  }

  /* =============================
          LOGIN USER
     ============================= */
  static async login(req: Request, res: Response) {
    try {
      const payload: IUserLogin = req.body;
      const { user, accessToken, refreshToken } = await AuthService.loginUser(payload);

      // Set refresh token as httpOnly cookie
      res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, cookieOptions);

      res.status(200).json({
        success: true,
        message: "Login successful ✅",
        data: {
          user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            company: user.company,
            permissions: user.permissions,
          },
          tokens: { accessToken }, // refreshToken only in cookie, NOT in body
        },
      });
    } catch (err: any) {
      const statusCode = err.statusCode || 401;
      res.status(statusCode).json({
        success: false,
        message: err.errorMessage || err.message || "Login failed",
      });
    }
  }

  /* =============================
          REFRESH TOKEN
     ============================= */
  static async refreshToken(req: Request, res: Response) {
    try {
      // Read from cookie first, fallback to body (backward compat)
      const incomingToken = (req as any).cookies?.[REFRESH_TOKEN_COOKIE] || req.body?.refreshToken;

      if (!incomingToken) {
        return res.status(401).json({
          success: false,
          message: "Refresh token is required",
        });
      }

      const { accessToken, refreshToken: newRefreshToken } = await AuthService.refreshToken(incomingToken);

      // Rotate: set new refresh token cookie
      res.cookie(REFRESH_TOKEN_COOKIE, newRefreshToken, cookieOptions);

      res.status(200).json({
        success: true,
        message: "Token refreshed ✅",
        data: { tokens: { accessToken } },
      });
    } catch (err: any) {
      const statusCode = err.statusCode || 401;
      // Clear invalid cookie
      res.clearCookie(REFRESH_TOKEN_COOKIE, { path: "/" });
      res.status(statusCode).json({
        success: false,
        message: err.errorMessage || err.message || "Invalid refresh token",
      });
    }
  }

  /* =============================
          GET CURRENT USER (ME)
     ============================= */
  static async getMe(_req: Request, res: Response) {
    try {
      const loggedInUser = res.locals.user;

      if (!loggedInUser) {
        return res.status(401).json({ success: false, message: "Unauthorized: Please login" });
      }

      const user = await AuthService.getCurrentUser(loggedInUser._id);

      res.status(200).json({
        success: true,
        message: "User fetched successfully",
        data: { user },
      });
    } catch (err: any) {
      const statusCode = err.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        message: err.errorMessage || err.message || "Failed to get user",
      });
    }
  }

  /* =============================
          CHANGE PASSWORD
     ============================= */
  static async changePassword(req: Request, res: Response) {
    try {
      const loggedInUser = res.locals.user;
      const { oldPassword, newPassword, confirmPassword } = req.body as IChangePassword;

      if (!loggedInUser) {
        return res.status(401).json({ success: false, message: "Unauthorized: Please login" });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({ success: false, message: "New password and confirm password do not match" });
      }

      await AuthService.changePassword(loggedInUser._id, oldPassword, newPassword);

      // Clear refresh token cookie — force re-login after password change
      res.clearCookie(REFRESH_TOKEN_COOKIE, { path: "/" });

      res.status(200).json({ success: true, message: "Password changed successfully ✅" });
    } catch (err: any) {
      const statusCode = err.statusCode || 400;
      res.status(statusCode).json({
        success: false,
        message: err.errorMessage || err.message || "Failed to change password",
      });
    }
  }

  /* =============================
          LOGOUT
     ============================= */
  static async logout(req: Request, res: Response) {
    try {
      const refreshToken = (req as any).cookies?.[REFRESH_TOKEN_COOKIE] || req.body?.refreshToken;
      await AuthService.logoutUser(refreshToken || "");
    } catch {
      // silently ignore errors during logout
    } finally {
      res.clearCookie(REFRESH_TOKEN_COOKIE, { path: "/" });
      res.status(200).json({ success: true, message: "Logged out successfully ✅" });
    }
  }

  /* =============================
          SWITCH USER (SUPER ADMIN)
     ============================= */
  static async switchUser(req: Request, res: Response) {
    try {
      const loggedInUser = res.locals.user;
      const rawUserId = req.params.userId;
      const targetUserId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;

      if (!loggedInUser) {
        return res.status(401).json({ success: false, message: "Unauthorized: Please login" });
      }

      if (!targetUserId) {
        return res.status(400).json({ success: false, message: "Target user ID is required" });
      }

      const { user, accessToken, refreshToken } = await AuthService.switchUser(loggedInUser._id.toString(), targetUserId);

      // Set switched user's refresh token as cookie
      res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, cookieOptions);

      return res.status(200).json({
        success: true,
        message: "Switched user successfully",
        data: { user, accessToken },
      });
    } catch (err: any) {
      const statusCode = err.statusCode || 400;
      return res.status(statusCode).json({
        success: false,
        message: err.errorMessage || err.message || "Failed to switch user",
      });
    }
  }
}
