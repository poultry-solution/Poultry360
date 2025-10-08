import { Router } from "express";
import { authMiddleware } from "../middelware/middelware";
import {
  checkBatchMortalityThresholds,
  checkAllActiveBatches,
  getBatchMortalityStats,
  testMortalityNotification,
} from "../controller/mortalityNotificationController";

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Check mortality thresholds for a specific batch
router.get("/batch/:batchId/check", checkBatchMortalityThresholds);

// Get mortality statistics for a batch
router.get("/batch/:batchId/stats", getBatchMortalityStats);

// Test mortality notification for a specific batch
router.post("/batch/:batchId/test", testMortalityNotification);

// Check all active batches (admin/system endpoint)
router.post("/check-all", checkAllActiveBatches);

export default router;
