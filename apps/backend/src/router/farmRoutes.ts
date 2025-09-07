import { Router } from "express";
import {
  getAllFarms,
  getFarmById,
  getUserFarms,
  createFarm,
  updateFarm,
  deleteFarm,
  addManagerToFarm,
  removeManagerFromFarm,
  getFarmAnalytics,
} from "../controller/farmController";
import { authMiddleware } from "../middelware/middelware";
import { UserRole } from "@prisma/client";

const farmRouter = Router();

// Apply auth middleware to all routes
farmRouter.use((req, res, next) => {
  authMiddleware(req, res, next, ["OWNER"]); // Allow all authenticated users
});

// ==================== FARM ROUTES ====================

// Get all farms (with role-based filtering)
farmRouter.get("/", getAllFarms);

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
  addManagerToFarm
);

// Remove manager from farm (only owner)
farmRouter.delete(
  "/:id/managers/:managerId",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.OWNER]);
  },
  removeManagerFromFarm
);

export default farmRouter;
