import Employee, { IEmployee } from "./employee.model";
import { Types, startSession } from "mongoose";
import { HttpStatusCode } from "axios";
import AppError from "../../errors/AppError";

export class EmployeeService {
  static async createEmployee(payload: Partial<IEmployee>, createdBy: Types.ObjectId) {
    const existingEmployee = await Employee.findOne({
      company: payload.company,
      employeeId: payload.employeeId,
    });

    if (existingEmployee) {
      throw new AppError(
        HttpStatusCode.BadRequest,
        "Request Failed",
        "Employee with this ID already exists in this company!"
      );
    }

    const existingEmail = await Employee.findOne({
      email: payload.email?.toLowerCase(),
      isDeleted: false,
    });

    if (existingEmail) {
      throw new AppError(
        HttpStatusCode.BadRequest,
        "Request Failed",
        "Employee with this email already exists!"
      );
    }

    const session = await startSession();
    let employeeData = null;

    try {
      await session.withTransaction(async () => {
        const [employee] = await Employee.create(
          [
            {
              ...payload,
              email: payload.email?.toLowerCase(),
              createdBy,
            },
          ],
          { session }
        );

        employeeData = employee;
      });
    } finally {
      await session.endSession();
    }

    return employeeData;
  }

  static async getAllEmployees(
    filter: Record<string, any> = {},
    query: { page?: number; limit?: number } = { page: 1, limit: 10 }
  ) {
    try {
      const page = query.page || 1;
      const limit = query.limit || 10;
      const skip = (page - 1) * limit;

      const finalFilter = { ...filter, isDeleted: false };

      // In non-production environments, use a simpler query with populate
      // to avoid any aggregation-related performance or timeout issues
      // that can surface with small local datasets.
      if (process.env.NODE_ENV !== 'production') {
        const employees = await Employee.find(finalFilter)
          .select("-__v")
          .populate("company", "name code")
          .populate("branch", "name code")
          .populate("department", "name code")
          .populate("designation", "title")
          .populate("reportingManager", "firstName lastName email")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean();

        const total = await Employee.countDocuments(finalFilter);

        return {
          employees,
          total,
          page,
          totalPages: Math.ceil(total / limit),
        };
      }

      // Use aggregation pipeline for better performance (single query instead of N+1)
      const aggregationPipeline = [
        // Match stage - filter documents
        { $match: finalFilter },

        // Lookup stages - equivalent to populate but in single query
        {
          $lookup: {
            from: "companies",
            localField: "company",
            foreignField: "_id",
            as: "company",
            pipeline: [{ $project: { name: 1, code: 1 } }]
          }
        },
        {
          $lookup: {
            from: "branches",
            localField: "branch",
            foreignField: "_id",
            as: "branch",
            pipeline: [{ $project: { name: 1, code: 1 } }]
          }
        },
        {
          $lookup: {
            from: "departments",
            localField: "department",
            foreignField: "_id",
            as: "department",
            pipeline: [{ $project: { name: 1, code: 1 } }]
          }
        },
        {
          $lookup: {
            from: "designations",
            localField: "designation",
            foreignField: "_id",
            as: "designation",
            pipeline: [{ $project: { title: 1 } }]
          }
        },
        {
          $lookup: {
            from: "employees",
            localField: "reportingManager",
            foreignField: "_id",
            as: "reportingManager",
            pipeline: [{ $project: { firstName: 1, lastName: 1, email: 1 } }]
          }
        },

        // Unwind stages - convert arrays to objects (since it's 1:1 relationship)
        { $unwind: { path: "$company", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$branch", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$department", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$designation", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$reportingManager", preserveNullAndEmptyArrays: true } },

        // Sort stage
        { $sort: { createdAt: -1 } },

        // Pagination stages
        { $skip: skip },
        { $limit: limit },

        // Project stage - exclude unwanted fields
        { $project: { __v: 0 } }
      ];

      // Execute aggregation for employees in production
      // Use a generous timeout to avoid unnecessary failures in normal usage
      const employees = await Employee.aggregate(aggregationPipeline)
        .maxTimeMS(60000);

      // Get total count with same filter (optimized count)
      const totalPipeline = [
        { $match: finalFilter },
        { $count: "total" }
      ];

      const totalResult = await Employee.aggregate(totalPipeline)
        .maxTimeMS(60000);
      const total = totalResult.length > 0 ? totalResult[0].total : 0;

      return {
        employees,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to fetch employees';

      // Handle specific MongoDB errors
      if (errorMessage.includes('exceeds maximum')) {
        throw AppError.database('Query result too large, please refine your filters', {
          code: 'QUERY_TOO_LARGE',
          originalError: errorMessage
        });
      }

      if (errorMessage.includes('timed out') || errorMessage.includes('maxTimeMS')) {
        throw AppError.timeout('Query took too long, please try again with narrower filters');
      }

      // Log detailed error for debugging
      console.error('[EmployeeService.getAllEmployees] Error:', {
        errorMessage,
        errorCode: error?.code,
        errorName: error?.name,
        stack: error?.stack
      });

      throw AppError.database('Failed to fetch employees', {
        originalError: errorMessage
      });
    }
  }

  static async getEmployeeById(_id: string | Types.ObjectId) {
    // Use aggregation pipeline for optimized single query
    const aggregationPipeline = [
      // Match the specific employee
      {
        $match: {
          _id: new Types.ObjectId(_id),
          isDeleted: false
        }
      },

      // Lookup stages - all joins in single query
      {
        $lookup: {
          from: "companies",
          localField: "company",
          foreignField: "_id",
          as: "company",
          pipeline: [{ $project: { name: 1, code: 1 } }]
        }
      },
      {
        $lookup: {
          from: "branches",
          localField: "branch",
          foreignField: "_id",
          as: "branch",
          pipeline: [{ $project: { name: 1, code: 1 } }]
        }
      },
      {
        $lookup: {
          from: "departments",
          localField: "department",
          foreignField: "_id",
          as: "department",
          pipeline: [{ $project: { name: 1, code: 1 } }]
        }
      },
      {
        $lookup: {
          from: "designations",
          localField: "designation",
          foreignField: "_id",
          as: "designation",
          pipeline: [{ $project: { title: 1 } }]
        }
      },
      {
        $lookup: {
          from: "employees",
          localField: "reportingManager",
          foreignField: "_id",
          as: "reportingManager",
          pipeline: [{ $project: { firstName: 1, lastName: 1, email: 1 } }]
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "user",
          pipeline: [{ $project: { name: 1, email: 1, role: 1 } }]
        }
      },

      // Unwind stages - convert arrays to objects
      { $unwind: { path: "$company", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$branch", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$department", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$designation", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$reportingManager", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },

      // Project stage - exclude unwanted fields
      { $project: { __v: 0 } },

      // Limit to 1 result
      { $limit: 1 }
    ];

    const result = await Employee.aggregate(aggregationPipeline);
    const employee = result.length > 0 ? result[0] : null;

    if (!employee) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Employee not found!"
      );
    }

    return employee;
  }

