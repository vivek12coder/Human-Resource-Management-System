import { z } from "zod";
import mongoose from "mongoose";

/* =============================
      CREATE COMPANY VALIDATION
   ============================= */
export const createCompanyValidationSchema = z.object({
  body: z.object({
    name: z
      .string({ message: "Company name is required" })
      .min(2, { message: "Name must be at least 2 characters" })
      .max(100, { message: "Name must be less than 100 characters" })
      .trim(),
    code: z.preprocess(
      (val) => {
        if (typeof val !== "string") return val;
        const trimmed = val.trim();
        return trimmed === "" ? undefined : trimmed;
      },
      z
        .string()
        .min(2, { message: "Code must be at least 2 characters" })
        .max(20, { message: "Code must be less than 20 characters" })
        .optional()
    ),
    phone: z.string().optional(),
    address: z.string().max(500).optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    pincode: z.string().optional(),
    logo: z.string().optional(),
    website: z.string().optional(),
    gstNumber: z.string().optional(),
    panNumber: z.string().optional(),
    registrationNumber: z.string().optional(),
    establishedDate: z.string().optional(),
    adminName: z
      .string({ message: "Admin name is required" })
      .min(2, { message: "Admin name must be at least 2 characters" })
      .max(50, { message: "Admin name must be less than 50 characters" })
      .trim(),
    adminRole: z
      .string()
      .refine((val) => val === "ADMIN", { message: "Admin role must be ADMIN" }),
    adminEmail: z
      .string({ message: "Admin email is required" })
      .email({ message: "Invalid admin email address" })
      .trim(),
    adminPassword: z
      .string({ message: "Admin password is required" })
      .min(6, { message: "Admin password must be at least 6 characters" })
      .max(100, { message: "Admin password must be less than 100 characters" }),
  }),
});

/* =============================
      UPDATE COMPANY VALIDATION
   ============================= */
export const updateCompanyValidationSchema = z.object({
  params: z.object({
    id: z
      .string()
      .refine((val) => mongoose.Types.ObjectId.isValid(val), {
        message: "Invalid company ID",
      }),
  }),
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    code: z.preprocess(
      (val) => {
        if (typeof val !== "string") return val;
        const trimmed = val.trim();
        return trimmed === "" ? undefined : trimmed;
      },
      z.string().min(2).max(20).optional()
    ),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address: z.string().max(500).optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    pincode: z.string().optional(),
    logo: z.string().optional(),
    website: z.string().optional(),
    gstNumber: z.string().optional(),
    panNumber: z.string().optional(),
    registrationNumber: z.string().optional(),
    establishedDate: z.string().optional(),
    isActive: z.boolean().optional(),
    adminName: z
      .string()
      .min(2, { message: "Admin name must be at least 2 characters" })
      .max(50, { message: "Admin name must be less than 50 characters" })
      .trim()
      .optional(),
    adminRole: z
      .string()
      .refine((val) => val === "ADMIN", { message: "Admin role must be ADMIN" })
      .optional(),
    adminEmail: z
      .string()
      .email({ message: "Invalid admin email address" })
      .trim()
      .optional(),
    adminPassword: z
      .string()
      .min(6, { message: "Admin password must be at least 6 characters" })
      .max(100, { message: "Admin password must be less than 100 characters" })
      .optional(),
  }),
});

/* =============================
      TOGGLE STATUS VALIDATION
   ============================= */
export const toggleStatusValidationSchema = z.object({
  params: z.object({
    id: z
      .string()
      .refine((val) => mongoose.Types.ObjectId.isValid(val), {
        message: "Invalid company ID",
      }),
  }),
  body: z.object({
    isActive: z.boolean({ message: "isActive is required" }),
  }),
});

export const CompanyValidations = {
  createCompanyValidationSchema,
  updateCompanyValidationSchema,
  toggleStatusValidationSchema,
};

