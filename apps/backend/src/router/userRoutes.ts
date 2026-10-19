import { Router } from "express";
import {
  getAllUsers,
  getUserById,
  getCurrentUser,
  updateUser,
  deleteUser,
  getOwnerUsers,
  updateUserStatus,
  getUserStatistics,
  updateUserPreferences,
} from "../controller/userController";
import { authMiddleware, requireStaffAccountOwner } from "../middelware/middelware";
import { UserRole } from "@prisma/client";

const userRouter = Router();

// Apply auth middleware to all routes
userRouter.use((req, res, next) => {
  authMiddleware(req, res, next, []); // Allow all authenticated users
});
// Staff identities use their owner's tenant scope for farm operations, but
// must never inherit the owner's account-administration abilities.
userRouter.use(requireStaffAccountOwner);

// ==================== USER ROUTES ====================

// Cross-tenant administration — SUPER_ADMIN only. OWNERs do not have authority
// over other tenants' accounts; the dedicated /admin/users surface is the
// scoped admin UI.
userRouter.get(
  "/",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.SUPER_ADMIN]);
  },
  getAllUsers
);

// Get current user profile
userRouter.get("/me", getCurrentUser);

// Update user preferences (language, calendar type)
userRouter.patch("/preferences", updateUserPreferences);

// Static admin sub-paths MUST be registered before "/:id" or Express will treat
// "owners" and "stats" as id values and shadow them.
userRouter.get(
  "/owners/list",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.SUPER_ADMIN]);
  },
  getOwnerUsers
);

userRouter.get(
  "/stats/overview",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.SUPER_ADMIN]);
  },
  getUserStatistics
);

// Lookup is self-service only — ownership check runs inside the controller
// (SUPER_ADMIN can look up anyone for admin workflows).
userRouter.get("/:id", getUserById);

// Self-service profile edits; role/status writes are rejected in the
// controller for everyone except SUPER_ADMIN.
userRouter.put("/:id", updateUser);

userRouter.delete(
  "/:id",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.SUPER_ADMIN]);
  },
  deleteUser
);

// Suspend/activate accounts is a cross-tenant admin action.
userRouter.patch(
  "/:id/status",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.SUPER_ADMIN]);
  },
  updateUserStatus
);

export default userRouter;
