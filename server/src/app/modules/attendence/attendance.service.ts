import Attendance, { IAttendance } from "./attendance.model";
import Employee from "../employee/employee.model";
import Shift from "../shift/shift.model";
import { Types } from "mongoose";
import Branch from "../branch/branch.model";
import { HttpStatusCode } from "axios";
import AppError from "../../errors/AppError";

export class AttendanceService {
  /**
   * Calculate distance between two points in meters using Haversine formula
   */
  private static calculateDistanceString(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const rad = Math.PI / 180;
    const phi1 = lat1 * rad;
    const phi2 = lat2 * rad;
    const deltaPhi = (lat2 - lat1) * rad;
    const deltaLambda = (lon2 - lon1) * rad;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // inside in meters
  }

  /* =============================
          CHECK IN
     ============================= */
  static async checkIn(
    payload: Partial<IAttendance>,
    employeeId: Types.ObjectId,
    createdBy: Types.ObjectId
  ) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already checked in today
    const existingAttendance = await Attendance.findOne({
      employee: employeeId,
      date: today,
    });

    if (existingAttendance && existingAttendance.checkIn) {
      throw new AppError(
        HttpStatusCode.BadRequest,
        "Request Failed",
        "Already checked in for today!"
      );
    }

    // Get employee details
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      throw new AppError(HttpStatusCode.NotFound, "Request Failed", "Employee not found!");
    }

    // Geofencing Location Validation
    if (employee.branch && payload.checkInLocation?.latitude && payload.checkInLocation?.longitude) {
      const branch = await Branch.findById(employee.branch);
      if (branch?.location?.latitude && branch?.location?.longitude) {
        const radius = branch.location.radius || 10;
        
        const distance = this.calculateDistanceString(
          payload.checkInLocation.latitude,
          payload.checkInLocation.longitude,
          branch.location.latitude,
          branch.location.longitude
        );

        if (distance > radius) {
          throw new AppError(
            HttpStatusCode.BadRequest,
            "Request Failed",
            `You are outside the branch area (${Math.round(distance)}m away). Please mark attendance from the office.`
          );
        }
      }
    }

    // Determine office start time from employee's assigned shift
    const now = new Date();
    let officeStartHour = 9;   // default 9:00 AM
    let officeStartMinute = 0;
    let gracePeriod = 0;

    if (employee.workShift && employee.workShift !== "General") {
      const shift = await Shift.findOne({
        company: employee.company,
        name: employee.workShift,
        isActive: true,
        isDeleted: false,
      }).lean();

      if (shift && shift.startTime) {
        const [h, m] = shift.startTime.split(":").map(Number);
        officeStartHour = h;
        officeStartMinute = m;
        gracePeriod = shift.gracePeriodMinutes || 0;
      }
    }

    const officeStartTime = new Date();
    officeStartTime.setHours(officeStartHour, officeStartMinute + gracePeriod, 0, 0);

    const isLate = now > officeStartTime;
    const lateMinutes = isLate ? Math.floor((now.getTime() - officeStartTime.getTime()) / 60000) : 0;

    const attendanceData = {
      employee: employeeId,
      company: employee.company,
      branch: employee.branch,
      date: today,
      checkIn: now,
      checkInLocation: payload.checkInLocation,
      checkInImage: payload.checkInImage,
      checkInDevice: payload.checkInDevice,
      checkInMethod: payload.checkInMethod || "Mobile",
      status: isLate ? "Late" : "Present",
      isLate,
      lateMinutes,
      createdBy,
    };

    if (existingAttendance) {
      const updatedAttendance = await Attendance.findByIdAndUpdate(
        existingAttendance._id,
        attendanceData,
        { new: true }
      );
      return updatedAttendance;
    }

    const attendance = await Attendance.create(attendanceData);
    return attendance;
  }

  /* =============================
          CHECK OUT
     ============================= */
  static async checkOut(
    payload: Partial<IAttendance>,
    employeeId: Types.ObjectId
  ) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      employee: employeeId,
      date: today,
    });

    if (!attendance) {
      throw new AppError(
        HttpStatusCode.BadRequest,
        "Request Failed",
        "You haven't checked in today!"
      );
    }

    if (attendance.checkOut) {
      throw new AppError(
        HttpStatusCode.BadRequest,
        "Request Failed",
        "Already checked out for today!"
      );
    }

    // Geofencing Location Validation
    if (attendance.branch && payload.checkOutLocation?.latitude && payload.checkOutLocation?.longitude) {
      const branch = await Branch.findById(attendance.branch);
      if (branch?.location?.latitude && branch?.location?.longitude) {
        const radius = branch.location.radius || 10;
        
        const distance = this.calculateDistanceString(
          payload.checkOutLocation.latitude,
          payload.checkOutLocation.longitude,
          branch.location.latitude,
          branch.location.longitude
        );

        if (distance > radius) {
          throw new AppError(
            HttpStatusCode.BadRequest,
            "Request Failed",
            `You are outside the branch area (${Math.round(distance)}m away). Please mark attendance from the office.`
          );
        }
      }
    }

    const now = new Date();

    // Determine office end time from employee's assigned shift
    let officeEndHour = 18;   // default 6:00 PM
    let officeEndMinute = 0;
    let standardHours = 8;

    const employee2 = await Employee.findById(employeeId).lean();
    if (employee2?.workShift && employee2.workShift !== "General") {
      const shift = await Shift.findOne({
        company: employee2.company,
        name: employee2.workShift,
        isActive: true,
        isDeleted: false,
      }).lean();

      if (shift && shift.endTime) {
        const [h, m] = shift.endTime.split(":").map(Number);
        officeEndHour = h;
        officeEndMinute = m;
        // Calculate standard hours from shift start to end
        if (shift.startTime) {
          const [sh, sm] = shift.startTime.split(":").map(Number);
          const breakMins = shift.breakDurationMinutes || 0;
          standardHours = ((h * 60 + m) - (sh * 60 + sm) - breakMins) / 60;
        }
      }
    }

    const officeEndTime = new Date();
    officeEndTime.setHours(officeEndHour, officeEndMinute, 0, 0);

    const isEarlyLeave = now < officeEndTime;
    const earlyLeaveMinutes = isEarlyLeave
      ? Math.floor((officeEndTime.getTime() - now.getTime()) / 60000)
      : 0;

    // Calculate total hours
    const checkInTime = attendance.checkIn as Date;
    const totalMinutes = Math.floor((now.getTime() - checkInTime.getTime()) / 60000);
    const totalHours = parseFloat((totalMinutes / 60).toFixed(2));

    const overtimeHours = totalHours > standardHours ? totalHours - standardHours : 0;

    // Determine final status
    let status = attendance.status;
    if (totalHours < 4) {
      status = "Half-Day";
    }

    const updatedAttendance = await Attendance.findByIdAndUpdate(
      attendance._id,
      {
        checkOut: now,
        checkOutLocation: payload.checkOutLocation,
        checkOutImage: payload.checkOutImage,
        checkOutDevice: payload.checkOutDevice,
        checkOutMethod: payload.checkOutMethod || "Mobile",
        totalHours,
        overtimeHours,
        isEarlyLeave,
        earlyLeaveMinutes,
        status,
      },
      { new: true }
    );

    return updatedAttendance;
  }

  /* =============================
          GET TODAY'S ATTENDANCE
     ============================= */
  static async getTodayAttendance(employeeId: Types.ObjectId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      employee: employeeId,
      date: today,
    }).lean();

    return attendance;
  }

  /* =============================
          GET ATTENDANCE BY DATE RANGE
     ============================= */
  static async getAttendanceByDateRange(
    filter: Record<string, any>,
    startDate: Date,
    endDate: Date,
    query: { page?: number; limit?: number } = { page: 1, limit: 31 }
  ) {
    const page = query.page || 1;
    const limit = query.limit || 31;
    const skip = (page - 1) * limit;

    const finalFilter = {
      ...filter,
      date: { $gte: startDate, $lte: endDate },
    };

    const attendances = await Attendance.find(finalFilter)
      .select("-__v")
      .populate("employee", "employeeId firstName lastName email")
      .populate("company", "name code")
      .populate("branch", "name code")
      .limit(limit)
      .skip(skip)
      .sort({ date: -1 })
      .lean();

    const total = await Attendance.countDocuments(finalFilter);

    return {
      attendances,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /* =============================
          GET EMPLOYEE ATTENDANCE
     ============================= */
  static async getEmployeeAttendance(
    employeeId: Types.ObjectId,
    month: number,
    year: number
  ) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    endDate.setHours(23, 59, 59, 999);

    const attendances = await Attendance.find({
      employee: employeeId,
      date: { $gte: startDate, $lte: endDate },
    })
      .select("-__v")
      .sort({ date: 1 })
      .lean();

    // Calculate summary
    const summary = {
      totalDays: endDate.getDate(),
      present: 0,
      absent: 0,
      halfDay: 0,
      late: 0,
      onLeave: 0,
      holiday: 0,
      weekOff: 0,
      totalHours: 0,
      averageHours: 0,
    };

    attendances.forEach((att) => {
      switch (att.status) {
        case "Present":
          summary.present++;
          break;
        case "Absent":
          summary.absent++;
          break;
        case "Half-Day":
          summary.halfDay++;
          break;
        case "Late":
          summary.late++;
          summary.present++; // Late is still present
          break;
        case "On-Leave":
          summary.onLeave++;
          break;
        case "Holiday":
          summary.holiday++;
          break;
        case "Week-Off":
          summary.weekOff++;
          break;
      }
      summary.totalHours += att.totalHours || 0;
    });

    summary.averageHours =
      summary.present > 0
        ? parseFloat((summary.totalHours / summary.present).toFixed(2))
        : 0;

    return { attendances, summary };
  }

  /* =============================
          MARK ATTENDANCE (MANUAL)
     ============================= */
  static async markAttendance(
    payload: Partial<IAttendance>,
    createdBy: Types.ObjectId
  ) {
    const dateObj = new Date(payload.date as Date);
    dateObj.setHours(0, 0, 0, 0);

    // Check if attendance already exists
    const existingAttendance = await Attendance.findOne({
      employee: payload.employee,
      date: dateObj,
    });

    if (existingAttendance) {
      // Update existing
      const updated = await Attendance.findByIdAndUpdate(
        existingAttendance._id,
        {
          ...payload,
          date: dateObj,
          checkInMethod: "Manual",
          isRegularized: true,
          regularizedBy: createdBy,
          regularizedAt: new Date(),
        },
        { new: true }
      );
      return updated;
    }

    // Create new
    const attendance = await Attendance.create({
      ...payload,
      date: dateObj,
      checkInMethod: "Manual",
      createdBy,
    });

    return attendance;
  }

  /* =============================
          REGULARIZE ATTENDANCE
     ============================= */
  static async regularizeAttendance(
    _id: Types.ObjectId,
    payload: Partial<IAttendance>,
    regularizedBy: Types.ObjectId
  ) {
    const attendance = await Attendance.findByIdAndUpdate(
      _id,
      {
        ...payload,
        isRegularized: true,
        regularizedBy,
        regularizedAt: new Date(),
      },
      { new: true }
    );

    if (!attendance) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Attendance not found!"
      );
    }

    return attendance;
  }

  /* =============================
          MARK FACE ATTENDANCE
     ============================= */
  static async markFaceAttendance(
    employeeId: Types.ObjectId | string,
    payload: { latitude?: number; longitude?: number; address?: string; image?: string; device?: string },
    createdBy: Types.ObjectId
  ) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingAttendance = await Attendance.findOne({
      employee: employeeId,
      date: today,
    });

    if (existingAttendance && existingAttendance.checkOut) {
      throw new AppError(
        HttpStatusCode.BadRequest,
        "Request Failed",
        "Already completed attendance for today!"
      );
    }

    if (existingAttendance && existingAttendance.checkIn) {
      // Perform Check-Out
      const updatedAttendance = await this.checkOut(
        {
          checkOutLocation: payload.latitude ? { latitude: payload.latitude, longitude: payload.longitude!, address: payload.address } : undefined,
          checkOutImage: payload.image,
          checkOutDevice: payload.device,
          checkOutMethod: "Face",
        },
        new Types.ObjectId(employeeId.toString())
      );
      return { type: "check-out", attendance: updatedAttendance };
    }

    // Perform Check-In
    const updatedAttendance = await this.checkIn(
      {
        checkInLocation: payload.latitude ? { latitude: payload.latitude, longitude: payload.longitude!, address: payload.address } : undefined,
        checkInImage: payload.image,
        checkInDevice: payload.device,
        checkInMethod: "Face",
      },
      new Types.ObjectId(employeeId.toString()),
      createdBy
    );
    return { type: "check-in", attendance: updatedAttendance };
  }

  /* =============================
          GET ATTENDANCE STATS
     ============================= */
  static async getAttendanceStats(
    companyId: Types.ObjectId,
    date?: Date
  ) {
    const targetDate = date || new Date();
    targetDate.setHours(0, 0, 0, 0);

    const [present, absent, late, onLeave] = await Promise.all([
      Attendance.countDocuments({
        company: companyId,
        date: targetDate,
        status: { $in: ["Present", "Late"] },
      }),
      Attendance.countDocuments({
        company: companyId,
        date: targetDate,
        status: "Absent",
      }),
      Attendance.countDocuments({
        company: companyId,
        date: targetDate,
        isLate: true,
      }),
      Attendance.countDocuments({
        company: companyId,
        date: targetDate,
        status: "On-Leave",
      }),
    ]);

    return { present, absent, late, onLeave, date: targetDate };
  }
}

