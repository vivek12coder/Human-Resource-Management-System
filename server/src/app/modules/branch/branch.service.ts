import Branch, { IBranch } from "./branch.model";
import AppError from "../../errors/AppError";
import httpStatus from "http-status";

export class BranchService {
  static createBranch = async (payload: Partial<IBranch>) => {
    const existingBranch = await Branch.findOne({
      company: payload.company,
      code: payload.code,
      isDeleted: false,
    });

    if (existingBranch) {
      throw new AppError(
        httpStatus.CONFLICT,
        "Conflict",
        "Branch with this code already exists in your company"
      );
    }

    const branch = await Branch.create(payload);
    return branch;
  };

  static getAllBranches = async (filter: Record<string, any>, options: { page: number; limit: number }) => {
    const skip = (options.page - 1) * options.limit;

    const branches = await Branch.find({ ...filter, isDeleted: false })
      .populate("company", "name code")
      .skip(skip)
      .limit(options.limit)
      .sort({ createdAt: -1 });

    const total = await Branch.countDocuments({ ...filter, isDeleted: false });

    return {
      branches,
      total,
      page: options.page,
      totalPages: Math.ceil(total / options.limit),
    };
  };

  static getBranchById = async (id: string) => {
    const branch = await Branch.findOne({ _id: id, isDeleted: false }).populate(
      "company",
      "name code"
    );

    if (!branch) {
      throw new AppError(httpStatus.NOT_FOUND, "Not Found", "Branch not found");
    }

    return branch;
  };

  static updateBranch = async (id: string, payload: Partial<IBranch>) => {
    const branch = await Branch.findOneAndUpdate(
      { _id: id, isDeleted: false },
      payload,
      { new: true, runValidators: true }
    );

    if (!branch) {
      throw new AppError(httpStatus.NOT_FOUND, "Not Found", "Branch not found");
    }

    return branch;
  };

  static deleteBranch = async (id: string) => {
    const branch = await Branch.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { isDeleted: true, isActive: false },
      { new: true }
    );

    if (!branch) {
      throw new AppError(httpStatus.NOT_FOUND, "Not Found", "Branch not found");
    }

    return branch;
  };

  static countBranches = async (filter: Record<string, any>) => {
    return await Branch.countDocuments({ ...filter, isDeleted: false });
  };
}
