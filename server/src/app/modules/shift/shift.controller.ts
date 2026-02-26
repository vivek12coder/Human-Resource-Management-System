import httpStatus from "http-status";
import { HttpStatusCode } from "axios";
import AppError from "../../errors/AppError";
import { catchAsync } from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { ShiftService } from "./shift.service";

export class ShiftController {
  static createShift = catchAsync(async (req, res) => {
    const payload = req.body;
    const loggedInUser = res.locals.user;

    if (loggedInUser.role !== "SUPER_ADMIN") {
      payload.company = loggedInUser.company;
    }

    if (!payload.company) {
      throw new AppError(
        HttpStatusCode.BadRequest,
        "Request Failed",
        "Company is required"
      );
    }

    const shift = await ShiftService.createShift(payload, loggedInUser._id);

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Shift created successfully",
      data: shift,
    });
  });

  static getAllShifts = catchAsync(async (req, res) => {
    const { page, limit, search, company, branch, isActive } = req.query;
    const loggedInUser = res.locals.user;

    const filter: Record<string, unknown> = {};

    if (loggedInUser.role !== "SUPER_ADMIN") {
      filter.company = loggedInUser.company;
    } else if (company) {
      filter.company = company;
    }

    if (branch) filter.branch = branch;
    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
      ];
    }

    const result = await ShiftService.getAllShifts(filter, {
      page: Number(page) || 1,
      limit: Number(limit) || 10,
    });

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Shifts fetched successfully",
      data: result,
    });
  });

  static getShiftById = catchAsync(async (req, res) => {
    const { id } = req.params;
    const loggedInUser = res.locals.user;
    const shiftId = Array.isArray(id) ? id[0] : id;

    const shift = await ShiftService.getShiftById(shiftId);

    if (
      loggedInUser.role !== "SUPER_ADMIN" &&
      shift.company?._id?.toString() !== loggedInUser.company?.toString()
    ) {
      throw new AppError(
        HttpStatusCode.Forbidden,
        "Forbidden",
        "You cannot access this shift"
      );
    }

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Shift fetched successfully",
      data: shift,
    });
  });

  static updateShift = catchAsync(async (req, res) => {
    const { id } = req.params;
    const payload = req.body;
    const loggedInUser = res.locals.user;
    const shiftId = Array.isArray(id) ? id[0] : id;

    const existingShift = await ShiftService.getShiftById(shiftId);

    if (
      loggedInUser.role !== "SUPER_ADMIN" &&
      existingShift.company?._id?.toString() !== loggedInUser.company?.toString()
    ) {
      throw new AppError(
        HttpStatusCode.Forbidden,
        "Forbidden",
        "You cannot update this shift"
      );
    }

    const shift = await ShiftService.updateShift(shiftId, payload);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Shift updated successfully",
      data: shift,
    });
  });

  static deleteShift = catchAsync(async (req, res) => {
    const { id } = req.params;
    const loggedInUser = res.locals.user;
    const shiftId = Array.isArray(id) ? id[0] : id;

    const existingShift = await ShiftService.getShiftById(shiftId);

    if (
      loggedInUser.role !== "SUPER_ADMIN" &&
      existingShift.company?._id?.toString() !== loggedInUser.company?.toString()
    ) {
      throw new AppError(
        HttpStatusCode.Forbidden,
        "Forbidden",
        "You cannot delete this shift"
      );
    }

    await ShiftService.deleteShift(shiftId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Shift deleted successfully",
      data: null,
    });
  });

  static toggleShiftStatus = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;
    const loggedInUser = res.locals.user;
    const shiftId = Array.isArray(id) ? id[0] : id;

    const existingShift = await ShiftService.getShiftById(shiftId);

    if (
      loggedInUser.role !== "SUPER_ADMIN" &&
      existingShift.company?._id?.toString() !== loggedInUser.company?.toString()
    ) {
      throw new AppError(
        HttpStatusCode.Forbidden,
        "Forbidden",
        "You cannot update this shift"
      );
    }

    const shift = await ShiftService.toggleShiftStatus(shiftId, isActive);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: `Shift ${isActive ? "activated" : "deactivated"} successfully`,
      data: shift,
    });
  });

  static getShiftDropdown = catchAsync(async (req, res) => {
    const loggedInUser = res.locals.user;
    const companyQuery = req.query.company;
    const branchQuery = req.query.branch;
    const companyId = Array.isArray(companyQuery)
      ? companyQuery[0]
      : companyQuery || loggedInUser.company;
    const rawBranch = Array.isArray(branchQuery) ? branchQuery[0] : branchQuery;
    const branchId = typeof rawBranch === "string" ? rawBranch : undefined;

    if (
      loggedInUser.role !== "SUPER_ADMIN" &&
      companyId?.toString() !== loggedInUser.company?.toString()
    ) {
      throw new AppError(HttpStatusCode.Forbidden, "Forbidden", "Access denied");
    }

    const shifts = await ShiftService.getShiftDropdown(companyId, branchId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Shift dropdown fetched successfully",
      data: shifts,
    });
  });
}
