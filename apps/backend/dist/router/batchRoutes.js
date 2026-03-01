"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const batchController_1 = require("../controller/batchController");
const eggProductionController_1 = require("../controller/eggProductionController");
const middelware_1 = require("../middelware/middelware");
const batchRouter = (0, express_1.Router)();
// Apply auth middleware to all routes
batchRouter.use((req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, ["OWNER"]); // Allow all authenticated users
});
// ==================== BATCH ROUTES ====================
// Get all batches (with role-based filtering)
batchRouter.get("/", batchController_1.getAllBatches);
// Get farm batches
batchRouter.get("/farm/:farmId", batchController_1.getFarmBatches);
// Get batch by ID
batchRouter.get("/:id", batchController_1.getBatchById);
// Get batch analytics
batchRouter.get("/:id/analytics", batchController_1.getBatchAnalytics);
// Get batch closure summary (for completed batches)
batchRouter.get("/:id/closure-summary", batchController_1.getBatchClosureSummary);
// Egg production (Layers batches only)
batchRouter.get("/:id/egg-production", eggProductionController_1.getEggProductionByBatch);
batchRouter.post("/:id/egg-production", eggProductionController_1.createEggProduction);
batchRouter.put("/:id/egg-production/:recordId", eggProductionController_1.updateEggProduction);
batchRouter.delete("/:id/egg-production/:recordId", eggProductionController_1.deleteEggProduction);
// Create batch
batchRouter.post("/", batchController_1.createBatch);
// Update batch
batchRouter.put("/:id", batchController_1.updateBatch);
// Update batch status
batchRouter.patch("/:id/status", batchController_1.updateBatchStatus);
// Close batch (specific endpoint for proper batch closure)
batchRouter.post("/:id/close", batchController_1.closeBatch);
// Delete batch
batchRouter.delete("/:id", batchController_1.deleteBatch);
exports.default = batchRouter;
