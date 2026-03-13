import { Router } from "express";
import { BranchController } from "./branch.controller";
import { verifyToken, authorizeRoles, checkPermission } from "../../middleware/jwtAuth.middleware";
import { validateRequest } from "../../middleware/auth.middleware";
import { z } from "zod";
import mongoose from "mongoose";

const router = Router();

router.use(verifyToken);

// Create branch
router.post(
  "/",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "HR"),
  validateRequest(
    z.object({
      body: z.object({
        name: z.string().min(2).max(100),
        code: z.string().min(2).max(20),
        company: z.string().optional(),
        address: z.string().max(500).optional(),
        phone: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        isHeadOffice: z.boolean().optional(),
        location: z.object({
          latitude: z.number().min(-90).max(90),
          longitude: z.number().min(-180).max(180),
          radius: z.number().min(1).default(10).optional(),
        }).optional(),
      }),
    })
  ),
  BranchController.createBranch
);

// Get all branches
router.get(
  "/",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "HR", "BRANCH_ADMIN", "JUNIOR_ADMIN"),
  BranchController.getAllBranches
);

// Get branches dropdown
router.get(
  "/dropdown",
  BranchController.getBranchesDropdown
);

// Get count
router.get(
  "/count",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "HR", "BRANCH_ADMIN", "JUNIOR_ADMIN"),
  BranchController.countBranches
);

// Get by ID
router.get(
  "/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "HR", "BRANCH_ADMIN", "JUNIOR_ADMIN"),
  validateRequest(
    z.object({
      params: z.object({
        id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
          message: "Invalid branch ID",
        }),
      }),
    })
  ),
  BranchController.getBranchById
);

// Update branch
router.put(
  "/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "HR"),
  validateRequest(
    z.object({
      params: z.object({
        id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
          message: "Invalid branch ID",
        }),
      }),
      body: z.object({
        name: z.string().min(2).max(100).optional(),
        code: z.string().min(2).max(20).optional(),
        company: z.string().optional(),
        address: z.string().max(500).optional(),
        phone: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        isHeadOffice: z.boolean().optional(),
        location: z.object({
          latitude: z.number().min(-90).max(90),
          longitude: z.number().min(-180).max(180),
          radius: z.number().min(1).default(10).optional(),
        }).optional(),
        isActive: z.boolean().optional(),
      }),
    })
  ),
  BranchController.updateBranch
);

// Toggle status
router.patch(
  "/:id/status",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "HR"),
  validateRequest(
    z.object({
      params: z.object({
        id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
          message: "Invalid branch ID",
        }),
      }),
      body: z.object({
        isActive: z.boolean(),
      }),
    })
  ),
  (req, res, next) => {
    req.body = { isActive: req.body.isActive };
    next();
  },
  BranchController.updateBranch
);

// Delete branch
router.delete(
  "/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  validateRequest(
    z.object({
      params: z.object({
        id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
          message: "Invalid branch ID",
        }),
      }),
    })
  ),
  BranchController.deleteBranch
);

export default router;
