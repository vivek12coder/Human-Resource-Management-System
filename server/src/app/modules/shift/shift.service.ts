import { Types } from "mongoose";
import { HttpStatusCode } from "axios";
import AppError from "../../errors/AppError";
import Shift, { IShift } from "./shift.model";

export class ShiftService {
  static async createShift(payload: Partial<IShift>, createdBy: Types.ObjectId) {
    const existingName = await Shift.findOne({
      company: payload.company,
      name: payload.name,
      isDeleted: false,
    });

    if (existingName) {
      throw new AppError(
        HttpStatusCode.BadRequest,
        "Request Failed",
        "Shift with this name already exists!"
      );
    }

    const existingCode = await Shift.findOne({
      company: payload.company,
      code: payload.code?.toUpperCase(),
      isDeleted: false,
    });

    if (existingCode) {
      throw new AppError(
        HttpStatusCode.BadRequest,
        "Request Failed",
        "Shift with this code already exists!"
      );
    }

    if (payload.isDefault) {
      await Shift.updateMany(
        { company: payload.company, isDeleted: false },
        { $set: { isDefault: false } }
      );
    }

    const shift = await Shift.create({
      ...payload,
      code: payload.code?.toUpperCase(),
      createdBy,
    });

    return shift;
  }

  static async getAllShifts(
    filter: Record<string, unknown> = {},
    query: { page?: number; limit?: number } = { page: 1, limit: 10 }
  ) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;
    const finalFilter = { ...filter, isDeleted: false };

    const shifts = await Shift.find(finalFilter)
      .select("-__v")
      .populate("company", "name code")
      .populate("branch", "name code")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Shift.countDocuments(finalFilter);

    return {
      shifts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async getShiftById(_id: string | Types.ObjectId) {
    const shift = await Shift.findById(_id)
      .select("-__v")
      .populate("company", "name code")
      .populate("branch", "name code")
      .lean();

    if (!shift || shift.isDeleted) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Shift not found!"
      );
    }

    return shift;
  }

  static async updateShift(_id: string | Types.ObjectId, payload: Partial<IShift>) {
    const existingShift = await Shift.findById(_id).lean();

    if (!existingShift || existingShift.isDeleted) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Shift not found!"
      );
    }

    if (payload.name) {
      const duplicateName = await Shift.findOne({
        company: existingShift.company,
        name: payload.name,
        _id: { $ne: _id },
        isDeleted: false,
      });

      if (duplicateName) {
        throw new AppError(
          HttpStatusCode.BadRequest,
          "Request Failed",
          "Shift with this name already exists!"
        );
      }
    }

    if (payload.code) {
      const duplicateCode = await Shift.findOne({
        company: existingShift.company,
        code: payload.code.toUpperCase(),
        _id: { $ne: _id },
        isDeleted: false,
      });

      if (duplicateCode) {
        throw new AppError(
          HttpStatusCode.BadRequest,
          "Request Failed",
          "Shift with this code already exists!"
        );
      }
      payload.code = payload.code.toUpperCase();
    }

    if (payload.isDefault) {
      await Shift.updateMany(
        { company: existingShift.company, _id: { $ne: _id }, isDeleted: false },
        { $set: { isDefault: false } }
      );
    }

    const shift = await Shift.findByIdAndUpdate(_id, payload, { new: true })
      .select("-__v")
      .populate("company", "name code")
      .populate("branch", "name code")
      .lean();

    if (!shift || shift.isDeleted) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Shift not found!"
      );
    }

    return shift;
  }

  static async deleteShift(_id: string | Types.ObjectId) {
    const shift = await Shift.findByIdAndUpdate(
      _id,
      { isDeleted: true, isActive: false, isDefault: false },
      { new: true }
    ).lean();

    if (!shift) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Shift not found!"
      );
    }

    return shift;
  }

  static async toggleShiftStatus(_id: string | Types.ObjectId, isActive: boolean) {
    const shift = await Shift.findByIdAndUpdate(_id, { isActive }, { new: true })
      .select("-__v")
      .lean();

    if (!shift || shift.isDeleted) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Shift not found!"
      );
    }

    return shift;
  }

  static async getShiftDropdown(companyId: string | Types.ObjectId, branchId?: string) {
    const filter: Record<string, unknown> = {
      company: companyId,
      isDeleted: false,
      isActive: true,
    };

    if (branchId) {
      filter.branch = branchId;
    }

    return Shift.find(filter)
      .select("name code startTime endTime isNightShift")
      .sort({ name: 1 })
      .lean();
  }
}
