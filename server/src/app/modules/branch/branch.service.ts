import Branch, { IBranch } from "./branch.model";
import { Types } from "mongoose";
import { HttpStatusCode } from "axios";
import AppError from "../../errors/AppError";
import User from "../user/user.model";
import { UserService } from "../user/user.service";

export class BranchService {
  /* =============================
          CREATE BRANCH
     ============================= */
  static async createBranch(
    payload: Partial<IBranch> & { email?: string; adminName?: string; adminPassword?: string },
    createdBy: Types.ObjectId
  ) {
    if (!payload.email) {
      throw new AppError(
        HttpStatusCode.BadRequest,
        "Request Failed",
        "Branch Admin Email is required!"
      );
    }

    // Check if email is already taken by a user
    const existingUser = await User.findOne({ email: payload.email.toLowerCase(), isDeleted: false });
    if (existingUser) {
      throw new AppError(
        HttpStatusCode.BadRequest,
        "Request Failed",
        "Email is already in use by another user!"
      );
    }

    // Check if branch code already exists for this company
    const existingBranch = await Branch.findOne({
      company: payload.company,
      code: payload.code?.toUpperCase(),
    });

    if (existingBranch) {
      throw new AppError(
        HttpStatusCode.BadRequest,
        "Request Failed",
        "Branch with this code already exists in this company!"
      );
    }

    const branch = await Branch.create({
      ...payload,
      code: payload.code?.toUpperCase(),
      createdBy,
    });

    try {
      const branchAdminPayload = {
        name: payload.adminName || `${payload.name} Admin`,
        email: payload.email,
        password: payload.adminPassword || "Password@123",
        role: "JUNIOR_ADMIN" as "JUNIOR_ADMIN",
        company: payload.company as any,
        branch: branch._id as any,
        permissions: ["USERS", "EMPLOYEE", "ATTENDANCE", "LEAVE", "REGULARIZATION", "PAYROLL"] as any[],
        isActive: true,
      };

      await UserService.createNewUser(branchAdminPayload);
    } catch (error) {
      await Branch.findByIdAndDelete(branch._id);
      throw error;
    }

    return branch;
  }

  /* =============================
          GET ALL BRANCHES
     ============================= */
  static async getAllBranches(
    filter: Record<string, any> = {},
    query: { page?: number; limit?: number } = { page: 1, limit: 10 }
  ) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const finalFilter = { ...filter, isDeleted: false };

    const branches = await Branch.find(finalFilter)
      .select("-__v")
      .populate("company", "name code")
      .populate("createdBy", "name email")
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 })
      .lean();

    const total = await Branch.countDocuments(finalFilter);

    return {
      branches,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /* =============================
          GET BRANCH BY ID
     ============================= */
  static async getBranchById(_id: string | Types.ObjectId) {
    const branch = await Branch.findById(_id)
      .select("-__v")
      .populate("company", "name code")
      .populate("createdBy", "name email")
      .lean();

    if (!branch || branch.isDeleted) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Branch not found!"
      );
    }

    return branch;
  }

  /* =============================
          UPDATE BRANCH
     ============================= */
  static async updateBranch(
    _id: string | Types.ObjectId,
    payload: Partial<IBranch>
  ) {
    // If updating code, check uniqueness
    if (payload.code) {
      const existingBranch = await Branch.findOne({
        company: payload.company,
        code: payload.code.toUpperCase(),
        _id: { $ne: _id },
      });

      if (existingBranch) {
        throw new AppError(
          HttpStatusCode.BadRequest,
          "Request Failed",
          "Branch with this code already exists!"
        );
      }
      payload.code = payload.code.toUpperCase();
    }

    const branch = await Branch.findByIdAndUpdate(_id, payload, { new: true })
      .select("-__v")
      .populate("company", "name code")
      .lean();

    if (!branch) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Branch not found!"
      );
    }

    return branch;
  }

  /* =============================
          DELETE BRANCH (SOFT)
     ============================= */
  static async deleteBranch(_id: string | Types.ObjectId) {
    const branch = await Branch.findByIdAndUpdate(
      _id,
      { isDeleted: true },
      { new: true }
    ).lean();

    if (!branch) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Branch not found!"
      );
    }

    return branch;
  }

  /* =============================
          TOGGLE BRANCH STATUS
     ============================= */
  static async toggleBranchStatus(
    _id: string | Types.ObjectId,
    isActive: boolean
  ) {
    const branch = await Branch.findByIdAndUpdate(
      _id,
      { isActive },
      { new: true }
    )
      .select("-__v")
      .lean();

    if (!branch || branch.isDeleted) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Branch not found!"
      );
    }

    return branch;
  }

  /* =============================
          GET BRANCHES BY COMPANY
     ============================= */
  static async getBranchesByCompany(companyId: string | Types.ObjectId) {
    const branches = await Branch.find({
      company: companyId,
      isDeleted: false,
      isActive: true,
    })
      .select("name code isHeadOffice")
      .lean();

    return branches;
  }

  /* =============================
          COUNT BRANCHES
     ============================= */
  static async countBranches(filter: Record<string, any> = {}) {
    return await Branch.countDocuments({ ...filter, isDeleted: false });
  }
}

