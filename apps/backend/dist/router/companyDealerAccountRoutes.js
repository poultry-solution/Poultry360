"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const companyDealerAccountController_1 = require("../controller/companyDealerAccountController");
const middelware_1 = require("../middelware/middelware");
const router = (0, express_1.Router)();
// ==================== COMPANY SIDE ROUTES ====================
// Get all dealer accounts for company
router.get("/company/dealers/accounts", (req, res, next) => (0, middelware_1.authMiddleware)(req, res, next, ["COMPANY"]), companyDealerAccountController_1.getAllDealerAccounts);
// Get specific dealer account
router.get("/company/dealers/:dealerId/account", (req, res, next) => (0, middelware_1.authMiddleware)(req, res, next, ["COMPANY"]), companyDealerAccountController_1.getDealerAccount);
// Set dealer balance limit
router.put("/company/dealers/:dealerId/account/balance-limit", (req, res, next) => (0, middelware_1.authMiddleware)(req, res, next, ["COMPANY"]), companyDealerAccountController_1.setDealerBalanceLimit);
// Check dealer balance limit
router.post("/company/dealers/:dealerId/account/check-balance-limit", (req, res, next) => (0, middelware_1.authMiddleware)(req, res, next, ["COMPANY"]), companyDealerAccountController_1.checkDealerBalanceLimit);
// Get dealer account statement
router.get("/company/dealers/:dealerId/statement", (req, res, next) => (0, middelware_1.authMiddleware)(req, res, next, ["COMPANY"]), companyDealerAccountController_1.getDealerAccountStatement);
// Record payment from dealer
router.post("/company/dealers/:dealerId/payments", (req, res, next) => (0, middelware_1.authMiddleware)(req, res, next, ["COMPANY"]), companyDealerAccountController_1.recordDealerPayment);
// Get all dealer payments for company
router.get("/company/payments", (req, res, next) => (0, middelware_1.authMiddleware)(req, res, next, ["COMPANY"]), companyDealerAccountController_1.getAllDealerPayments);
// ==================== DEALER SIDE ROUTES ====================
// Get all company accounts for dealer
router.get("/dealer/companies/accounts", (req, res, next) => (0, middelware_1.authMiddleware)(req, res, next, ["DEALER"]), companyDealerAccountController_1.getAllCompanyAccounts);
// Get specific company account
router.get("/dealer/companies/:companyId/account", (req, res, next) => (0, middelware_1.authMiddleware)(req, res, next, ["DEALER"]), companyDealerAccountController_1.getCompanyAccount);
// Get company account statement
router.get("/dealer/companies/:companyId/statement", (req, res, next) => (0, middelware_1.authMiddleware)(req, res, next, ["DEALER"]), companyDealerAccountController_1.getCompanyAccountStatement);
// Record payment to company
router.post("/dealer/companies/:companyId/payments", (req, res, next) => (0, middelware_1.authMiddleware)(req, res, next, ["DEALER"]), companyDealerAccountController_1.recordCompanyPayment);
exports.default = router;
