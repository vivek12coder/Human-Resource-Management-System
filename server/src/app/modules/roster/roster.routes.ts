import { Router } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { RosterController } from "./roster.controller";
import {
  authorizeRoles,
  verifyToken,
} from "../../middleware/jwtAuth.middleware";
import { validateRequest } from "../../middleware/auth.middleware";

const router = Router();

router.use(verifyToken);

// Create single roster entry
router.post(
  "/",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "HR", "BRANCH_ADMIN", "JUNIOR_ADMIN"),
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

// Bulk assign roster
router.post(
  "/bulk",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "HR", "BRANCH_ADMIN", "JUNIOR_ADMIN"),
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

// Get all rosters
router.get(
  "/",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "HR", "JUNIOR_ADMIN", "BRANCH_ADMIN"),
  RosterController.getAllRosters
);

// Get employee roster
router.get(
  "/employee/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "HR", "JUNIOR_ADMIN", "BRANCH_ADMIN"),
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

// Get roster by ID
router.get(
  "/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "HR", "JUNIOR_ADMIN", "BRANCH_ADMIN"),
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

// Update roster
router.put(
  "/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "HR", "BRANCH_ADMIN", "JUNIOR_ADMIN"),
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

// Publish/unpublish roster
router.patch(
  "/:id/publish",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "HR", "BRANCH_ADMIN"),
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

// Delete roster
router.delete(
  "/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "HR", "BRANCH_ADMIN"),
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
