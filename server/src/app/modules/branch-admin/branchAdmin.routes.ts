import { Router } from "express";
import { verifyToken, authorizeRoles } from "../../middleware/jwtAuth.middleware";
import { validateRequest } from "../../middleware/auth.middleware";
import { BranchAdminValidation } from "./branchAdmin.validation";
import { BranchAdminController } from "./branchAdmin.controller";

const router = Router();

router.use(verifyToken);

router.post(
  "/create-staff",
  authorizeRoles("BRANCH_ADMIN", "JUNIOR_ADMIN"),
  validateRequest(BranchAdminValidation.createStaffSchema),
  BranchAdminController.createStaff
);

export default router;
