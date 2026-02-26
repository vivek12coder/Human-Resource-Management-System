import { catchAsync } from "../../utils/catchAsync";
import { PayrollService } from "./payroll.service";
import sendResponse from "../../utils/sendResponse";
import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import { HttpStatusCode } from "axios";
import Employee from "../employee/employee.model";
import { generatePayslipPDF } from "./payslip.generator";

export class PayrollController {
  /* =============================
          GENERATE PAYROLL
     ============================= */
  static generatePayroll = catchAsync(async (req, res) => {
    const { employee, month, year } = req.body;
    const loggedInUser = res.locals.user;

    const emp = await Employee.findById(employee);
    if (!emp) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Employee not found!"
      );
    }

    // Tenant isolation
    if (
      loggedInUser.role !== "SUPER_ADMIN" &&
      emp.company.toString() !== loggedInUser.company?.toString()
    ) {
      throw new AppError(
        HttpStatusCode.Forbidden,
        "Forbidden",
        "Access denied"
      );
    }

    const payroll = await PayrollService.generatePayroll(
      employee,
      month,
      year,
      loggedInUser._id
    );

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Payroll generated successfully",
      data: payroll,
    });
  });

  /* =============================
          BULK GENERATE PAYROLL
     ============================= */
  static bulkGeneratePayroll = catchAsync(async (req, res) => {
    const { month, year } = req.body;
    const loggedInUser = res.locals.user;

    const companyId =
      loggedInUser.role === "SUPER_ADMIN"
        ? req.body.company
        : loggedInUser.company;

    if (!companyId) {
      throw new AppError(
        HttpStatusCode.BadRequest,
        "Request Failed",
        "Company is required"
      );
    }

    const result = await PayrollService.bulkGeneratePayroll(
      companyId,
      month,
      year,
      loggedInUser._id
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Bulk payroll generation completed",
      data: result,
    });
  });

  /* =============================
          GET ALL PAYROLLS
     ============================= */
  static getAllPayrolls = catchAsync(async (req, res) => {
    const { page, limit, month, year, paymentStatus, employee } = req.query;
    const loggedInUser = res.locals.user;

    const filter: Record<string, any> = {};

    // Tenant isolation
    if (loggedInUser.role !== "SUPER_ADMIN") {
      filter.company = loggedInUser.company;
    }

    if (month) filter.month = Number(month);
    if (year) filter.year = Number(year);
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (employee) filter.employee = employee;

    const result = await PayrollService.getAllPayrolls(filter, {
      page: Number(page) || 1,
      limit: Number(limit) || 10,
    });

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Payrolls fetched successfully",
      data: result,
    });
  });

  /* =============================
          GET PAYROLL BY ID
     ============================= */
  static getPayrollById = catchAsync(async (req, res) => {
    const { id } = req.params;
    const loggedInUser = res.locals.user;

    const payroll = await PayrollService.getPayrollById(id as any);

    // Tenant isolation
    if (
      loggedInUser.role !== "SUPER_ADMIN" &&
      payroll.company?._id?.toString() !== loggedInUser.company?.toString()
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
      message: "Payroll fetched successfully",
      data: payroll,
    });
  });

  /* =============================
          UPDATE PAYROLL
     ============================= */
  static updatePayroll = catchAsync(async (req, res) => {
    const { id } = req.params;
    const payload = req.body;
    const loggedInUser = res.locals.user;

    const existingPayroll = await PayrollService.getPayrollById(id as any);

    // Tenant isolation
    if (
      loggedInUser.role !== "SUPER_ADMIN" &&
      existingPayroll.company?._id?.toString() !== loggedInUser.company?.toString()
    ) {
      throw new AppError(
        HttpStatusCode.Forbidden,
        "Forbidden",
        "Access denied"
      );
    }

    if (existingPayroll.paymentStatus === "Paid") {
      throw new AppError(
        HttpStatusCode.BadRequest,
        "Request Failed",
        "Cannot update paid payroll!"
      );
    }

    const payroll = await PayrollService.updatePayroll(id as any, payload);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Payroll updated successfully",
      data: payroll,
    });
  });

  /* =============================
          APPROVE PAYROLL
     ============================= */
  static approvePayroll = catchAsync(async (req, res) => {
    const { id } = req.params;
    const loggedInUser = res.locals.user;

    const payroll = await PayrollService.approvePayroll(id as any, loggedInUser._id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Payroll approved successfully",
      data: payroll,
    });
  });

  /* =============================
          MARK AS PAID
     ============================= */
  static markAsPaid = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { paymentMethod, transactionId } = req.body;

    const payroll = await PayrollService.markAsPaid(id as any, {
      paymentMethod,
      transactionId,
    });

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Payroll marked as paid successfully",
      data: payroll,
    });
  });

  /* =============================
          GET MY PAYSLIPS
     ============================= */
  static getMyPayslips = catchAsync(async (req, res) => {
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

    const payslips = await PayrollService.getEmployeePayslips(
      employee._id,
      year ? Number(year) : undefined
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Payslips fetched successfully",
      data: payslips,
    });
  });

  /* =============================
          GET PAYROLL SUMMARY
     ============================= */
  static getPayrollSummary = catchAsync(async (req, res) => {
    const { month, year } = req.query;
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

    const currentDate = new Date();
    const monthNum = month ? Number(month) : currentDate.getMonth() + 1;
    const yearNum = year ? Number(year) : currentDate.getFullYear();

    const summary = await PayrollService.getPayrollSummary(
      companyId as any,
      monthNum,
      yearNum
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Payroll summary fetched successfully",
      data: summary,
    });
  });
  /* =============================
          DOWNLOAD PAYSLIP (PDF)
     ============================= */
  static downloadPayslip = catchAsync(async (req, res) => {
    const { id } = req.params;
    const loggedInUser = res.locals.user;

    const payroll = await PayrollService.getPayrollById(id as any);

    // Tenant isolation — employees can only download their own payslip
    if (loggedInUser.role === "EMPLOYEE") {
      const employee = await Employee.findOne({ user: loggedInUser._id });
      if (!employee || payroll.employee?._id?.toString() !== employee._id.toString()) {
        throw new AppError(HttpStatusCode.Forbidden, "Forbidden", "Access denied");
      }
    } else if (loggedInUser.role !== "SUPER_ADMIN") {
      if (payroll.company?._id?.toString() !== loggedInUser.company?.toString()) {
        throw new AppError(HttpStatusCode.Forbidden, "Forbidden", "Access denied");
      }
    }

    generatePayslipPDF(payroll, res);
  });
}

