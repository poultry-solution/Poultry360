import { Router } from "express";
import { getAllUsers, getUserById } from "../controller/adminUserController";
import { getPendingOtps } from "../controller/passwordResetController";
import { authMiddleware } from "../middelware/middelware";
import { UserRole } from "@prisma/client";

const router = Router();

// Apply authentication middleware to all routes - SUPER_ADMIN only
router.use((req, res, next) => {
  authMiddleware(req, res, next, [UserRole.SUPER_ADMIN]);
});

// ==================== ADMIN USER ROUTES ====================

// Get all users with pagination, search, and filtering
router.get("/", getAllUsers);

// Get pending password reset OTPs
router.get("/password-reset/otps", getPendingOtps);

// Get user by ID with full details
router.get("/:id", getUserById);

export default router;
