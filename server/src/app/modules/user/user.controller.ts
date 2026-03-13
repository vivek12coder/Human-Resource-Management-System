import { catchAsync } from '../../utils/catchAsync';
import { UserService } from './user.service';
import AppError from '../../errors/AppError';
import sendResponse from '../../utils/sendResponse';
import { HttpStatusCode } from 'axios';
import httpStatus from 'http-status';
import Employee from '../employee/employee.model';
import Branch from '../branch/branch.model';

export class UserController {
  static createUser = catchAsync(async (req, res) => {
    const payload = req.body;
    const loggedInUser = res.locals.user;

    if (!loggedInUser) {
      throw new AppError(
        HttpStatusCode.Unauthorized,
        'Unauthorized',
        'Please login first'
      );
    }

    if (payload.role === 'SUPER_ADMIN') {
      throw new AppError(
        HttpStatusCode.Forbidden,
        'Permission Denied',
        'Cannot create SUPER_ADMIN'
      );
    }

    if (loggedInUser.role === 'SUPER_ADMIN') {
      if (payload.role !== 'ADMIN') {
        throw new AppError(
          HttpStatusCode.Forbidden,
          'Permission Denied',
          'SUPER_ADMIN can only create ADMIN users'
        );
      }

      if (!payload.company) {
        throw new AppError(
          HttpStatusCode.BadRequest,
          'Request Failed',
          'Company is required to create ADMIN user'
        );
      }
    } else if (loggedInUser.role === 'ADMIN') {
      payload.company = loggedInUser.company;

      if (payload.role !== 'JUNIOR_ADMIN' && payload.role !== 'HR') {
        throw new AppError(
          HttpStatusCode.Forbidden,
          'Permission Denied',
          'ADMIN can only create JUNIOR_ADMIN or HR users'
        );
      }

      if (!payload.permissions || payload.permissions.length === 0) {
        throw new AppError(
          HttpStatusCode.BadRequest,
          'Request Failed',
          'Permissions required for JUNIOR_ADMIN/HR'
        );
      }

      if (payload.branch) {
        const branch = await Branch.findById(payload.branch).lean();
        if (!branch || branch.isDeleted) {
          throw new AppError(
            HttpStatusCode.NotFound,
            'Request Failed',
            'Branch not found'
          );
        }

        if (branch.company?.toString() !== loggedInUser.company?.toString()) {
          throw new AppError(
            HttpStatusCode.Forbidden,
            'Permission Denied',
            'You can only assign branches from your company'
          );
        }
      }
    } else if (loggedInUser.role === 'JUNIOR_ADMIN') {
      payload.company = loggedInUser.company;
      payload.branch = loggedInUser.branch;
      payload.role = 'EMPLOYEE';
      payload.permissions = [];

      if (!payload.employee) {
        throw new AppError(
          HttpStatusCode.BadRequest,
          'Request Failed',
          'Employee is required to create credentials'
        );
      }

      const employee = await Employee.findById(payload.employee).lean();
      if (!employee || employee.isDeleted) {
        throw new AppError(
          HttpStatusCode.NotFound,
          'Request Failed',
          'Employee not found'
        );
      }

      if (employee.company?.toString() !== loggedInUser.company?.toString()) {
        throw new AppError(
          HttpStatusCode.Forbidden,
          'Permission Denied',
          'You can only create users for your company employees'
        );
      }

      if (employee.branch?.toString() !== loggedInUser.branch?.toString()) {
        throw new AppError(
          HttpStatusCode.Forbidden,
          'Permission Denied',
          'You can only create users for your branch employees'
        );
      }

      if (employee.user) {
        throw new AppError(
          HttpStatusCode.BadRequest,
          'Request Failed',
          'Credentials already created for this employee'
        );
      }

      payload.name = payload.name || `${employee.firstName} ${employee.lastName}`;
      payload.email = payload.email || employee.email;
    } else {
      throw new AppError(
        HttpStatusCode.Forbidden,
        'Permission Denied',
        'You are not allowed to create users'
      );
    }

    const newUser = await UserService.createNewUser(payload);
    if (loggedInUser.role === 'JUNIOR_ADMIN' && payload.employee) {
      await Employee.findByIdAndUpdate(payload.employee, { user: newUser._id });
    }

    sendResponse(res, {
      statusCode: httpStatus.CREATED,
      success: true,
      message: 'User created successfully',
      data: newUser,
    });
  });

