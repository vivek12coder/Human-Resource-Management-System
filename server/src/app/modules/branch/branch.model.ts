import mongoose, { Document, Schema } from "mongoose";

export interface IBranch extends Document {
  name: string;
  code: string;
  company: mongoose.Types.ObjectId;
  address?: string;
  phone?: string;
  email?: string;
  isHeadOffice?: boolean;
  location?: {
    latitude: number;
    longitude: number;
    radius: number; // in meters (default 10)
  };
  isActive: boolean;
  isDeleted: boolean;
  createdBy: mongoose.Types.ObjectId;
}

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
    address: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    isHeadOffice: {
      type: Boolean,
      default: false,
    },
    location: {
      latitude: Number,
      longitude: Number,
      radius: {
        type: Number,
        default: 10,
      },
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

branchSchema.index({ company: 1, code: 1 }, { unique: true });
branchSchema.index({ company: 1 });

const Branch = mongoose.model<IBranch>("Branch", branchSchema);

export default Branch;
