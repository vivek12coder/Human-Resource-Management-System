import { catchAsync } from "../../utils/catchAsync";
import { FaceService } from "./face.service";
import sendResponse from "../../utils/sendResponse";
import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import { HttpStatusCode } from "axios";
import Employee from "../employee/employee.model";


export class FaceController {
  /* =============================
          REGISTER FACE
     ============================= */
  static registerFace = catchAsync(async (req, res) => {
    let { employeeId, descriptors } = req.body;
    const loggedInUser = res.locals.user;

    // If an EMPLOYEE is registering their own face, use their linked employee profile
    if (loggedInUser.role === "EMPLOYEE" || !employeeId) {
      const employee = await Employee.findOne({ user: loggedInUser._id });
      if (!employee) {
        throw new AppError(HttpStatusCode.NotFound, "Request Failed", "Employee profile not found!");
      }
      employeeId = employee._id;
    }

    // Register face embeddings
    await FaceService.registerFace(employeeId, descriptors);

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Face registered successfully",
      data: null,
    });
  });

  /* =============================
          GET ALL DESCRIPTORS
     ============================= */
  static getFaceDescriptors = catchAsync(async (req, res) => {
    const result = await FaceService.getAllDescriptors();

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Face descriptors fetched successfully",
      data: result,
    });
  });
}
