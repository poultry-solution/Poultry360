"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminCompanyController_1 = require("../controller/adminCompanyController");
const middelware_1 = require("../middelware/middelware");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
// Apply authentication middleware to all routes - SUPER_ADMIN only
router.use((req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, [client_1.UserRole.SUPER_ADMIN]);
});
// ==================== ADMIN COMPANY ROUTES ====================
// Get all companies with pagination, search, and filtering
router.get("/", adminCompanyController_1.getAllCompanies);
// Get company by ID
router.get("/:id", adminCompanyController_1.getCompanyById);
// Create new company
router.post("/", adminCompanyController_1.createCompany);
// Update company
router.put("/:id", adminCompanyController_1.updateCompany);
// Delete company
router.delete("/:id", adminCompanyController_1.deleteCompany);
exports.default = router;
