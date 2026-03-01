"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminDealerController_1 = require("../controller/adminDealerController");
const middelware_1 = require("../middelware/middelware");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
// Apply authentication middleware to all routes - SUPER_ADMIN only
router.use((req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, [client_1.UserRole.SUPER_ADMIN]);
});
// ==================== ADMIN DEALER ROUTES ====================
// Get all dealers with pagination, search, and filtering
router.get("/", adminDealerController_1.getAllDealers);
// Get dealer by ID
router.get("/:id", adminDealerController_1.getDealerById);
// Create new dealer
router.post("/", adminDealerController_1.createDealer);
// Update dealer
router.put("/:id", adminDealerController_1.updateDealer);
// Delete dealer
router.delete("/:id", adminDealerController_1.deleteDealer);
exports.default = router;
