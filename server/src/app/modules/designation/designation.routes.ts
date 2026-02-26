import { Router } from "express";
import { DesignationController } from "./designation.controller";
import { verifyToken, authorizeRoles } from "../../middleware/jwtAuth.middleware";
import { validateRequest } from "../../middleware/auth.middleware";
import { z } from "zod";
import mongoose from "mongoose";

const router = Router();

router.use(verifyToken);

// Create designation
router.post(
  "/",
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  validateRequest(
    z.object({
      body: z.object({
        title: z.string().min(2).max(100),
        code: z.string().min(2).max(20),
        company: z.string().optional(),
        department: z.string().optional(),
        level: z.number().min(1).max(10).optional(),
        description: z.string().max(500).optional(),
      }),
    })
  ),
  DesignationController.createDesignation
);

// Get all designations
router.get(
  "/",
  DesignationController.getAllDesignations
);

// Get designations dropdown
router.get(
  "/dropdown",
  DesignationController.getDesignationsDropdown
);

// Get count
router.get(
  "/count",
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  DesignationController.countDesignations
);

// Get by ID
router.get(
  "/:id",
  validateRequest(
    z.object({
      params: z.object({
        id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
          message: "Invalid designation ID",
        }),
      }),
    })
  ),
  DesignationController.getDesignationById
);

// Update designation
router.put(
  "/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  validateRequest(
    z.object({
      params: z.object({
        id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
          message: "Invalid designation ID",
        }),
      }),
      body: z.object({
        title: z.string().min(2).max(100).optional(),
        code: z.string().min(2).max(20).optional(),
        level: z.number().min(1).max(10).optional(),
        description: z.string().max(500).optional(),
        isActive: z.boolean().optional(),
      }),
    })
  ),
  DesignationController.updateDesignation
);

// Delete designation
router.delete(
  "/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  validateRequest(
    z.object({
      params: z.object({
        id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
          message: "Invalid designation ID",
        }),
      }),
    })
  ),
  DesignationController.deleteDesignation
);

export default router;

