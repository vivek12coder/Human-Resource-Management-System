import mongoose from "mongoose";
import { HttpStatusCode } from "axios";
import AppError from "../../errors/AppError";
import User, { IUser } from "../user/user.model";
import Employee from "../employee/employee.model";
import { EmployeeService } from "../employee/employee.service";
import bcrypt from "bcryptjs";

type CreateStaffRole = "HR" | "JUNIOR_ADMIN" | "EMPLOYEE";

interface IEmployeePayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  joiningDate: string;
  basicSalary: number;
  employmentType: "Full-Time" | "Part-Time" | "Contract" | "Intern" | "Probation";
}

interface ICreateStaffPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: CreateStaffRole;
  permissions?: string[];
  employee?: IEmployeePayload;
}

interface IAuthUser {
  _id: mongoose.Types.ObjectId;
  role: string;
  company?: mongoose.Types.ObjectId;
  branch?: mongoose.Types.ObjectId;
}

const sanitizeUser = (user: IUser) => {
  const userObj = user.toObject();
  delete (userObj as Record<string, unknown>).password;
  return userObj;
};

export class BranchAdminService {
  static async createStaff(payload: ICreateStaffPayload, loggedInUser: IAuthUser) {
    if (loggedInUser.role !== "BRANCH_ADMIN" && loggedInUser.role !== "JUNIOR_ADMIN") {
      throw new AppError(
        HttpStatusCode.Forbidden,
        "Permission Denied",
        "Only BRANCH_ADMIN/JUNIOR_ADMIN can create staff"
      );
    }

    if (!loggedInUser.company || !loggedInUser.branch) {
      throw new AppError(
        HttpStatusCode.BadRequest,
        "Request Failed",
        "Logged in branch admin must belong to a company and branch"
      );
    }

    const normalizedEmail = payload.email.toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail, isDeleted: false })
      .select("_id")
      .lean();

    if (existingUser) {
      throw new AppError(
        HttpStatusCode.BadRequest,
        "Request Failed",
        "User with this email already exists!"
      );
    }

    if (payload.role !== "EMPLOYEE") {
      const sanitizedPermissions = (payload.permissions || []).filter(Boolean);
      
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(payload.password, salt);

      const user = await User.create({
        name: payload.name,
        email: normalizedEmail,
        phone: payload.phone,
        password: hashedPassword,
        role: payload.role,
        permissions: sanitizedPermissions,
        company: loggedInUser.company,
        branch: loggedInUser.branch,
      });

      return {
        user: sanitizeUser(user),
      };
    }

    if (!payload.employee) {
      throw new AppError(
        HttpStatusCode.BadRequest,
        "Request Failed",
        "Employee profile is required when role is EMPLOYEE"
      );
    }

    const existingEmployeeEmail = await Employee.findOne({
      email: payload.employee.email.toLowerCase(),
      isDeleted: false,
      branch: loggedInUser.branch,
    })
      .select("_id")
      .lean();

    if (existingEmployeeEmail) {
      throw new AppError(
        HttpStatusCode.BadRequest,
        "Request Failed",
        "Employee with this email already exists in this branch!"
      );
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(payload.password, salt);

    // Step 1: Create the User first
    const createdUser = await User.create({
      name: payload.name,
      email: normalizedEmail,
      phone: payload.phone,
      password: hashedPassword,
      role: "EMPLOYEE",
      permissions: [],
      company: loggedInUser.company,
      branch: loggedInUser.branch,
    });

    let createdEmployee;
    try {
      // Step 2: Generate unique employee ID
      const employeeId = await EmployeeService.generateEmployeeId(loggedInUser.company);

      // Step 3: Create the Employee record linked to the User
      createdEmployee = await Employee.create({
        employeeId,
        firstName: payload.employee.firstName,
        lastName: payload.employee.lastName,
        email: payload.employee.email.toLowerCase(),
        phone: payload.employee.phone,
        gender: "Other",
        department: payload.employee.department,
        designation: payload.employee.designation,
        joiningDate: new Date(payload.employee.joiningDate),
        basicSalary: payload.employee.basicSalary,
        employmentType: payload.employee.employmentType,
        company: loggedInUser.company,
        branch: loggedInUser.branch,
        user: createdUser._id,
        createdBy: loggedInUser._id,
      });

      // Step 4: Link the Employee back to the User
      createdUser.employee = createdEmployee._id as mongoose.Types.ObjectId;
      await createdUser.save();

    } catch (error) {
      // Manual rollback: if employee creation or linking fails, delete the created user
      await User.findByIdAndDelete(createdUser._id);
      throw error;
    }

    return {
      user: sanitizeUser(createdUser),
      employee: createdEmployee.toObject(),
    };
  }
}
