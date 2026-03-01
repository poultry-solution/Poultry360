"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dealerFarmerAccountController_1 = require("../controller/dealerFarmerAccountController");
const middelware_1 = require("../middelware/middelware");
const router = (0, express_1.Router)();
// All routes require dealer authentication
router.use((req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, ["DEALER"]);
});
// List all farmer accounts for the authenticated dealer
router.get("/", dealerFarmerAccountController_1.getDealerFarmerAccounts);
// Get a specific farmer account
router.get("/:farmerId", dealerFarmerAccountController_1.getDealerFarmerAccount);
// Set farmer balance limit
router.put("/:farmerId/balance-limit", dealerFarmerAccountController_1.setFarmerBalanceLimit);
// Check farmer balance limit (e.g. before creating sale)
router.post("/:farmerId/check-balance-limit", dealerFarmerAccountController_1.checkFarmerBalanceLimit);
// Get account statement for a farmer
router.get("/:farmerId/statement", dealerFarmerAccountController_1.getDealerFarmerAccountStatement);
exports.default = router;
