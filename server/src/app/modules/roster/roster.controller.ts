import httpStatus from "http-status";
import { HttpStatusCode } from "axios";
import AppError from "../../errors/AppError";
import { catchAsync } from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import Employee from "../employee/employee.model";
import Shift from "../shift/shift.model";
import { RosterService } from "./roster.service";

export class RosterController {
  static createRoster = catchAsync(async (req, res) => {
    const payload = req.body;
    const loggedInUser = res.locals.user;

    if (loggedInUser.role !== "SUPER_ADMIN") {
      payload.company = loggedInUser.company;
    }

    const employee = await Employee.findById(payload.employee).lean();
    if (!employee || employee.isDeleted) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Employee not found!"
      );
    }

    if (
      loggedInUser.role !== "SUPER_ADMIN" &&
      employee.company.toString() !== loggedInUser.company?.toString()
    ) {
      throw new AppError(HttpStatusCode.Forbidden, "Forbidden", "Access denied");
    }

    if (payload.shift) {
      const shift = await Shift.findById(payload.shift).lean();
      if (!shift || shift.isDeleted) {
        throw new AppError(
          HttpStatusCode.NotFound,
          "Request Failed",
          "Shift not found!"
        );
      }

      if (shift.company.toString() !== employee.company.toString()) {
        throw new AppError(
          HttpStatusCode.BadRequest,
          "Request Failed",
          "Shift and employee must belong to same company"
        );
      }
    }

    payload.company = employee.company;
    payload.branch = employee.branch;

