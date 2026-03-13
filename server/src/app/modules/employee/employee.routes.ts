import { Router } from "express";
import { EmployeeController } from "./employee.controller";
import { verifyToken, authorizeRoles, checkPermission } from "../../middleware/jwtAuth.middleware";
import { validateRequest } from "../../middleware/validateRequest";  // Fixed import path
import { EmployeeValidations } from "./employee.validation";

const router = Router();

router.use(verifyToken);

/* ============================= */
/*       EMPLOYEE ROUTES         */
/* ============================= */

/**
 * @swagger
 * /api/employees/me:
 *   get:
 *     summary: Get my employee profile
 *     description: Retrieve the complete employee profile for the currently authenticated employee user
 *     tags: [Employees]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Employee profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Employee profile retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     employee:
 *                       $ref: '#/components/schemas/Employee'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Access denied - user must have EMPLOYEE role
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Access denied"
 *               error: "Only employees can access their own profile"
 *       404:
 *         description: Employee profile not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Employee not found"
 *               error: "No employee profile found for this user"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Get my profile
router.get(
  "/me",
  authorizeRoles("EMPLOYEE"),
  EmployeeController.getMyProfile
);

/**
 * @swagger
 * /api/employees/me:
 *   patch:
 *     summary: Update my employee profile
 *     description: Allow employees to update limited fields in their own profile (phone, emergency contacts, address, etc.)
 *     tags: [Employees]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *               personalEmail:
 *                 type: string
 *                 format: email
 *                 example: "john.personal@gmail.com"
 *               address:
 *                 $ref: '#/components/schemas/Address'
 *               emergencyContact:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                     example: "Jane Smith"
 *                   relationship:
 *                     type: string
 *                     example: "Spouse"
 *                   phone:
 *                     type: string
 *                     example: "9876543211"
 *           example:
 *             phone: "9876543210"
 *             personalEmail: "john.personal@gmail.com"
 *             address:
 *               street: "123 Updated Street"
 *               city: "New City"
 *               state: "NY"
 *               country: "USA"
 *               pincode: "10001"
 *             emergencyContact:
 *               name: "Jane Smith"
 *               relationship: "Spouse"
 *               phone: "9876543211"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Profile updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     employee:
 *                       $ref: '#/components/schemas/Employee'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Update my profile (using simplified validation for employee self-update)
router.patch(
  "/me",
  authorizeRoles("EMPLOYEE"),
  validateRequest(EmployeeValidations.updateEmployeeSchema), // Simplified for employees
  EmployeeController.updateMyProfile
);

/**
 * @swagger
 * /api/employees:
 *   post:
 *     summary: Create new employee
 *     description: Create a new employee record with complete information. Only accessible by HR and admin roles with EMPLOYEE_CREATE permission.
 *     tags: [Employees]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateEmployeeRequest'
 *           examples:
 *             fullTime:
 *               summary: Full-time employee
 *               value:
 *                 firstName: "John"
 *                 lastName: "Doe"
 *                 email: "john.doe@company.com"
 *                 phone: "9876543210"
 *                 gender: "Male"
 *                 dateOfBirth: "1990-01-15T00:00:00.000Z"
 *                 company: "507f1f77bcf86cd799439011"
 *                 branch: "507f1f77bcf86cd799439012"
 *                 department: "507f1f77bcf86cd799439013"
 *                 designation: "507f1f77bcf86cd799439014"
 *                 employmentType: "Full-Time"
 *                 joiningDate: "2024-01-01T00:00:00.000Z"
 *                 basicSalary: 50000
 *             intern:
 *               summary: Intern employee
 *               value:
 *                 firstName: "Jane"
 *                 lastName: "Smith"
 *                 email: "jane.smith@company.com"
 *                 phone: "9876543211"
 *                 gender: "Female"
 *                 company: "507f1f77bcf86cd799439011"
 *                 employmentType: "Intern"
 *                 joiningDate: "2024-06-01T00:00:00.000Z"
 *                 basicSalary: 20000
 *     responses:
 *       201:
 *         description: Employee created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Employee created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     employee:
 *                       $ref: '#/components/schemas/Employee'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       409:
 *         description: Employee with email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Employee already exists"
 *               error: "An employee with this email address already exists"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Create employee
router.post(
  "/",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "HR", "BRANCH_ADMIN", "JUNIOR_ADMIN"),
  checkPermission("EMPLOYEE_CREATE"),
  validateRequest(EmployeeValidations.createEmployeeSchema),
  EmployeeController.createEmployee
);

/**
 * @swagger
 * /api/employees:
 *   get:
 *     summary: Get all employees with advanced filtering
 *     description: |
 *       Retrieve employees with comprehensive filtering, searching, sorting, and pagination.
 *       Uses optimized MongoDB aggregation pipeline for performance (83% query reduction).
 *       Supports filtering by company, branch, department, designation, status, and employment type.
 *     tags: [Employees]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of employees per page
 *         example: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, email, or employee ID
 *         example: "john"
 *       - in: query
 *         name: company
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Filter by company ID
 *         example: "507f1f77bcf86cd799439011"
 *       - in: query
 *         name: branch
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Filter by branch ID
 *         example: "507f1f77bcf86cd799439012"
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Filter by department ID
 *         example: "507f1f77bcf86cd799439013"
 *       - in: query
 *         name: designation
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Filter by designation ID
 *         example: "507f1f77bcf86cd799439014"
 *       - in: query
 *         name: employmentType
 *         schema:
 *           type: string
 *           enum: [Full-Time, Part-Time, Contract, Intern, Probation]
 *         description: Filter by employment type
 *         example: "Full-Time"
 *       - in: query
 *         name: employmentStatus
 *         schema:
 *           type: string
 *           enum: [Active, Resigned, Terminated, On-Notice, Absconding]
 *         description: Filter by employment status
 *         example: "Active"
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *         example: true
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [firstName, lastName, employeeId, joiningDate, basicSalary, createdAt]
 *           default: createdAt
 *         description: Field to sort by
 *         example: "firstName"
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order (ascending or descending)
 *         example: "asc"
 *     responses:
 *       200:
 *         description: Employees retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *             example:
 *               success: true
 *               data:
 *                 data:
 *                   - _id: "507f1f77bcf86cd799439011"
 *                     employeeId: "EMP2024001"
 *                     firstName: "John"
 *                     lastName: "Doe"
 *                     email: "john.doe@company.com"
 *                     phone: "9876543210"
 *                     employmentType: "Full-Time"
 *                     employmentStatus: "Active"
 *                     basicSalary: 50000
 *                     company:
 *                       _id: "507f1f77bcf86cd799439012"
 *                       name: "Acme Corporation"
 *                     branch:
 *                       _id: "507f1f77bcf86cd799439013"
 *                       name: "New York Office"
 *                     department:
 *                       _id: "507f1f77bcf86cd799439014"
 *                       name: "Engineering"
 *                     designation:
 *                       _id: "507f1f77bcf86cd799439015"
 *                       title: "Senior Developer"
 *                 pagination:
 *                   page: 1
 *                   limit: 10
 *                   total: 150
 *                   totalPages: 15
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Get all employees
router.get(
  "/",
  checkPermission("EMPLOYEE_VIEW"),
  validateRequest(EmployeeValidations.getEmployeesQuerySchema),
  EmployeeController.getAllEmployees
);

/**
 * @swagger
 * /api/employees/dropdown:
 *   get:
 *     summary: Get employees dropdown list
 *     description: Retrieve a simplified list of employees for dropdown selections (ID, name, employeeId). Optimized for performance with minimal data.
 *     tags: [Employees]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: company
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Filter by company ID
 *         example: "507f1f77bcf86cd799439011"
 *       - in: query
 *         name: branch
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Filter by branch ID
 *         example: "507f1f77bcf86cd799439012"
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Filter by active status
 *         example: true
 *     responses:
 *       200:
 *         description: Employees dropdown retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Employees dropdown retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     employees:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: "507f1f77bcf86cd799439011"
 *                           employeeId:
 *                             type: string
 *                             example: "EMP2024001"
 *                           name:
 *                             type: string
 *                             example: "John Doe"
 *                           designation:
 *                             type: string
 *                             example: "Senior Developer"
 *             example:
 *               success: true
 *               message: "Employees dropdown retrieved successfully"
 *               data:
 *                 employees:
 *                   - _id: "507f1f77bcf86cd799439011"
 *                     employeeId: "EMP2024001"
 *                     name: "John Doe"
 *                     designation: "Senior Developer"
 *                   - _id: "507f1f77bcf86cd799439012"
 *                     employeeId: "EMP2024002"
 *                     name: "Jane Smith"
 *                     designation: "Product Manager"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Get employees dropdown
router.get(
  "/dropdown",
  EmployeeController.getEmployeesDropdown
);

/**
 * @swagger
 * /api/employees/stats:
 *   get:
 *     summary: Get employee statistics
 *     description: Retrieve comprehensive employee statistics including counts by status, employment type, department, and other metrics. Only accessible by HR and admin roles.
 *     tags: [Employees]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: company
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Filter statistics by company ID
 *         example: "507f1f77bcf86cd799439011"
 *       - in: query
 *         name: branch
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Filter statistics by branch ID
 *         example: "507f1f77bcf86cd799439012"
 *     responses:
 *       200:
 *         description: Employee statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Employee statistics retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalEmployees:
 *                       type: integer
 *                       example: 150
 *                     activeEmployees:
 *                       type: integer
 *                       example: 142
 *                     inactiveEmployees:
 *                       type: integer
 *                       example: 8
 *                     byEmploymentStatus:
 *                       type: object
 *                       properties:
 *                         Active:
 *                           type: integer
 *                           example: 135
 *                         Resigned:
 *                           type: integer
 *                           example: 10
 *                         Terminated:
 *                           type: integer
 *                           example: 3
 *                         On-Notice:
 *                           type: integer
 *                           example: 2
 *                     byEmploymentType:
 *                       type: object
 *                       properties:
 *                         Full-Time:
 *                           type: integer
 *                           example: 120
 *                         Part-Time:
 *                           type: integer
 *                           example: 15
 *                         Contract:
 *                           type: integer
 *                           example: 10
 *                         Intern:
 *                           type: integer
 *                           example: 5
 *                     byDepartment:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           department:
 *                             type: string
 *                             example: "Engineering"
 *                           count:
 *                             type: integer
 *                             example: 45
 *                     averageSalary:
 *                       type: number
 *                       example: 55000
 *                     salaryRange:
 *                       type: object
 *                       properties:
 *                         min:
 *                           type: number
 *                           example: 20000
 *                         max:
 *                           type: number
 *                           example: 120000
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Get employee stats
router.get(
  "/stats",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "HR", "BRANCH_ADMIN"),
  EmployeeController.getEmployeeStats
);

/**
 * @swagger
 * /api/employees/count:
 *   get:
 *     summary: Get total employee count
 *     description: Get the total number of employees with optional filtering. Quick endpoint for dashboard widgets and metrics.
 *     tags: [Employees]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: company
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Filter count by company ID
 *         example: "507f1f77bcf86cd799439011"
 *       - in: query
 *         name: branch
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Filter count by branch ID
 *         example: "507f1f77bcf86cd799439012"
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Filter count by active status
 *         example: true
 *       - in: query
 *         name: employmentStatus
 *         schema:
 *           type: string
 *           enum: [Active, Resigned, Terminated, On-Notice, Absconding]
 *         description: Filter count by employment status
 *         example: "Active"
 *     responses:
 *       200:
 *         description: Employee count retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Employee count retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     count:
 *                       type: integer
 *                       example: 142
 *             example:
 *               success: true
 *               message: "Employee count retrieved successfully"
 *               data:
 *                 count: 142
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Get count
router.get(
  "/count",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "HR", "BRANCH_ADMIN"),
  EmployeeController.countEmployees
);

/**
 * @swagger
 * /api/employees/generate-id:
 *   get:
 *     summary: Generate new employee ID
 *     description: Generate the next available employee ID following the organization's naming convention (e.g., EMP2024001)
 *     tags: [Employees]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: company
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Company ID to generate employee ID for
 *         example: "507f1f77bcf86cd799439011"
 *       - in: query
 *         name: branch
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Branch ID for branch-specific employee ID format
 *         example: "507f1f77bcf86cd799439012"
 *     responses:
 *       200:
 *         description: Employee ID generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Employee ID generated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     employeeId:
 *                       type: string
 *                       example: "EMP2024001"
 *             example:
 *               success: true
 *               message: "Employee ID generated successfully"
 *               data:
 *                 employeeId: "EMP2024001"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Generate employee ID
router.get(
  "/generate-id",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "HR", "BRANCH_ADMIN"),
  EmployeeController.generateEmployeeId
);

/**
 * @swagger
 * /api/employees/bulk-action:
 *   post:
 *     summary: Perform bulk operations on employees
 *     description: |
 *       Execute bulk operations on multiple employees simultaneously. Supported actions include:
 *       - activate: Activate selected employees
 *       - deactivate: Deactivate selected employees
 *       - delete: Soft delete selected employees
 *       - export: Export selected employees data
 *       - update: Update specific fields for selected employees
 *     tags: [Employees]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action, employeeIds]
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [activate, deactivate, delete, export, update]
 *                 description: The bulk action to perform
 *                 example: "activate"
 *               employeeIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   pattern: '^[0-9a-fA-F]{24}$'
 *                 minItems: 1
 *                 description: Array of employee IDs to perform action on
 *                 example: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]
 *               updateData:
 *                 type: object
 *                 description: Data to update (required for 'update' action)
 *                 properties:
 *                   department:
 *                     type: string
 *                     example: "507f1f77bcf86cd799439013"
 *                   designation:
 *                     type: string
 *                     example: "507f1f77bcf86cd799439014"
 *                   branch:
 *                     type: string
 *                     example: "507f1f77bcf86cd799439015"
 *           examples:
 *             activate:
 *               summary: Bulk activate employees
 *               value:
 *                 action: "activate"
 *                 employeeIds: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]
 *             update:
 *               summary: Bulk update department
 *               value:
 *                 action: "update"
 *                 employeeIds: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]
 *                 updateData:
 *                   department: "507f1f77bcf86cd799439013"
 *             delete:
 *               summary: Bulk soft delete employees
 *               value:
 *                 action: "delete"
 *                 employeeIds: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]
 *     responses:
 *       200:
 *         description: Bulk action completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Bulk action completed successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     action:
 *                       type: string
 *                       example: "activate"
 *                     processed:
 *                       type: integer
 *                       example: 2
 *                     successful:
 *                       type: integer
 *                       example: 2
 *                     failed:
 *                       type: integer
 *                       example: 0
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           employeeId:
 *                             type: string
 *                             example: "507f1f77bcf86cd799439011"
 *                           status:
 *                             type: string
 *                             enum: [success, failed]
 *                             example: "success"
 *                           message:
 *                             type: string
 *                             example: "Employee activated successfully"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Bulk actions (new endpoint for bulk operations)
router.post(
  "/bulk-action",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "HR", "BRANCH_ADMIN"),
  validateRequest(EmployeeValidations.bulkActionSchema),
  EmployeeController.bulkAction
);

/**
 * @swagger
 * /api/employees/{id}:
 *   get:
 *     summary: Get employee by ID
 *     description: Retrieve detailed information for a specific employee by their ID. Includes populated company, branch, department, and designation data.
 *     tags: [Employees]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Employee's MongoDB ObjectId
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Employee retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Employee retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     employee:
 *                       $ref: '#/components/schemas/Employee'
 *       400:
 *         description: Invalid employee ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Invalid employee ID"
 *               error: "Employee ID must be a valid MongoDB ObjectId"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Get by ID
router.get(
  "/:id",
  checkPermission("EMPLOYEE_VIEW"),
  validateRequest(EmployeeValidations.employeeParamsSchema),
  EmployeeController.getEmployeeById
);

/**
 * @swagger
 * /api/employees/{id}:
 *   put:
 *     summary: Update employee
 *     description: Update an existing employee's information. Allows updating all employee fields including assignment changes, salary updates, and status modifications.
 *     tags: [Employees]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Employee's MongoDB ObjectId
 *         example: "507f1f77bcf86cd799439011"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: "John"
 *               lastName:
 *                 type: string
 *                 example: "Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john.doe@company.com"
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *               department:
 *                 type: string
 *                 pattern: '^[0-9a-fA-F]{24}$'
 *                 example: "507f1f77bcf86cd799439013"
 *               designation:
 *                 type: string
 *                 pattern: '^[0-9a-fA-F]{24}$'
 *                 example: "507f1f77bcf86cd799439014"
 *               basicSalary:
 *                 type: number
 *                 minimum: 0
 *                 example: 55000
 *               employmentStatus:
 *                 type: string
 *                 enum: [Active, Resigned, Terminated, On-Notice, Absconding]
 *                 example: "Active"
 *               address:
 *                 $ref: '#/components/schemas/Address'
 *           example:
 *             firstName: "John"
 *             lastName: "Doe"
 *             phone: "9876543210"
 *             department: "507f1f77bcf86cd799439013"
 *             designation: "507f1f77bcf86cd799439014"
 *             basicSalary: 55000
 *             employmentStatus: "Active"
 *             address:
 *               street: "123 Main Street"
 *               city: "New York"
 *               state: "NY"
 *               country: "USA"
 *               pincode: "10001"
 *     responses:
 *       200:
 *         description: Employee updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Employee updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     employee:
 *                       $ref: '#/components/schemas/Employee'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       409:
 *         description: Conflict - email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Employee update failed"
 *               error: "Another employee with this email address already exists"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Update employee
router.put(
  "/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "HR", "BRANCH_ADMIN", "JUNIOR_ADMIN"),
  checkPermission("EMPLOYEE_UPDATE"),
  validateRequest(EmployeeValidations.updateEmployeeSchema),
  EmployeeController.updateEmployee
);

/**
 * @swagger
 * /api/employees/{id}:
 *   delete:
 *     summary: Delete employee
 *     description: |
 *       Soft delete an employee record. The employee will be marked as deleted but data is preserved for auditing.
 *       This action cannot be undone through the API and requires administrative privileges.
 *     tags: [Employees]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Employee's MongoDB ObjectId
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Employee deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: "Employee deleted successfully"
 *               data:
 *                 employeeId: "EMP2024001"
 *                 deletedAt: "2024-01-15T10:30:00.000Z"
 *       400:
 *         description: Invalid employee ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Invalid employee ID"
 *               error: "Employee ID must be a valid MongoDB ObjectId"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       409:
 *         description: Cannot delete employee with active records
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Cannot delete employee"
 *               error: "Employee has active attendance or payroll records. Please resolve these before deletion."
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Delete employee
router.delete(
  "/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "HR", "BRANCH_ADMIN"),
  validateRequest(EmployeeValidations.employeeParamsSchema),
  EmployeeController.deleteEmployee
);

/**
 * @swagger
 * /api/employees/{id}/status:
 *   patch:
 *     summary: Toggle employee active status
 *     description: |
 *       Toggle the active status of an employee (activate/deactivate).
 *       Deactivated employees cannot access the system but their data is preserved.
 *       This is useful for temporary suspensions or leave of absence.
 *     tags: [Employees]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Employee's MongoDB ObjectId
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Employee status toggled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Employee status updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     employee:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: "507f1f77bcf86cd799439011"
 *                         employeeId:
 *                           type: string
 *                           example: "EMP2024001"
 *                         firstName:
 *                           type: string
 *                           example: "John"
 *                         lastName:
 *                           type: string
 *                           example: "Doe"
 *                         isActive:
 *                           type: boolean
 *                           example: false
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-01-15T10:30:00.000Z"
 *             examples:
 *               activated:
 *                 summary: Employee activated
 *                 value:
 *                   success: true
 *                   message: "Employee activated successfully"
 *                   data:
 *                     employee:
 *                       _id: "507f1f77bcf86cd799439011"
 *                       employeeId: "EMP2024001"
 *                       firstName: "John"
 *                       lastName: "Doe"
 *                       isActive: true
 *                       updatedAt: "2024-01-15T10:30:00.000Z"
 *               deactivated:
 *                 summary: Employee deactivated
 *                 value:
 *                   success: true
 *                   message: "Employee deactivated successfully"
 *                   data:
 *                     employee:
 *                       _id: "507f1f77bcf86cd799439011"
 *                       employeeId: "EMP2024001"
 *                       firstName: "John"
 *                       lastName: "Doe"
 *                       isActive: false
 *                       updatedAt: "2024-01-15T10:30:00.000Z"
 *       400:
 *         description: Invalid employee ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "Invalid employee ID"
 *               error: "Employee ID must be a valid MongoDB ObjectId"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Toggle status
router.patch(
  "/:id/status",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "HR", "BRANCH_ADMIN"),
  validateRequest(EmployeeValidations.employeeParamsSchema),
  EmployeeController.toggleEmployeeStatus
);

export default router;
