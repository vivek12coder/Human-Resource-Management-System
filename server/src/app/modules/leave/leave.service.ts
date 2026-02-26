import Leave, { ILeave } from "./leave.model";
import Employee from "../employee/employee.model";
import Attendance from "../attendence/attendance.model";
import { Types } from "mongoose";
import { HttpStatusCode } from "axios";
import AppError from "../../errors/AppError";

export class LeaveService {
  /* =============================
          APPLY LEAVE
     ============================= */
  static async applyLeave(
    payload: Partial<ILeave>,
    employeeId: Types.ObjectId,
    createdBy: Types.ObjectId
  ) {
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Employee not found!"
      );
    }

    const startDate = new Date(payload.startDate as Date);
    const endDate = new Date(payload.endDate as Date);

    if (startDate > endDate) {
      throw new AppError(
        HttpStatusCode.BadRequest,
        "Request Failed",
        "End date must be after start date!"
      );
    }

    // Calculate total days
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    let totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (payload.isHalfDay) {
      totalDays = 0.5;
    }

    // Check leave balance
    const leaveType = payload.leaveType?.toLowerCase() as keyof typeof employee.leaveBalance;
    if (
      employee.leaveBalance &&
      leaveType &&
      employee.leaveBalance[leaveType] !== undefined
    ) {
      if (employee.leaveBalance[leaveType] < totalDays) {
        throw new AppError(
          HttpStatusCode.BadRequest,
          "Request Failed",
          `Insufficient ${payload.leaveType} leave balance! Available: ${employee.leaveBalance[leaveType]} days`
        );
      }
    }

    // Check for overlapping leaves
    const overlappingLeave = await Leave.findOne({
      employee: employeeId,
      status: { $in: ["Pending", "Approved"] },
      $or: [
        { startDate: { $lte: endDate }, endDate: { $gte: startDate } },
      ],
    });

    if (overlappingLeave) {
      throw new AppError(
        HttpStatusCode.BadRequest,
        "Request Failed",
        "You already have a leave request for these dates!"
      );
    }

    const leave = await Leave.create({
      ...payload,
      employee: employeeId,
      company: employee.company,
      branch: employee.branch,
      totalDays,
      createdBy,
    });

    return leave;
  }

  /* =============================
          GET ALL LEAVES
     ============================= */
  static async getAllLeaves(
    filter: Record<string, any>,
    query: { page?: number; limit?: number } = { page: 1, limit: 10 }
  ) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const leaves = await Leave.find(filter)
      .select("-__v")
      .populate("employee", "employeeId firstName lastName email")
      .populate("company", "name code")
      .populate("approvedBy", "name email")
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 })
      .lean();

    const total = await Leave.countDocuments(filter);

    return {
      leaves,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /* =============================
          GET LEAVE BY ID
     ============================= */
  static async getLeaveById(_id: string | Types.ObjectId) {
    const leave = await Leave.findById(_id)
      .select("-__v")
      .populate("employee", "employeeId firstName lastName email")
      .populate("company", "name code")
      .populate("approvedBy", "name email")
      .lean();

    if (!leave) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Leave not found!"
      );
    }

    return leave;
  }

  /* =============================
          APPROVE LEAVE
     ============================= */
  static async approveLeave(
    _id: Types.ObjectId,
    approvedBy: Types.ObjectId
  ) {
    const leave = await Leave.findById(_id);

    if (!leave) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Leave not found!"
      );
    }

    if (leave.status !== "Pending") {
      throw new AppError(
        HttpStatusCode.BadRequest,
        "Request Failed",
        `Leave is already ${leave.status.toLowerCase()}!`
      );
    }

    // Deduct from leave balance
    const employee = await Employee.findById(leave.employee);
    if (employee && employee.leaveBalance) {
      const leaveType = leave.leaveType.toLowerCase() as keyof typeof employee.leaveBalance;
      if (employee.leaveBalance[leaveType] !== undefined) {
        employee.leaveBalance[leaveType] -= leave.totalDays;
        await employee.save();
      }
    }

    // Mark attendance as on-leave for the leave days
    const startDate = new Date(leave.startDate);
    const endDate = new Date(leave.endDate);
    
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dateOnly = new Date(date);
      dateOnly.setHours(0, 0, 0, 0);

      await Attendance.findOneAndUpdate(
        { employee: leave.employee, date: dateOnly },
        {
          employee: leave.employee,
          company: leave.company,
          branch: leave.branch,
          date: dateOnly,
          status: "On-Leave",
          createdBy: approvedBy,
        },
        { upsert: true, new: true }
      );
    }

    leave.status = "Approved";
    leave.approvedBy = approvedBy;
    leave.approvedAt = new Date();
    await leave.save();

    return leave;
  }

  /* =============================
          REJECT LEAVE
     ============================= */
  static async rejectLeave(
    _id: Types.ObjectId,
    rejectionReason: string,
    rejectedBy: Types.ObjectId
  ) {
    const leave = await Leave.findById(_id);

    if (!leave) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Leave not found!"
      );
    }

    if (leave.status !== "Pending") {
      throw new AppError(
        HttpStatusCode.BadRequest,
        "Request Failed",
        `Leave is already ${leave.status.toLowerCase()}!`
      );
    }

    leave.status = "Rejected";
    leave.rejectionReason = rejectionReason;
    leave.approvedBy = rejectedBy;
    leave.approvedAt = new Date();
    await leave.save();

    return leave;
  }

  /* =============================
          CANCEL LEAVE
     ============================= */
  static async cancelLeave(
    _id: Types.ObjectId,
    cancellationReason: string,
    cancelledBy: Types.ObjectId
  ) {
    const leave = await Leave.findById(_id);

    if (!leave) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Leave not found!"
      );
    }

    if (leave.status === "Cancelled") {
      throw new AppError(
        HttpStatusCode.BadRequest,
        "Request Failed",
        "Leave is already cancelled!"
      );
    }

    // If was approved, restore leave balance
    if (leave.status === "Approved") {
      const employee = await Employee.findById(leave.employee);
      if (employee && employee.leaveBalance) {
        const leaveType = leave.leaveType.toLowerCase() as keyof typeof employee.leaveBalance;
        if (employee.leaveBalance[leaveType] !== undefined) {
          employee.leaveBalance[leaveType] += leave.totalDays;
          await employee.save();
        }
      }

      // Remove attendance entries
      const startDate = new Date(leave.startDate);
      const endDate = new Date(leave.endDate);
      
      await Attendance.deleteMany({
        employee: leave.employee,
        date: { $gte: startDate, $lte: endDate },
        status: "On-Leave",
      });
    }

    leave.status = "Cancelled";
    leave.cancelledBy = cancelledBy;
    leave.cancelledAt = new Date();
    leave.cancellationReason = cancellationReason;
    await leave.save();

    return leave;
  }

  /* =============================
          GET EMPLOYEE LEAVES
     ============================= */
  static async getEmployeeLeaves(
    employeeId: Types.ObjectId,
    year?: number
  ) {
    const filter: Record<string, any> = { employee: employeeId };

    if (year) {
      filter.startDate = {
        $gte: new Date(year, 0, 1),
        $lte: new Date(year, 11, 31),
      };
    }

    const leaves = await Leave.find(filter)
      .select("-__v")
      .sort({ startDate: -1 })
      .lean();

    return leaves;
  }

  /* =============================
          GET LEAVE BALANCE
     ============================= */
  static async getLeaveBalance(employeeId: Types.ObjectId) {
    const employee = await Employee.findById(employeeId).lean();

    if (!employee) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Employee not found!"
      );
    }

    return employee.leaveBalance || {
      casual: 12,
      sick: 12,
      earned: 15,
      unpaid: 0,
    };
  }

  /* =============================
          GET PENDING LEAVES COUNT
     ============================= */
  static async getPendingLeavesCount(companyId: Types.ObjectId) {
    return await Leave.countDocuments({
      company: companyId,
      status: "Pending",
    });
  }

  /* =============================
          GET LEAVE STATS
     ============================= */
  static async getLeaveStats(
    companyId: Types.ObjectId,
    year?: number
  ) {
    const currentYear = year || new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31);

    const [total, pending, approved, rejected] = await Promise.all([
      Leave.countDocuments({
        company: companyId,
        startDate: { $gte: startOfYear, $lte: endOfYear },
      }),
      Leave.countDocuments({
        company: companyId,
        status: "Pending",
        startDate: { $gte: startOfYear, $lte: endOfYear },
      }),
      Leave.countDocuments({
        company: companyId,
        status: "Approved",
        startDate: { $gte: startOfYear, $lte: endOfYear },
      }),
      Leave.countDocuments({
        company: companyId,
        status: "Rejected",
        startDate: { $gte: startOfYear, $lte: endOfYear },
      }),
    ]);

    return { total, pending, approved, rejected, year: currentYear };
  }
}

