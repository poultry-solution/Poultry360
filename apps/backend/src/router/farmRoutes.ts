import { Router } from "express";
import {
  getFarmById,
  getUserFarms,
  createFarm,
  updateFarm,
  deleteFarm,
  addManagerToFarm,
  removeManagerFromFarm,
  getFarmAnalytics,
} from "../controller/farmController";
import { authMiddleware, requireStaffAccountOwner, requireStaffPermission } from "../middelware/middelware";
import { StaffPermission, UserRole } from "@prisma/client";
import { auditSuccessfulFarmerMutation } from "../middelware/farmerAuditMiddleware";

const farmRouter = Router();

// Apply auth middleware to all routes
farmRouter.use((req, res, next) => {
  authMiddleware(req, res, next, ["OWNER"]); // Allow all authenticated users
});
farmRouter.use(requireStaffPermission(StaffPermission.FARMER_MANAGE_OPERATIONS));
farmRouter.use(auditSuccessfulFarmerMutation);

// ==================== FARM ROUTES ====================

// Get current user's farms
farmRouter.get("/my-farms", getUserFarms);

// Get farm by ID
farmRouter.get("/:id", getFarmById);

// Get farm analytics
farmRouter.get("/:id/analytics", getFarmAnalytics);

// Create farm (only OWNER)
farmRouter.post(
  "/",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.OWNER]);
  },
  createFarm
);

// Update farm
farmRouter.put("/:id", updateFarm);

// Delete farm (only owner)
farmRouter.delete("/:id", deleteFarm);

// ==================== MANAGER MANAGEMENT ROUTES ====================

// Add manager to farm (only owner)
farmRouter.post(
  "/:id/managers",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.OWNER]);
  },
  requireStaffAccountOwner,
  addManagerToFarm
);

// Remove manager from farm (only owner)
farmRouter.delete(
  "/:id/managers/:managerId",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.OWNER]);
  },
  requireStaffAccountOwner,
  removeManagerFromFarm
);

export default farmRouter;
