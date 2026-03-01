"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const farmController_1 = require("../controller/farmController");
const middelware_1 = require("../middelware/middelware");
const client_1 = require("@prisma/client");
const farmRouter = (0, express_1.Router)();
// Apply auth middleware to all routes
farmRouter.use((req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, ["OWNER"]); // Allow all authenticated users
});
// ==================== FARM ROUTES ====================
// Get all farms (with role-based filtering)
farmRouter.get("/", farmController_1.getAllFarms);
// Get current user's farms
farmRouter.get("/my-farms", farmController_1.getUserFarms);
// Get farm by ID
farmRouter.get("/:id", farmController_1.getFarmById);
// Get farm analytics
farmRouter.get("/:id/analytics", farmController_1.getFarmAnalytics);
// Create farm (only OWNER)
farmRouter.post("/", (req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, [client_1.UserRole.OWNER]);
}, farmController_1.createFarm);
// Update farm
farmRouter.put("/:id", farmController_1.updateFarm);
// Delete farm (only owner)
farmRouter.delete("/:id", farmController_1.deleteFarm);
// ==================== MANAGER MANAGEMENT ROUTES ====================
// Add manager to farm (only owner)
farmRouter.post("/:id/managers", (req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, [client_1.UserRole.OWNER]);
}, farmController_1.addManagerToFarm);
// Remove manager from farm (only owner)
farmRouter.delete("/:id/managers/:managerId", (req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, [client_1.UserRole.OWNER]);
}, farmController_1.removeManagerFromFarm);
exports.default = farmRouter;