  static getUserById = catchAsync(async (req, res) => {
    const { id } = req.params;
    const loggedInUser = res.locals.user;

    if (!id) {
      throw new AppError(
        HttpStatusCode.BadRequest,
        'Request Failed',
        'User ID is required'
      );
    }

    const userId = Array.isArray(id) ? id[0] : id;
    const user = await UserService.findUserById(userId);

    if (
      loggedInUser.role !== 'SUPER_ADMIN' &&
      user.company?._id?.toString() !== loggedInUser.company?.toString()
    ) {
      throw new AppError(
        HttpStatusCode.Forbidden,
        'Forbidden',
        'You cannot access this user'
      );
    }

    if (
      loggedInUser.role === 'ADMIN' &&
      user.role !== 'JUNIOR_ADMIN' &&
      user.role !== 'HR'
    ) {
      throw new AppError(
        HttpStatusCode.Forbidden,
        'Forbidden',
        'ADMIN can only access JUNIOR_ADMIN/HR profiles'
      );
    }
    if (loggedInUser.role === 'JUNIOR_ADMIN') {
      if (user.role !== 'EMPLOYEE') {
        throw new AppError(
          HttpStatusCode.Forbidden,
          'Forbidden',
          'JUNIOR_ADMIN can only access EMPLOYEE profiles'
        );
      }
      if (user.branch?._id?.toString() !== loggedInUser.branch?.toString()) {
        throw new AppError(
          HttpStatusCode.Forbidden,
          'Forbidden',
          'You can only access employees from your branch'
        );
      }
    }

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'User fetched successfully',
      data: user,
    });
  });

  static getUserList = catchAsync(async (req, res) => {
    const { page, limit, role, search, company } = req.query;
    const loggedInUser = res.locals.user;

    const filter: Record<string, any> = { isDeleted: false };

    if (loggedInUser.role !== 'SUPER_ADMIN') {
      filter.company = loggedInUser.company;
    }

    if (loggedInUser.role === 'ADMIN') {
      filter.role = { $in: ['JUNIOR_ADMIN', 'HR'] };
    } else if (loggedInUser.role === 'JUNIOR_ADMIN' || loggedInUser.role === 'BRANCH_ADMIN') {
      filter.role = { $in: ['JUNIOR_ADMIN', 'HR', 'EMPLOYEE'] };
      filter.branch = loggedInUser.branch;
    } else if (role) {
      filter.role = role;
    }

    if (loggedInUser.role === 'SUPER_ADMIN' && company) {
      filter.company = company;
    }

    if (search) {
      filter['$or'] = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const result = await UserService.findUserList(filter, {
      page: Number(page) || 1,
      limit: Number(limit) || 10,
    });

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Users fetched successfully',
      data: result,
    });
  });

  static updateUser = catchAsync(async (req, res) => {
    const { id } = req.params;
    const payload = req.body;
    const loggedInUser = res.locals.user;

    if (!id) {
      throw new AppError(
        HttpStatusCode.BadRequest,
        'Request Failed',
        'User ID is required'
      );
    }

    const userId = Array.isArray(id) ? id[0] : id;
    const existingUser = await UserService.findUserById(userId);

    if (
      loggedInUser.role !== 'SUPER_ADMIN' &&
      existingUser.company?._id?.toString() !== loggedInUser.company?.toString()
    ) {
      throw new AppError(
        HttpStatusCode.Forbidden,
        'Forbidden',
        'You cannot update this user'
      );
    }

    if (payload.role === 'SUPER_ADMIN') {
      throw new AppError(
        HttpStatusCode.Forbidden,
        'Permission Denied',
        'Cannot assign SUPER_ADMIN role'
      );
    }

    if (loggedInUser.role === 'ADMIN') {
      if (existingUser.role !== 'JUNIOR_ADMIN' && existingUser.role !== 'HR') {
        throw new AppError(
          HttpStatusCode.Forbidden,
          'Forbidden',
          'ADMIN can only update JUNIOR_ADMIN/HR profiles'
        );
      }
      payload.company = loggedInUser.company;
    } else if (loggedInUser.role === 'JUNIOR_ADMIN') {
      if (existingUser.role !== 'EMPLOYEE') {
        throw new AppError(
          HttpStatusCode.Forbidden,
          'Forbidden',
          'JUNIOR_ADMIN can only update EMPLOYEE users'
        );
      }

      if (existingUser.branch?._id?.toString() !== loggedInUser.branch?.toString()) {
        throw new AppError(
          HttpStatusCode.Forbidden,
          'Forbidden',
          'You can only update employees from your branch'
        );
      }

      payload.role = 'EMPLOYEE';
      payload.company = loggedInUser.company;
      payload.branch = loggedInUser.branch;
    }

    const updatedUser = await UserService.updateUser({ _id: userId }, payload);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'User updated successfully',
      data: updatedUser,
    });
  });

  static deleteUser = catchAsync(async (req, res) => {
    const { id } = req.params;
    const loggedInUser = res.locals.user;

    if (!id) {
      throw new AppError(
        HttpStatusCode.BadRequest,
        'Request Failed',
        'User ID is required'
      );
    }

    const userId = Array.isArray(id) ? id[0] : id;
    const existingUser = await UserService.findUserById(userId);

    if (
      loggedInUser.role !== 'SUPER_ADMIN' &&
      existingUser.company?._id?.toString() !== loggedInUser.company?.toString()
    ) {
      throw new AppError(
        HttpStatusCode.Forbidden,
        'Forbidden',
        'You cannot delete this user'
      );
    }

    if (
      loggedInUser.role === 'ADMIN' &&
      existingUser.role !== 'JUNIOR_ADMIN' &&
      existingUser.role !== 'HR'
    ) {
      throw new AppError(
        HttpStatusCode.Forbidden,
        'Forbidden',
        'ADMIN can only delete JUNIOR_ADMIN/HR profiles'
      );
    }
    if (loggedInUser.role === 'JUNIOR_ADMIN') {
      if (existingUser.role !== 'EMPLOYEE') {
        throw new AppError(
          HttpStatusCode.Forbidden,
          'Forbidden',
          'JUNIOR_ADMIN can only delete EMPLOYEE users'
        );
      }
      if (existingUser.branch?._id?.toString() !== loggedInUser.branch?.toString()) {
        throw new AppError(
          HttpStatusCode.Forbidden,
          'Forbidden',
          'You can only delete employees from your branch'
        );
      }
    }

    const user = await UserService.deleteUserById(userId);
    if (existingUser.role === 'EMPLOYEE') {
      await Employee.findOneAndUpdate({ user: userId }, { $unset: { user: 1 } });
    }

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'User deleted successfully',
      data: user,
    });
  });

  static countUsers = catchAsync(async (req, res) => {
    const { role } = req.query;
    const loggedInUser = res.locals.user;

    const filter: Record<string, any> = { isDeleted: false };

    if (loggedInUser.role !== 'SUPER_ADMIN') {
      filter.company = loggedInUser.company;
    }

    if (loggedInUser.role === 'ADMIN') {
      filter.role = { $in: ['JUNIOR_ADMIN', 'HR'] };
    } else if (loggedInUser.role === 'JUNIOR_ADMIN' || loggedInUser.role === 'BRANCH_ADMIN') {
      filter.role = { $in: ['JUNIOR_ADMIN', 'HR', 'EMPLOYEE'] };
      filter.branch = loggedInUser.branch;
    } else if (role) {
      filter.role = role;
    }

    const total = await UserService.countUsers(filter);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Users count fetched successfully',
      data: { total },
    });
  });
}
