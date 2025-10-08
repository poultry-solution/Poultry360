import { Router } from "express";
import { authMiddleware } from "../middelware/middelware";
import {
  checkBatchFeedConsumption,
  checkAllActiveBatches,
  getBatchFeedStats,
  testFeedNotification,
} from "../controller/feedNotificationController";

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Check feed consumption patterns for a specific batch
router.get("/batch/:batchId/check", checkBatchFeedConsumption);

// Get feed consumption statistics for a batch
router.get("/batch/:batchId/stats", getBatchFeedStats);

// Test feed consumption notification for a specific batch
router.post("/batch/:batchId/test", testFeedNotification);

// Check all active batches (admin/system endpoint)
router.post("/check-all", checkAllActiveBatches);

export default router;
