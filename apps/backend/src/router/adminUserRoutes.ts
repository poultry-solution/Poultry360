import { Router } from "express";
import { getAllUsers, getUserById, hardDeleteUser } from "../controller/adminUserController";
import { authMiddleware, auditSuccessfulAdminMutation } from "../middelware/middelware";
import { UserRole } from "@prisma/client";
import { updateAdminAccountFeature } from "../controller/accountFeatureController";

const router = Router();

// Apply authentication middleware to all routes - SUPER_ADMIN only
router.use((req, res, next) => {
  authMiddleware(req, res, next, [UserRole.SUPER_ADMIN]);
});
router.use(auditSuccessfulAdminMutation("User"));

// ==================== ADMIN USER ROUTES ====================

// Get all users with pagination, search, and filtering
router.get("/", getAllUsers);

// Get user by ID with full details
router.get("/:id", getUserById);

// Independently grant or revoke a feature for one account
router.put("/:id/features/:featureKey", updateAdminAccountFeature);

// Hard delete user with super admin password confirmation
router.delete("/:id", hardDeleteUser);

export default router;
