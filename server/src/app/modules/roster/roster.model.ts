import mongoose, { Document, Schema } from "mongoose";

export interface IRoster extends Document {
  company: mongoose.Types.ObjectId;
  branch?: mongoose.Types.ObjectId;
  employee: mongoose.Types.ObjectId;
  shift?: mongoose.Types.ObjectId;
  rosterDate: Date;
  status: "Scheduled" | "Week-Off" | "On-Leave" | "Holiday";
  notes?: string;
  isPublished: boolean;
  isDeleted: boolean;
  createdBy: mongoose.Types.ObjectId;
}

const rosterSchema = new Schema<IRoster>(
  {
    company: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: [true, "Company is required"],
    },
    branch: {
      type: Schema.Types.ObjectId,
      ref: "Branch",
    },
    employee: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: [true, "Employee is required"],
    },
    shift: {
      type: Schema.Types.ObjectId,
      ref: "Shift",
    },
    rosterDate: {
      type: Date,
      required: [true, "Roster date is required"],
    },
    status: {
      type: String,
      enum: ["Scheduled", "Week-Off", "On-Leave", "Holiday"],
      default: "Scheduled",
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
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

rosterSchema.index(
  { employee: 1, rosterDate: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);
rosterSchema.index({ company: 1, rosterDate: 1 });
rosterSchema.index({ shift: 1 });

const Roster = mongoose.model<IRoster>("Roster", rosterSchema);

export default Roster;
