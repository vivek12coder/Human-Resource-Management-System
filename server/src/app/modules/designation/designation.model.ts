import mongoose, { Document, Schema } from "mongoose";

/* ============================= */
/*     DESIGNATION INTERFACE     */
/* ============================= */

export interface IDesignation extends Document {
  title: string;
  code: string;
  company: mongoose.Types.ObjectId;
  department?: mongoose.Types.ObjectId;
  level: number; // 1 = Entry, 2 = Junior, 3 = Mid, 4 = Senior, 5 = Lead, 6 = Manager, 7 = Director
  description?: string;
  isActive: boolean;
  isDeleted: boolean;
  createdBy: mongoose.Types.ObjectId;
}

/* ============================= */
/*            SCHEMA             */
/* ============================= */

const designationSchema = new Schema<IDesignation>(
  {
    title: {
      type: String,
      required: [true, "Designation title is required"],
      trim: true,
      maxlength: 100,
    },
    code: {
      type: String,
      required: [true, "Designation code is required"],
      uppercase: true,
      trim: true,
      maxlength: 20,
    },
    company: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: [true, "Company is required"],
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: "Department",
    },
    level: {
      type: Number,
      default: 1,
      min: 1,
      max: 10,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
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

/* ============================= */
/*           INDEXES             */
/* ============================= */

designationSchema.index({ company: 1, code: 1 }, { unique: true });
designationSchema.index({ company: 1 });

const Designation = mongoose.model<IDesignation>("Designation", designationSchema);

export default Designation;

