import { z } from "zod";
import mongoose from "mongoose";

const EMPLOYMENT_TYPES = [
  "Full-Time",
  "Part-Time",
  "Contract",
  "Intern",
  "Probation",
] as const;

const employeeProfileSchema = z
  .object({
    firstName: z.string().min(2).max(50).trim(),
    lastName: z.string().min(2).max(50).trim(),
    email: z.string().email().trim(),
    phone: z.string().min(7).max(20).trim(),
    department: z
      .string()
      .refine((val) => mongoose.Types.ObjectId.isValid(val), {
        message: "Invalid department ID",
      }),
    designation: z
      .string()
      .refine((val) => mongoose.Types.ObjectId.isValid(val), {
        message: "Invalid designation ID",
      }),
    joiningDate: z.string().min(1).refine((val) => !Number.isNaN(Date.parse(val)), {
      message: "Invalid joining date",
    }),
    basicSalary: z.number().nonnegative(),
    employmentType: z.enum(EMPLOYMENT_TYPES),
  })
  .strict();

const createStaffSchema = z
  .object({
    body: z
      .object({
        name: z.string().min(2).max(100).trim(),
        email: z.string().email().trim(),
        phone: z.string().min(7).max(20).trim(),
        password: z.string().min(6).max(100),
        role: z.enum(["HR", "JUNIOR_ADMIN", "EMPLOYEE"]),
        permissions: z.array(z.string().min(1)).optional(),
        employee: employeeProfileSchema.optional(),
      })
      .strict()
      .superRefine((data, ctx) => {
        if (data.role === "EMPLOYEE" && !data.employee) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Employee profile is required when role is EMPLOYEE",
            path: ["employee"],
          });
        }

        if (data.role !== "EMPLOYEE" && data.employee) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Employee profile is only allowed when role is EMPLOYEE",
            path: ["employee"],
          });
        }

        if (
          (data.role === "HR" || data.role === "JUNIOR_ADMIN") &&
          (!data.permissions || data.permissions.length === 0)
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "At least one permission is required for HR/JUNIOR_ADMIN",
            path: ["permissions"],
          });
        }

        if (data.role === "EMPLOYEE" && data.permissions?.length) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Permissions are not allowed for EMPLOYEE role",
            path: ["permissions"],
          });
        }
      }),
  });

export const BranchAdminValidation = {
  createStaffSchema,
};
