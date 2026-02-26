import mongoose, { Document, Schema } from "mongoose";

/* ============================= */
/*       LEAVE INTERFACE         */
/* ============================= */

export interface ILeave extends Document {
  employee: mongoose.Types.ObjectId;
  company: mongoose.Types.ObjectId;
  branch?: mongoose.Types.ObjectId;
  
  leaveType: "Casual" | "Sick" | "Earned" | "Unpaid" | "Maternity" | "Paternity" | "Compensatory" | "Other";
  
  startDate: Date;
  endDate: Date;
  totalDays: number;
  isHalfDay: boolean;
  halfDayType?: "First-Half" | "Second-Half";
  
  reason: string;
  attachments?: string[];
  
  // Approval
  status: "Pending" | "Approved" | "Rejected" | "Cancelled";
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;
  
  // If cancelled
  cancelledBy?: mongoose.Types.ObjectId;
  cancelledAt?: Date;
  cancellationReason?: string;
  
  createdBy: mongoose.Types.ObjectId;
}

/* ============================= */
/*            SCHEMA             */
/* ============================= */

const leaveSchema = new Schema<ILeave>(
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
    
    leaveType: {
      type: String,
      enum: ["Casual", "Sick", "Earned", "Unpaid", "Maternity", "Paternity", "Compensatory", "Other"],
      required: [true, "Leave type is required"],
    },
    
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },
    totalDays: {
      type: Number,
      required: true,
      min: 0.5,
    },
    isHalfDay: {
      type: Boolean,
      default: false,
    },
    halfDayType: {
      type: String,
      enum: ["First-Half", "Second-Half"],
    },
    
    reason: {
      type: String,
      required: [true, "Reason is required"],
      trim: true,
      maxlength: 1000,
    },
    attachments: [String],
    
    // Approval
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Cancelled"],
      default: "Pending",
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: Date,
    rejectionReason: String,
    
    // Cancellation
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    cancelledAt: Date,
    cancellationReason: String,
    
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

leaveSchema.index({ employee: 1, startDate: 1 });
leaveSchema.index({ company: 1, status: 1 });
leaveSchema.index({ status: 1 });

const Leave = mongoose.model<ILeave>("Leave", leaveSchema);

export default Leave;

