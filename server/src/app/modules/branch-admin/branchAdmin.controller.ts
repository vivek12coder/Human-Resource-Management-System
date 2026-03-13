import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { BranchAdminService } from "./branchAdmin.service";

export class BranchAdminController {
  static createStaff = catchAsync(async (req, res) => {
    const loggedInUser = res.locals.user;

    const result = await BranchAdminService.createStaff(req.body, loggedInUser);

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: "Staff created successfully",
      data: result,
    });
  });
}
