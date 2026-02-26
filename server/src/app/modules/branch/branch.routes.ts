import { Router } from "express";
import { BranchController } from "./branch.controller";
import { BranchValidations } from "./branch.validation";
import { verifyToken, authorizeRoles } from "../../middleware/jwtAuth.middleware";
import { validateRequest } from "../../middleware/auth.middleware";
import { z } from "zod";
import mongoose from "mongoose";

const router = Router();

router.use(verifyToken);

// Create branch - SUPER_ADMIN, ADMIN
router.post(
  "/",
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  validateRequest(BranchValidations.createBranchValidationSchema),
  BranchController.createBranch
);

// Get all branches
router.get(
  "/",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "JUNIOR_ADMIN"),
  BranchController.getAllBranches
);

// Get branches count
router.get(
  "/count",
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  BranchController.countBranches
);

// Get branches dropdown
router.get(
  "/dropdown",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "JUNIOR_ADMIN"),
  BranchController.getBranchesByCompany
);

// Get branch by ID
router.get(
  "/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "JUNIOR_ADMIN"),
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

// Update branch - SUPER_ADMIN, ADMIN
router.put(
  "/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  validateRequest(BranchValidations.updateBranchValidationSchema),
  BranchController.updateBranch
);

// Delete branch - SUPER_ADMIN, ADMIN
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

// Toggle branch status - SUPER_ADMIN, ADMIN
router.patch(
  "/:id/status",
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  validateRequest(BranchValidations.toggleBranchStatusValidationSchema),
  BranchController.toggleBranchStatus
);

export default router;
