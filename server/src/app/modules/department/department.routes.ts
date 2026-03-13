import { Router } from "express";
import { DepartmentController } from "./department.controller";
import { verifyToken, authorizeRoles, checkPermission } from "../../middleware/jwtAuth.middleware";
import { validateRequest } from "../../middleware/auth.middleware";
import { z } from "zod";
import mongoose from "mongoose";

const router = Router();

router.use(verifyToken);

// Create department
router.post(
  "/",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "HR", "BRANCH_ADMIN", "JUNIOR_ADMIN"),
  validateRequest(
    z.object({
      body: z.object({
        name: z.string().min(2).max(100),
        code: z.string().min(2).max(20),
        company: z.string().optional(),
        branch: z.string().optional(),
        description: z.string().max(500).optional(),
      }),
    })
  ),
  DepartmentController.createDepartment
);

// Get all departments
router.get(
  "/",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "HR", "BRANCH_ADMIN", "JUNIOR_ADMIN"),
  DepartmentController.getAllDepartments
);

// Get departments dropdown
router.get(
  "/dropdown",
  DepartmentController.getDepartmentsDropdown
);

// Get count
router.get(
  "/count",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "HR", "BRANCH_ADMIN", "JUNIOR_ADMIN"),
  DepartmentController.countDepartments
);

// Get by ID
router.get(
  "/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "HR", "BRANCH_ADMIN", "JUNIOR_ADMIN"),
  validateRequest(
    z.object({
      params: z.object({
        id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
          message: "Invalid department ID",
        }),
      }),
    })
  ),
  DepartmentController.getDepartmentById
);

// Update department
router.put(
  "/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "HR", "BRANCH_ADMIN", "JUNIOR_ADMIN"),
  validateRequest(
    z.object({
      params: z.object({
        id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
          message: "Invalid department ID",
        }),
      }),
      body: z.object({
        name: z.string().min(2).max(100).optional(),
        code: z.string().min(2).max(20).optional(),
        description: z.string().max(500).optional(),
        isActive: z.boolean().optional(),
      }),
    })
  ),
  DepartmentController.updateDepartment
);

// Delete department
router.delete(
  "/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "HR", "BRANCH_ADMIN", "JUNIOR_ADMIN"),
  validateRequest(
    z.object({
      params: z.object({
        id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
          message: "Invalid department ID",
        }),
      }),
    })
  ),
  DepartmentController.deleteDepartment
);

export default router;

