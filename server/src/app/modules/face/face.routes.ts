import { Router } from "express";
import { FaceController } from "./face.controller";
import { verifyToken, authorizeRoles } from "../../middleware/jwtAuth.middleware";
import { validateRequest } from "../../middleware/auth.middleware";
import { z } from "zod";
import mongoose from "mongoose";

const router = Router();

router.use(verifyToken);

// Register face embeddings
router.post(
  "/register",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "HR", "JUNIOR_ADMIN", "BRANCH_ADMIN", "EMPLOYEE"),
  validateRequest(
    z.object({
      body: z.object({
        employeeId: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
          message: "Invalid employee ID",
        }).optional(),
        descriptors: z.array(z.array(z.number())).min(1),
      }),
    })
  ),
  FaceController.registerFace
);

// Get all stored descriptors
router.get(
  "/descriptors",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "HR", "JUNIOR_ADMIN", "BRANCH_ADMIN", "EMPLOYEE"),
  FaceController.getFaceDescriptors
);

export default router;
