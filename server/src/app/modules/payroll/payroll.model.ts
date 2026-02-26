import mongoose, { Document, Schema } from "mongoose";

/* ============================= */
/*      PAYROLL INTERFACE        */
/* ============================= */

export interface IPayroll extends Document {
  employee: mongoose.Types.ObjectId;
  company: mongoose.Types.ObjectId;
  branch?: mongoose.Types.ObjectId;
  
  // Period
  month: number;
  year: number;
  payPeriodStart: Date;
  payPeriodEnd: Date;
  
  // Earnings
  basicSalary: number;
  hra: number; // House Rent Allowance
  da: number; // Dearness Allowance
  conveyanceAllowance: number;
  medicalAllowance: number;
  specialAllowance: number;
  otherAllowances: number;
  overtime: number;
  bonus: number;
  incentive: number;
  grossEarnings: number;
  
  // Deductions
  pf: number; // Provident Fund
  esi: number; // Employee State Insurance
  professionalTax: number;
  tds: number; // Tax Deducted at Source
  loanDeduction: number;
  advanceDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  
  // Net Pay
  netSalary: number;
  
  // Attendance Summary
  totalWorkingDays: number;
  daysWorked: number;
  lop: number; // Loss of Pay days
  paidLeaves: number;
  holidays: number;
  
  // Payment Details
  paymentStatus: "Pending" | "Processing" | "Paid" | "Failed";
  paymentMethod?: "Bank Transfer" | "Cash" | "Cheque";
  paymentDate?: Date;
  transactionId?: string;
  bankName?: string;
  accountNumber?: string;
  
  // Slip
  slipGenerated: boolean;
  slipUrl?: string;
  
  notes?: string;
  
  generatedBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
}

/* ============================= */
/*            SCHEMA             */
/* ============================= */

const payrollSchema = new Schema<IPayroll>(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: [true, "Employee is required"],
    },
    company: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: [true, "Company is required"],
    },
    branch: {
      type: Schema.Types.ObjectId,
      ref: "Branch",
    },
    
    // Period
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
    },
    payPeriodStart: {
      type: Date,
      required: true,
    },
    payPeriodEnd: {
      type: Date,
      required: true,
    },
    
    // Earnings
    basicSalary: { type: Number, default: 0 },
    hra: { type: Number, default: 0 },
    da: { type: Number, default: 0 },
    conveyanceAllowance: { type: Number, default: 0 },
    medicalAllowance: { type: Number, default: 0 },
    specialAllowance: { type: Number, default: 0 },
    otherAllowances: { type: Number, default: 0 },
    overtime: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    incentive: { type: Number, default: 0 },
    grossEarnings: { type: Number, default: 0 },
    
    // Deductions
    pf: { type: Number, default: 0 },
    esi: { type: Number, default: 0 },
    professionalTax: { type: Number, default: 0 },
    tds: { type: Number, default: 0 },
    loanDeduction: { type: Number, default: 0 },
    advanceDeduction: { type: Number, default: 0 },
    otherDeductions: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    
    // Net Pay
    netSalary: { type: Number, default: 0 },
    
    // Attendance Summary
    totalWorkingDays: { type: Number, default: 0 },
    daysWorked: { type: Number, default: 0 },
    lop: { type: Number, default: 0 },
    paidLeaves: { type: Number, default: 0 },
    holidays: { type: Number, default: 0 },
    
    // Payment Details
    paymentStatus: {
      type: String,
      enum: ["Pending", "Processing", "Paid", "Failed"],
      default: "Pending",
    },
    paymentMethod: {
      type: String,
      enum: ["Bank Transfer", "Cash", "Cheque"],
    },
    paymentDate: Date,
    transactionId: String,
    bankName: String,
    accountNumber: String,
    
    // Slip
    slipGenerated: { type: Boolean, default: false },
    slipUrl: String,
    
    notes: String,
    
    generatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: Date,
  },
  {
    timestamps: true,
  }
);

/* ============================= */
/*           INDEXES             */
/* ============================= */

// Unique payroll per employee per month
payrollSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });
payrollSchema.index({ company: 1, month: 1, year: 1 });
payrollSchema.index({ paymentStatus: 1 });

const Payroll = mongoose.model<IPayroll>("Payroll", payrollSchema);

export default Payroll;

