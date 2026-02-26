import { Types } from "mongoose";

/* =============================
        AUTH INTERFACES
   ============================= */

export interface IUserRegister {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: "ADMIN" | "JUNIOR_ADMIN" | "EMPLOYEE";
  company?: Types.ObjectId | string;
}

export interface IUserLogin {
  email: string;
  password: string;
}

export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface IRefreshTokenRequest {
  refreshToken: string;
}

export interface IChangePassword {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}
