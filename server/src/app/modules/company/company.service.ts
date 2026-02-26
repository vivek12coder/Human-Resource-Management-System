import Company, { ICompany } from "./company.model";
import User from "../user/user.model";
import { Types } from "mongoose";
import { HttpStatusCode } from "axios";
import AppError from "../../errors/AppError";
import { UserService } from "../user/user.service";

type CreateCompanyPayload = Partial<ICompany> & {
  adminName: string;
  adminRole: "ADMIN";
  adminEmail: string;
  adminPassword: string;
};

type UpdateCompanyPayload = Partial<ICompany> & {
  adminName?: string;
  adminRole?: "ADMIN";
  adminEmail?: string;
  adminPassword?: string;
};

export class CompanyService {
  static async generateUniqueCompanyCode(name: string) {
    const base = (name || "CMP")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 6) || "CMP";

    for (let i = 0; i < 20; i += 1) {
      const random = Math.floor(1000 + Math.random() * 9000);
      const code = `${base}${random}`;
      const exists = await Company.exists({ code });
      if (!exists) return code;
    }

    throw new AppError(
      HttpStatusCode.InternalServerError,
      "Request Failed",
      "Unable to generate unique company code, please try again"
    );
  }

  /* =============================
          CREATE COMPANY
     ============================= */
  static async createCompany(
    payload: CreateCompanyPayload,
    createdBy: Types.ObjectId
  ) {
    const {
      adminName,
      adminRole,
      adminEmail,
      adminPassword,
      code,
      ...companyData
    } = payload;

    const finalCode = code?.toUpperCase()
      ? code.toUpperCase()
      : await CompanyService.generateUniqueCompanyCode(payload.name || "CMP");

    // Check if company code already exists
    const existingCompany = await Company.findOne({
      code: finalCode,
    });

    if (existingCompany) {
      throw new AppError(
        HttpStatusCode.BadRequest,
        "Request Failed",
        "Company with this code already exists!"
      );
    }

    const existingAdmin = await User.findOne({
      email: adminEmail.toLowerCase(),
      isDeleted: false,
    });

    if (existingAdmin) {
      throw new AppError(
        HttpStatusCode.BadRequest,
        "Request Failed",
        "User with this admin email already exists!"
      );
    }

    const company = await Company.create({
      ...companyData,
      email: adminEmail.toLowerCase(),
      code: finalCode,
      createdBy,
    });

    try {
      await User.create({
        name: adminName,
        email: adminEmail.toLowerCase(),
        password: adminPassword,
        role: adminRole,
        company: company._id,
      });
    } catch (error) {
      await Company.findByIdAndDelete(company._id);
      throw error;
    }

    return company;
  }

  /* =============================
          GET ALL COMPANIES
     ============================= */
  static async getAllCompanies(
    filter: Record<string, any> = {},
    query: { page?: number; limit?: number } = { page: 1, limit: 10 }
  ) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const finalFilter = { ...filter, isDeleted: false };

    const companies = await Company.find(finalFilter)
      .select("-__v")
      .populate("createdBy", "name email")
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 })
      .lean();

    const total = await Company.countDocuments(finalFilter);

    return {
      companies,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /* =============================
          GET COMPANY BY ID
     ============================= */
  static async getCompanyById(_id: string | Types.ObjectId) {
    const company = await Company.findById(_id)
      .select("-__v")
      .populate("createdBy", "name email")
      .lean();

    if (!company || company.isDeleted) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Company not found!"
      );
    }

    return company;
  }

  /* =============================
          UPDATE COMPANY
     ============================= */
  static async updateCompany(
    _id: string | Types.ObjectId,
    payload: UpdateCompanyPayload
  ) {
    const {
      adminName,
      adminRole,
      adminEmail,
      adminPassword,
      ...companyPayload
    } = payload;

    // If updating code, check uniqueness
    if (companyPayload.code) {
      const existingCompany = await Company.findOne({
        code: companyPayload.code.toUpperCase(),
        _id: { $ne: _id },
      });

      if (existingCompany) {
        throw new AppError(
          HttpStatusCode.BadRequest,
          "Request Failed",
          "Company with this code already exists!"
        );
      }
      companyPayload.code = companyPayload.code.toUpperCase();
    }

    if (adminRole && adminRole !== "ADMIN") {
      throw new AppError(
        HttpStatusCode.BadRequest,
        "Request Failed",
        "Admin role must be ADMIN"
      );
    }

    const adminUpdates: Record<string, any> = {};
    if (adminName) adminUpdates.name = adminName.trim();
    if (adminPassword) adminUpdates.password = adminPassword;

    const needsAdminUpdate =
      Object.keys(adminUpdates).length > 0 || Boolean(adminEmail);
    if (needsAdminUpdate) {
      const companyAdminUser = await User.findOne({
        company: _id,
        role: "ADMIN",
        isDeleted: false,
      }).lean();

      if (!companyAdminUser) {
        throw new AppError(
          HttpStatusCode.NotFound,
          "Request Failed",
          "Company admin user not found!"
        );
      }

      if (adminEmail) {
        const normalizedEmail = adminEmail.toLowerCase();
        const existingUser = await User.findOne({
          email: normalizedEmail,
          _id: { $ne: companyAdminUser._id },
          isDeleted: false,
        }).lean();

        if (existingUser) {
          throw new AppError(
            HttpStatusCode.BadRequest,
            "Request Failed",
            "User with this admin email already exists!"
          );
        }

        adminUpdates.email = normalizedEmail;
        companyPayload.email = normalizedEmail;
      }

      await UserService.updateUser({ _id: companyAdminUser._id }, adminUpdates);
    }

    const company = await Company.findByIdAndUpdate(_id, companyPayload, { new: true })
      .select("-__v")
      .populate("createdBy", "name email")
      .lean();

    if (!company) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Company not found!"
      );
    }

    return company;
  }

  /* =============================
          DELETE COMPANY (SOFT)
     ============================= */
  static async deleteCompany(_id: string | Types.ObjectId) {
    const company = await Company.findByIdAndUpdate(
      _id,
      { isDeleted: true },
      { new: true }
    ).lean();

    if (!company) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Company not found!"
      );
    }

    return company;
  }

  /* =============================
          TOGGLE COMPANY STATUS
     ============================= */
  static async toggleCompanyStatus(
    _id: string | Types.ObjectId,
    isActive: boolean
  ) {
    const company = await Company.findByIdAndUpdate(
      _id,
      { isActive },
      { new: true }
    )
      .select("-__v")
      .lean();

    if (!company || company.isDeleted) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Company not found!"
      );
    }

    return company;
  }

  /* =============================
          COUNT COMPANIES
     ============================= */
  static async countCompanies(filter: Record<string, any> = {}) {
    return await Company.countDocuments({ ...filter, isDeleted: false });
  }
}

