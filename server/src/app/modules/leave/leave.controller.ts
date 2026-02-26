import { catchAsync } from "../../utils/catchAsync";
import { LeaveService } from "./leave.service";
import sendResponse from "../../utils/sendResponse";
import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import { HttpStatusCode } from "axios";
import Employee from "../employee/employee.model";

export class LeaveController {
  /* =============================
          APPLY LEAVE
     ============================= */
  static applyLeave = catchAsync(async (req, res) => {
    const payload = req.body;
    const loggedInUser = res.locals.user;

    const employee = await Employee.findOne({ user: loggedInUser._id });
    if (!employee) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Employee profile not found!"
      );
    }

    const leave = await LeaveService.applyLeave(
      payload,
      employee._id,
      loggedInUser._id
    );

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Leave applied successfully",
      data: leave,
    });
  });

  /* =============================
          GET ALL LEAVES
     ============================= */
  static getAllLeaves = catchAsync(async (req, res) => {
    const { page, limit, status, leaveType, employee, startDate, endDate } =
      req.query;
    const loggedInUser = res.locals.user;

    const filter: Record<string, any> = {};

    // Tenant isolation
    if (loggedInUser.role !== "SUPER_ADMIN") {
      filter.company = loggedInUser.company;
    }

    if (status) filter.status = status;
    if (leaveType) filter.leaveType = leaveType;
    if (employee) filter.employee = employee;

    if (startDate && endDate) {
      filter.startDate = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }

    const result = await LeaveService.getAllLeaves(filter, {
      page: Number(page) || 1,
      limit: Number(limit) || 10,
    });

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Leaves fetched successfully",
      data: result,
    });
  });

  /* =============================
          GET MY LEAVES
     ============================= */
  static getMyLeaves = catchAsync(async (req, res) => {
    const { year } = req.query;
    const loggedInUser = res.locals.user;

    const employee = await Employee.findOne({ user: loggedInUser._id });
    if (!employee) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Employee profile not found!"
      );
    }

    const leaves = await LeaveService.getEmployeeLeaves(
      employee._id,
      year ? Number(year) : undefined
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "My leaves fetched successfully",
      data: leaves,
    });
  });

  /* =============================
          GET MY LEAVE BALANCE
     ============================= */
  static getMyLeaveBalance = catchAsync(async (req, res) => {
    const loggedInUser = res.locals.user;

    const employee = await Employee.findOne({ user: loggedInUser._id });
    if (!employee) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Employee profile not found!"
      );
    }

    const balance = await LeaveService.getLeaveBalance(employee._id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Leave balance fetched successfully",
      data: balance,
    });
  });

  /* =============================
          GET LEAVE BY ID
     ============================= */
  static getLeaveById = catchAsync(async (req, res) => {
    const { id } = req.params;
    const loggedInUser = res.locals.user;

    const leave = await LeaveService.getLeaveById(id as any);

    // Tenant isolation
    if (
      loggedInUser.role !== "SUPER_ADMIN" &&
      leave.company?._id?.toString() !== loggedInUser.company?.toString()
    ) {
      throw new AppError(
        HttpStatusCode.Forbidden,
        "Forbidden",
        "Access denied"
      );
    }

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Leave fetched successfully",
      data: leave,
    });
  });

  /* =============================
          APPROVE LEAVE
     ============================= */
  static approveLeave = catchAsync(async (req, res) => {
    const { id } = req.params;
    const loggedInUser = res.locals.user;

    const existingLeave = await LeaveService.getLeaveById(id as any);

    // Tenant isolation
    if (
      loggedInUser.role !== "SUPER_ADMIN" &&
      existingLeave.company?._id?.toString() !== loggedInUser.company?.toString()
    ) {
      throw new AppError(
        HttpStatusCode.Forbidden,
        "Forbidden",
        "Access denied"
      );
    }

    const leave = await LeaveService.approveLeave(id as any, loggedInUser._id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Leave approved successfully",
      data: leave,
    });
  });

  /* =============================
          REJECT LEAVE
     ============================= */
  static rejectLeave = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    const loggedInUser = res.locals.user;

    const existingLeave = await LeaveService.getLeaveById(id as any);

    // Tenant isolation
    if (
      loggedInUser.role !== "SUPER_ADMIN" &&
      existingLeave.company?._id?.toString() !== loggedInUser.company?.toString()
    ) {
      throw new AppError(
        HttpStatusCode.Forbidden,
        "Forbidden",
        "Access denied"
      );
    }

    const leave = await LeaveService.rejectLeave(
      id as any,
      rejectionReason,
      loggedInUser._id
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Leave rejected successfully",
      data: leave,
    });
  });

  /* =============================
          CANCEL LEAVE
     ============================= */
  static cancelLeave = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { cancellationReason } = req.body;
    const loggedInUser = res.locals.user;

    const existingLeave = await LeaveService.getLeaveById(id as any);

    // Check if user owns this leave or is admin
    const employee = await Employee.findOne({ user: loggedInUser._id });
    const isOwner =
      employee && existingLeave.employee?._id?.toString() === employee._id.toString();

    if (
      !isOwner &&
      loggedInUser.role !== "SUPER_ADMIN" &&
      loggedInUser.role !== "ADMIN"
    ) {
      throw new AppError(
        HttpStatusCode.Forbidden,
        "Forbidden",
        "You can only cancel your own leave requests"
      );
    }

    const leave = await LeaveService.cancelLeave(
      id as any,
      cancellationReason || "Cancelled by user",
      loggedInUser._id
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Leave cancelled successfully",
      data: leave,
    });
  });

  /* =============================
          GET PENDING LEAVES COUNT
     ============================= */
  static getPendingLeavesCount = catchAsync(async (req, res) => {
    const loggedInUser = res.locals.user;

    const companyId =
      loggedInUser.role === "SUPER_ADMIN"
        ? req.query.company
        : loggedInUser.company;

    if (!companyId) {
      throw new AppError(
        HttpStatusCode.BadRequest,
        "Request Failed",
        "Company is required"
      );
    }

    const count = await LeaveService.getPendingLeavesCount(companyId as any);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Pending leaves count fetched successfully",
      data: { count },
    });
  });

  /* =============================
          GET LEAVE STATS
     ============================= */
  static getLeaveStats = catchAsync(async (req, res) => {
    const { year } = req.query;
    const loggedInUser = res.locals.user;

    const companyId =
      loggedInUser.role === "SUPER_ADMIN"
        ? req.query.company
        : loggedInUser.company;

    if (!companyId) {
      throw new AppError(
        HttpStatusCode.BadRequest,
        "Request Failed",
        "Company is required"
      );
    }

    const stats = await LeaveService.getLeaveStats(
      companyId as any,
      year ? Number(year) : undefined
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Leave stats fetched successfully",
      data: stats,
    });
  });
}

