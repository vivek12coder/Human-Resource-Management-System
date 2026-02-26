import { Router } from "express";
import { EmployeeController } from "./employee.controller";
import { verifyToken, authorizeRoles, checkPermission } from "../../middleware/jwtAuth.middleware";
import { validateRequest } from "../../middleware/auth.middleware";
import { z } from "zod";
import mongoose from "mongoose";

const router = Router();

router.use(verifyToken);

/* ============================= */
/*       EMPLOYEE ROUTES         */
/* ============================= */

// Get my profile
router.get(
  "/me",
  authorizeRoles("EMPLOYEE"),
  EmployeeController.getMyProfile
);

// Update my profile
router.patch(
  "/me",
  authorizeRoles("EMPLOYEE"),
  validateRequest(
    z.object({
      body: z.object({
        firstName: z.string().min(2).max(50).optional(),
        lastName: z.string().min(2).max(50).optional(),
        phone: z.string().min(10).optional(),
        alternatePhone: z.string().min(10).optional(),
        dateOfBirth: z.string().optional(),
        gender: z.enum(["Male", "Female", "Other"]).optional(),
        maritalStatus: z.enum(["Single", "Married", "Divorced", "Widowed"]).optional(),
        bloodGroup: z.string().max(20).optional(),
        currentAddress: z
          .object({
            street: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            country: z.string().optional(),
            pincode: z.string().optional(),
          })
          .optional(),
        permanentAddress: z
          .object({
            street: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            country: z.string().optional(),
            pincode: z.string().optional(),
          })
          .optional(),
        emergencyContact: z
          .object({
            name: z.string().optional(),
            relationship: z.string().optional(),
            phone: z.string().optional(),
          })
          .optional(),
      }),
    })
  ),
  EmployeeController.updateMyProfile
);

// Create employee
router.post(
  "/",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "JUNIOR_ADMIN"),
  checkPermission("EMPLOYEE_CREATE"),
  validateRequest(
    z.object({
      body: z.object({
        employeeId: z.string().optional(),
        firstName: z.string().min(2).max(50),
        lastName: z.string().min(2).max(50),
        email: z.string().email(),
        phone: z.string().min(10),
        gender: z.enum(["Male", "Female", "Other"]),
        company: z.string().optional(),
        branch: z.string().optional(),
        department: z.string().optional(),
        designation: z.string().optional(),
        joiningDate: z.string(),
        basicSalary: z.number().min(0),
        employmentType: z
          .enum(["Full-Time", "Part-Time", "Contract", "Intern", "Probation"])
          .optional(),
      }),
    })
  ),
  EmployeeController.createEmployee
);

// Get all employees
router.get(
  "/",
  checkPermission("EMPLOYEE_VIEW"),
  EmployeeController.getAllEmployees
);

// Get employees dropdown
router.get(
  "/dropdown",
  EmployeeController.getEmployeesDropdown
);

// Get employee stats
router.get(
  "/stats",
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  EmployeeController.getEmployeeStats
);

// Get count
router.get(
  "/count",
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  EmployeeController.countEmployees
);

// Generate employee ID
router.get(
  "/generate-id",
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  EmployeeController.generateEmployeeId
);

// Get by ID
router.get(
  "/:id",
  checkPermission("EMPLOYEE_VIEW"),
  validateRequest(
    z.object({
      params: z.object({
        id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
          message: "Invalid employee ID",
        }),
      }),
    })
  ),
  EmployeeController.getEmployeeById
);

// Update employee
router.put(
  "/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "JUNIOR_ADMIN"),
  checkPermission("EMPLOYEE_UPDATE"),
  validateRequest(
    z.object({
      params: z.object({
        id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
          message: "Invalid employee ID",
        }),
      }),
    })
  ),
  EmployeeController.updateEmployee
);

// Delete employee
router.delete(
  "/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  validateRequest(
    z.object({
      params: z.object({
        id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
          message: "Invalid employee ID",
        }),
      }),
    })
  ),
  EmployeeController.deleteEmployee
);

// Toggle status
router.patch(
  "/:id/status",
  authorizeRoles("SUPER_ADMIN", "ADMIN"),
  validateRequest(
    z.object({
      params: z.object({
        id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
          message: "Invalid employee ID",
        }),
      }),
      body: z.object({
        isActive: z.boolean(),
      }),
    })
  ),
  EmployeeController.toggleEmployeeStatus
);

export default router;

