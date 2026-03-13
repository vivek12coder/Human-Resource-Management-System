import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";

/* ============================= */
/*        USER INTERFACE         */
/* ============================= */

export type UserRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "BRANCH_ADMIN"
  | "JUNIOR_ADMIN"
  | "HR"
  | "MANAGER"
  | "EMPLOYEE";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: UserRole;

  company?: mongoose.Types.ObjectId; // Not required for SUPER_ADMIN
  branch?: mongoose.Types.ObjectId;  // Optional
  employee?: mongoose.Types.ObjectId;

  permissions: string[]; // ✅ Dynamic module permissions (for Junior Admin)
  
  devices: {
    deviceId: string;
    deviceName: string;
    signature: string;
    lastLogin: Date;
    ipAddress?: string;
    details?: {
      os: string;
      browser: string;
      resolution: string;
      gpu: string;
      timezone: string;
      memory: string;
      cores: string | number;
    };
  }[];

  isActive: boolean;
  isDeleted: boolean;

  comparePassword(candidatePassword: string): Promise<boolean>;
}

/* ============================= */
/*          SCHEMA               */
/* ============================= */

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },

    phone: {
      type: String,
    },

    role: {
      type: String,
      enum: [
        "SUPER_ADMIN",
        "ADMIN",
        "BRANCH_ADMIN",
        "JUNIOR_ADMIN",
        "HR",
        "MANAGER",
        "EMPLOYEE",
      ],
      required: true,
    },

    company: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: function (this: IUser) {
        return this.role !== "SUPER_ADMIN";
      },
    },

    branch: {
      type: Schema.Types.ObjectId,
      ref: "Branch",
    },

    employee: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
    },

    // ✅ New Field for Module Based Access
    permissions: {
      type: [String],
      default: [],
    },

    devices: [
      {
        deviceId: { type: String, required: true },
        deviceName: { type: String },
        signature: { type: String, required: true },
        lastLogin: { type: Date, default: Date.now },
        ipAddress: { type: String },
        details: {
          os: { type: String },
          browser: { type: String },
          resolution: { type: String },
          gpu: { type: String },
          timezone: { type: String },
          memory: { type: String },
          cores: { type: Schema.Types.Mixed },
        }
      }
    ],

    isActive: {
      type: Boolean,
      default: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

/* ============================= */
/*        INDEXES (Performance)  */
/* ============================= */

// Platform-wide unique email (recommended for SaaS)
userSchema.index({ email: 1 }, { unique: true });

// Fast filtering
userSchema.index({ company: 1 });
userSchema.index({ role: 1 });
userSchema.index({ employee: 1 }, { unique: true, sparse: true });

/* ============================= */
/*        PASSWORD HASHING       */
/* ============================= */

userSchema.pre("save", async function (this: IUser) {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

/* ============================= */
/*     PASSWORD COMPARE METHOD   */
/* ============================= */

userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model<IUser>("User", userSchema);

export default User;
