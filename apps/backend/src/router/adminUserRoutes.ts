import { Router } from "express";
import {
  getAllUsers,
  getUserById,
  getUserUsageById,
  hardDeleteUser,
  recordAccountPayment,
  updateAdminNotes,
  updateTestAccount,
} from "../controller/adminUserController";
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

// Count-only, role-aware account usage for the Admin account detail page
router.get("/:id/usage", getUserUsageById);

// Get user by ID with full details
router.get("/:id", getUserById);

// Independently grant or revoke a feature for one account
router.put("/:id/features/:featureKey", updateAdminAccountFeature);

// Customer-account bookkeeping managed by the Super Admin.
router.post("/:id/payments", recordAccountPayment);
router.patch("/:id/test-account", updateTestAccount);
router.patch("/:id/admin-notes", updateAdminNotes);

// Hard delete user with super admin password confirmation
router.delete("/:id", hardDeleteUser);

export default router;
