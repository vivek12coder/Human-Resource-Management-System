import express from 'express';
import { UserController } from './user.controller';
import { UserValidationsHRM } from './user.validation';
import { verifyToken, authorizeRoles } from '../../middleware/jwtAuth.middleware';
import { validateRequest } from '../../middleware/auth.middleware';
import { z } from 'zod';

const router = express.Router();

router.use(verifyToken);

// Create user
router.post(
  '/',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'JUNIOR_ADMIN'),
  validateRequest(UserValidationsHRM.createUserValidationSchema),
  UserController.createUser
);

// Get users
router.get(
  '/',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'JUNIOR_ADMIN', 'BRANCH_ADMIN'),
  validateRequest(UserValidationsHRM.paginationValidationSchema),
  UserController.getUserList
);

// Count users
router.get(
  '/count',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'JUNIOR_ADMIN', 'BRANCH_ADMIN'),
  validateRequest(
    z.object({
      query: z.object({
        role: z.string().optional(),
      }),
    })
  ),
  UserController.countUsers
);

// Get user by ID
router.get(
  '/:id',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'JUNIOR_ADMIN'),
  validateRequest(
    z.object({
      params: z.object({
        id: z.string().min(1, 'User ID is required'),
      }),
    })
  ),
  UserController.getUserById
);

// Update user
router.put(
  '/:id',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'JUNIOR_ADMIN'),
  validateRequest(
    z.object({
      params: z.object({
        id: z.string().min(1, 'User ID is required'),
      }),
      body: UserValidationsHRM.updateUserProfileValidationSchema.shape.body,
    })
  ),
  UserController.updateUser
);

// Delete user
router.delete(
  '/:id',
  authorizeRoles('SUPER_ADMIN', 'ADMIN', 'JUNIOR_ADMIN'),
  validateRequest(
    z.object({
      params: z.object({
        id: z.string().min(1, 'User ID is required'),
      }),
    })
  ),
  UserController.deleteUser
);

export default router;


