import { catchAsync } from "../../utils/catchAsync";
import { BranchService } from "./branch.service";
import sendResponse from "../../utils/sendResponse";
import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import { HttpStatusCode } from "axios";

export class BranchController {
  static createBranch = catchAsync(async (req, res) => {
    const payload = req.body;
    const loggedInUser = res.locals.user;

    if (loggedInUser.role !== "SUPER_ADMIN") {
      payload.company = loggedInUser.company;
    }

    const branch = await BranchService.createBranch(payload, loggedInUser._id);

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Branch created successfully",
      data: branch,
    });
  });

  static getAllBranches = catchAsync(async (req, res) => {
    const { page, limit, search, company, isActive } = req.query;
    const loggedInUser = res.locals.user;

    const filter: Record<string, any> = {};

    if (loggedInUser.role !== "SUPER_ADMIN") {
      filter.company = loggedInUser.company;
    } else if (company) {
      filter.company = company;
    }

    if (loggedInUser.role === "JUNIOR_ADMIN") {
      filter._id = loggedInUser.branch;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    if (search) {
      filter["$or"] = [
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

  static getBranchById = catchAsync(async (req, res) => {
    const { id } = req.params;
    const loggedInUser = res.locals.user;

    const branch = await BranchService.getBranchById(id);

    if (
      loggedInUser.role !== "SUPER_ADMIN" &&
      branch.company?._id?.toString() !== loggedInUser.company?.toString()
    ) {
      throw new AppError(HttpStatusCode.Forbidden, "Forbidden", "You cannot access this branch");
    }

    if (
      loggedInUser.role === "JUNIOR_ADMIN" &&
      branch._id?.toString() !== loggedInUser.branch?.toString()
    ) {
      throw new AppError(HttpStatusCode.Forbidden, "Forbidden", "You can only access your own branch");
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
    const loggedInUser = res.locals.user;

    const existingBranch = await BranchService.getBranchById(id);

    if (
      loggedInUser.role !== "SUPER_ADMIN" &&
      existingBranch.company?._id?.toString() !== loggedInUser.company?.toString()
    ) {
      throw new AppError(HttpStatusCode.Forbidden, "Forbidden", "You cannot update this branch");
    }

    const branch = await BranchService.updateBranch(id, payload);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Branch updated successfully",
      data: branch,
    });
  });

  static deleteBranch = catchAsync(async (req, res) => {
    const { id } = req.params;
    const loggedInUser = res.locals.user;

    const existingBranch = await BranchService.getBranchById(id);

    if (
      loggedInUser.role !== "SUPER_ADMIN" &&
      existingBranch.company?._id?.toString() !== loggedInUser.company?.toString()
    ) {
      throw new AppError(HttpStatusCode.Forbidden, "Forbidden", "You cannot delete this branch");
    }

    await BranchService.deleteBranch(id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Branch deleted successfully",
      data: null,
    });
  });

  static toggleBranchStatus = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;
    const loggedInUser = res.locals.user;

    const existingBranch = await BranchService.getBranchById(id);

    if (
      loggedInUser.role !== "SUPER_ADMIN" &&
      existingBranch.company?._id?.toString() !== loggedInUser.company?.toString()
    ) {
      throw new AppError(HttpStatusCode.Forbidden, "Forbidden", "You cannot update this branch");
    }

    const branch = await BranchService.toggleBranchStatus(id, isActive);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: `Branch ${isActive ? "activated" : "deactivated"} successfully`,
      data: branch,
    });
  });

  static getBranchesByCompany = catchAsync(async (req, res) => {
    const loggedInUser = res.locals.user;
    const companyId = req.query.company || loggedInUser.company;

    if (
      loggedInUser.role !== "SUPER_ADMIN" &&
      companyId?.toString() !== loggedInUser.company?.toString()
    ) {
      throw new AppError(
        HttpStatusCode.Forbidden,
        "Forbidden",
        "You cannot access branches of other companies"
      );
    }

    const branches = await BranchService.getBranchesByCompany(companyId);

    const filteredBranches =
      loggedInUser.role === "JUNIOR_ADMIN"
        ? branches.filter((branch: any) => branch._id?.toString() === loggedInUser.branch?.toString())
        : branches;

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Branches fetched successfully",
      data: filteredBranches,
    });
  });

  static countBranches = catchAsync(async (req, res) => {
    const loggedInUser = res.locals.user;

    const filter: Record<string, any> = {};

    if (loggedInUser.role !== "SUPER_ADMIN") {
      filter.company = loggedInUser.company;
    }

    if (loggedInUser.role === "JUNIOR_ADMIN") {
      filter._id = loggedInUser.branch;
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
