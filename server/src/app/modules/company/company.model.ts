import mongoose, { Document, Schema } from "mongoose";

/* ============================= */
/*      COMPANY INTERFACE        */
/* ============================= */

export interface ICompany extends Document {
  name: string;
  code: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  logo?: string;
  website?: string;
  gstNumber?: string;
  panNumber?: string;
  registrationNumber?: string;
  establishedDate?: Date;
  employeeCount?: number;
  isActive: boolean;
  isDeleted: boolean;
  createdBy: mongoose.Types.ObjectId;
}

/* ============================= */
/*          SCHEMA               */
/* ============================= */

const companySchema = new Schema<ICompany>(
  {
    name: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
      maxlength: 100,
    },
    code: {
      type: String,
      required: [true, "Company code is required"],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 20,
    },
    email: {
      type: String,
      required: [true, "Company email is required"],
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
    logo: {
      type: String,
    },
    website: {
      type: String,
      trim: true,
    },
    gstNumber: {
      type: String,
      trim: true,
    },
    panNumber: {
      type: String,
      trim: true,
    },
    registrationNumber: {
      type: String,
      trim: true,
    },
    establishedDate: {
      type: Date,
    },
    employeeCount: {
      type: Number,
      default: 0,
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

companySchema.index({ email: 1 });
companySchema.index({ isActive: 1 });
companySchema.index({ isDeleted: 1 });

const Company = mongoose.model<ICompany>("Company", companySchema);

export default Company;

