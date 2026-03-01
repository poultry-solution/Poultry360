"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dealerSalePaymentRequestController_1 = require("../controller/dealerSalePaymentRequestController");
const middelware_1 = require("../middelware/middelware");
const router = (0, express_1.Router)();
// All routes require dealer authentication
router.use((req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, ["DEALER"]);
});
// ==================== DEALER PAYMENT REQUEST ROUTES ====================
// Statistics (must come before /:id to avoid route conflicts)
router.get("/statistics", dealerSalePaymentRequestController_1.getDealerPaymentRequestStatistics);
// Create payment request (dealer → farmer)
router.post("/", dealerSalePaymentRequestController_1.createDealerPaymentRequest);
// List and get
router.get("/", dealerSalePaymentRequestController_1.getDealerPaymentRequests);
router.get("/:id", dealerSalePaymentRequestController_1.getDealerPaymentRequestById);
// Approve/reject
router.post("/:id/approve", dealerSalePaymentRequestController_1.approvePaymentRequest);
router.post("/:id/reject", dealerSalePaymentRequestController_1.rejectPaymentRequest);
exports.default = router;
