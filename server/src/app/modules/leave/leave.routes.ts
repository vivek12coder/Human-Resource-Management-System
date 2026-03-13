import { Router } from "express";
import { LeaveController } from "./leave.controller";
import { verifyToken, authorizeRoles, checkPermission } from "../../middleware/jwtAuth.middleware";
import { validateRequest } from "../../middleware/auth.middleware";
import { z } from "zod";
import mongoose from "mongoose";

const router = Router();

router.use(verifyToken);

/* ============================= */
/*     EMPLOYEE SELF SERVICE     */
/* ============================= */

// Apply leave
router.post(
  "/apply",
  validateRequest(
    z.object({
      body: z.object({
        leaveType: z.enum([
          "Casual",
          "Sick",
          "Earned",
          "Unpaid",
          "Maternity",
          "Paternity",
          "Compensatory",
          "Other",
        ]),
        startDate: z.string(),
        endDate: z.string(),
        reason: z.string().min(10).max(1000),
        isHalfDay: z.boolean().optional(),
        halfDayType: z.enum(["First-Half", "Second-Half"]).optional(),
        attachments: z.array(z.string()).optional(),
      }),
    })
  ),
  LeaveController.applyLeave
);

// Get my leaves
router.get("/my", LeaveController.getMyLeaves);

// Get my leave balance
router.get("/balance", LeaveController.getMyLeaveBalance);

// Cancel my leave
router.patch(
  "/:id/cancel",
  validateRequest(
    z.object({
      params: z.object({
        id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
          message: "Invalid leave ID",
        }),
      }),
      body: z.object({
        cancellationReason: z.string().optional(),
      }),
    })
  ),
  LeaveController.cancelLeave
);

/* ============================= */
/*     ADMIN ROUTES              */
/* ============================= */

// Get all leaves
router.get(
  "/",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "HR", "BRANCH_ADMIN", "JUNIOR_ADMIN"),
  checkPermission("LEAVE_VIEW"),
  LeaveController.getAllLeaves
);

// Get pending leaves count
router.get(
  "/pending/count",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "HR", "BRANCH_ADMIN"),
  LeaveController.getPendingLeavesCount
);

// Get leave stats
router.get(
  "/stats",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "HR", "BRANCH_ADMIN"),
  LeaveController.getLeaveStats
);

// Get leave by ID
router.get(
  "/:id",
  validateRequest(
    z.object({
      params: z.object({
        id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
          message: "Invalid leave ID",
        }),
      }),
    })
  ),
  LeaveController.getLeaveById
);

// Approve leave
router.patch(
  "/:id/approve",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "HR", "BRANCH_ADMIN", "JUNIOR_ADMIN"),
  checkPermission("LEAVE_APPROVE"),
  validateRequest(
    z.object({
      params: z.object({
        id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
          message: "Invalid leave ID",
        }),
      }),
    })
  ),
  LeaveController.approveLeave
);

// Reject leave
router.patch(
  "/:id/reject",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "HR", "BRANCH_ADMIN", "JUNIOR_ADMIN"),
  checkPermission("LEAVE_APPROVE"),
  validateRequest(
    z.object({
      params: z.object({
        id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
          message: "Invalid leave ID",
        }),
      }),
      body: z.object({
        rejectionReason: z.string().min(10),
      }),
    })
  ),
  LeaveController.rejectLeave
);

export default router;

