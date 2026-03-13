import { z } from "zod";
import mongoose from "mongoose";

// Common enum validations
const EmploymentStatusEnum = z.enum([
  "Active",
  "Resigned",
  "Terminated",
  "On-Notice",
  "Absconding"
]);

const EmploymentTypeEnum = z.enum([
  "Full-Time",
  "Part-Time",
  "Contract",
  "Intern",
  "Probation"
]);

const BloodGroupEnum = z.enum([
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-"
]);

const GenderEnum = z.enum(["Male", "Female", "Other"]);

const MaritalStatusEnum = z.enum(["Single", "Married", "Divorced", "Widowed"]);

// ObjectId validation helper
const objectIdSchema = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: "Invalid ObjectId format"
});

/* =============================
    CREATE EMPLOYEE VALIDATION
   ============================= */
export const createEmployeeSchema = z.object({
  body: z.object({
    employeeId: z
      .string({ message: "Employee ID is required" })
      .min(3, { message: "Employee ID must be at least 3 characters" })
      .max(20, { message: "Employee ID must be less than 20 characters" })
      .trim(),

    firstName: z
      .string({ message: "First name is required" })
      .min(1, { message: "First name is required" })
      .max(50, { message: "First name must be less than 50 characters" })
      .trim(),

    lastName: z
      .string({ message: "Last name is required" })
      .min(1, { message: "Last name is required" })
      .max(50, { message: "Last name must be less than 50 characters" })
      .trim(),

    email: z
      .string({ message: "Email is required" })
      .email({ message: "Invalid email format" })
      .toLowerCase()
      .trim(),

    phone: z
      .string({ message: "Phone is required" })
      .min(10, { message: "Phone must be at least 10 characters" })
      .max(15, { message: "Phone must be less than 15 characters" })
      .regex(/^[0-9+\-\s()]*$/, { message: "Invalid phone number format" }),

    dateOfBirth: z
      .string()
      .datetime({ message: "Invalid date format" })
      .optional()
      .nullable(),

    gender: GenderEnum.optional().nullable(),
    bloodGroup: BloodGroupEnum.optional().nullable(),
    maritalStatus: MaritalStatusEnum.optional().nullable(),

    company: objectIdSchema,
    branch: objectIdSchema.optional().nullable(),
    department: objectIdSchema.optional().nullable(),
    designation: objectIdSchema.optional().nullable(),
    reportingManager: objectIdSchema.optional().nullable(),

    employmentType: EmploymentTypeEnum,
    employmentStatus: EmploymentStatusEnum.default("Active"),

    joiningDate: z
      .string()
      .datetime({ message: "Invalid joining date format" }),

    confirmationDate: z
      .string()
      .datetime({ message: "Invalid confirmation date format" })
      .optional()
      .nullable(),

    resignationDate: z
      .string()
      .datetime({ message: "Invalid resignation date format" })
      .optional()
      .nullable(),

    // Salary information with validation
    basicSalary: z
      .number({ message: "Basic salary must be a number" })
      .min(0, { message: "Basic salary cannot be negative" })
      .max(10000000, { message: "Basic salary seems unusually high" }),

    grossSalary: z
      .number({ message: "Gross salary must be a number" })
      .min(0, { message: "Gross salary cannot be negative" })
      .optional()
      .nullable(),

    ctc: z
      .number({ message: "CTC must be a number" })
      .min(0, { message: "CTC cannot be negative" })
      .optional()
      .nullable(),

    // Bank details
    bankAccountNumber: z
      .string()
      .min(8, { message: "Bank account number must be at least 8 characters" })
      .max(20, { message: "Bank account number must be less than 20 characters" })
      .optional()
      .nullable(),

    bankName: z
      .string()
      .max(100, { message: "Bank name must be less than 100 characters" })
      .optional()
      .nullable(),

    ifscCode: z
      .string()
      .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, { message: "Invalid IFSC code format" })
      .optional()
      .nullable(),

    // Government IDs with validation
    panNumber: z
      .string()
      .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, { message: "Invalid PAN number format" })
      .optional()
      .nullable(),

    aadharNumber: z
      .string()
      .regex(/^[0-9]{12}$/, { message: "Aadhar number must be 12 digits" })
      .optional()
      .nullable(),

    pfNumber: z
      .string()
      .max(50, { message: "PF number must be less than 50 characters" })
      .optional()
      .nullable(),

    esiNumber: z
      .string()
      .max(50, { message: "ESI number must be less than 50 characters" })
      .optional()
      .nullable(),

    uanNumber: z
      .string()
      .max(50, { message: "UAN number must be less than 50 characters" })
      .optional()
      .nullable(),

    // Address validation
    currentAddress: z.object({
      street: z.string().max(200, { message: "Street must be less than 200 characters" }).optional().nullable(),
      city: z.string().max(50, { message: "City must be less than 50 characters" }).optional().nullable(),
      state: z.string().max(50, { message: "State must be less than 50 characters" }).optional().nullable(),
      country: z.string().max(50, { message: "Country must be less than 50 characters" }).optional().nullable(),
      pincode: z.string().regex(/^[0-9]{6}$/, { message: "Pincode must be 6 digits" }).optional().nullable(),
    }).optional().nullable(),

    // Emergency contact
    emergencyContact: z.object({
      name: z.string().max(100, { message: "Emergency contact name must be less than 100 characters" }).optional().nullable(),
      relationship: z.string().max(50, { message: "Relationship must be less than 50 characters" }).optional().nullable(),
      phone: z.string().regex(/^[0-9+\-\s()]*$/, { message: "Invalid emergency contact phone format" }).optional().nullable(),
    }).optional().nullable(),

    // Leave balances with validation
    leaveBalance: z.object({
      casual: z.number().min(0).max(365).default(12).optional(),
      sick: z.number().min(0).max(365).default(12).optional(),
      earned: z.number().min(0).max(365).default(15).optional(),
      unpaid: z.number().min(0).max(365).default(0).optional(),
    }).optional(),

    // Boolean flags
    allowMobileAttendance: z.boolean().default(true).optional(),
    geofenceEnabled: z.boolean().default(false).optional(),
    geofenceRadius: z.number().min(0).max(10000).default(100).optional(),
    faceRegistered: z.boolean().default(false).optional(),
  }),
});

