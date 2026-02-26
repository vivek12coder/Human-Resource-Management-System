import { z } from "zod";
import mongoose from "mongoose";

/* =============================
      CREATE BRANCH VALIDATION
   ============================= */
export const createBranchValidationSchema = z.object({
  body: z.object({
    name: z
      .string({ message: "Branch name is required" })
      .min(2, { message: "Name must be at least 2 characters" })
      .max(100, { message: "Name must be less than 100 characters" })
      .trim(),
    code: z
      .string({ message: "Branch code is required" })
      .min(2, { message: "Code must be at least 2 characters" })
      .max(20, { message: "Code must be less than 20 characters" })
      .trim(),
    company: z
      .string()
      .refine((val) => mongoose.Types.ObjectId.isValid(val), {
        message: "Invalid company ID",
      })
      .optional(),
    email: z.string({ message: "Branch Admin Email is required" }).email({ message: "Invalid format for Branch Admin Email" }),
    phone: z.string().optional(),
    address: z.string().max(500).optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    pincode: z.string().optional(),
    isHeadOffice: z.boolean().optional(),
    adminName: z.string().min(2, "Admin name must be at least 2 characters").max(100).optional(),
    adminPassword: z.string().min(6, "Password must be at least 6 characters").max(100).optional(),
  }),
});

/* =============================
      UPDATE BRANCH VALIDATION
   ============================= */
export const updateBranchValidationSchema = z.object({
  params: z.object({
    id: z
      .string()
      .refine((val) => mongoose.Types.ObjectId.isValid(val), {
        message: "Invalid branch ID",
      }),
  }),
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    code: z.string().min(2).max(20).optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address: z.string().max(500).optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    pincode: z.string().optional(),
    isHeadOffice: z.boolean().optional(),
    isActive: z.boolean().optional(),
  }),
});

/* =============================
      TOGGLE STATUS VALIDATION
   ============================= */
export const toggleBranchStatusValidationSchema = z.object({
  params: z.object({
    id: z
      .string()
      .refine((val) => mongoose.Types.ObjectId.isValid(val), {
        message: "Invalid branch ID",
      }),
  }),
  body: z.object({
    isActive: z.boolean({ message: "isActive is required" }),
  }),
});

export const BranchValidations = {
  createBranchValidationSchema,
  updateBranchValidationSchema,
  toggleBranchStatusValidationSchema,
};

