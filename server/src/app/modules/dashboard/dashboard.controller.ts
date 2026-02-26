import { catchAsync } from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import { HttpStatusCode } from "axios";
import Employee from "../employee/employee.model";
import Attendance from "../attendence/attendance.model";
import Leave from "../leave/leave.model";
import Company from "../company/company.model";
import Branch from "../branch/branch.model";
import Department from "../department/department.model";
import Payroll from "../payroll/payroll.model";
import User from "../user/user.model";

export class DashboardController {
  static getSuperAdminDashboard = catchAsync(async (_req, res) => {
    const [
      totalCompanies,
      activeCompanies,
      totalEmployees,
      totalBranches,
      totalCompanyAdmins,
      totalBranchAdmins,
    ] = await Promise.all([
      Company.countDocuments({ isDeleted: false }),
      Company.countDocuments({ isDeleted: false, isActive: true }),
      Employee.countDocuments({ isDeleted: false }),
      Branch.countDocuments({ isDeleted: false }),
      User.countDocuments({ role: "ADMIN", isDeleted: false }),
      User.countDocuments({ role: "JUNIOR_ADMIN", isDeleted: false }),
    ]);

    const [recentCompanies, recentCompanyAdmins, recentBranchAdmins] = await Promise.all([
      Company.find({ isDeleted: false })
        .select("name code email isActive createdAt")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      User.find({ role: "ADMIN", isDeleted: false })
        .select("name email company isActive createdAt")
        .populate("company", "name code")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      User.find({ role: "JUNIOR_ADMIN", isDeleted: false })
        .select("name email company branch isActive createdAt")
        .populate("company", "name code")
        .populate("branch", "name code")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Super Admin dashboard data fetched successfully",
      data: {
        stats: {
          totalCompanies,
          activeCompanies,
          totalEmployees,
          totalBranches,
          totalCompanyAdmins,
          totalBranchAdmins,
        },
        recentCompanies,
        recentCompanyAdmins,
        recentBranchAdmins,
      },
    });
  });

