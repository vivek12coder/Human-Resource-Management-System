import { Types, Document } from "mongoose";

/* ============================= */
/*           ENUMS               */
/* ============================= */

export type UserRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "JUNIOR_ADMIN"
  | "HR"
  | "MANAGER"
  | "EMPLOYEE";

/* ============================= */
/*       MODULE KEYS ENUM        */
/* ============================= */
export type ModuleKey =
  | "DASHBOARD"
  | "USERS"
  | "PAYROLL"
  | "ATTENDANCE"
  | "LEAVE"
  | "REPORTS";

/* ============================= */
/*         INTERFACES            */
/* ============================= */

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: UserRole;
  company?: Types.ObjectId;
  branch?: Types.ObjectId;

  isActive: boolean;
  isDeleted: boolean;

  permissions?: ModuleKey[]; // Junior Admin ya future role ke liye

  createdAt: Date;
  updatedAt: Date;

  comparePassword(candidatePassword: string): Promise<boolean>;
}

/* ============================= */
/*       CREATE / UPDATE DTOs     */
/* ============================= */

export interface ICreateUser {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: UserRole;
  company?: Types.ObjectId;
  branch?: Types.ObjectId;
  permissions?: ModuleKey[]; // optional, only for JUNIOR_ADMIN
}

export interface IUpdateUser {
  name?: string;
  email?: string;
  phone?: string;
  branch?: Types.ObjectId;
  isActive?: boolean;
  permissions?: ModuleKey[]; // optional, update Junior Admin permissions
}

/* ============================= */
/*        RESPONSE DTOs           */
/* ============================= */

export interface IUserResponse {
  _id: Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  company?: Types.ObjectId;
  branch?: Types.ObjectId;
  isActive: boolean;
  permissions?: ModuleKey[];
  createdAt: Date;
  updatedAt: Date;
}

/* ============================= */
/*        LOGIN / FILTER DTOs     */
/* ============================= */

export interface IUserLogin {
  email: string;
  password: string;
}

export interface IUserFilter {
  search?: string;
  role?: UserRole;
  isActive?: boolean;
  company?: Types.ObjectId;
  branch?: Types.ObjectId;
  permissions?: ModuleKey[]; // optional filter by module access
}
