import { Router } from "express";
import { AttendanceController } from "./attendance.controller";
import { verifyToken, authorizeRoles, checkPermission } from "../../middleware/jwtAuth.middleware";
import { validateRequest } from "../../middleware/auth.middleware";
import { z } from "zod";
import mongoose from "mongoose";

const router = Router();

router.use(verifyToken);

/* ============================= */
/*     EMPLOYEE SELF SERVICE     */
/* ============================= */

/**
 * @swagger
 * /api/attendance/check-in:
 *   post:
 *     summary: Employee check-in
 *     description: |
 *       Employees check in to start their workday. Supports multiple check-in methods:
 *       - Mobile app with location tracking
 *       - Biometric devices
 *       - Web-based check-in
 *       - Manual check-in with admin approval
 *     tags: [Attendance]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               checkInLocation:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                     example: 40.7128
 *                   longitude:
 *                     type: number
 *                     example: -74.0060
 *                   address:
 *                     type: string
 *                     example: "New York Office"
 *               checkInImage:
 *                 type: string
 *                 format: base64
 *                 description: Base64 encoded image for verification
 *               checkInDevice:
 *                 type: string
 *                 example: "iPhone 13"
 *               checkInMethod:
 *                 type: string
 *                 enum: [Mobile, Biometric, Web, Manual]
 *                 example: "Mobile"
 *           example:
 *             checkInLocation:
 *               latitude: 40.7128
 *               longitude: -74.0060
 *               address: "New York Office"
 *             checkInMethod: "Mobile"
 *     responses:
 *       200:
 *         description: Check-in successful
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
 *                   example: "Checked in successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     attendance:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         checkInTime:
 *                           type: string
 *                           format: date-time
 *                         checkInLocation:
 *                           type: object
 *                         checkInMethod:
 *                           type: string
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Check In
router.post(
  "/check-in",
  authorizeRoles("EMPLOYEE"),
  validateRequest(
    z.object({
      body: z.object({
        checkInLocation: z
          .object({
            latitude: z.number(),
            longitude: z.number(),
            address: z.string().optional(),
          })
          .optional(),
        checkInImage: z.string().optional(),
        checkInDevice: z.string().optional(),
        checkInMethod: z.enum(["Mobile", "Biometric", "Web", "Manual"]).optional(),
      }),
    })
  ),
  AttendanceController.checkIn
);

/**
 * @swagger
 * /api/attendance/check-out:
 *   post:
 *     summary: Employee check-out
 *     description: |
 *       Employees check out to end their workday. Records location, device, and method.
 *       Calculates total working hours automatically.
 *     tags: [Attendance]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               checkOutLocation:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *                   address:
 *                     type: string
 *               checkOutImage:
 *                 type: string
 *               checkOutDevice:
 *                 type: string
 *               checkOutMethod:
 *                 type: string
 *                 enum: [Mobile, Biometric, Web, Manual]
 *     responses:
 *       200:
 *         description: Check-out successful
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
 *                   example: "Checked out successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     attendance:
 *                       type: object
 *                       properties:
 *                         checkOutTime:
 *                           type: string
 *                           format: date-time
 *                         workingHours:
 *                           type: number
 *                           example: 8.5
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Check Out
router.post(
  "/check-out",
  authorizeRoles("EMPLOYEE"),
  validateRequest(
    z.object({
      body: z.object({
        checkOutLocation: z
          .object({
            latitude: z.number(),
            longitude: z.number(),
            address: z.string().optional(),
          })
          .optional(),
        checkOutImage: z.string().optional(),
        checkOutDevice: z.string().optional(),
        checkOutMethod: z.enum(["Mobile", "Biometric", "Web", "Manual"]).optional(),
      }),
    })
  ),
  AttendanceController.checkOut
);

/**
 * @swagger
 * /api/attendance/face:
 *   post:
 *     summary: Face recognition attendance
 *     description: |
 *       Mark attendance using face recognition. Requires employee ID and face image.
 *       Automatically detects check-in or check-out based on time.
 *     tags: [Attendance]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [employeeId, image]
 *             properties:
 *               employeeId:
 *                 type: string
 *                 pattern: '^[0-9a-fA-F]{24}$'
 *                 description: MongoDB ObjectId of employee
 *               latitude:
 *                 type: number
 *               longitude:
 *                 type: number
 *               address:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: base64
 *                 description: Captured face image in base64 format
 *               device:
 *                 type: string
 *     responses:
 *       200:
 *         description: Face attendance marked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       enum: [check-in, check-out]
 *                     message:
 *                       type: string
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Face Recognition Check In/Out
router.post(
  "/face",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "JUNIOR_ADMIN", "BRANCH_ADMIN", "HR", "EMPLOYEE"),
  validateRequest(
    z.object({
      body: z.object({
        employeeId: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
          message: "Invalid employee ID",
        }),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        address: z.string().optional(),
        image: z.string().optional(),
        device: z.string().optional(),
      }),
    })
  ),
  AttendanceController.markFaceAttendance
);

/**
 * @swagger
 * /api/attendance/today:
 *   get:
 *     summary: Get today's attendance
 *     description: Retrieve current employee's attendance record for today
 *     tags: [Attendance]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Today's attendance retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     attendance:
 *                       type: object
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Get today's attendance
router.get(
  "/today",
  authorizeRoles("EMPLOYEE"),
  AttendanceController.getTodayAttendance
);

/**
 * @swagger
 * /api/attendance/my:
 *   get:
 *     summary: Get my attendance history
 *     description: Retrieve attendance records for current employee with pagination support
 *     tags: [Attendance]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Attendance history retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Get my attendance
router.get(
  "/my",
  authorizeRoles("EMPLOYEE"),
  AttendanceController.getMyAttendance
);

/* ============================= */
/*     ADMIN ROUTES              */
/* ============================= */