  static getAdminDashboard = catchAsync(async (req, res) => {
    const loggedInUser = res.locals.user;
    const companyId = loggedInUser.company;

    if (!companyId) {
      throw new AppError(
        HttpStatusCode.BadRequest,
        "Request Failed",
        "Company not found"
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    const [
      totalEmployees,
      activeEmployees,
      totalBranches,
      totalDepartments,
      totalBranchAdmins,
      todayPresent,
      todayAbsent,
      todayOnLeave,
      pendingLeaves,
      monthlyPayroll,
    ] = await Promise.all([
      Employee.countDocuments({ company: companyId, isDeleted: false }),
      Employee.countDocuments({
        company: companyId,
        isDeleted: false,
        isActive: true,
        employmentStatus: "Active",
      }),
      Branch.countDocuments({ company: companyId, isDeleted: false }),
      Department.countDocuments({ company: companyId, isDeleted: false }),
      User.countDocuments({ company: companyId, role: "JUNIOR_ADMIN", isDeleted: false }),
      Attendance.countDocuments({
        company: companyId,
        date: today,
        status: { $in: ["Present", "Late"] },
      }),
      Attendance.countDocuments({
        company: companyId,
        date: today,
        status: "Absent",
      }),
      Attendance.countDocuments({
        company: companyId,
        date: today,
        status: "On-Leave",
      }),
      Leave.countDocuments({
        company: companyId,
        status: "Pending",
      }),
      Payroll.aggregate([
        {
          $match: {
            company: companyId,
            month: currentMonth,
            year: currentYear,
          },
        },
        {
          $group: {
            _id: null,
            totalNetSalary: { $sum: "$netSalary" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const [recentEmployees, pendingLeaveRequests, recentBranchAdmins] = await Promise.all([
      Employee.find({
        company: companyId,
        isDeleted: false,
      })
        .select("employeeId firstName lastName email joiningDate department")
        .populate("department", "name")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Leave.find({
        company: companyId,
        status: "Pending",
      })
        .select("leaveType startDate endDate totalDays reason")
        .populate("employee", "firstName lastName employeeId")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      User.find({ company: companyId, role: "JUNIOR_ADMIN", isDeleted: false })
        .select("name email branch isActive createdAt")
        .populate("branch", "name code")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Admin dashboard data fetched successfully",
      data: {
        stats: {
          totalEmployees,
          activeEmployees,
          totalBranches,
          totalDepartments,
          totalBranchAdmins,
          todayAttendance: {
            present: todayPresent,
            absent: todayAbsent,
            onLeave: todayOnLeave,
          },
          pendingLeaves,
          monthlyPayroll: {
            totalAmount: monthlyPayroll[0]?.totalNetSalary || 0,
            employeesCount: monthlyPayroll[0]?.count || 0,
          },
        },
        recentEmployees,
        recentBranchAdmins,
        pendingLeaveRequests,
      },
    });
  });

  static getBranchAdminDashboard = catchAsync(async (req, res) => {
    const loggedInUser = res.locals.user;
    const companyId = loggedInUser.company;
    const branchId = loggedInUser.branch;

    if (!companyId || !branchId) {
      throw new AppError(
        HttpStatusCode.BadRequest,
        "Request Failed",
        "Company or branch not found"
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    const [
      totalEmployees,
      activeEmployees,
      todayPresent,
      todayAbsent,
      todayOnLeave,
      pendingLeaves,
      monthlyPayroll,
    ] = await Promise.all([
      Employee.countDocuments({ company: companyId, branch: branchId, isDeleted: false }),
      Employee.countDocuments({
        company: companyId,
        branch: branchId,
        isDeleted: false,
        isActive: true,
        employmentStatus: "Active",
      }),
      Attendance.countDocuments({
        company: companyId,
        branch: branchId,
        date: today,
        status: { $in: ["Present", "Late"] },
      }),
      Attendance.countDocuments({
        company: companyId,
        branch: branchId,
        date: today,
        status: "Absent",
      }),
      Attendance.countDocuments({
        company: companyId,
        branch: branchId,
        date: today,
        status: "On-Leave",
      }),
      Leave.countDocuments({
        company: companyId,
        branch: branchId,
        status: "Pending",
      }),
      Payroll.aggregate([
        {
          $match: {
            company: companyId,
            branch: branchId,
            month: currentMonth,
            year: currentYear,
          },
        },
        {
          $group: {
            _id: null,
            totalNetSalary: { $sum: "$netSalary" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const [recentEmployees, pendingLeaveRequests] = await Promise.all([
      Employee.find({ company: companyId, branch: branchId, isDeleted: false })
        .select("employeeId firstName lastName email joiningDate department")
        .populate("department", "name")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Leave.find({ company: companyId, branch: branchId, status: "Pending" })
        .select("leaveType startDate endDate totalDays reason")
        .populate("employee", "firstName lastName employeeId")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Branch Admin dashboard data fetched successfully",
      data: {
        stats: {
          totalEmployees,
          activeEmployees,
          todayAttendance: {
            present: todayPresent,
            absent: todayAbsent,
            onLeave: todayOnLeave,
          },
          pendingLeaves,
          monthlyPayroll: {
            totalAmount: monthlyPayroll[0]?.totalNetSalary || 0,
            employeesCount: monthlyPayroll[0]?.count || 0,
          },
        },
        recentEmployees,
        pendingLeaveRequests,
      },
    });
  });

  static getEmployeeDashboard = catchAsync(async (req, res) => {
    const loggedInUser = res.locals.user;

    const employee = await Employee.findOne({ user: loggedInUser._id })
      .populate("company", "name")
      .populate("branch", "name")
      .populate("department", "name")
      .populate("designation", "title")
      .lean();

    if (!employee) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Employee profile not found!"
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfMonth = new Date(currentYear, currentMonth, 0);

    const todayAttendance = await Attendance.findOne({
      employee: employee._id,
      date: today,
    }).lean();

    const monthlyAttendance = await Attendance.find({
      employee: employee._id,
      date: { $gte: startOfMonth, $lte: endOfMonth },
    }).lean();

    let presentDays = 0;
    let absentDays = 0;
    let leaveDays = 0;

    monthlyAttendance.forEach((att) => {
      if (att.status === "Present" || att.status === "Late") {
        presentDays++;
      } else if (att.status === "Absent") {
        absentDays++;
      } else if (att.status === "On-Leave") {
        leaveDays++;
      }
    });

    const leaveBalance = employee.leaveBalance || {
      casual: 12,
      sick: 12,
      earned: 15,
      unpaid: 0,
    };

    const pendingLeaves = await Leave.find({
      employee: employee._id,
      status: "Pending",
    })
      .select("leaveType startDate endDate totalDays status")
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    const recentPayslips = await Payroll.find({
      employee: employee._id,
    })
      .select("month year netSalary paymentStatus paymentDate")
      .sort({ year: -1, month: -1 })
      .limit(3)
      .lean();

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Employee dashboard data fetched successfully",
      data: {
        profile: {
          employeeId: employee.employeeId,
          name: `${employee.firstName} ${employee.lastName}`,
          email: employee.email,
          phone: employee.phone,
          company: employee.company,
          branch: employee.branch,
          department: employee.department,
          designation: employee.designation,
          joiningDate: employee.joiningDate,
        },
        todayAttendance: todayAttendance
          ? {
              checkIn: todayAttendance.checkIn,
              checkOut: todayAttendance.checkOut,
              status: todayAttendance.status,
              totalHours: todayAttendance.totalHours,
            }
          : null,
        monthlyAttendanceSummary: {
          present: presentDays,
          absent: absentDays,
          onLeave: leaveDays,
        },
        leaveBalance,
        pendingLeaves,
        recentPayslips,
      },
    });
  });
}
