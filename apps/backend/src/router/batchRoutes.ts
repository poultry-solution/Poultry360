import { Router } from "express";
import {
  getAllBatches,
  getBatchById,
  getFarmBatches,
  createBatch,
  updateBatch,
  deleteBatch,
  updateBatchStatus,
  getBatchAnalytics,
} from "../controller/batchController.js";
import { authMiddleware } from "../middelware/middelware.js";
import { UserRole } from "@prisma/client";

const batchRouter = Router();

// Apply auth middleware to all routes
batchRouter.use((req, res, next) => {
  authMiddleware(req, res, next, []); // Allow all authenticated users
});

// ==================== BATCH ROUTES ====================

// Get all batches (with role-based filtering)
batchRouter.get("/", getAllBatches);

// Get farm batches
batchRouter.get("/farm/:farmId", getFarmBatches);

// Get batch by ID
batchRouter.get("/:id", getBatchById);

// Get batch analytics
batchRouter.get("/:id/analytics", getBatchAnalytics);

// Create batch
batchRouter.post("/", createBatch);

// Update batch
batchRouter.put("/:id", updateBatch);

// Update batch status
batchRouter.patch("/:id/status", updateBatchStatus);

// Delete batch
batchRouter.delete("/:id", deleteBatch);

export default batchRouter;
