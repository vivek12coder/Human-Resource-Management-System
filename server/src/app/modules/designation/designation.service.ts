import Designation, { IDesignation } from "./designation.model";
import { Types } from "mongoose";
import { HttpStatusCode } from "axios";
import AppError from "../../errors/AppError";

export class DesignationService {
  /* =============================
          CREATE DESIGNATION
     ============================= */
  static async createDesignation(
    payload: Partial<IDesignation>,
    createdBy: Types.ObjectId
  ) {
    const existingDesignation = await Designation.findOne({
      company: payload.company,
      code: payload.code?.toUpperCase(),
    });

    if (existingDesignation) {
      throw new AppError(
        HttpStatusCode.BadRequest,
        "Request Failed",
        "Designation with this code already exists!"
      );
    }

    const designation = await Designation.create({
      ...payload,
      code: payload.code?.toUpperCase(),
      createdBy,
    });

    return designation;
  }

  /* =============================
          GET ALL DESIGNATIONS
     ============================= */
  static async getAllDesignations(
    filter: Record<string, any> = {},
    query: { page?: number; limit?: number } = { page: 1, limit: 10 }
  ) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const finalFilter = { ...filter, isDeleted: false };

    const designations = await Designation.find(finalFilter)
      .select("-__v")
      .populate("company", "name code")
      .populate("department", "name code")
      .limit(limit)
      .skip(skip)
      .sort({ level: 1, createdAt: -1 })
      .lean();

    const total = await Designation.countDocuments(finalFilter);

    return {
      designations,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /* =============================
          GET DESIGNATION BY ID
     ============================= */
  static async getDesignationById(_id: string | Types.ObjectId) {
    const designation = await Designation.findById(_id)
      .select("-__v")
      .populate("company", "name code")
      .populate("department", "name code")
      .lean();

    if (!designation || designation.isDeleted) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Designation not found!"
      );
    }

    return designation;
  }

  /* =============================
          UPDATE DESIGNATION
     ============================= */
  static async updateDesignation(
    _id: string | Types.ObjectId,
    payload: Partial<IDesignation>
  ) {
    if (payload.code) {
      const existingDesignation = await Designation.findOne({
        company: payload.company,
        code: payload.code.toUpperCase(),
        _id: { $ne: _id },
      });

      if (existingDesignation) {
        throw new AppError(
          HttpStatusCode.BadRequest,
          "Request Failed",
          "Designation with this code already exists!"
        );
      }
      payload.code = payload.code.toUpperCase();
    }

    const designation = await Designation.findByIdAndUpdate(_id, payload, {
      new: true,
    })
      .select("-__v")
      .populate("company", "name code")
      .lean();

    if (!designation) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Designation not found!"
      );
    }

    return designation;
  }

  /* =============================
          DELETE DESIGNATION
     ============================= */
  static async deleteDesignation(_id: string | Types.ObjectId) {
    const designation = await Designation.findByIdAndUpdate(
      _id,
      { isDeleted: true },
      { new: true }
    ).lean();

    if (!designation) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Designation not found!"
      );
    }

    return designation;
  }

  /* =============================
          GET DESIGNATIONS DROPDOWN
     ============================= */
  static async getDesignationsDropdown(
    companyId: string | Types.ObjectId,
    departmentId?: string
  ) {
    const filter: Record<string, any> = {
      company: companyId,
      isDeleted: false,
      isActive: true,
    };

    if (departmentId) {
      filter.department = departmentId;
    }

    const designations = await Designation.find(filter)
      .select("title code level")
      .sort({ level: 1 })
      .lean();

    return designations;
  }

  /* =============================
          COUNT DESIGNATIONS
     ============================= */
  static async countDesignations(filter: Record<string, any> = {}) {
    return await Designation.countDocuments({ ...filter, isDeleted: false });
  }
}

