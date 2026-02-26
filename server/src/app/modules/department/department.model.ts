import mongoose, { Document, Schema } from "mongoose";

/* ============================= */
/*     DEPARTMENT INTERFACE      */
/* ============================= */

export interface IDepartment extends Document {
  name: string;
  code: string;
  company: mongoose.Types.ObjectId;
  branch?: mongoose.Types.ObjectId;
  description?: string;
  headOfDepartment?: mongoose.Types.ObjectId;
  isActive: boolean;
  isDeleted: boolean;
  createdBy: mongoose.Types.ObjectId;
}

/* ============================= */
/*            SCHEMA             */
/* ============================= */

const departmentSchema = new Schema<IDepartment>(
  {
    name: {
      type: String,
      required: [true, "Department name is required"],
      trim: true,
      maxlength: 100,
    },
    code: {
      type: String,
      required: [true, "Department code is required"],
      uppercase: true,
      trim: true,
      maxlength: 20,
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
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    headOfDepartment: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
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

departmentSchema.index({ company: 1, code: 1 }, { unique: true });
departmentSchema.index({ company: 1 });

const Department = mongoose.model<IDepartment>("Department", departmentSchema);

export default Department;

