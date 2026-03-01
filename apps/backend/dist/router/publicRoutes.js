"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const publicController_1 = require("../controller/publicController");
const router = (0, express_1.Router)();
// ==================== PUBLIC ROUTES (NO AUTH REQUIRED) ====================
// Search companies - used during dealer signup
router.get("/companies/search", publicController_1.searchCompanies);
// Search dealers - used when farmers want to connect
router.get("/dealers/search", publicController_1.searchDealers);
exports.default = router;
