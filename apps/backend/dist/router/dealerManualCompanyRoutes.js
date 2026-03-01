"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const middelware_1 = require("../middelware/middelware");
const dealerManualCompanyController_1 = require("../controller/dealerManualCompanyController");
const router = (0, express_1.Router)();
// All routes require dealer authentication
router.use((req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, ["DEALER"]);
});
// CRUD
router.post("/", dealerManualCompanyController_1.createManualCompany);
router.get("/", dealerManualCompanyController_1.getManualCompanies);
router.put("/:id", dealerManualCompanyController_1.updateManualCompany);
router.delete("/:id", dealerManualCompanyController_1.deleteManualCompany);
// Purchases & Payments
router.post("/:id/purchases", dealerManualCompanyController_1.recordManualPurchase);
router.post("/:id/payments", dealerManualCompanyController_1.recordManualCompanyPayment);
router.get("/:id/statement", dealerManualCompanyController_1.getManualCompanyStatement);
// Profit
router.get("/profit/summary", dealerManualCompanyController_1.getDealerProfitSummary);
exports.default = router;