/* =============================
    UPDATE EMPLOYEE VALIDATION
   ============================= */
export const updateEmployeeSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: createEmployeeSchema.shape.body.partial(), // Make all fields optional for updates
});

/* =============================
    GET EMPLOYEES QUERY VALIDATION
   ============================= */
export const getEmployeesQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).default(1).optional(),
    limit: z.coerce.number().min(1).max(100).default(10).optional(),
    search: z
      .string()
      .max(100, { message: "Search term must be less than 100 characters" })
      .trim()
      .optional(),
    company: objectIdSchema.optional(),
    branch: objectIdSchema.optional(),
    department: objectIdSchema.optional(),
    designation: objectIdSchema.optional(),
    employmentStatus: EmploymentStatusEnum.optional(),
    employmentType: EmploymentTypeEnum.optional(),
    reportingManager: objectIdSchema.optional(),
  }),
});

/* =============================
    EMPLOYEE PARAMS VALIDATION
   ============================= */
export const employeeParamsSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});

/* =============================
    BULK ACTION VALIDATION
   ============================= */
export const bulkActionSchema = z.object({
  body: z.object({
    employeeIds: z.array(objectIdSchema).min(1, { message: "At least one employee ID is required" }),
    action: z.enum(["activate", "deactivate", "delete"]),
    reason: z.string().max(500, { message: "Reason must be less than 500 characters" }).optional(),
  }),
});

export const EmployeeValidations = {
  createEmployeeSchema,
  updateEmployeeSchema,
  getEmployeesQuerySchema,
  employeeParamsSchema,
  bulkActionSchema,
};