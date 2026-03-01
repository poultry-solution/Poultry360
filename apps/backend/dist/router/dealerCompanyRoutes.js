"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dealerController_1 = require("../controller/dealerController");
const middelware_1 = require("../middelware/middelware");
const router = (0, express_1.Router)();
// All routes require dealer authentication
router.use((req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, ["DEALER"]);
});
// Get products from a specific company (for catalog view)
router.get("/:companyId/products", dealerController_1.getCompanyProducts);
exports.default = router;
