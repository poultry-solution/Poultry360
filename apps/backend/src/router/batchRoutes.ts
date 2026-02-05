import { Router } from "express";
import {
  getAllBatches,
  getBatchById,
  getFarmBatches,
  createBatch,
  updateBatch,
  deleteBatch,
  updateBatchStatus,
  closeBatch,
  getBatchAnalytics,
  getBatchClosureSummary,
} from "../controller/batchController";
import {
  getEggProductionByBatch,
  createEggProduction,
  updateEggProduction,
  deleteEggProduction,
} from "../controller/eggProductionController";
import { authMiddleware } from "../middelware/middelware";
import { UserRole } from "@prisma/client";

const batchRouter = Router();

// Apply auth middleware to all routes
batchRouter.use((req, res, next) => {
  authMiddleware(req, res, next, ["OWNER"]); // Allow all authenticated users
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

// Get batch closure summary (for completed batches)
batchRouter.get("/:id/closure-summary", getBatchClosureSummary);

// Egg production (Layers batches only)
batchRouter.get("/:id/egg-production", getEggProductionByBatch);
batchRouter.post("/:id/egg-production", createEggProduction);
batchRouter.put("/:id/egg-production/:recordId", updateEggProduction);
batchRouter.delete("/:id/egg-production/:recordId", deleteEggProduction);

// Create batch
batchRouter.post("/", createBatch);

// Update batch
batchRouter.put("/:id", updateBatch);

// Update batch status
batchRouter.patch("/:id/status", updateBatchStatus);

// Close batch (specific endpoint for proper batch closure)
batchRouter.post("/:id/close", closeBatch);

// Delete batch
batchRouter.delete("/:id", deleteBatch);

export default batchRouter;
