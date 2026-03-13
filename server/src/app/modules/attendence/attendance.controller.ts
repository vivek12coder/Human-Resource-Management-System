import { catchAsync } from "../../utils/catchAsync";
import { AttendanceService } from "./attendance.service";
import sendResponse from "../../utils/sendResponse";
import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import { HttpStatusCode } from "axios";
import Employee from "../employee/employee.model";

export class AttendanceController {
  static checkIn = catchAsync(async (req, res) => {
    const payload = req.body;
    const loggedInUser = res.locals.user;

    const employee = await Employee.findOne({ user: loggedInUser._id });
    if (!employee) {
      throw new AppError(HttpStatusCode.NotFound, "Request Failed", "Employee profile not found!");
    }

    const attendance = await AttendanceService.checkIn(payload, employee._id, loggedInUser._id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Checked in successfully",
      data: attendance,
    });
  });

  static checkOut = catchAsync(async (req, res) => {
    const payload = req.body;
    const loggedInUser = res.locals.user;

    const employee = await Employee.findOne({ user: loggedInUser._id });
    if (!employee) {
      throw new AppError(HttpStatusCode.NotFound, "Request Failed", "Employee profile not found!");
    }

    const attendance = await AttendanceService.checkOut(payload, employee._id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Checked out successfully",
      data: attendance,
    });
  });

  static getTodayAttendance = catchAsync(async (req, res) => {
    const loggedInUser = res.locals.user;

    const employee = await Employee.findOne({ user: loggedInUser._id });
    if (!employee) {
      throw new AppError(HttpStatusCode.NotFound, "Request Failed", "Employee profile not found!");
    }

    const attendance = await AttendanceService.getTodayAttendance(employee._id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Today's attendance fetched successfully",
      data: attendance,
    });
  });

  static getAttendanceByDateRange = catchAsync(async (req, res) => {
    const { startDate, endDate, page, limit, employee, branch, status } = req.query;
    const loggedInUser = res.locals.user;

    const filter: Record<string, any> = {};

    if (loggedInUser.role !== "SUPER_ADMIN") {
      filter.company = loggedInUser.company;
    }

    if (employee) filter.employee = employee;

    if (loggedInUser.role === "JUNIOR_ADMIN") {
      filter.branch = loggedInUser.branch;
    } else if (branch) {
      filter.branch = branch;
    }

    if (status) filter.status = status;

    const start = new Date(startDate as string);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate as string);
    end.setHours(23, 59, 59, 999);

    const result = await AttendanceService.getAttendanceByDateRange(filter, start, end, {
      page: Number(page) || 1,
      limit: Number(limit) || 31,
    });

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Attendance fetched successfully",
      data: result,
    });
  });

  static getMyAttendance = catchAsync(async (req, res) => {
    const { month, year } = req.query;
    const loggedInUser = res.locals.user;

    const employee = await Employee.findOne({ user: loggedInUser._id });
    if (!employee) {
      throw new AppError(HttpStatusCode.NotFound, "Request Failed", "Employee profile not found!");
    }

    const currentDate = new Date();
    const monthNum = month ? Number(month) : currentDate.getMonth() + 1;
    const yearNum = year ? Number(year) : currentDate.getFullYear();

    const result = await AttendanceService.getEmployeeAttendance(employee._id, monthNum, yearNum);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "My attendance fetched successfully",
      data: result,
    });
  });

  static getEmployeeAttendance = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { month, year } = req.query;
    const loggedInUser = res.locals.user;

    const employee = await Employee.findById(id);
    if (!employee) {
      throw new AppError(HttpStatusCode.NotFound, "Request Failed", "Employee not found!");
    }

    if (
      loggedInUser.role !== "SUPER_ADMIN" &&
      employee.company.toString() !== loggedInUser.company?.toString()
    ) {
      throw new AppError(HttpStatusCode.Forbidden, "Forbidden", "Access denied");
    }

    if (
      loggedInUser.role === "JUNIOR_ADMIN" &&
      employee.branch?.toString() !== loggedInUser.branch?.toString()
    ) {
      throw new AppError(HttpStatusCode.Forbidden, "Forbidden", "You can only view your branch attendance");
    }

    const currentDate = new Date();
    const monthNum = month ? Number(month) : currentDate.getMonth() + 1;
    const yearNum = year ? Number(year) : currentDate.getFullYear();

    const result = await AttendanceService.getEmployeeAttendance(employee._id, monthNum, yearNum);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Employee attendance fetched successfully",
      data: result,
    });
  });

  static markAttendance = catchAsync(async (req, res) => {
    const payload = req.body;
    const loggedInUser = res.locals.user;

    const employee = await Employee.findById(payload.employee);
    if (!employee) {
      throw new AppError(HttpStatusCode.NotFound, "Request Failed", "Employee not found!");
    }

    if (
      loggedInUser.role !== "SUPER_ADMIN" &&
      employee.company.toString() !== loggedInUser.company?.toString()
    ) {
      throw new AppError(HttpStatusCode.Forbidden, "Forbidden", "Access denied");
    }

    if (
      loggedInUser.role === "JUNIOR_ADMIN" &&
      employee.branch?.toString() !== loggedInUser.branch?.toString()
    ) {
      throw new AppError(HttpStatusCode.Forbidden, "Forbidden", "You can only mark attendance for your branch");
    }

    payload.company = employee.company;
    payload.branch = employee.branch;

    const attendance = await AttendanceService.markAttendance(payload, loggedInUser._id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Attendance marked successfully",
      data: attendance,
    });
  });

  static regularizeAttendance = catchAsync(async (req, res) => {
    const { id } = req.params;
    const payload = req.body;
    const loggedInUser = res.locals.user;

    const attendance = await AttendanceService.regularizeAttendance(id as any, payload, loggedInUser._id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Attendance regularized successfully",
      data: attendance,
    });
  });

  static markFaceAttendance = catchAsync(async (req, res) => {
    const { employeeId, ...payload } = req.body;
    const loggedInUser = res.locals.user;

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      throw new AppError(HttpStatusCode.NotFound, "Request Failed", "Employee not found!");
    }

    const { type, attendance } = await AttendanceService.markFaceAttendance(employeeId, payload, loggedInUser._id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: `Successfully ${type === "check-in" ? "checked in" : "checked out"} via Face Recognition`,
      data: { type, attendance },
    });
  });

  static getAttendanceStats = catchAsync(async (req, res) => {
    const { date } = req.query;
    const loggedInUser = res.locals.user;

    const companyId = loggedInUser.role === "SUPER_ADMIN" ? req.query.company : loggedInUser.company;

    if (!companyId) {
      throw new AppError(HttpStatusCode.BadRequest, "Request Failed", "Company is required");
    }

    const targetDate = date ? new Date(date as string) : new Date();

    const stats = await AttendanceService.getAttendanceStats(companyId as any, targetDate);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Attendance stats fetched successfully",
      data: stats,
    });
  });
}
