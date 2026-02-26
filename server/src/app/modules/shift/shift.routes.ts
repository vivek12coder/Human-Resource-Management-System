import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { ShiftController } from "./shift.controller";
import {
  authorizeRoles,
  checkPermission,
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

router.post(
  "/",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "JUNIOR_ADMIN"),
  checkPermission("SHIFT_CREATE"),
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

router.get("/", checkPermission("SHIFT_VIEW"), ShiftController.getAllShifts);

router.get("/dropdown", ShiftController.getShiftDropdown);

router.get(
  "/:id",
  checkPermission("SHIFT_VIEW"),
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

router.put(
  "/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "JUNIOR_ADMIN"),
  checkPermission("SHIFT_UPDATE"),
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

router.patch(
  "/:id/status",
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
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

router.delete(
  "/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  checkPermission("SHIFT_DELETE"),
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
