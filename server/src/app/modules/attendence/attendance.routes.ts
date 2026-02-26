import { Router } from "express";
import { AttendanceController } from "./attendance.controller";
import { verifyToken, authorizeRoles, checkPermission } from "../../middleware/jwtAuth.middleware";
import { validateRequest } from "../../middleware/auth.middleware";
import { z } from "zod";
import mongoose from "mongoose";

const router = Router();

router.use(verifyToken);

/* ============================= */
/*     EMPLOYEE SELF SERVICE     */
/* ============================= */

// Check In
router.post(
  "/check-in",
  authorizeRoles("EMPLOYEE"),
  validateRequest(
    z.object({
      body: z.object({
        checkInLocation: z
          .object({
            latitude: z.number(),
            longitude: z.number(),
            address: z.string().optional(),
          })
          .optional(),
        checkInImage: z.string().optional(),
        checkInDevice: z.string().optional(),
        checkInMethod: z.enum(["Mobile", "Biometric", "Web", "Manual"]).optional(),
      }),
    })
  ),
  AttendanceController.checkIn
);

// Check Out
router.post(
  "/check-out",
  authorizeRoles("EMPLOYEE"),
  validateRequest(
    z.object({
      body: z.object({
        checkOutLocation: z
          .object({
            latitude: z.number(),
            longitude: z.number(),
            address: z.string().optional(),
          })
          .optional(),
        checkOutImage: z.string().optional(),
        checkOutDevice: z.string().optional(),
        checkOutMethod: z.enum(["Mobile", "Biometric", "Web", "Manual"]).optional(),
      }),
    })
  ),
  AttendanceController.checkOut
);

// Get today's attendance
router.get(
  "/today",
  authorizeRoles("EMPLOYEE"),
  AttendanceController.getTodayAttendance
);

// Get my attendance
router.get(
  "/my",
  authorizeRoles("EMPLOYEE"),
  AttendanceController.getMyAttendance
);

/* ============================= */
/*     ADMIN ROUTES              */
/* ============================= */

// Get attendance by date range
router.get(
  "/",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "JUNIOR_ADMIN"),
  checkPermission("ATTENDANCE_VIEW"),
  AttendanceController.getAttendanceByDateRange
);

// Get attendance stats
router.get(
  "/stats",
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  AttendanceController.getAttendanceStats
);

// Mark attendance manually
router.post(
  "/mark",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "JUNIOR_ADMIN"),
  checkPermission("ATTENDANCE_MARK"),
  validateRequest(
    z.object({
      body: z.object({
        employee: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
          message: "Invalid employee ID",
        }),
        date: z.string(),
        status: z.enum(["Present", "Absent", "Half-Day", "Late", "On-Leave", "Holiday", "Week-Off"]),
        checkIn: z.string().optional(),
        checkOut: z.string().optional(),
        notes: z.string().optional(),
      }),
    })
  ),
  AttendanceController.markAttendance
);

// Get employee attendance
router.get(
  "/employee/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "JUNIOR_ADMIN"),
  checkPermission("ATTENDANCE_VIEW"),
  validateRequest(
    z.object({
      params: z.object({
        id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
          message: "Invalid employee ID",
        }),
      }),
    })
  ),
  AttendanceController.getEmployeeAttendance
);

// Regularize attendance
router.patch(
  "/:id/regularize",
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  validateRequest(
    z.object({
      params: z.object({
        id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
          message: "Invalid attendance ID",
        }),
      }),
      body: z.object({
        status: z.enum(["Present", "Absent", "Half-Day", "Late", "On-Leave"]).optional(),
        checkIn: z.string().optional(),
        checkOut: z.string().optional(),
        regularizationReason: z.string(),
      }),
    })
  ),
  AttendanceController.regularizeAttendance
);

export default router;

