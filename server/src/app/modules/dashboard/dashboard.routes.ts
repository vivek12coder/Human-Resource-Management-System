import { Router } from "express";
import { DashboardController } from "./dashboard.controller";
import { verifyToken, authorizeRoles } from "../../middleware/jwtAuth.middleware";

const router = Router();

router.use(verifyToken);

router.get(
  "/super-admin",
  authorizeRoles("SUPER_ADMIN"),
  DashboardController.getSuperAdminDashboard
);

router.get(
  "/admin",
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  DashboardController.getAdminDashboard
);

router.get(
  "/branch-admin",
  authorizeRoles("JUNIOR_ADMIN", "BRANCH_ADMIN"),
  DashboardController.getBranchAdminDashboard
);

router.get(
  "/hr",
  authorizeRoles("HR"),
  DashboardController.getHRDashboard
);

router.get(
  "/employee",
  authorizeRoles("EMPLOYEE"),
  DashboardController.getEmployeeDashboard
);

export default router;
