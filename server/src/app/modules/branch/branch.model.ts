import mongoose, { Document, Schema } from "mongoose";

/* ============================= */
/*       BRANCH INTERFACE        */
/* ============================= */

export interface IBranch extends Document {
  name: string;
  code: string;
  company: mongoose.Types.ObjectId;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  isHeadOffice: boolean;
  isActive: boolean;
  isDeleted: boolean;
  createdBy: mongoose.Types.ObjectId;
}

/* ============================= */
/*            SCHEMA             */
/* ============================= */

const branchSchema = new Schema<IBranch>(
  {
    name: {
      type: String,
      required: [true, "Branch name is required"],
      trim: true,
      maxlength: 100,
    },
    code: {
      type: String,
      required: [true, "Branch code is required"],
      uppercase: true,
      trim: true,
      maxlength: 20,
    },
    company: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: [true, "Company is required"],
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
      default: "India",
    },
    pincode: {
      type: String,
      trim: true,
    },
    isHeadOffice: {
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

/* ============================= */
/*           INDEXES             */
/* ============================= */

// Unique code per company
branchSchema.index({ company: 1, code: 1 }, { unique: true });
branchSchema.index({ company: 1 });
branchSchema.index({ isActive: 1 });

const Branch = mongoose.model<IBranch>("Branch", branchSchema);

export default Branch;

