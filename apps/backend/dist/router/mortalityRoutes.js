"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mortalityController_1 = require("../controller/mortalityController");
const middelware_1 = require("../middelware/middelware");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(middelware_1.authMiddleware);
// Statistics route (before /:id to avoid conflicts)
router.get("/statistics", mortalityController_1.getMortalityStatistics);
// Batch-specific mortalities
router.get("/batch/:batchId", mortalityController_1.getBatchMortalities);
// CRUD routes
router.get("/", mortalityController_1.getAllMortalities);
router.get("/:id", mortalityController_1.getMortalityById);
router.post("/", mortalityController_1.createMortality);
router.put("/:id", mortalityController_1.updateMortality);
router.delete("/:id", mortalityController_1.deleteMortality);
exports.default = router;