    const roster = await RosterService.createRoster(payload, loggedInUser._id);

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Roster created successfully",
      data: roster,
    });
  });

  static bulkAssignRoster = catchAsync(async (req, res) => {
    const payload = req.body;
    const loggedInUser = res.locals.user;

    if (loggedInUser.role !== "SUPER_ADMIN") {
      payload.company = loggedInUser.company;
    }

    const employees = await Employee.find({
      _id: { $in: payload.employees },
      isDeleted: false,
      company: payload.company,
    })
      .select("_id company branch")
      .lean();

    if (employees.length !== payload.employees.length) {
      throw new AppError(
        HttpStatusCode.BadRequest,
        "Request Failed",
        "One or more employees are invalid for this company"
      );
    }

    if (payload.shift) {
      const shift = await Shift.findById(payload.shift).lean();
      if (!shift || shift.isDeleted) {
        throw new AppError(
          HttpStatusCode.NotFound,
          "Request Failed",
          "Shift not found!"
        );
      }
      if (shift.company.toString() !== payload.company.toString()) {
        throw new AppError(
          HttpStatusCode.BadRequest,
          "Request Failed",
          "Shift does not belong to this company"
        );
      }
    }

    const result = await RosterService.bulkAssignRoster(payload, loggedInUser._id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Roster scheduled successfully",
      data: result,
    });
  });

  static getAllRosters = catchAsync(async (req, res) => {
    const {
      page,
      limit,
      company,
      employee,
      shift,
      status,
      isPublished,
      startDate,
      endDate,
    } = req.query;
    const loggedInUser = res.locals.user;

    const filter: Record<string, unknown> = {};

    if (loggedInUser.role !== "SUPER_ADMIN") {
      filter.company = loggedInUser.company;
    } else if (company) {
      filter.company = company;
    }

    if (employee) filter.employee = employee;
    if (shift) filter.shift = shift;
    if (status) filter.status = status;
    if (isPublished !== undefined) filter.isPublished = isPublished === "true";

    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      if (startDate) {
        const start = new Date(startDate as string);
        start.setHours(0, 0, 0, 0);
        dateFilter.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        dateFilter.$lte = end;
      }
      filter.rosterDate = dateFilter;
    }

    const result = await RosterService.getAllRosters(filter, {
      page: Number(page) || 1,
      limit: Number(limit) || 31,
    });

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Rosters fetched successfully",
      data: result,
    });
  });

  static getRosterById = catchAsync(async (req, res) => {
    const { id } = req.params;
    const loggedInUser = res.locals.user;
    const rosterId = Array.isArray(id) ? id[0] : id;

    const roster = await RosterService.getRosterById(rosterId);

    if (
      loggedInUser.role !== "SUPER_ADMIN" &&
      roster.company?._id?.toString() !== loggedInUser.company?.toString()
    ) {
      throw new AppError(HttpStatusCode.Forbidden, "Forbidden", "Access denied");
    }

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Roster fetched successfully",
      data: roster,
    });
  });

  static getEmployeeRoster = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { month, year } = req.query;
    const loggedInUser = res.locals.user;

    const employeeId = Array.isArray(id) ? id[0] : id;
    const employee = await Employee.findById(employeeId).lean();
    if (!employee || employee.isDeleted) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Employee not found!"
      );
    }

    if (
      loggedInUser.role !== "SUPER_ADMIN" &&
      employee.company.toString() !== loggedInUser.company?.toString()
    ) {
      throw new AppError(HttpStatusCode.Forbidden, "Forbidden", "Access denied");
    }

    const currentDate = new Date();
    const monthNum = month ? Number(month) : currentDate.getMonth() + 1;
    const yearNum = year ? Number(year) : currentDate.getFullYear();

    const result = await RosterService.getEmployeeRoster(employee._id, monthNum, yearNum);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Employee roster fetched successfully",
      data: result,
    });
  });

  static updateRoster = catchAsync(async (req, res) => {
    const { id } = req.params;
    const payload = req.body;
    const loggedInUser = res.locals.user;
    const rosterId = Array.isArray(id) ? id[0] : id;

    const existingRoster = await RosterService.getRosterById(rosterId);

    if (
      loggedInUser.role !== "SUPER_ADMIN" &&
      existingRoster.company?._id?.toString() !== loggedInUser.company?.toString()
    ) {
      throw new AppError(HttpStatusCode.Forbidden, "Forbidden", "Access denied");
    }

    if (payload.employee) {
      const employee = await Employee.findById(payload.employee).lean();
      if (!employee || employee.isDeleted) {
        throw new AppError(
          HttpStatusCode.NotFound,
          "Request Failed",
          "Employee not found!"
        );
      }
    }

    if (payload.shift) {
      const shift = await Shift.findById(payload.shift).lean();
      if (!shift || shift.isDeleted) {
        throw new AppError(
          HttpStatusCode.NotFound,
          "Request Failed",
          "Shift not found!"
        );
      }
    }

    const roster = await RosterService.updateRoster(rosterId, payload);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Roster updated successfully",
      data: roster,
    });
  });

  static publishRoster = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { isPublished } = req.body;
    const loggedInUser = res.locals.user;

    const rosterId = Array.isArray(id) ? id[0] : id;
    const existingRoster = await RosterService.getRosterById(rosterId);
    if (
      loggedInUser.role !== "SUPER_ADMIN" &&
      existingRoster.company?._id?.toString() !== loggedInUser.company?.toString()
    ) {
      throw new AppError(HttpStatusCode.Forbidden, "Forbidden", "Access denied");
    }

    const roster = await RosterService.publishRoster(rosterId, isPublished);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: `Roster ${isPublished ? "published" : "unpublished"} successfully`,
      data: roster,
    });
  });

  static deleteRoster = catchAsync(async (req, res) => {
    const { id } = req.params;
    const loggedInUser = res.locals.user;
    const rosterId = Array.isArray(id) ? id[0] : id;

    const existingRoster = await RosterService.getRosterById(rosterId);
    if (
      loggedInUser.role !== "SUPER_ADMIN" &&
      existingRoster.company?._id?.toString() !== loggedInUser.company?.toString()
    ) {
      throw new AppError(HttpStatusCode.Forbidden, "Forbidden", "Access denied");
    }

    await RosterService.deleteRoster(rosterId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Roster deleted successfully",
      data: null,
    });
  });
}
