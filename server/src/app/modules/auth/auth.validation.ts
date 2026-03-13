import { z } from "zod";
import mongoose from "mongoose";

/* =============================
        REGISTER VALIDATION
   ============================= */
export const registerValidationSchema = z.object({
  body: z.object({
    name: z
      .string({ message: "Name is required" })
      .min(2, { message: "Name must be at least 2 characters" })
      .max(50, { message: "Name must be less than 50 characters" })
      .trim(),
    email: z
      .string({ message: "Email is required" })
      .email({ message: "Invalid email address" })
      .trim(),
    password: z
      .string({ message: "Password is required" })
      .min(6, { message: "Password must be at least 6 characters" })
      .max(100, { message: "Password must be less than 100 characters" }),
    phone: z
      .string()
      .optional()
      .nullable(),
    role: z
      .enum(["ADMIN", "JUNIOR_ADMIN", "EMPLOYEE"])
      .optional()
      .nullable()
      .default("EMPLOYEE"),
    company: z
      .string()
      .refine((val) => !val || mongoose.Types.ObjectId.isValid(val), {
        message: "Invalid company ID",
      })
      .optional()
      .nullable(),
  }),
});

/* =============================
        LOGIN VALIDATION
   ============================= */
export const loginValidationSchema = z.object({
  body: z.object({
    email: z
      .string({ message: "Email is required" })
      .email({ message: "Invalid email address" }),
    password: z
      .string({ message: "Password is required" })
      .min(6, { message: "Password must be at least 6 characters" }),
    device: z
      .object({
        deviceId: z.string(),
        deviceName: z.string(),
        signature: z.string(),
        details: z.object({
          os: z.string(),
          browser: z.string(),
          resolution: z.string(),
          gpu: z.string(),
          timezone: z.string(),
          memory: z.string(),
          cores: z.union([z.string(), z.number()]),
        }).optional(),
      })
      .optional()
      .nullable(),
  }),
});

/* =============================
       REFRESH TOKEN VALIDATION
   ============================= */
// refreshToken comes from httpOnly cookie; body field is optional fallback
export const refreshTokenValidationSchema = z.object({
  body: z.object({
    refreshToken: z.string().optional(),
  }),
});

/* =============================
       CHANGE PASSWORD VALIDATION
   ============================= */
export const changePasswordValidationSchema = z.object({
  body: z.object({
    oldPassword: z
      .string({ message: "Current password is required" })
      .min(6, { message: "Password must be at least 6 characters" }),
    newPassword: z
      .string({ message: "New password is required" })
      .min(6, { message: "Password must be at least 6 characters" }),
    confirmPassword: z
      .string({ message: "Confirm password is required" })
      .min(6, { message: "Password must be at least 6 characters" }),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  }),
});

export const AuthValidations = {
  registerValidationSchema,
  loginValidationSchema,
  refreshTokenValidationSchema,
  changePasswordValidationSchema,
};
