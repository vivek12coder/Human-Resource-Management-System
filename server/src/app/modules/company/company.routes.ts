import { Router } from "express";
import { CompanyController } from "./company.controller";
import { CompanyValidations } from "./company.validation";
import { verifyToken, authorizeRoles } from "../../middleware/jwtAuth.middleware";
import { validateRequest } from "../../middleware/auth.middleware";
import { z } from "zod";
import mongoose from "mongoose";

const router = Router();

// All routes require authentication
router.use(verifyToken);

/* ============================= */
/*       SUPER ADMIN ONLY        */
/* ============================= */

// Create company - SUPER_ADMIN only
router.post(
  "/",
  authorizeRoles("SUPER_ADMIN"),
  validateRequest(CompanyValidations.createCompanyValidationSchema),
  CompanyController.createCompany
);

// Get all companies - SUPER_ADMIN only
router.get(
  "/",
  authorizeRoles("SUPER_ADMIN"),
  CompanyController.getAllCompanies
);

// Get companies count - SUPER_ADMIN only
router.get(
  "/count",
  authorizeRoles("SUPER_ADMIN"),
  CompanyController.countCompanies
);

// Get company by ID - SUPER_ADMIN only
router.get(
  "/:id",
  authorizeRoles("SUPER_ADMIN"),
  validateRequest(
    z.object({
      params: z.object({
        id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
          message: "Invalid company ID",
        }),
      }),
    })
  ),
  CompanyController.getCompanyById
);

// Update company - SUPER_ADMIN only
router.put(
  "/:id",
  authorizeRoles("SUPER_ADMIN"),
  validateRequest(CompanyValidations.updateCompanyValidationSchema),
  CompanyController.updateCompany
);

// Delete company - SUPER_ADMIN only
router.delete(
  "/:id",
  authorizeRoles("SUPER_ADMIN"),
  validateRequest(
    z.object({
      params: z.object({
        id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
          message: "Invalid company ID",
        }),
      }),
    })
  ),
  CompanyController.deleteCompany
);

// Toggle company status - SUPER_ADMIN only
router.patch(
  "/:id/status",
  authorizeRoles("SUPER_ADMIN"),
  validateRequest(CompanyValidations.toggleStatusValidationSchema),
  CompanyController.toggleCompanyStatus
);

export default router;

