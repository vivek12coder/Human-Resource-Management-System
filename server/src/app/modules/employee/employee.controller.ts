import { catchAsync } from "../../utils/catchAsync";
import { EmployeeService } from "./employee.service";
import sendResponse from "../../utils/sendResponse";
import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import { HttpStatusCode } from "axios";

export class EmployeeController {
  static createEmployee = catchAsync(async (req, res) => {
    const payload = req.body;
    const loggedInUser = res.locals.user;

    if (loggedInUser.role !== "SUPER_ADMIN") {
      payload.company = loggedInUser.company;
    }

    if (loggedInUser.role === "JUNIOR_ADMIN") {
      payload.branch = loggedInUser.branch;
    }

    if (!payload.employeeId) {
      payload.employeeId = await EmployeeService.generateEmployeeId(payload.company);
    }

    const employee = await EmployeeService.createEmployee(payload, loggedInUser._id);

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Employee created successfully",
      data: employee,
    });
  });

  static getAllEmployees = catchAsync(async (req, res) => {
    const {
      page,
      limit,
      search,
      company,
      branch,
      department,
      employmentStatus,
      employmentType,
    } = req.query;
    const loggedInUser = res.locals.user;

    const filter: Record<string, any> = {};

    if (loggedInUser.role !== "SUPER_ADMIN") {
      filter.company = loggedInUser.company;
    } else if (company) {
      filter.company = company;
    }

    if (loggedInUser.role === "JUNIOR_ADMIN") {
      filter.branch = loggedInUser.branch;
    } else if (branch) {
      filter.branch = branch;
    }

    if (department) filter.department = department;
    if (employmentStatus) filter.employmentStatus = employmentStatus;
    if (employmentType) filter.employmentType = employmentType;

    if (search) {
      filter["$or"] = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { employeeId: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const result = await EmployeeService.getAllEmployees(filter, {
      page: Number(page) || 1,
      limit: Number(limit) || 10,
    });

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Employees fetched successfully",
      data: result,
    });
  });

  static getEmployeeById = catchAsync(async (req, res) => {
    const { id } = req.params;
    const loggedInUser = res.locals.user;

    const employeeId = Array.isArray(id) ? id[0] : id;
    const employee = await EmployeeService.getEmployeeById(employeeId);

    if (
      loggedInUser.role !== "SUPER_ADMIN" &&
      employee.company?._id?.toString() !== loggedInUser.company?.toString()
    ) {
      throw new AppError(HttpStatusCode.Forbidden, "Forbidden", "You cannot access this employee");
    }

    if (
      loggedInUser.role === "JUNIOR_ADMIN" &&
      employee.branch?._id?.toString() !== loggedInUser.branch?.toString()
    ) {
      throw new AppError(HttpStatusCode.Forbidden, "Forbidden", "You can only access employees from your branch");
    }

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Employee fetched successfully",
      data: employee,
    });
  });

  static updateEmployee = catchAsync(async (req, res) => {
    const { id } = req.params;
    const payload = req.body;
    const loggedInUser = res.locals.user;

    const existingEmployee = await EmployeeService.getEmployeeById(id);

    if (
      loggedInUser.role !== "SUPER_ADMIN" &&
      existingEmployee.company?._id?.toString() !== loggedInUser.company?.toString()
    ) {
      throw new AppError(HttpStatusCode.Forbidden, "Forbidden", "You cannot update this employee");
    }

    if (
      loggedInUser.role === "JUNIOR_ADMIN" &&
      existingEmployee.branch?._id?.toString() !== loggedInUser.branch?.toString()
    ) {
      throw new AppError(HttpStatusCode.Forbidden, "Forbidden", "You can only update employees from your branch");
    }

    if (loggedInUser.role === "JUNIOR_ADMIN") {
      payload.branch = loggedInUser.branch;
      payload.company = loggedInUser.company;
    }

    const employee = await EmployeeService.updateEmployee(id, payload);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Employee updated successfully",
      data: employee,
    });
  });

  static deleteEmployee = catchAsync(async (req, res) => {
    const { id } = req.params;
    const loggedInUser = res.locals.user;

    const existingEmployee = await EmployeeService.getEmployeeById(id);

    if (
      loggedInUser.role !== "SUPER_ADMIN" &&
      existingEmployee.company?._id?.toString() !== loggedInUser.company?.toString()
    ) {
      throw new AppError(HttpStatusCode.Forbidden, "Forbidden", "You cannot delete this employee");
    }

    if (
      loggedInUser.role === "JUNIOR_ADMIN" &&
      existingEmployee.branch?._id?.toString() !== loggedInUser.branch?.toString()
    ) {
      throw new AppError(HttpStatusCode.Forbidden, "Forbidden", "You can only delete employees from your branch");
    }

    await EmployeeService.deleteEmployee(id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Employee deleted successfully",
      data: null,
    });
  });

  static toggleEmployeeStatus = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;
    const loggedInUser = res.locals.user;

    const existingEmployee = await EmployeeService.getEmployeeById(id);

    if (
      loggedInUser.role !== "SUPER_ADMIN" &&
      existingEmployee.company?._id?.toString() !== loggedInUser.company?.toString()
    ) {
      throw new AppError(HttpStatusCode.Forbidden, "Forbidden", "You cannot update this employee");
    }

    if (
      loggedInUser.role === "JUNIOR_ADMIN" &&
      existingEmployee.branch?._id?.toString() !== loggedInUser.branch?.toString()
    ) {
      throw new AppError(HttpStatusCode.Forbidden, "Forbidden", "You can only update employees from your branch");
    }

    const employee = await EmployeeService.toggleEmployeeStatus(id, isActive);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: `Employee ${isActive ? "activated" : "deactivated"} successfully`,
      data: employee,
    });
  });

  static getEmployeesDropdown = catchAsync(async (req, res) => {
    const loggedInUser = res.locals.user;
    const companyId = req.query.company || loggedInUser.company;
    const departmentId = req.query.department as string | undefined;

    if (
      loggedInUser.role !== "SUPER_ADMIN" &&
      companyId?.toString() !== loggedInUser.company?.toString()
    ) {
      throw new AppError(HttpStatusCode.Forbidden, "Forbidden", "Access denied");
    }

    const branchId = loggedInUser.role === "JUNIOR_ADMIN" ? loggedInUser.branch : undefined;

    const employees = await EmployeeService.getEmployeesDropdown(companyId, departmentId, branchId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Employees fetched successfully",
      data: employees,
    });
  });

  static getEmployeeStats = catchAsync(async (req, res) => {
    const loggedInUser = res.locals.user;
    const companyId = loggedInUser.role === "SUPER_ADMIN" ? req.query.company : loggedInUser.company;

    const stats = await EmployeeService.getEmployeeStats(companyId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Employee stats fetched successfully",
      data: stats,
    });
  });

  static countEmployees = catchAsync(async (req, res) => {
    const loggedInUser = res.locals.user;

    const filter: Record<string, any> = {};

    if (loggedInUser.role !== "SUPER_ADMIN") {
      filter.company = loggedInUser.company;
    }

    if (loggedInUser.role === "JUNIOR_ADMIN") {
      filter.branch = loggedInUser.branch;
    }

    const total = await EmployeeService.countEmployees(filter);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Employees count fetched successfully",
      data: { total },
    });
  });

  static generateEmployeeId = catchAsync(async (req, res) => {
    const loggedInUser = res.locals.user;
    const companyId = req.query.company || loggedInUser.company;

    const employeeId = await EmployeeService.generateEmployeeId(companyId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Employee ID generated successfully",
      data: { employeeId },
    });
  });

  static getMyProfile = catchAsync(async (_req, res) => {
    const loggedInUser = res.locals.user;
    const employee = await EmployeeService.getEmployeeByUserId(loggedInUser._id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "My profile fetched successfully",
      data: employee,
    });
  });

  static updateMyProfile = catchAsync(async (req, res) => {
    const loggedInUser = res.locals.user;
    const payload = req.body;

    const allowedFields = [
      "firstName",
      "lastName",
      "phone",
      "alternatePhone",
      "dateOfBirth",
      "gender",
      "maritalStatus",
      "bloodGroup",
      "currentAddress",
      "permanentAddress",
      "emergencyContact",
    ];

    const safePayload = Object.fromEntries(
      Object.entries(payload).filter(([key]) => allowedFields.includes(key))
    );

    const employee = await EmployeeService.updateEmployeeByUserId(loggedInUser._id, safePayload);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Profile updated successfully",
      data: employee,
    });
  });
}
