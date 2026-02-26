import { Router } from "express";

// Auth
import authRoutes from "../modules/auth/auth.routes";

// User Management
import userRoutes from "../modules/user/user.routes";

// Company Management
import companyRoutes from "../modules/company/company.routes";
import branchRoutes from "../modules/branch/branch.routes";
import departmentRoutes from "../modules/department/department.routes";
import designationRoutes from "../modules/designation/designation.routes";

// Employee Management
import employeeRoutes from "../modules/employee/employee.routes";
import shiftRoutes from "../modules/shift/shift.routes";
import rosterRoutes from "../modules/roster/roster.routes";

// Attendance & Leave
import attendanceRoutes from "../modules/attendence/attendance.routes";
import leaveRoutes from "../modules/leave/leave.routes";

// Payroll
import payrollRoutes from "../modules/payroll/payroll.routes";

// Dashboard
import dashboardRoutes from "../modules/dashboard/dashboard.routes";

const router = Router();

/* ============================= */
/*          API ROUTES           */
/* ============================= */

// Health Check
router.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "HRM API is running! 🚀",
    timestamp: new Date().toISOString(),
  });
});

// Authentication
router.use("/auth", authRoutes);

// User Management (Admin users)
router.use("/users", userRoutes);

// Company Management (SUPER_ADMIN only)
router.use("/companies", companyRoutes);

// Branch Management
router.use("/branches", branchRoutes);

// Department Management
router.use("/departments", departmentRoutes);

// Designation Management
router.use("/designations", designationRoutes);

// Employee Management
router.use("/employees", employeeRoutes);
router.use("/shifts", shiftRoutes);
router.use("/rosters", rosterRoutes);

// Attendance Management
router.use("/attendance", attendanceRoutes);

// Leave Management
router.use("/leaves", leaveRoutes);

// Payroll Management
router.use("/payroll", payrollRoutes);

// Dashboard
router.use("/dashboard", dashboardRoutes);

export default router;
