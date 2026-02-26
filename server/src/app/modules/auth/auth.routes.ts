import { Router } from "express";
import { AuthController } from "./auth.controller";
import {
  loginValidationSchema,
  refreshTokenValidationSchema,
  changePasswordValidationSchema,
} from "./auth.validation";
import { validateRequest } from "../../middleware/auth.middleware";
import { authorizeRoles, verifyToken } from "../../middleware/jwtAuth.middleware";
import UserModel from "../user/user.model";

const router = Router();

router.get("/check", (_req, res) => res.send("Auth API working"));

// DEBUG route: keep only for dev environments.
router.get("/debug/users", async (_req, res) => {
  try {
    const users = await UserModel.find({})
      .select("name email role isActive isDeleted")
      .lean();
    res.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post(
  "/login",
  validateRequest(loginValidationSchema),
  AuthController.login
);

router.post(
  "/refresh-token",
  validateRequest(refreshTokenValidationSchema),
  AuthController.refreshToken
);

router.get(
  "/me",
  verifyToken,
  AuthController.getMe
);

router.post(
  "/change-password",
  verifyToken,
  validateRequest(changePasswordValidationSchema),
  AuthController.changePassword
);

router.post(
  "/logout",
  verifyToken,
  AuthController.logout
);

router.post(
  "/switch-user/:userId",
  verifyToken,
  authorizeRoles("SUPER_ADMIN"),
  AuthController.switchUser
);

export default router;