  static async getEmployeeByUserId(userId: string | Types.ObjectId) {
    const employee = await Employee.findOne({ user: userId, isDeleted: false })
      .select("-__v")
      .populate("company", "name code")
      .populate("branch", "name code")
      .populate("department", "name code")
      .populate("designation", "title")
      .populate("reportingManager", "firstName lastName email")
      .populate("user", "name email role")
      .lean();

    if (!employee) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Employee profile not found!"
      );
    }

    return employee;
  }

  static async updateEmployee(_id: string | Types.ObjectId, payload: Partial<IEmployee>) {
    if (payload.email) {
      const existingEmail = await Employee.findOne({
        email: payload.email.toLowerCase(),
        _id: { $ne: _id },
        isDeleted: false,
      });

      if (existingEmail) {
        throw new AppError(
          HttpStatusCode.BadRequest,
          "Request Failed",
          "Employee with this email already exists!"
        );
      }
      payload.email = payload.email.toLowerCase();
    }

    const employee = await Employee.findByIdAndUpdate(_id, payload, { new: true })
      .select("-__v")
      .populate("company", "name code")
      .populate("branch", "name code")
      .populate("department", "name code")
      .lean();

    if (!employee) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Employee not found!"
      );
    }

    return employee;
  }

  static async updateEmployeeByUserId(
    userId: string | Types.ObjectId,
    payload: Partial<IEmployee>
  ) {
    const existingEmployee = await Employee.findOne({ user: userId, isDeleted: false })
      .select("_id")
      .lean();

    if (!existingEmployee?._id) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Employee profile not found!"
      );
    }

    return this.updateEmployee(existingEmployee._id, payload);
  }

  static async deleteEmployee(_id: string | Types.ObjectId) {
    const employee = await Employee.findByIdAndUpdate(
      _id,
      { isDeleted: true, isActive: false },
      { new: true }
    ).lean();

    if (!employee) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Employee not found!"
      );
    }

    return employee;
  }

  static async toggleEmployeeStatus(_id: string | Types.ObjectId, isActive: boolean) {
    const employee = await Employee.findByIdAndUpdate(_id, { isActive }, { new: true })
      .select("-__v")
      .lean();

    if (!employee || employee.isDeleted) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Employee not found!"
      );
    }

    return employee;
  }

  static async getEmployeesDropdown(
    companyId: string | Types.ObjectId,
    departmentId?: string,
    branchId?: string | Types.ObjectId
  ) {
    const filter: Record<string, any> = {
      company: companyId,
      isDeleted: false,
      isActive: true,
    };

    if (departmentId) {
      filter.department = departmentId;
    }

    if (branchId) {
      filter.branch = branchId;
    }

    const employees = await Employee.find(filter)
      .select("employeeId firstName lastName email branch")
      .lean();

    return employees;
  }

  static async countEmployees(filter: Record<string, any> = {}) {
    return await Employee.countDocuments({ ...filter, isDeleted: false });
  }

  static async getEmployeeStats(companyId?: string | Types.ObjectId) {
    const filter: Record<string, any> = { isDeleted: false };
    if (companyId) {
      filter.company = companyId;
    }

    const [total, active, onNotice, resigned] = await Promise.all([
      Employee.countDocuments(filter),
      Employee.countDocuments({ ...filter, employmentStatus: "Active" }),
      Employee.countDocuments({ ...filter, employmentStatus: "On-Notice" }),
      Employee.countDocuments({ ...filter, employmentStatus: "Resigned" }),
    ]);

    return { total, active, onNotice, resigned };
  }

  static async generateEmployeeId(companyId: string | Types.ObjectId) {
    const count = await Employee.countDocuments({ company: companyId });
    const year = new Date().getFullYear().toString().slice(-2);
    return `EMP${year}${String(count + 1).padStart(4, "0")}`;
  }
}
