import { Router } from "express";
import {
  getAllUsers,
  getUserById,
  getCurrentUser,
  updateUser,
  deleteUser,
  getOwnerUsers,
  getManagerUsers,
  updateUserStatus,
  getUserStatistics,
} from "../controller/userController.js";
import { authMiddleware } from "../middelware/middelware.js";
import { UserRole } from "@prisma/client";

const userRouter = Router();

// Apply auth middleware to all routes
userRouter.use((req, res, next) => {
  authMiddleware(req, res, next, []); // Allow all authenticated users
});

// ==================== USER ROUTES ====================

// Get all users (with pagination, filtering, search)
userRouter.get(
  "/",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.OWNER]); // Only OWNER can view all users
  },
  getAllUsers
);

// Get current user profile
userRouter.get("/me", getCurrentUser);

// Get user by ID
userRouter.get("/:id", getUserById);

// Update user
userRouter.put("/:id", updateUser);

// Delete user (only OWNER, cannot delete self)
userRouter.delete(
  "/:id",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.OWNER]);
  },
  deleteUser
);

// ==================== ROLE-SPECIFIC ROUTES ====================

// Get all owner users
userRouter.get(
  "/owners/list",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.OWNER]);
  },
  getOwnerUsers
);

// Get all manager users
userRouter.get(
  "/managers/list",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.OWNER]);
  },
  getManagerUsers
);

// ==================== ADMIN ROUTES ====================

// Update user status (only OWNER)
userRouter.patch(
  "/:id/status",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.OWNER]);
  },
  updateUserStatus
);

// Get user statistics (only OWNER)
userRouter.get(
  "/stats/overview",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.OWNER]);
  },
  getUserStatistics
);

export default userRouter;
