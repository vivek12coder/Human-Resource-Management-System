import { z } from 'zod';
import mongoose from 'mongoose';

const VALID_ROLES = ['SUPER_ADMIN', 'ADMIN', 'JUNIOR_ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'];

/* =============================
      CREATE USER (SUPER_ADMIN)
   ============================= */
const createUserValidationSchema = z.object({
  body: z.object({
    name: z
      .string({ message: 'Name is required' })
      .min(2, { message: 'Name must be at least 2 characters' })
      .max(50, { message: 'Name must be less than 50 characters' })
      .trim(),
    email: z
      .string({ message: 'Email is required' })
      .email({ message: 'Invalid email address' })
      .trim(),
    password: z
      .string({ message: 'Password is required' })
      .min(6, { message: 'Password must be at least 6 characters' })
      .max(100, { message: 'Password must be less than 100 characters' }),
    role: z
      .string({ message: 'Role is required' })
      .refine((val) => VALID_ROLES.includes(val), {
        message: `Role must be one of: ${VALID_ROLES.join(', ')}`,
      }),
    company: z
      .string()
      .optional()
      .refine((val) => !val || mongoose.Types.ObjectId.isValid(val), {
        message: 'Company ID is invalid',
      }),
    branch: z
      .string()
      .optional()
      .refine((val) => !val || mongoose.Types.ObjectId.isValid(val), {
        message: 'Branch ID is invalid',
      }),
    phone: z
      .string()
      .regex(/^[\d\s\-\+\(\)]{7,}$/, { message: 'Phone format is invalid' })
      .optional(),
    isActive: z.boolean().optional(),
    employee: z
      .string()
      .optional()
      .refine((val) => !val || mongoose.Types.ObjectId.isValid(val), {
        message: 'Employee ID is invalid',
      }),
  }),
});

/* =============================
      CREATE EMPLOYEE
   ============================= */
const createEmployeeValidationSchema = z.object({
  body: z.object({
    name: z
      .string({ message: 'Name is required' })
      .min(2, { message: 'Name must be at least 2 characters' })
      .max(50, { message: 'Name must be less than 50 characters' })
      .trim(),
    email: z
      .string({ message: 'Email is required' })
      .email({ message: 'Invalid email address' })
      .trim(),
    phone: z
      .string({ message: 'Phone is required' })
      .regex(/^[\d\s\-\+\(\)]{7,}$/, { message: 'Phone format is invalid' }),
    password: z
      .string({ message: 'Password is required' })
      .min(6, { message: 'Password must be at least 6 characters' })
      .max(100, { message: 'Password must be less than 100 characters' }),
    role: z
      .string({ message: 'Role is required' })
      .refine((val) => VALID_ROLES.includes(val), {
        message: `Role must be one of: ${VALID_ROLES.join(', ')}`,
      }),
    company: z
      .string({ message: 'Company ID is required' })
      .refine((val) => mongoose.Types.ObjectId.isValid(val), { message: 'Company ID is invalid' }),
    branch: z
      .string({ message: 'Branch ID is required' })
      .refine((val) => mongoose.Types.ObjectId.isValid(val), { message: 'Branch ID is invalid' }),
    department: z.string().max(50).optional(),
    designation: z.string().max(50).optional(),
    joiningDate: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

/* =============================
      UPDATE USER PROFILE
   ============================= */
const updateUserProfileValidationSchema = z.object({
  body: z.object({
    name: z.string().max(50).optional(),
    email: z.string().email({ message: 'Invalid email' }).optional(),
    phone: z.string().regex(/^[\d\s\-\+\(\)]{7,}$/).optional(),
    image: z.string().optional(),
    company: z.string().optional().refine((val) => !val || mongoose.Types.ObjectId.isValid(val), {
      message: 'Company ID is invalid',
    }),
    branch: z.string().optional().refine((val) => !val || mongoose.Types.ObjectId.isValid(val), {
      message: 'Branch ID is invalid',
    }),
    department: z.string().max(50).optional(),
    designation: z.string().max(50).optional(),
    joiningDate: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

/* =============================
      UPDATE EMPLOYEE
   ============================= */
const updateEmployeeValidationSchema = z.object({
  body: z.object({
    _id: z
      .string({ message: 'Employee ID is required' })
      .refine((val) => mongoose.Types.ObjectId.isValid(val), { message: 'Employee ID is invalid' }),
    name: z.string().max(50).optional(),
    email: z.string().email({ message: 'Invalid email' }).optional(),
    phone: z.string().regex(/^[\d\s\-\+\(\)]{7,}$/).optional(),
    password: z.string().min(6).max(100).optional(),
    role: z
      .string()
      .optional()
      .refine((val) => !val || VALID_ROLES.includes(val), {
        message: `Role must be one of: ${VALID_ROLES.join(', ')}`,
      }),
    company: z.string().optional().refine((val) => !val || mongoose.Types.ObjectId.isValid(val), {
      message: 'Company ID is invalid',
    }),
    branch: z.string().optional().refine((val) => !val || mongoose.Types.ObjectId.isValid(val), {
      message: 'Branch ID is invalid',
    }),
    department: z.string().max(50).optional(),
    designation: z.string().max(50).optional(),
    joiningDate: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

/* =============================
      CHANGE PASSWORD
   ============================= */
const updatePasswordValidationSchema = z.object({
  body: z.object({
    _id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), { message: 'User ID is invalid' }),
    password: z.string().min(6).max(100),
    confirmPassword: z.string().min(6).max(100),
  }).refine((data) => data.password === data.confirmPassword, { message: "Passwords don't match" }),
});

/* =============================
      PAGINATION / LIST FETCH
   ============================= */
const paginationValidationSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    role: z.string().optional().refine((val) => !val || VALID_ROLES.includes(val), {
      message: `Role must be one of: ${VALID_ROLES.join(', ')}`,
    }),
    isActive: z.string().optional(),
    company: z.string().optional().refine((val) => !val || mongoose.Types.ObjectId.isValid(val), {
      message: 'Company ID is invalid',
    }),
    branch: z.string().optional().refine((val) => !val || mongoose.Types.ObjectId.isValid(val), {
      message: 'Branch ID is invalid',
    }),
    search: z.string().optional(),
  }),
});

export const UserValidationsHRM = {
  createUserValidationSchema,
  createEmployeeValidationSchema,
  updateUserProfileValidationSchema,
  updateEmployeeValidationSchema,
  updatePasswordValidationSchema,
  paginationValidationSchema,
};
