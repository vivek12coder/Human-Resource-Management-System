import mongoose, { Document, Schema } from "mongoose";

export interface IShift extends Document {
  company: mongoose.Types.ObjectId;
  branch?: mongoose.Types.ObjectId;
  name: string;
  code: string;
  description?: string;
  startTime: string;
  endTime: string;
  gracePeriodMinutes: number;
  breakDurationMinutes: number;
  weeklyOff: string[];
  isNightShift: boolean;
  isDefault: boolean;
  isActive: boolean;
  isDeleted: boolean;
  createdBy: mongoose.Types.ObjectId;
}

const shiftSchema = new Schema<IShift>(
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
    name: {
      type: String,
      required: [true, "Shift name is required"],
      trim: true,
      maxlength: 80,
    },
    code: {
      type: String,
      required: [true, "Shift code is required"],
      trim: true,
      uppercase: true,
      maxlength: 20,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 250,
    },
    startTime: {
      type: String,
      required: [true, "Start time is required"],
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },
    endTime: {
      type: String,
      required: [true, "End time is required"],
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },
    gracePeriodMinutes: {
      type: Number,
      default: 10,
      min: 0,
      max: 180,
    },
    breakDurationMinutes: {
      type: Number,
      default: 60,
      min: 0,
      max: 480,
    },
    weeklyOff: {
      type: [String],
      enum: [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ],
      default: ["Sunday"],
    },
    isNightShift: {
      type: Boolean,
      default: false,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
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

shiftSchema.index(
  { company: 1, name: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);
shiftSchema.index(
  { company: 1, code: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);
shiftSchema.index({ company: 1, branch: 1, isActive: 1 });

const Shift = mongoose.model<IShift>("Shift", shiftSchema);

export default Shift;
