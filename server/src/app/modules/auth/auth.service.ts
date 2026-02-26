import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import UserModel from "../user/user.model";
import { IUserLogin, IUserRegister } from "./auth.types";
import { JWT_SECRET, JWT_REFRESH_SECRET } from "../../config/env";
import AppError from "../../errors/AppError";
import { HttpStatusCode } from "axios";
import RefreshTokenModel from "./refreshToken.model";

/* ============================= */
/*     TOKEN HELPER FUNCTIONS    */
/* ============================= */

function generateTokens(userId: string, role: string) {
  const accessToken = jwt.sign({ id: userId, role }, JWT_SECRET, { expiresIn: "1h" });
  const refreshToken = jwt.sign({ id: userId }, JWT_REFRESH_SECRET, { expiresIn: "7d" });
  return { accessToken, refreshToken };
}

async function saveRefreshToken(userId: string, token: string) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await RefreshTokenModel.create({ user: userId, token, expiresAt });
}

export class AuthService {
  /* =============================
          REGISTER USER
     ============================= */
  static async registerUser(payload: IUserRegister) {
    const { name, email, password, phone, role, company } = payload;

    const existingUser = await UserModel.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new AppError(HttpStatusCode.BadRequest, "Registration Failed", "User with this email already exists!");
    }

    if ((role as string) === "SUPER_ADMIN") {
      throw new AppError(HttpStatusCode.Forbidden, "Registration Failed", "Cannot register as SUPER_ADMIN!");
    }

    if (role === "ADMIN" && !company) {
      throw new AppError(HttpStatusCode.BadRequest, "Registration Failed", "Company is required for Admin registration!");
    }

    const newUser = await UserModel.create({
      name,
      email: email.toLowerCase(),
      password,
      phone,
      role: role || "EMPLOYEE",
      company,
      isActive: true,
      isDeleted: false,
    });

    const { accessToken, refreshToken } = generateTokens(newUser._id.toString(), newUser.role);
    await saveRefreshToken(newUser._id.toString(), refreshToken);

    const userObj = newUser.toObject();
    delete (userObj as any).password;

    return { user: userObj, accessToken, refreshToken };
  }

  /* =============================
          LOGIN USER
     ============================= */
  static async loginUser(payload: IUserLogin) {
    const { email, password } = payload;

    const user = await UserModel.findOne({
      email: email.toLowerCase(),
      isDeleted: false,
    }).select("+password");

    if (!user) {
      throw new AppError(HttpStatusCode.Unauthorized, "Login Failed", "Invalid email or password!");
    }

    if (!user.isActive) {
      throw new AppError(HttpStatusCode.Forbidden, "Login Failed", "Your account is deactivated. Please contact admin.");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new AppError(HttpStatusCode.Unauthorized, "Login Failed", "Invalid email or password!");
    }

    const { accessToken, refreshToken } = generateTokens(user._id.toString(), user.role);
    await saveRefreshToken(user._id.toString(), refreshToken);

    const userObj = user.toObject();
    delete (userObj as any).password;

    return { user: userObj, accessToken, refreshToken };
  }

  /* =============================
          REFRESH TOKEN
     ============================= */
  static async refreshToken(incomingRefreshToken: string) {
    try {
      // 1. Verify JWT signature
      const payload: any = jwt.verify(incomingRefreshToken, JWT_REFRESH_SECRET);

      // 2. Check token exists in DB (not logged out)
      const storedToken = await RefreshTokenModel.findOne({ token: incomingRefreshToken });
      if (!storedToken) {
        throw new AppError(HttpStatusCode.Unauthorized, "Token Error", "Refresh token has been revoked. Please login again.");
      }

      const user = await UserModel.findById(payload.id);
      if (!user || user.isDeleted) {
        throw new AppError(HttpStatusCode.Unauthorized, "Token Error", "Invalid refresh token!");
      }

      if (!user.isActive) {
        throw new AppError(HttpStatusCode.Forbidden, "Token Error", "Your account is deactivated!");
      }

      // 3. Rotate: delete old token, save new one
      await RefreshTokenModel.deleteOne({ token: incomingRefreshToken });
      const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id.toString(), user.role);
      await saveRefreshToken(user._id.toString(), newRefreshToken);

      return { accessToken, refreshToken: newRefreshToken };
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw new AppError(HttpStatusCode.Unauthorized, "Token Error", "Invalid or expired refresh token!");
    }
  }

  /* =============================
          LOGOUT USER
     ============================= */
  static async logoutUser(refreshToken: string) {
    if (refreshToken) {
      // Remove from DB to invalidate it
      await RefreshTokenModel.deleteOne({ token: refreshToken });
    }
  }

  /* =============================
          GET CURRENT USER
     ============================= */
  static async getCurrentUser(userId: string) {
    const user = await UserModel.findById(userId)
      .select("-password -__v")
      .populate("company", "name code")
      .populate("branch", "name code")
      .lean();

    if (!user || user.isDeleted) {
      throw new AppError(HttpStatusCode.NotFound, "User Error", "User not found!");
    }

    return user;
  }

  /* =============================
          CHANGE PASSWORD
     ============================= */
  static async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await UserModel.findById(userId).select("+password");

    if (!user) {
      throw new AppError(HttpStatusCode.NotFound, "User Error", "User not found!");
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      throw new AppError(HttpStatusCode.BadRequest, "Password Error", "Current password is incorrect!");
    }

    user.password = newPassword;
    await user.save();

    // Invalidate all existing refresh tokens for security
    await RefreshTokenModel.deleteMany({ user: userId });

    return { message: "Password changed successfully" };
  }

  /* =============================
          SWITCH USER (SUPER ADMIN)
     ============================= */
  static async switchUser(superAdminId: string, targetUserId: string) {
    const superAdmin = await UserModel.findById(superAdminId).select("-password").lean();

    if (!superAdmin || superAdmin.isDeleted || !superAdmin.isActive) {
      throw new AppError(HttpStatusCode.Unauthorized, "Switch Failed", "Unauthorized super admin session");
    }

    if (superAdmin.role !== "SUPER_ADMIN") {
      throw new AppError(HttpStatusCode.Forbidden, "Switch Failed", "Only super admin can switch accounts");
    }

    const targetUser = await UserModel.findById(targetUserId)
      .select("-password -__v")
      .populate("company", "name code")
      .populate("branch", "name code")
      .lean();

    if (!targetUser || targetUser.isDeleted) {
      throw new AppError(HttpStatusCode.NotFound, "Switch Failed", "Target user not found");
    }

    if (!targetUser.isActive) {
      throw new AppError(HttpStatusCode.Forbidden, "Switch Failed", "Target user is inactive");
    }

    if (targetUser.role === "SUPER_ADMIN") {
      throw new AppError(HttpStatusCode.BadRequest, "Switch Failed", "Cannot switch into another SUPER_ADMIN");
    }

    const { accessToken, refreshToken } = generateTokens(targetUser._id.toString(), targetUser.role);
    await saveRefreshToken(targetUser._id.toString(), refreshToken);

    return { user: targetUser, accessToken, refreshToken };
  }
}
