import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { RosterController } from "./roster.controller";
import {
  authorizeRoles,
  checkPermission,
  verifyToken,
} from "../../middleware/jwtAuth.middleware";
import { validateRequest } from "../../middleware/auth.middleware";

const router = Router();

router.use(verifyToken);

router.post(
  "/",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "JUNIOR_ADMIN"),
  checkPermission("ROSTER_CREATE"),
  validateRequest(
    z.object({
      body: z.object({
        employee: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
          message: "Invalid employee ID",
        }),
        shift: z
          .string()
          .refine((val) => mongoose.Types.ObjectId.isValid(val), {
            message: "Invalid shift ID",
          })
          .optional(),
        rosterDate: z.string(),
        status: z.enum(["Scheduled", "Week-Off", "On-Leave", "Holiday"]).optional(),
        notes: z.string().max(300).optional(),
      }),
    })
  ),
  RosterController.createRoster
);

router.post(
  "/bulk",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "JUNIOR_ADMIN"),
  checkPermission("ROSTER_CREATE"),
  validateRequest(
    z.object({
      body: z.object({
        company: z.string().optional(),
        employees: z
          .array(
            z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
              message: "Invalid employee ID",
            })
          )
          .min(1),
        shift: z
          .string()
          .refine((val) => mongoose.Types.ObjectId.isValid(val), {
            message: "Invalid shift ID",
          })
          .optional(),
        fromDate: z.string(),
        toDate: z.string(),
        status: z.enum(["Scheduled", "Week-Off", "On-Leave", "Holiday"]).optional(),
        notes: z.string().max(300).optional(),
      }),
    })
  ),
  RosterController.bulkAssignRoster
);

router.get("/", checkPermission("ROSTER_VIEW"), RosterController.getAllRosters);

router.get(
  "/employee/:id",
  checkPermission("ROSTER_VIEW"),
  validateRequest(
    z.object({
      params: z.object({
        id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
          message: "Invalid employee ID",
        }),
      }),
    })
  ),
  RosterController.getEmployeeRoster
);

router.get(
  "/:id",
  checkPermission("ROSTER_VIEW"),
  validateRequest(
    z.object({
      params: z.object({
        id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
          message: "Invalid roster ID",
        }),
      }),
    })
  ),
  RosterController.getRosterById
);

router.put(
  "/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "JUNIOR_ADMIN"),
  checkPermission("ROSTER_UPDATE"),
  validateRequest(
    z.object({
      params: z.object({
        id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
          message: "Invalid roster ID",
        }),
      }),
    })
  ),
  RosterController.updateRoster
);

router.patch(
  "/:id/publish",
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  validateRequest(
    z.object({
      params: z.object({
        id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
          message: "Invalid roster ID",
        }),
      }),
      body: z.object({
        isPublished: z.boolean(),
      }),
    })
  ),
  RosterController.publishRoster
);

router.delete(
  "/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  checkPermission("ROSTER_DELETE"),
  validateRequest(
    z.object({
      params: z.object({
        id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
          message: "Invalid roster ID",
        }),
      }),
    })
  ),
  RosterController.deleteRoster
);

export default router;
