import { catchAsync } from "../../utils/catchAsync";
import { BranchService } from "./branch.service";
import sendResponse from "../../utils/sendResponse";
import httpStatus from "http-status";
import AppError from "../../errors/AppError";

export class BranchController {
  static createBranch = catchAsync(async (req, res) => {
    const payload = req.body;
    const user = res.locals.user;

    if (user.role !== "SUPER_ADMIN" && !payload.company) {
      payload.company = user.company;
    }

    payload.createdBy = user._id;

    const branch = await BranchService.createBranch(payload);

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Branch created successfully",
      data: branch,
    });
  });

  static getAllBranches = catchAsync(async (req, res) => {
    const { page, limit, company, search } = req.query;
    const user = res.locals.user;

    const filter: Record<string, any> = {};

    if (user.role !== "SUPER_ADMIN") {
      filter.company = user.company;
    } else if (company) {
      filter.company = company;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
      ];
    }

    const result = await BranchService.getAllBranches(filter, {
      page: Number(page) || 1,
      limit: Number(limit) || 10,
    });

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Branches fetched successfully",
      data: result,
    });
  });

  static getBranchesDropdown = catchAsync(async (req, res) => {
    const { company } = req.query;
    const user = res.locals.user;

    const filter: Record<string, any> = { isActive: true };

    if (user.role !== "SUPER_ADMIN") {
      filter.company = user.company;
    } else if (company) {
      filter.company = company;
    }

    const result = await BranchService.getAllBranches(filter, { page: 1, limit: 1000 });

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Branches fetched successfully",
      data: result.branches,
    });
  });

  static getBranchById = catchAsync(async (req, res) => {
    const { id } = req.params;
    const user = res.locals.user;

    const branchId = Array.isArray(id) ? id[0] : id;
    const branch = await BranchService.getBranchById(branchId);

    if (
      user.role !== "SUPER_ADMIN" &&
      branch.company?.toString() !== user.company?.toString()
    ) {
      throw new AppError(httpStatus.FORBIDDEN, "Forbidden", "Cannot access this branch");
    }

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Branch fetched successfully",
      data: branch,
    });
  });

  static updateBranch = catchAsync(async (req, res) => {
    const { id } = req.params;
    const payload = req.body;
    const user = res.locals.user;

    const branchId = Array.isArray(id) ? id[0] : id;
    const branch = await BranchService.getBranchById(branchId);

    if (
      user.role !== "SUPER_ADMIN" &&
      branch.company?.toString() !== user.company?.toString()
    ) {
      throw new AppError(httpStatus.FORBIDDEN, "Forbidden", "Cannot modify this branch");
    }

    if (user.role !== "SUPER_ADMIN" && payload.company) {
      delete payload.company;
    }

    const updatedBranch = await BranchService.updateBranch(branchId, payload);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Branch updated successfully",
      data: updatedBranch,
    });
  });

  static deleteBranch = catchAsync(async (req, res) => {
    const { id } = req.params;
    const user = res.locals.user;

    const branchId = Array.isArray(id) ? id[0] : id;
    const branch = await BranchService.getBranchById(branchId);

    if (
      user.role !== "SUPER_ADMIN" &&
      branch.company?.toString() !== user.company?.toString()
    ) {
      throw new AppError(httpStatus.FORBIDDEN, "Forbidden", "Cannot delete this branch");
    }

    await BranchService.deleteBranch(branchId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Branch deleted successfully",
      data: null,
    });
  });

  static countBranches = catchAsync(async (req, res) => {
    const { company } = req.query;
    const user = res.locals.user;

    const filter: Record<string, any> = {};

    if (user.role !== "SUPER_ADMIN") {
      filter.company = user.company;
    } else if (company) {
      filter.company = company;
    }

    const total = await BranchService.countBranches(filter);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Branches count fetched successfully",
      data: { total },
    });
  });
}
