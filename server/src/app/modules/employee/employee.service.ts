import Employee, { IEmployee } from "./employee.model";
import { Types } from "mongoose";
import { HttpStatusCode } from "axios";
import AppError from "../../errors/AppError";

export class EmployeeService {
  static async createEmployee(payload: Partial<IEmployee>, createdBy: Types.ObjectId) {
    const existingEmployee = await Employee.findOne({
      company: payload.company,
      employeeId: payload.employeeId,
    });

    if (existingEmployee) {
      throw new AppError(
        HttpStatusCode.BadRequest,
        "Request Failed",
        "Employee with this ID already exists in this company!"
      );
    }

    const existingEmail = await Employee.findOne({
      email: payload.email?.toLowerCase(),
      isDeleted: false,
    });

    if (existingEmail) {
      throw new AppError(
        HttpStatusCode.BadRequest,
        "Request Failed",
        "Employee with this email already exists!"
      );
    }

    const employee = await Employee.create({
      ...payload,
      email: payload.email?.toLowerCase(),
      createdBy,
    });

    return employee;
  }

  static async getAllEmployees(
    filter: Record<string, any> = {},
    query: { page?: number; limit?: number } = { page: 1, limit: 10 }
  ) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const finalFilter = { ...filter, isDeleted: false };

    const employees = await Employee.find(finalFilter)
      .select("-__v")
      .populate("company", "name code")
      .populate("branch", "name code")
      .populate("department", "name code")
      .populate("designation", "title")
      .populate("reportingManager", "firstName lastName email")
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 })
      .lean();

    const total = await Employee.countDocuments(finalFilter);

    return {
      employees,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async getEmployeeById(_id: string | Types.ObjectId) {
    const employee = await Employee.findById(_id)
      .select("-__v")
      .populate("company", "name code")
      .populate("branch", "name code")
      .populate("department", "name code")
      .populate("designation", "title")
      .populate("reportingManager", "firstName lastName email")
      .populate("user", "name email role")
      .lean();

    if (!employee || employee.isDeleted) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Employee not found!"
      );
    }

    return employee;
  }

  static async getEmployeeByUserId(userId: string | Types.ObjectId) {
    const employee = await Employee.findOne({ user: userId, isDeleted: false })
      .select("-__v")
      .populate("company", "name code")
      .populate("branch", "name code")
      .populate("department", "name code")
      .populate("designation", "title")
      .populate("reportingManager", "firstName lastName email")
      .populate("user", "name email role")
      .lean();

    if (!employee) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Employee profile not found!"
      );
    }

    return employee;
  }

  static async updateEmployee(_id: string | Types.ObjectId, payload: Partial<IEmployee>) {
    if (payload.email) {
      const existingEmail = await Employee.findOne({
        email: payload.email.toLowerCase(),
        _id: { $ne: _id },
        isDeleted: false,
      });

      if (existingEmail) {
        throw new AppError(
          HttpStatusCode.BadRequest,
          "Request Failed",
          "Employee with this email already exists!"
        );
      }
      payload.email = payload.email.toLowerCase();
    }

    const employee = await Employee.findByIdAndUpdate(_id, payload, { new: true })
      .select("-__v")
      .populate("company", "name code")
      .populate("branch", "name code")
      .populate("department", "name code")
      .lean();

    if (!employee) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Employee not found!"
      );
    }

    return employee;
  }

  static async updateEmployeeByUserId(
    userId: string | Types.ObjectId,
    payload: Partial<IEmployee>
  ) {
    const existingEmployee = await Employee.findOne({ user: userId, isDeleted: false })
      .select("_id")
      .lean();

    if (!existingEmployee?._id) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Employee profile not found!"
      );
    }

    return this.updateEmployee(existingEmployee._id, payload);
  }

  static async deleteEmployee(_id: string | Types.ObjectId) {
    const employee = await Employee.findByIdAndUpdate(
      _id,
      { isDeleted: true, isActive: false },
      { new: true }
    ).lean();

    if (!employee) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Employee not found!"
      );
    }

    return employee;
  }

  static async toggleEmployeeStatus(_id: string | Types.ObjectId, isActive: boolean) {
    const employee = await Employee.findByIdAndUpdate(_id, { isActive }, { new: true })
      .select("-__v")
      .lean();

    if (!employee || employee.isDeleted) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Employee not found!"
      );
    }

    return employee;
  }

  static async getEmployeesDropdown(
    companyId: string | Types.ObjectId,
    departmentId?: string,
    branchId?: string | Types.ObjectId
  ) {
    const filter: Record<string, any> = {
      company: companyId,
      isDeleted: false,
      isActive: true,
    };

    if (departmentId) {
      filter.department = departmentId;
    }

    if (branchId) {
      filter.branch = branchId;
    }

    const employees = await Employee.find(filter)
      .select("employeeId firstName lastName email branch")
      .lean();

    return employees;
  }

  static async countEmployees(filter: Record<string, any> = {}) {
    return await Employee.countDocuments({ ...filter, isDeleted: false });
  }

  static async getEmployeeStats(companyId?: string | Types.ObjectId) {
    const filter: Record<string, any> = { isDeleted: false };
    if (companyId) {
      filter.company = companyId;
    }

    const [total, active, onNotice, resigned] = await Promise.all([
      Employee.countDocuments(filter),
      Employee.countDocuments({ ...filter, employmentStatus: "Active" }),
      Employee.countDocuments({ ...filter, employmentStatus: "On-Notice" }),
      Employee.countDocuments({ ...filter, employmentStatus: "Resigned" }),
    ]);

    return { total, active, onNotice, resigned };
  }

  static async generateEmployeeId(companyId: string | Types.ObjectId) {
    const count = await Employee.countDocuments({ company: companyId });
    const year = new Date().getFullYear().toString().slice(-2);
    return `EMP${year}${String(count + 1).padStart(4, "0")}`;
  }
}
