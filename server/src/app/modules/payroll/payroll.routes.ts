import { Router } from "express";
import { PayrollController } from "./payroll.controller";
import { verifyToken, authorizeRoles, checkPermission } from "../../middleware/jwtAuth.middleware";
import { validateRequest } from "../../middleware/auth.middleware";
import { z } from "zod";
import mongoose from "mongoose";

const router = Router();

router.use(verifyToken);

/* ============================= */
/*     EMPLOYEE SELF SERVICE     */
/* ============================= */

// Get my payslips
router.get("/my", PayrollController.getMyPayslips);

/* ============================= */
/*     ADMIN ROUTES              */
/* ============================= */

// Generate single payroll
router.post(
  "/generate",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "HR", "BRANCH_ADMIN"),
  checkPermission("PAYROLL_GENERATE"),
  validateRequest(
    z.object({
      body: z.object({
        employee: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
          message: "Invalid employee ID",
        }),
        month: z.number().min(1).max(12),
        year: z.number().min(2020).max(2100),
      }),
    })
  ),
  PayrollController.generatePayroll
);

// Bulk generate payroll
router.post(
  "/bulk-generate",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "HR", "BRANCH_ADMIN"),
  checkPermission("PAYROLL_GENERATE"),
  validateRequest(
    z.object({
      body: z.object({
        company: z.string().optional(),
        month: z.number().min(1).max(12),
        year: z.number().min(2020).max(2100),
      }),
    })
  ),
  PayrollController.bulkGeneratePayroll
);

// Get all payrolls
router.get(
  "/",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "HR", "BRANCH_ADMIN", "JUNIOR_ADMIN"),
  checkPermission("PAYROLL_VIEW"),
  PayrollController.getAllPayrolls
);

// Get payroll summary
router.get(
  "/summary",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "HR", "BRANCH_ADMIN"),
  PayrollController.getPayrollSummary
);

// Download payslip PDF
router.get(
  "/:id/payslip",
  validateRequest(
    z.object({
      params: z.object({
        id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
          message: "Invalid payroll ID",
        }),
      }),
    })
  ),
  PayrollController.downloadPayslip
);

// Get payroll by ID
router.get(
  "/:id",
  checkPermission("PAYROLL_VIEW"),
  validateRequest(
    z.object({
      params: z.object({
        id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
          message: "Invalid payroll ID",
        }),
      }),
    })
  ),
  PayrollController.getPayrollById
);


// Update payroll
router.put(
  "/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "HR", "BRANCH_ADMIN"),
  checkPermission("PAYROLL_UPDATE"),
  validateRequest(
    z.object({
      params: z.object({
        id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
          message: "Invalid payroll ID",
        }),
      }),
    })
  ),
  PayrollController.updatePayroll
);

// Approve payroll
router.patch(
  "/:id/approve",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "HR", "BRANCH_ADMIN"),
  validateRequest(
    z.object({
      params: z.object({
        id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
          message: "Invalid payroll ID",
        }),
      }),
    })
  ),
  PayrollController.approvePayroll
);

// Mark as paid
router.patch(
  "/:id/paid",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "HR", "BRANCH_ADMIN"),
  validateRequest(
    z.object({
      params: z.object({
        id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
          message: "Invalid payroll ID",
        }),
      }),
      body: z.object({
        paymentMethod: z.enum(["Bank Transfer", "Cash", "Cheque"]),
        transactionId: z.string().optional(),
      }),
    })
  ),
  PayrollController.markAsPaid
);

export default router;

