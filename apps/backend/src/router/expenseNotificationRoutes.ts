import { Router } from "express";
import { authMiddleware } from "../middelware/middelware";
import {
  checkFarmExpensePatterns,
  checkAllFarms,
  getFarmExpenseStats,
  testExpenseNotification,
} from "../controller/expenseNotificationController";

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Check expense patterns for a specific farm
router.get("/farm/:farmId/check", checkFarmExpensePatterns);

// Get expense statistics for a farm
router.get("/farm/:farmId/stats", getFarmExpenseStats);

// Test expense notification for a specific farm
router.post("/farm/:farmId/test", testExpenseNotification);

// Check all farms (admin/system endpoint)
router.post("/check-all", checkAllFarms);

export default router;
