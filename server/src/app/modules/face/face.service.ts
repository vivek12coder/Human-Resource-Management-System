import { Types } from "mongoose";
import FaceDescriptor from "./face.model";
import Employee from "../employee/employee.model";
import AppError from "../../errors/AppError";
import { HttpStatusCode } from "axios";

export class FaceService {
  /* =============================
          REGISTER FACE
     ============================= */
  static async registerFace(
    employeeId: string | Types.ObjectId,
    descriptors: number[][]
  ) {
    if (!descriptors || !descriptors.length) {
      throw new AppError(
        HttpStatusCode.BadRequest,
        "Request Failed",
        "Face descriptors are required"
      );
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      throw new AppError(
        HttpStatusCode.NotFound,
        "Request Failed",
        "Employee not found"
      );
    }

    // Replace old descriptors if re-registering
    await FaceDescriptor.deleteMany({ employee: employeeId });

    const descriptorDocs = descriptors.map((desc) => ({
      employee: employeeId,
      descriptorVector: desc,
    }));

    await FaceDescriptor.insertMany(descriptorDocs);

    // Update employee profile
    employee.faceRegistered = true;
    await employee.save();

    return { success: true };
  }

  /* =============================
          GET ALL DESCRIPTORS
     ============================= */
  static async getAllDescriptors() {
    // We only fetch active employees
    const activeEmployees = await Employee.find({
      isActive: true,
      isDeleted: false,
      faceRegistered: true,
    }).select("_id firstName lastName employeeId profileImage");

    const employeeIds = activeEmployees.map((e) => e._id);

    const matchDescriptors = await FaceDescriptor.find({
      employee: { $in: employeeIds },
    });

    // Group descriptors by employee
    const grouped = matchDescriptors.reduce((acc, curr) => {
      const empId = curr.employee.toString();
      if (!acc[empId]) acc[empId] = [];
      acc[empId].push(curr.descriptorVector);
      return acc;
    }, {} as Record<string, number[][]>);

    // Construct response
    const result = activeEmployees
      .map((emp) => ({
        employeeId: emp._id,
        employeeCode: emp.employeeId,
        name: `${emp.firstName} ${emp.lastName}`,
        profileImage: emp.profileImage,
        descriptors: grouped[emp._id.toString()] || [],
      }))
      .filter((emp) => emp.descriptors.length > 0);

    return result;
  }
}
