import { catchAsync } from "../../utils/catchAsync";
import { CompanyService } from "./company.service";
import sendResponse from "../../utils/sendResponse";
import httpStatus from "http-status";

export class CompanyController {
  /* =============================
          CREATE COMPANY
     ============================= */
  static createCompany = catchAsync(async (req, res) => {
    const payload = req.body;
    const loggedInUser = res.locals.user;

    const company = await CompanyService.createCompany(payload, loggedInUser._id);

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Company created successfully",
      data: company,
    });
  });

  /* =============================
          GET ALL COMPANIES
     ============================= */
  static getAllCompanies = catchAsync(async (req, res) => {
    const { page, limit, search, isActive } = req.query;

    const filter: Record<string, any> = {};

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    if (search) {
      filter["$or"] = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const result = await CompanyService.getAllCompanies(filter, {
      page: Number(page) || 1,
      limit: Number(limit) || 10,
    });

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Companies fetched successfully",
      data: result,
    });
  });

  /* =============================
          GET COMPANY BY ID
     ============================= */
  static getCompanyById = catchAsync(async (req, res) => {
    const { id } = req.params;

    const company = await CompanyService.getCompanyById(id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Company fetched successfully",
      data: company,
    });
  });

  /* =============================
          UPDATE COMPANY
     ============================= */
  static updateCompany = catchAsync(async (req, res) => {
    const { id } = req.params;
    const payload = req.body;

    const company = await CompanyService.updateCompany(id, payload);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Company updated successfully",
      data: company,
    });
  });

  /* =============================
          DELETE COMPANY
     ============================= */
  static deleteCompany = catchAsync(async (req, res) => {
    const { id } = req.params;

    await CompanyService.deleteCompany(id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Company deleted successfully",
      data: null,
    });
  });

  /* =============================
          TOGGLE STATUS
     ============================= */
  static toggleCompanyStatus = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;

    const company = await CompanyService.toggleCompanyStatus(id, isActive);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: `Company ${isActive ? "activated" : "deactivated"} successfully`,
      data: company,
    });
  });

  /* =============================
          COUNT COMPANIES
     ============================= */
  static countCompanies = catchAsync(async (req, res) => {
    const total = await CompanyService.countCompanies();

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Companies count fetched successfully",
      data: { total },
    });
  });
}

