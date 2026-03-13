import mongoose, { Document, Schema } from "mongoose";

/* ============================= */
/*     ATTENDANCE INTERFACE      */
/* ============================= */

export interface IAttendance extends Document {
  employee: mongoose.Types.ObjectId;
  company: mongoose.Types.ObjectId;
  branch?: mongoose.Types.ObjectId;
  date: Date;
  
  // Check In Details
  checkIn?: Date;
  checkInLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  checkInImage?: string;
  checkInDevice?: string;
  checkInMethod: "Mobile" | "Biometric" | "Web" | "Manual" | "Face";
  
  // Check Out Details
  checkOut?: Date;
  checkOutLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  checkOutImage?: string;
  checkOutDevice?: string;
  checkOutMethod?: "Mobile" | "Biometric" | "Web" | "Manual" | "Face";
  
  // Working Hours
  totalHours?: number;
  overtimeHours?: number;
  breakDuration?: number;
  
  // Status
  status: "Present" | "Absent" | "Half-Day" | "Late" | "On-Leave" | "Holiday" | "Week-Off";
  isLate: boolean;
  lateMinutes?: number;
  isEarlyLeave: boolean;
  earlyLeaveMinutes?: number;
  
  // Regularization
  isRegularized: boolean;
  regularizationReason?: string;
  regularizedBy?: mongoose.Types.ObjectId;
  regularizedAt?: Date;
  
  // Notes
  notes?: string;
  
  createdBy: mongoose.Types.ObjectId;
}

/* ============================= */
/*            SCHEMA             */
/* ============================= */

const attendanceSchema = new Schema<IAttendance>(
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
    date: {
      type: Date,
      required: [true, "Date is required"],
    },
    
    // Check In
    checkIn: {
      type: Date,
    },
    checkInLocation: {
      latitude: Number,
      longitude: Number,
      address: String,
    },
    checkInImage: String,
    checkInDevice: String,
    checkInMethod: {
      type: String,
      enum: ["Mobile", "Biometric", "Web", "Manual", "Face"],
      default: "Mobile",
    },
    
    // Check Out
    checkOut: {
      type: Date,
    },
    checkOutLocation: {
      latitude: Number,
      longitude: Number,
      address: String,
    },
    checkOutImage: String,
    checkOutDevice: String,
    checkOutMethod: {
      type: String,
      enum: ["Mobile", "Biometric", "Web", "Manual", "Face"],
    },
    
    // Working Hours
    totalHours: {
      type: Number,
      default: 0,
    },
    overtimeHours: {
      type: Number,
      default: 0,
    },
    breakDuration: {
      type: Number,
      default: 0,
    },
    
    // Status
    status: {
      type: String,
      enum: ["Present", "Absent", "Half-Day", "Late", "On-Leave", "Holiday", "Week-Off"],
      default: "Present",
    },
    isLate: {
      type: Boolean,
      default: false,
    },
    lateMinutes: {
      type: Number,
      default: 0,
    },
    isEarlyLeave: {
      type: Boolean,
      default: false,
    },
    earlyLeaveMinutes: {
      type: Number,
      default: 0,
    },
    
    // Regularization
    isRegularized: {
      type: Boolean,
      default: false,
    },
    regularizationReason: String,
    regularizedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    regularizedAt: Date,
    
    // Notes
    notes: String,
    
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

/* ============================= */
/*           INDEXES             */
/* ============================= */

// Unique attendance per employee per day
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1, employee: 1 });
attendanceSchema.index({ company: 1, date: 1 });
attendanceSchema.index({ employee: 1 });
attendanceSchema.index({ status: 1 });

const Attendance = mongoose.model<IAttendance>("Attendance", attendanceSchema);

export default Attendance;

