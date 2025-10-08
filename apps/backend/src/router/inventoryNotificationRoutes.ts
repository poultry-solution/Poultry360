import { Router } from "express";
import { authMiddleware } from "../middelware/middelware";
import {
  checkUserInventoryLevels,
  checkAllUsers,
  getUserInventoryStats,
  testInventoryNotification,
} from "../controller/inventoryNotificationController";

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Check inventory levels for a specific user
router.get("/user/:userId/check", checkUserInventoryLevels);

// Get inventory statistics for a user
router.get("/user/:userId/stats", getUserInventoryStats);

// Test inventory notification for a specific user
router.post("/user/:userId/test", testInventoryNotification);

// Check all users (admin/system endpoint)
router.post("/check-all", checkAllUsers);

export default router;