/**
 * @swagger
 * /api/attendance:
 *   get:
 *     summary: Get attendance by date range
 *     description: Retrieve attendance records with advanced filtering by date range, employee, department, branch
 *     tags: [Attendance]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for attendance search
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for attendance search
 *       - in: query
 *         name: employee
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *       - in: query
 *         name: department
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Present, Absent, Half-Day, Late, On-Leave, Holiday]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Attendance records retrieved
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Get attendance by date range
router.get(
  "/",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "BRANCH_ADMIN", "HR", "JUNIOR_ADMIN"),
  checkPermission("ATTENDANCE_VIEW"),
  AttendanceController.getAttendanceByDateRange
);

/**
 * @swagger
 * /api/attendance/stats:
 *   get:
 *     summary: Get attendance statistics
 *     description: Retrieve analytics for attendance including present %, late %, absent %, etc by department/branch/company
 *     tags: [Attendance]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Attendance statistics retrieved
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Get attendance stats
router.get(
  "/stats",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "BRANCH_ADMIN", "HR"),
  AttendanceController.getAttendanceStats
);

/**
 * @swagger
 * /api/attendance/mark:
 *   post:
 *     summary: Mark attendance manually
 *     description: Admin marks attendance for an employee on a specific date with custom status
 *     tags: [Attendance]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [employee, date, status]
 *             properties:
 *               employee:
 *                 type: string
 *                 pattern: '^[0-9a-fA-F]{24}$'
 *               date:
 *                 type: string
 *                 format: date
 *               status:
 *                 type: string
 *                 enum: [Present, Absent, Half-Day, Late, On-Leave, Holiday, Week-Off]
 *               checkIn:
 *                 type: string
 *                 format: time
 *               checkOut:
 *                 type: string
 *                 format: time
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Attendance marked successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Mark attendance manually
router.post(
  "/mark",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "BRANCH_ADMIN", "HR", "JUNIOR_ADMIN"),
  checkPermission("ATTENDANCE_MARK"),
  validateRequest(
    z.object({
      body: z.object({
        employee: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
          message: "Invalid employee ID",
        }),
        date: z.string(),
        status: z.enum(["Present", "Absent", "Half-Day", "Late", "On-Leave", "Holiday", "Week-Off"]),
        checkIn: z.string().optional(),
        checkOut: z.string().optional(),
        notes: z.string().optional(),
      }),
    })
  ),
  AttendanceController.markAttendance
);

/**
 * @swagger
 * /api/attendance/employee/{id}:
 *   get:
 *     summary: Get employee attendance
 *     description: Retrieve complete attendance history for specific employee with date range filtering
 *     tags: [Attendance]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *       - in: query
 *         name: fromDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: toDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Employee attendance retrieved
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
// Get employee attendance
router.get(
  "/employee/:id",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "BRANCH_ADMIN", "HR", "JUNIOR_ADMIN"),
  checkPermission("ATTENDANCE_VIEW"),
  validateRequest(
    z.object({
      params: z.object({
        id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
          message: "Invalid employee ID",
        }),
      }),
    })
  ),
  AttendanceController.getEmployeeAttendance
);

/**
 * @swagger
 * /api/attendance/{id}/regularize:
 *   patch:
 *     summary: Regularize attendance
 *     description: Admin corrects/regularizes attendance record with reason and approval
 *     tags: [Attendance]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [regularizationReason]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Present, Absent, Half-Day, Late, On-Leave]
 *               checkIn:
 *                 type: string
 *                 format: time
 *               checkOut:
 *                 type: string
 *                 format: time
 *               regularizationReason:
 *                 type: string
 *                 example: "Medical emergency on that day"
 *     responses:
 *       200:
 *         description: Attendance regularized successfully
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
// Regularize attendance
router.patch(
  "/:id/regularize",
  authorizeRoles("SUPER_ADMIN", "ADMIN", "BRANCH_ADMIN", "HR"),
  validateRequest(
    z.object({
      params: z.object({
        id: z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
          message: "Invalid attendance ID",
        }),
      }),
      body: z.object({
        status: z.enum(["Present", "Absent", "Half-Day", "Late", "On-Leave"]).optional(),
        checkIn: z.string().optional(),
        checkOut: z.string().optional(),
        regularizationReason: z.string(),
      }),
    })
  ),
  AttendanceController.regularizeAttendance
);

export default router;
