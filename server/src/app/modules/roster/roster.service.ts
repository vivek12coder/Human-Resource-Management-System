import { Types } from "mongoose";
import { HttpStatusCode } from "axios";
import AppError from "../../errors/AppError";
import Roster, { IRoster } from "./roster.model";

interface BulkRosterPayload {
  company: string | Types.ObjectId;
  branch?: string | Types.ObjectId;
  employees: string[];
  shift?: string;
  fromDate: string;
  toDate: string;
  status?: "Scheduled" | "Week-Off" | "On-Leave" | "Holiday";
  notes?: string;
}

export class RosterService {
  private static normalizeDate(date: string | Date) {
    const value = new Date(date);
    value.setHours(0, 0, 0, 0);
    return value;
  }

  static async createRoster(payload: Partial<IRoster>, createdBy: Types.ObjectId) {
    if (!payload.employee || !payload.rosterDate) {
      throw new AppError(
        HttpStatusCode.BadRequest,
        "Request Failed",
        "Employee and roster date are required"
      );
    }

    const rosterDate = this.normalizeDate(payload.rosterDate);

    const existing = await Roster.findOne({
      employee: payload.employee,
      rosterDate,
      isDeleted: false,
    });

    if (existing) {
      throw new AppError(
        HttpStatusCode.BadRequest,
        "Request Failed",
        "Roster already exists for this employee and date"
      );
    }

    return Roster.create({
      ...payload,
      rosterDate,
      createdBy,
    });
  }

  static async bulkAssignRoster(payload: BulkRosterPayload, createdBy: Types.ObjectId) {
    const from = this.normalizeDate(payload.fromDate);
    const to = this.normalizeDate(payload.toDate);

    if (from > to) {
      throw new AppError(
        HttpStatusCode.BadRequest,
        "Request Failed",
        "fromDate cannot be greater than toDate"
      );
    }

    const operations: any[] = [];

    for (const employeeId of payload.employees) {
      const currentDate = new Date(from);
      while (currentDate <= to) {
        operations.push({
          updateOne: {
            filter: {
              employee: new Types.ObjectId(employeeId),
              rosterDate: new Date(currentDate),
              isDeleted: false,
            },
            update: {
              $set: {
                company: payload.company,
                branch: payload.branch,
                shift: payload.shift,
                status: payload.status || "Scheduled",
                notes: payload.notes,
              },
              $setOnInsert: {
                isPublished: false,
                createdBy,
              },
            },
            upsert: true,
          },
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    if (operations.length > 0) {
      await Roster.bulkWrite(operations);
    }

    return {
      assignedRecords: operations.length,
      employees: payload.employees.length,
      fromDate: from,
      toDate: to,
    };
  }

  static async getAllRosters(
    filter: Record<string, unknown> = {},
    query: { page?: number; limit?: number } = { page: 1, limit: 31 }
  ) {
    const page = query.page || 1;
    const limit = query.limit || 31;
    const skip = (page - 1) * limit;
    const finalFilter = { ...filter, isDeleted: false };

    const rosters = await Roster.find(finalFilter)
      .select("-__v")
      .populate("company", "name code")
      .populate("branch", "name code")
      .populate("employee", "employeeId firstName lastName")
      .populate("shift", "name code startTime endTime")
      .sort({ rosterDate: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Roster.countDocuments(finalFilter);

    return {
      rosters,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async getRosterById(_id: string | Types.ObjectId) {
    const roster = await Roster.findById(_id)
      .select("-__v")
      .populate("company", "name code")
      .populate("branch", "name code")
      .populate("employee", "employeeId firstName lastName")
      .populate("shift", "name code startTime endTime")
      .lean();

    if (!roster || roster.isDeleted) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Roster not found!"
      );
    }

    return roster;
  }

  static async getEmployeeRoster(
    employeeId: string | Types.ObjectId,
    month: number,
    year: number
  ) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const rosters = await Roster.find({
      employee: employeeId,
      rosterDate: { $gte: startDate, $lte: endDate },
      isDeleted: false,
    })
      .select("-__v")
      .populate("shift", "name code startTime endTime")
      .sort({ rosterDate: 1 })
      .lean();

    return {
      employeeId,
      month,
      year,
      rosters,
    };
  }

  static async updateRoster(_id: string | Types.ObjectId, payload: Partial<IRoster>) {
    const existingRoster = await Roster.findById(_id).lean();

    if (!existingRoster || existingRoster.isDeleted) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Roster not found!"
      );
    }

    const employeeId = payload.employee || existingRoster.employee;
    const rosterDate = payload.rosterDate
      ? this.normalizeDate(payload.rosterDate)
      : existingRoster.rosterDate;

    const duplicate = await Roster.findOne({
      employee: employeeId,
      rosterDate,
      _id: { $ne: _id },
      isDeleted: false,
    });

    if (duplicate) {
      throw new AppError(
        HttpStatusCode.BadRequest,
        "Request Failed",
        "Roster already exists for this employee and date"
      );
    }

    const roster = await Roster.findByIdAndUpdate(
      _id,
      { ...payload, rosterDate },
      { new: true }
    )
      .select("-__v")
      .populate("employee", "employeeId firstName lastName")
      .populate("shift", "name code startTime endTime")
      .lean();

    if (!roster || roster.isDeleted) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Roster not found!"
      );
    }

    return roster;
  }

  static async publishRoster(_id: string | Types.ObjectId, isPublished: boolean) {
    const roster = await Roster.findByIdAndUpdate(_id, { isPublished }, { new: true })
      .select("-__v")
      .lean();

    if (!roster || roster.isDeleted) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Roster not found!"
      );
    }

    return roster;
  }

  static async deleteRoster(_id: string | Types.ObjectId) {
    const roster = await Roster.findByIdAndUpdate(
      _id,
      { isDeleted: true, isPublished: false },
      { new: true }
    ).lean();

    if (!roster) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Roster not found!"
      );
    }

    return roster;
  }
}
