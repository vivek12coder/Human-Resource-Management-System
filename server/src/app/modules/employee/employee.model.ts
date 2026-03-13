import mongoose, { Document, Schema } from "mongoose";

/* ============================= */
/*     EMPLOYEE INTERFACE        */
/* ============================= */

export interface IEmployee extends Document {
  // Basic Info
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  dateOfBirth?: Date;
  gender: "Male" | "Female" | "Other";
  maritalStatus?: "Single" | "Married" | "Divorced" | "Widowed";
  bloodGroup?: string;
  profileImage?: string;

  // Company Info
  company: mongoose.Types.ObjectId;
  branch?: mongoose.Types.ObjectId;
  department?: mongoose.Types.ObjectId;
  designation?: mongoose.Types.ObjectId;
  reportingManager?: mongoose.Types.ObjectId;

  // Employment Info
  employmentType: "Full-Time" | "Part-Time" | "Contract" | "Intern" | "Probation";
  joiningDate: Date;
  confirmationDate?: Date;
  resignationDate?: Date;
  lastWorkingDate?: Date;
  employmentStatus: "Active" | "Resigned" | "Terminated" | "On-Notice" | "Absconding";

  // Salary Info
  basicSalary: number;
  grossSalary?: number;
  ctc?: number;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  panNumber?: string;
  pfNumber?: string;
  esiNumber?: string;
  uanNumber?: string;

  // Address
  currentAddress?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
  };
  permanentAddress?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
  };

  // Emergency Contact
  emergencyContact?: {
    name?: string;
    relationship?: string;
    phone?: string;
  };

  // Documents
  documents?: {
    aadharNumber?: string;
    passportNumber?: string;
    drivingLicense?: string;
    voterId?: string;
  };

  // Linked User Account
  user?: mongoose.Types.ObjectId;

  // Work Schedule
  workShift?: string;
  weekOff?: string[];

  // Attendance Settings
  allowMobileAttendance: boolean;
  geofenceEnabled: boolean;
  geofenceRadius?: number;

  // Leave Balance
  leaveBalance?: {
    casual: number;
    sick: number;
    earned: number;
    unpaid: number;
  };

  // Face Recognition Setting
  faceRegistered: boolean;

  isActive: boolean;
  isDeleted: boolean;
  createdBy: mongoose.Types.ObjectId;
}

/* ============================= */
/*            SCHEMA             */
/* ============================= */

const employeeSchema = new Schema<IEmployee>(
  {
    // Basic Info
    employeeId: {
      type: String,
      required: [true, "Employee ID is required"],
      trim: true,
    },
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      maxlength: 50,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone is required"],
      trim: true,
    },
    alternatePhone: {
      type: String,
      trim: true,
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      required: true,
    },
    maritalStatus: {
      type: String,
      enum: ["Single", "Married", "Divorced", "Widowed"],
    },
    bloodGroup: {
      type: String,
    },
    profileImage: {
      type: String,
    },

    // Company Info
    company: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: [true, "Company is required"],
    },
    branch: {
      type: Schema.Types.ObjectId,
      ref: "Branch",
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: "Department",
    },
    designation: {
      type: Schema.Types.ObjectId,
      ref: "Designation",
    },
    reportingManager: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
    },

    // Employment Info
    employmentType: {
      type: String,
      enum: ["Full-Time", "Part-Time", "Contract", "Intern", "Probation"],
      default: "Full-Time",
    },
    joiningDate: {
      type: Date,
      required: [true, "Joining date is required"],
    },
    confirmationDate: {
      type: Date,
    },
    resignationDate: {
      type: Date,
    },
    lastWorkingDate: {
      type: Date,
    },
    employmentStatus: {
      type: String,
      enum: ["Active", "Resigned", "Terminated", "On-Notice", "Absconding"],
      default: "Active",
    },

    // Salary Info
    basicSalary: {
      type: Number,
      required: [true, "Basic salary is required"],
      default: 0,
    },
    grossSalary: {
      type: Number,
      default: 0,
    },
    ctc: {
      type: Number,
      default: 0,
    },
    bankName: {
      type: String,
      trim: true,
    },
    accountNumber: {
      type: String,
      trim: true,
    },
    ifscCode: {
      type: String,
      trim: true,
    },
    panNumber: {
      type: String,
      trim: true,
    },
    pfNumber: {
      type: String,
      trim: true,
    },
    esiNumber: {
      type: String,
      trim: true,
    },
    uanNumber: {
      type: String,
      trim: true,
    },

    // Address
    currentAddress: {
      street: String,
      city: String,
      state: String,
      country: { type: String, default: "India" },
      pincode: String,
    },
    permanentAddress: {
      street: String,
      city: String,
      state: String,
      country: { type: String, default: "India" },
      pincode: String,
    },

    // Emergency Contact
    emergencyContact: {
      name: String,
      relationship: String,
      phone: String,
    },

    // Documents
    documents: {
      aadharNumber: String,
      passportNumber: String,
      drivingLicense: String,
      voterId: String,
    },

    // Linked User Account
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    // Work Schedule
    workShift: {
      type: String,
      default: "General",
    },
    weekOff: {
      type: [String],
      default: ["Sunday"],
    },

    // Attendance Settings
    allowMobileAttendance: {
      type: Boolean,
      default: true,
    },
    geofenceEnabled: {
      type: Boolean,
      default: false,
    },
    geofenceRadius: {
      type: Number,
      default: 100,
    },

    // Leave Balance
    leaveBalance: {
      casual: { type: Number, default: 12 },
      sick: { type: Number, default: 12 },
      earned: { type: Number, default: 15 },
      unpaid: { type: Number, default: 0 },
    },

    // Face Recognition Setting
    faceRegistered: {
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

employeeSchema.index({ company: 1, employeeId: 1 }, { unique: true });
employeeSchema.index({ company: 1 });
employeeSchema.index({ email: 1 });
employeeSchema.index({ department: 1 });
employeeSchema.index({ branch: 1 });
employeeSchema.index({ employmentStatus: 1 });

/* ============================= */
/*         VIRTUAL FIELDS        */
/* ============================= */

employeeSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

employeeSchema.set("toJSON", { virtuals: true });
employeeSchema.set("toObject", { virtuals: true });

const Employee = mongoose.model<IEmployee>("Employee", employeeSchema);

export default Employee;
