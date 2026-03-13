import { catchAsync } from "../../utils/catchAsync";
import { DepartmentService } from "./department.service";
import sendResponse from "../../utils/sendResponse";
import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import { HttpStatusCode } from "axios";

export class DepartmentController {
  /* =============================
          CREATE DEPARTMENT
     ============================= */
  static createDepartment = catchAsync(async (req, res) => {
    const payload = req.body;
    const loggedInUser = res.locals.user;

    if (loggedInUser.role !== "SUPER_ADMIN") {
      payload.company = loggedInUser.company;
    }

    const department = await DepartmentService.createDepartment(
      payload,
      loggedInUser._id
    );

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Department created successfully",
      data: department,
    });
  });

  /* =============================
          GET ALL DEPARTMENTS
     ============================= */
  static getAllDepartments = catchAsync(async (req, res) => {
    const { page, limit, search, company } = req.query;
    const loggedInUser = res.locals.user;

    const filter: Record<string, any> = {};

    if (loggedInUser.role !== "SUPER_ADMIN") {
      filter.company = loggedInUser.company;
    } else if (company) {
      filter.company = company;
    }

    if (search) {
      filter["$or"] = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
      ];
    }

    const result = await DepartmentService.getAllDepartments(filter, {
      page: Number(page) || 1,
      limit: Number(limit) || 10,
    });

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Departments fetched successfully",
      data: result,
    });
  });

  /* =============================
          GET DEPARTMENT BY ID
     ============================= */
  static getDepartmentById = catchAsync(async (req, res) => {
    const id = req.params.id as string;
    const loggedInUser = res.locals.user;

    const department = await DepartmentService.getDepartmentById(id);

    if (
      loggedInUser.role !== "SUPER_ADMIN" &&
      department.company?._id?.toString() !== loggedInUser.company?.toString()
    ) {
      throw new AppError(
        HttpStatusCode.Forbidden,
        "Forbidden",
        "You cannot access this department"
      );
    }

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Department fetched successfully",
      data: department,
    });
  });

  /* =============================
          UPDATE DEPARTMENT
     ============================= */
  static updateDepartment = catchAsync(async (req, res) => {
    const id = req.params.id as string;
    const payload = req.body;
    const loggedInUser = res.locals.user;

    const existingDept = await DepartmentService.getDepartmentById(id);

    if (
      loggedInUser.role !== "SUPER_ADMIN" &&
      existingDept.company?._id?.toString() !== loggedInUser.company?.toString()
    ) {
      throw new AppError(
        HttpStatusCode.Forbidden,
        "Forbidden",
        "You cannot update this department"
      );
    }

    const department = await DepartmentService.updateDepartment(id, payload);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Department updated successfully",
      data: department,
    });
  });

  /* =============================
          DELETE DEPARTMENT
     ============================= */
  static deleteDepartment = catchAsync(async (req, res) => {
    const id = req.params.id as string;
    const loggedInUser = res.locals.user;

    const existingDept = await DepartmentService.getDepartmentById(id);

    if (
      loggedInUser.role !== "SUPER_ADMIN" &&
      existingDept.company?._id?.toString() !== loggedInUser.company?.toString()
    ) {
      throw new AppError(
        HttpStatusCode.Forbidden,
        "Forbidden",
        "You cannot delete this department"
      );
    }

    await DepartmentService.deleteDepartment(id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Department deleted successfully",
      data: null,
    });
  });

  /* =============================
          GET DEPARTMENTS DROPDOWN
     ============================= */
  static getDepartmentsDropdown = catchAsync(async (req, res) => {
    const loggedInUser = res.locals.user;
    const companyId = req.query.company || loggedInUser.company;

    if (
      loggedInUser.role !== "SUPER_ADMIN" &&
      companyId?.toString() !== loggedInUser.company?.toString()
    ) {
      throw new AppError(
        HttpStatusCode.Forbidden,
        "Forbidden",
        "Access denied"
      );
    }

    const departments = await DepartmentService.getDepartmentsDropdown(companyId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Departments fetched successfully",
      data: departments,
    });
  });

  /* =============================
          COUNT DEPARTMENTS
     ============================= */
  static countDepartments = catchAsync(async (req, res) => {
    const loggedInUser = res.locals.user;

    const filter: Record<string, any> = {};

    if (loggedInUser.role !== "SUPER_ADMIN") {
      filter.company = loggedInUser.company;
    }

    const total = await DepartmentService.countDepartments(filter);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Departments count fetched successfully",
      data: { total },
    });
  });
}

