import Department, { IDepartment } from "./department.model";
import { Types } from "mongoose";
import { HttpStatusCode } from "axios";
import AppError from "../../errors/AppError";

export class DepartmentService {
  /* =============================
          CREATE DEPARTMENT
     ============================= */
  static async createDepartment(
    payload: Partial<IDepartment>,
    createdBy: Types.ObjectId
  ) {
    const existingDept = await Department.findOne({
      company: payload.company,
      code: payload.code?.toUpperCase(),
    });

    if (existingDept) {
      throw new AppError(
        HttpStatusCode.BadRequest,
        "Request Failed",
        "Department with this code already exists!"
      );
    }

    const department = await Department.create({
      ...payload,
      code: payload.code?.toUpperCase(),
      createdBy,
    });

    return department;
  }

  /* =============================
          GET ALL DEPARTMENTS
     ============================= */
  static async getAllDepartments(
    filter: Record<string, any> = {},
    query: { page?: number; limit?: number } = { page: 1, limit: 10 }
  ) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const finalFilter = { ...filter, isDeleted: false };

    const departments = await Department.find(finalFilter)
      .select("-__v")
      .populate("company", "name code")
      .populate("branch", "name code")
      .populate("headOfDepartment", "name email")
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 })
      .lean();

    const total = await Department.countDocuments(finalFilter);

    return {
      departments,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /* =============================
          GET DEPARTMENT BY ID
     ============================= */
  static async getDepartmentById(_id: string | Types.ObjectId) {
    const department = await Department.findById(_id)
      .select("-__v")
      .populate("company", "name code")
      .populate("branch", "name code")
      .populate("headOfDepartment", "name email")
      .lean();

    if (!department || department.isDeleted) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Department not found!"
      );
    }

    return department;
  }

  /* =============================
          UPDATE DEPARTMENT
     ============================= */
  static async updateDepartment(
    _id: string | Types.ObjectId,
    payload: Partial<IDepartment>
  ) {
    if (payload.code) {
      const existingDept = await Department.findOne({
        company: payload.company,
        code: payload.code.toUpperCase(),
        _id: { $ne: _id },
      });

      if (existingDept) {
        throw new AppError(
          HttpStatusCode.BadRequest,
          "Request Failed",
          "Department with this code already exists!"
        );
      }
      payload.code = payload.code.toUpperCase();
    }

    const department = await Department.findByIdAndUpdate(_id, payload, {
      new: true,
    })
      .select("-__v")
      .populate("company", "name code")
      .populate("branch", "name code")
      .lean();

    if (!department) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Department not found!"
      );
    }

    return department;
  }

  /* =============================
          DELETE DEPARTMENT
     ============================= */
  static async deleteDepartment(_id: string | Types.ObjectId) {
    const department = await Department.findByIdAndUpdate(
      _id,
      { isDeleted: true },
      { new: true }
    ).lean();

    if (!department) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Department not found!"
      );
    }

    return department;
  }

  /* =============================
          GET DEPARTMENTS DROPDOWN
     ============================= */
  static async getDepartmentsDropdown(companyId?: string | Types.ObjectId) {
    const filter: Record<string, any> = {
      isDeleted: false,
      isActive: true,
    };

    if (companyId) {
      filter.company = companyId;
    }

    const departments = await Department.find(filter)
      .select("name code")
      .lean();

    return departments;
  }

  /* =============================
          COUNT DEPARTMENTS
     ============================= */
  static async countDepartments(filter: Record<string, any> = {}) {
    return await Department.countDocuments({ ...filter, isDeleted: false });
  }
}

