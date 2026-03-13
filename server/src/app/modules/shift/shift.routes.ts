import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { ShiftController } from "./shift.controller";
import {
  authorizeRoles,
  verifyToken,
} from "../../middleware/jwtAuth.middleware";
import { validateRequest } from "../../middleware/auth.middleware";

const router = Router();

router.use(verifyToken);

const daysSchema = z.enum([
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
]);

// Create shift — open to all admin roles, no extra permission check needed
router.post(
  "/",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "HR", "BRANCH_ADMIN", "JUNIOR_ADMIN"),
  validateRequest(
    z.object({
      body: z.object({
        company: z.string().optional(),
        branch: z.string().optional(),
        name: z.string().min(2).max(80),
        code: z.string().min(2).max(20),
        description: z.string().max(250).optional(),
        startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
        endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
        gracePeriodMinutes: z.number().min(0).max(180).optional(),
        breakDurationMinutes: z.number().min(0).max(480).optional(),
        weeklyOff: z.array(daysSchema).optional(),
        isNightShift: z.boolean().optional(),
        isDefault: z.boolean().optional(),
      }),
    })
  ),
  ShiftController.createShift
);

// Get all shifts — any authenticated admin can view
router.get("/", authorizeRoles("SUPER_ADMIN", "ADMIN", "HR", "JUNIOR_ADMIN", "BRANCH_ADMIN"), ShiftController.getAllShifts);

// Dropdown — open to all authenticated users (for roster assignment etc.)
router.get("/dropdown", ShiftController.getShiftDropdown);

// Get single shift
router.get(
  "/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "HR", "JUNIOR_ADMIN", "BRANCH_ADMIN"),
  validateRequest(
    z.object({
      params: z.object({
        id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
          message: "Invalid shift ID",
        }),
      }),
    })
  ),
  ShiftController.getShiftById
);

// Update shift
router.put(
  "/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "HR", "BRANCH_ADMIN", "JUNIOR_ADMIN"),
  validateRequest(
    z.object({
      params: z.object({
        id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
          message: "Invalid shift ID",
        }),
      }),
    })
  ),
  ShiftController.updateShift
);

// Toggle active status
router.patch(
  "/:id/status",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "HR", "BRANCH_ADMIN", "JUNIOR_ADMIN"),
  validateRequest(
    z.object({
      params: z.object({
        id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
          message: "Invalid shift ID",
        }),
      }),
      body: z.object({
        isActive: z.boolean(),
      }),
    })
  ),
  ShiftController.toggleShiftStatus
);

// Delete shift
router.delete(
  "/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "HR", "BRANCH_ADMIN"),
  validateRequest(
    z.object({
      params: z.object({
        id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
          message: "Invalid shift ID",
        }),
      }),
    })
  ),
  ShiftController.deleteShift
);

export default router;
