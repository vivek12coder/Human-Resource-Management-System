import User, { IUser } from "./user.model";
import { Types } from "mongoose";
import { HttpStatusCode } from "axios";
import AppError from "../../errors/AppError";
import bcrypt from "bcryptjs";

export class UserService {

  /* =============================
          CREATE NEW USER
     ============================= */
  static async createNewUser(payload: Partial<IUser>) {

    if (!payload.email) {
      throw new AppError(
        HttpStatusCode.BadRequest,
        "Request Failed",
        "Email is required!"
      );
    }

    const email = payload.email.toLowerCase();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError(
        HttpStatusCode.BadRequest,
        "Request Failed",
        "User with this email already exists!"
      );
    }

    // Role validation
    if (!payload.role) {
      throw new AppError(
        HttpStatusCode.BadRequest,
        "Request Failed",
        "Role is required!"
      );
    }

    // Company required except SUPER_ADMIN
    if (payload.role !== "SUPER_ADMIN" && !payload.company) {
      throw new AppError(
        HttpStatusCode.BadRequest,
        "Request Failed",
        "Company is required!"
      );
    }

    // Junior Admin must have permissions
    if (
      payload.role === "JUNIOR_ADMIN" &&
      (!payload.permissions || payload.permissions.length === 0)
    ) {
      throw new AppError(
        HttpStatusCode.BadRequest,
        "Request Failed",
        "Permissions required for Junior Admin!"
      );
    }

    const newUser = await User.create({
      ...payload,
      email,
    });

    const userObj = newUser.toObject();
    delete (userObj as any).password;

    return userObj;
  }


  /* =============================
          GET USER BY ID
     ============================= */
  static async findUserById(_id: string | Types.ObjectId) {
    const user = await User.findById(_id)
      .select("-password -__v -updatedAt")
      .populate("company", "name code")
      .populate("branch", "name code")
      .populate("employee", "employeeId firstName lastName email")
      .lean();

    if (!user || user.isDeleted) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "User not found!"
      );
    }

    return user;
  }


  /* =============================
          GET USER BY EMAIL (FOR LOGIN)
     ============================= */
  static async findUserByEmail(email: string, withPassword = false) {
    const query = User.findOne({ email: email.toLowerCase() });

    if (withPassword) {
      query.select("+password");
    } else {
      query.select("-password -__v -updatedAt");
    }

    const user = await query
      .populate("company", "name code")
      .populate("branch", "name code")
      .populate("employee", "employeeId firstName lastName email");

    if (!user || user.isDeleted) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "User not found!"
      );
    }

    return user;
  }


  /* =============================
          GET USER LIST
     ============================= */
  static async findUserList(
    filter: Record<string, any> = {},
    query: { page?: number; limit?: number } = { page: 1, limit: 10 }
  ) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const finalFilter = { ...filter, isDeleted: false };

    const users = await User.find(finalFilter)
      .select("-password -__v -updatedAt")
      .populate("company", "name code")
      .populate("branch", "name code")
      .populate("employee", "employeeId firstName lastName email")
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 })
      .lean();

    const total = await User.countDocuments(finalFilter);

    return {
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }


  /* =============================
          UPDATE USER
     ============================= */
  static async updateUser(
    query: Record<string, string | Types.ObjectId>,
    updateDocument: Partial<IUser>
  ) {

    // Prevent updating to SUPER_ADMIN
    if (updateDocument.role === "SUPER_ADMIN") {
      throw new AppError(
        HttpStatusCode.Forbidden,
        "Permission Denied",
        "Cannot assign SUPER_ADMIN role"
      );
    }

    // Junior admin permissions validation
    if (
      updateDocument.role === "JUNIOR_ADMIN" &&
      updateDocument.permissions &&
      updateDocument.permissions.length === 0
    ) {
      throw new AppError(
        HttpStatusCode.BadRequest,
        "Request Failed",
        "Permissions required for Junior Admin!"
      );
    }

    // Password hashing if updated
    if (updateDocument.password) {
      const salt = await bcrypt.genSalt(10);
      updateDocument.password = await bcrypt.hash(updateDocument.password, salt);
    }

    const updatedUser = await User.findOneAndUpdate(
      query,
      updateDocument,
      { new: true }
    )
      .select("-password")
      .populate("company", "name code")
      .populate("branch", "name code")
      .populate("employee", "employeeId firstName lastName email")
      .lean();

    if (!updatedUser) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "User not found!"
      );
    }

    return updatedUser;
  }


  /* =============================
          SOFT DELETE USER
     ============================= */
  static async deleteUserById(_id: string | Types.ObjectId) {
    const user = await User.findByIdAndUpdate(
      _id,
      { isDeleted: true },
      { new: true }
    ).lean();

    if (!user) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "User not found!"
      );
    }

    return user;
  }


  /* =============================
          RESTORE USER
     ============================= */
  static async restoreUserById(_id: string | Types.ObjectId) {
    const user = await User.findByIdAndUpdate(
      _id,
      { isDeleted: false },
      { new: true }
    )
      .select("-password")
      .populate("company", "name code")
      .populate("branch", "name code")
      .populate("employee", "employeeId firstName lastName email")
      .lean();

    if (!user) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "User not found!"
      );
    }

    return user;
  }


  /* =============================
          CHANGE USER STATUS
     ============================= */
  static async changeUserStatus(
    _id: string | Types.ObjectId,
    isActive: boolean
  ) {
    const user = await User.findByIdAndUpdate(
      _id,
      { isActive },
      { new: true }
    )
      .select("-password")
      .populate("company", "name code")
      .populate("branch", "name code")
      .populate("employee", "employeeId firstName lastName email")
      .lean();

    if (!user || user.isDeleted) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "User not found!"
      );
    }

    return user;
  }


  /* =============================
          COUNT USERS
     ============================= */
  static async countUsers(filter: Record<string, any> = {}) {
    return await User.countDocuments({ ...filter, isDeleted: false });
  }

}
