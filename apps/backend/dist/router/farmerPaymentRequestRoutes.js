"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dealerSalePaymentRequestController_1 = require("../controller/dealerSalePaymentRequestController");
const middelware_1 = require("../middelware/middelware");
const router = (0, express_1.Router)();
// All routes require farmer (OWNER) authentication
router.use((req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, ["OWNER"]);
});
// ==================== FARMER PAYMENT REQUEST ROUTES ====================
// Statistics (must come before /:id to avoid route conflicts)
router.get("/statistics", dealerSalePaymentRequestController_1.getFarmerPaymentRequestStatistics);
// List and get
router.get("/", dealerSalePaymentRequestController_1.getFarmerPaymentRequests);
router.get("/:id", dealerSalePaymentRequestController_1.getFarmerPaymentRequestById);
// Create
router.post("/", dealerSalePaymentRequestController_1.createPaymentRequest);
// Respond to dealer-initiated request with proof
router.post("/:id/respond", dealerSalePaymentRequestController_1.respondToPaymentRequest);
exports.default = router;
