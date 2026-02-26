import Payroll, { IPayroll } from "./payroll.model";
import Employee from "../employee/employee.model";
import Attendance from "../attendence/attendance.model";
import { Types } from "mongoose";
import { HttpStatusCode } from "axios";
import AppError from "../../errors/AppError";

export class PayrollService {
  /* =============================
          GENERATE PAYROLL
     ============================= */
  static async generatePayroll(
    employeeId: Types.ObjectId,
    month: number,
    year: number,
    generatedBy: Types.ObjectId
  ) {
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Employee not found!"
      );
    }

    // Check if payroll already exists
    const existingPayroll = await Payroll.findOne({
      employee: employeeId,
      month,
      year,
    });

    if (existingPayroll) {
      throw new AppError(
        HttpStatusCode.BadRequest,
        "Request Failed",
        "Payroll already exists for this month!"
      );
    }

    // Calculate dates
    const payPeriodStart = new Date(year, month - 1, 1);
    const payPeriodEnd = new Date(year, month, 0);
    payPeriodEnd.setHours(23, 59, 59, 999);

    // Get attendance summary
    const attendances = await Attendance.find({
      employee: employeeId,
      date: { $gte: payPeriodStart, $lte: payPeriodEnd },
    }).lean();

    let daysWorked = 0;
    let lop = 0;
    let paidLeaves = 0;
    let holidays = 0;

    attendances.forEach((att) => {
      switch (att.status) {
        case "Present":
        case "Late":
          daysWorked++;
          break;
        case "Half-Day":
          daysWorked += 0.5;
          break;
        case "On-Leave":
          paidLeaves++;
          break;
        case "Holiday":
          holidays++;
          break;
        case "Absent":
          lop++;
          break;
      }
    });

    const totalWorkingDays = payPeriodEnd.getDate();

    // Calculate salary components
    const basicSalary = employee.basicSalary || 0;
    const hra = Math.round(basicSalary * 0.4); // 40% of basic
    const da = Math.round(basicSalary * 0.1); // 10% of basic
    const conveyanceAllowance = 1600;
    const medicalAllowance = 1250;
    const specialAllowance = Math.round(basicSalary * 0.15);

    const grossEarnings =
      basicSalary +
      hra +
      da +
      conveyanceAllowance +
      medicalAllowance +
      specialAllowance;

    // Deductions
    const pf = Math.round(basicSalary * 0.12); // 12% of basic
    const esi = basicSalary <= 21000 ? Math.round(grossEarnings * 0.0075) : 0; // ESI only for salary <= 21000
    const professionalTax = grossEarnings > 15000 ? 200 : 0;

    const totalDeductions = pf + esi + professionalTax;

    // Calculate per day salary and apply LOP
    const perDaySalary = grossEarnings / totalWorkingDays;
    const lopDeduction = Math.round(perDaySalary * lop);

    const netSalary = grossEarnings - totalDeductions - lopDeduction;

    const payroll = await Payroll.create({
      employee: employeeId,
      company: employee.company,
      branch: employee.branch,
      month,
      year,
      payPeriodStart,
      payPeriodEnd,
      basicSalary,
      hra,
      da,
      conveyanceAllowance,
      medicalAllowance,
      specialAllowance,
      otherAllowances: 0,
      overtime: 0,
      bonus: 0,
      incentive: 0,
      grossEarnings,
      pf,
      esi,
      professionalTax,
      tds: 0,
      loanDeduction: 0,
      advanceDeduction: 0,
      otherDeductions: lopDeduction,
      totalDeductions: totalDeductions + lopDeduction,
      netSalary,
      totalWorkingDays,
      daysWorked,
      lop,
      paidLeaves,
      holidays,
      generatedBy,
      bankName: employee.bankName,
      accountNumber: employee.accountNumber,
    });

    return payroll;
  }

  /* =============================
          GET ALL PAYROLLS
     ============================= */
  static async getAllPayrolls(
    filter: Record<string, any>,
    query: { page?: number; limit?: number } = { page: 1, limit: 10 }
  ) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const payrolls = await Payroll.find(filter)
      .select("-__v")
      .populate("employee", "employeeId firstName lastName email")
      .populate("company", "name code")
      .populate("generatedBy", "name email")
      .limit(limit)
      .skip(skip)
      .sort({ year: -1, month: -1 })
      .lean();

    const total = await Payroll.countDocuments(filter);

    return {
      payrolls,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /* =============================
          GET PAYROLL BY ID
     ============================= */
  static async getPayrollById(_id: string | Types.ObjectId) {
    const payroll = await Payroll.findById(_id)
      .select("-__v")
      .populate("employee", "employeeId firstName lastName email phone bankName accountNumber ifscCode")
      .populate("company", "name code address")
      .populate("generatedBy", "name email")
      .populate("approvedBy", "name email")
      .lean();

    if (!payroll) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Payroll not found!"
      );
    }

    return payroll;
  }

  /* =============================
          UPDATE PAYROLL
     ============================= */
  static async updatePayroll(
    _id: Types.ObjectId,
    payload: Partial<IPayroll>
  ) {
    // Recalculate totals if components changed
    if (payload.basicSalary !== undefined || payload.hra !== undefined) {
      const existingPayroll = await Payroll.findById(_id);
      if (existingPayroll) {
        const grossEarnings =
          (payload.basicSalary || existingPayroll.basicSalary) +
          (payload.hra || existingPayroll.hra) +
          (payload.da || existingPayroll.da) +
          (payload.conveyanceAllowance || existingPayroll.conveyanceAllowance) +
          (payload.medicalAllowance || existingPayroll.medicalAllowance) +
          (payload.specialAllowance || existingPayroll.specialAllowance) +
          (payload.otherAllowances || existingPayroll.otherAllowances) +
          (payload.overtime || existingPayroll.overtime) +
          (payload.bonus || existingPayroll.bonus) +
          (payload.incentive || existingPayroll.incentive);

        const totalDeductions =
          (payload.pf || existingPayroll.pf) +
          (payload.esi || existingPayroll.esi) +
          (payload.professionalTax || existingPayroll.professionalTax) +
          (payload.tds || existingPayroll.tds) +
          (payload.loanDeduction || existingPayroll.loanDeduction) +
          (payload.advanceDeduction || existingPayroll.advanceDeduction) +
          (payload.otherDeductions || existingPayroll.otherDeductions);

        payload.grossEarnings = grossEarnings;
        payload.totalDeductions = totalDeductions;
        payload.netSalary = grossEarnings - totalDeductions;
      }
    }

    const payroll = await Payroll.findByIdAndUpdate(_id, payload, { new: true })
      .select("-__v")
      .populate("employee", "employeeId firstName lastName email")
      .lean();

    if (!payroll) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Payroll not found!"
      );
    }

    return payroll;
  }

  /* =============================
          APPROVE PAYROLL
     ============================= */
  static async approvePayroll(_id: Types.ObjectId, approvedBy: Types.ObjectId) {
    const payroll = await Payroll.findByIdAndUpdate(
      _id,
      {
        paymentStatus: "Processing",
        approvedBy,
        approvedAt: new Date(),
      },
      { new: true }
    );

    if (!payroll) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Payroll not found!"
      );
    }

    return payroll;
  }

  /* =============================
          MARK AS PAID
     ============================= */
  static async markAsPaid(
    _id: Types.ObjectId,
    paymentDetails: {
      paymentMethod: string;
      transactionId?: string;
    }
  ) {
    const payroll = await Payroll.findByIdAndUpdate(
      _id,
      {
        paymentStatus: "Paid",
        paymentMethod: paymentDetails.paymentMethod,
        paymentDate: new Date(),
        transactionId: paymentDetails.transactionId,
      },
      { new: true }
    );

    if (!payroll) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Payroll not found!"
      );
    }

    return payroll;
  }

  /* =============================
          GET EMPLOYEE PAYSLIPS
     ============================= */
  static async getEmployeePayslips(
    employeeId: Types.ObjectId,
    year?: number
  ) {
    const filter: Record<string, any> = { employee: employeeId };

    if (year) {
      filter.year = year;
    }

    const payslips = await Payroll.find(filter)
      .select("month year netSalary paymentStatus paymentDate")
      .sort({ year: -1, month: -1 })
      .lean();

    return payslips;
  }

  /* =============================
          GET PAYROLL SUMMARY
     ============================= */
  static async getPayrollSummary(
    companyId: Types.ObjectId,
    month: number,
    year: number
  ) {
    const payrolls = await Payroll.find({
      company: companyId,
      month,
      year,
    }).lean();

    const summary = {
      totalEmployees: payrolls.length,
      totalGrossEarnings: 0,
      totalDeductions: 0,
      totalNetSalary: 0,
      pending: 0,
      processing: 0,
      paid: 0,
    };

    payrolls.forEach((p) => {
      summary.totalGrossEarnings += p.grossEarnings;
      summary.totalDeductions += p.totalDeductions;
      summary.totalNetSalary += p.netSalary;

      switch (p.paymentStatus) {
        case "Pending":
          summary.pending++;
          break;
        case "Processing":
          summary.processing++;
          break;
        case "Paid":
          summary.paid++;
          break;
      }
    });

    return summary;
  }

  /* =============================
          BULK GENERATE PAYROLL
     ============================= */
  static async bulkGeneratePayroll(
    companyId: Types.ObjectId,
    month: number,
    year: number,
    generatedBy: Types.ObjectId
  ) {
    const employees = await Employee.find({
      company: companyId,
      isActive: true,
      isDeleted: false,
      employmentStatus: "Active",
    }).lean();

    const results = {
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const employee of employees) {
      try {
        // Check if already exists
        const existing = await Payroll.findOne({
          employee: employee._id,
          month,
          year,
        });

        if (existing) {
          results.skipped++;
          continue;
        }

        await this.generatePayroll(employee._id, month, year, generatedBy);
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`${employee.firstName} ${employee.lastName}: ${error.message}`);
      }
    }

    return results;
  }
}

