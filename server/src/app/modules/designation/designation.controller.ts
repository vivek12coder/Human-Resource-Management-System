import { catchAsync } from "../../utils/catchAsync";
import { DesignationService } from "./designation.service";
import sendResponse from "../../utils/sendResponse";
import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import { HttpStatusCode } from "axios";

export class DesignationController {
  /* =============================
          CREATE DESIGNATION
     ============================= */
  static createDesignation = catchAsync(async (req, res) => {
    const payload = req.body;
    const loggedInUser = res.locals.user;

    if (loggedInUser.role !== "SUPER_ADMIN") {
      payload.company = loggedInUser.company;
    } else if (!payload.company) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Validation Error",
        "Company is required to create a designation"
      );
    }

    const designation = await DesignationService.createDesignation(
      payload,
      loggedInUser._id
    );

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Designation created successfully",
      data: designation,
    });
  });

  /* =============================
          GET ALL DESIGNATIONS
     ============================= */
  static getAllDesignations = catchAsync(async (req, res) => {
    const { page, limit, search, company, department } = req.query;
    const loggedInUser = res.locals.user;

    const filter: Record<string, any> = {};

    if (loggedInUser.role !== "SUPER_ADMIN") {
      filter.company = loggedInUser.company;
    } else if (company) {
      filter.company = company;
    }

    if (department) filter.department = department;

    if (search) {
      filter["$or"] = [
        { title: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
      ];
    }

    const result = await DesignationService.getAllDesignations(filter, {
      page: Number(page) || 1,
      limit: Number(limit) || 10,
    });

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Designations fetched successfully",
      data: result,
    });
  });

  /* =============================
          GET DESIGNATION BY ID
     ============================= */
  static getDesignationById = catchAsync(async (req, res) => {
    const id = req.params.id as string;
    const loggedInUser = res.locals.user;

    const designation = await DesignationService.getDesignationById(id);

    if (
      loggedInUser.role !== "SUPER_ADMIN" &&
      designation.company?._id?.toString() !== loggedInUser.company?.toString()
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
      message: "Designation fetched successfully",
      data: designation,
    });
  });

  /* =============================
          UPDATE DESIGNATION
     ============================= */
  static updateDesignation = catchAsync(async (req, res) => {
    const id = req.params.id as string;
    const payload = req.body;
    const loggedInUser = res.locals.user;

    const existingDesignation = await DesignationService.getDesignationById(id);

    if (
      loggedInUser.role !== "SUPER_ADMIN" &&
      existingDesignation.company?._id?.toString() !==
      loggedInUser.company?.toString()
    ) {
      throw new AppError(
        HttpStatusCode.Forbidden,
        "Forbidden",
        "Access denied"
      );
    }

    const designation = await DesignationService.updateDesignation(id, payload);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Designation updated successfully",
      data: designation,
    });
  });

  /* =============================
          DELETE DESIGNATION
     ============================= */
  static deleteDesignation = catchAsync(async (req, res) => {
    const id = req.params.id as string;
    const loggedInUser = res.locals.user;

    const existingDesignation = await DesignationService.getDesignationById(id);

    if (
      loggedInUser.role !== "SUPER_ADMIN" &&
      existingDesignation.company?._id?.toString() !==
      loggedInUser.company?.toString()
    ) {
      throw new AppError(
        HttpStatusCode.Forbidden,
        "Forbidden",
        "Access denied"
      );
    }

    await DesignationService.deleteDesignation(id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Designation deleted successfully",
      data: null,
    });
  });

  /* =============================
          GET DESIGNATIONS DROPDOWN
     ============================= */
  static getDesignationsDropdown = catchAsync(async (req, res) => {
    const loggedInUser = res.locals.user;
    const companyId = req.query.company || loggedInUser.company;
    const departmentId = req.query.department as string | undefined;

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

    const designations = await DesignationService.getDesignationsDropdown(
      companyId,
      departmentId
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Designations fetched successfully",
      data: designations,
    });
  });

  /* =============================
          COUNT DESIGNATIONS
     ============================= */
  static countDesignations = catchAsync(async (req, res) => {
    const loggedInUser = res.locals.user;

    const filter: Record<string, any> = {};

    if (loggedInUser.role !== "SUPER_ADMIN") {
      filter.company = loggedInUser.company;
    }

    const total = await DesignationService.countDesignations(filter);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Designations count fetched successfully",
      data: { total },
    });
  });
}

