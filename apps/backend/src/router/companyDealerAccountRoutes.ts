import { Router } from "express";
import {
  getDealerAccount,
  getDealerAccountStatement,
  recordDealerPayment,
  setDealerBalanceLimit,
  checkDealerBalanceLimit,
  proposeDealerOpeningBalance,
  proposeDealerOpeningBalanceForDealer,
  getCompanyAccount,
  getCompanyAccountStatement,
  recordCompanyPayment,
  getAllDealerAccounts,
  getAllCompanyAccounts,
  getAllDealerPayments,
  acknowledgeCompanyOpeningBalance,
  disputeCompanyOpeningBalance,
} from "../controller/companyDealerAccountController";
import { authMiddleware } from "../middelware/middelware";

const router = Router();

// ==================== COMPANY SIDE ROUTES ====================
// Get all dealer accounts for company
router.get(
  "/company/dealers/accounts",
  (req, res, next) => authMiddleware(req, res, next, ["COMPANY"]),
  getAllDealerAccounts
);

// Get specific dealer account
router.get(
  "/company/dealers/:dealerId/account",
  (req, res, next) => authMiddleware(req, res, next, ["COMPANY"]),
  getDealerAccount
);

// Set dealer balance limit
router.put(
  "/company/dealers/:dealerId/account/balance-limit",
  (req, res, next) => authMiddleware(req, res, next, ["COMPANY"]),
  setDealerBalanceLimit
);

// Check dealer balance limit
router.post(
  "/company/dealers/:dealerId/account/check-balance-limit",
  (req, res, next) => authMiddleware(req, res, next, ["COMPANY"]),
  checkDealerBalanceLimit
);

// Get dealer account statement
router.get(
  "/company/dealers/:dealerId/statement",
  (req, res, next) => authMiddleware(req, res, next, ["COMPANY"]),
  getDealerAccountStatement
);

// Record payment from dealer
router.post(
  "/company/dealers/:dealerId/payments",
  (req, res, next) => authMiddleware(req, res, next, ["COMPANY"]),
  recordDealerPayment
);

// Propose opening balance (company side; dealer must acknowledge)
router.post(
  "/company/dealers/:connectionId/opening-balance",
  (req, res, next) => authMiddleware(req, res, next, ["COMPANY"]),
  proposeDealerOpeningBalance
);

// Propose opening balance by dealerId (matches company dealer account page)
router.post(
  "/company/dealers/:dealerId/account/opening-balance",
  (req, res, next) => authMiddleware(req, res, next, ["COMPANY"]),
  proposeDealerOpeningBalanceForDealer
);

// Get all dealer payments for company
router.get(
  "/company/payments",
  (req, res, next) => authMiddleware(req, res, next, ["COMPANY"]),
  getAllDealerPayments
);

// ==================== DEALER SIDE ROUTES ====================
// Get all company accounts for dealer
router.get(
  "/dealer/companies/accounts",
  (req, res, next) => authMiddleware(req, res, next, ["DEALER"]),
  getAllCompanyAccounts
);

// Get specific company account
router.get(
  "/dealer/companies/:companyId/account",
  (req, res, next) => authMiddleware(req, res, next, ["DEALER"]),
  getCompanyAccount
);

// Get company account statement
router.get(
  "/dealer/companies/:companyId/statement",
  (req, res, next) => authMiddleware(req, res, next, ["DEALER"]),
  getCompanyAccountStatement
);

// Record payment to company
router.post(
  "/dealer/companies/:companyId/payments",
  (req, res, next) => authMiddleware(req, res, next, ["DEALER"]),
  recordCompanyPayment
);

// Dealer acknowledges opening balance proposal
router.post(
  "/dealer/companies/:companyId/opening-balance/ack",
  (req, res, next) => authMiddleware(req, res, next, ["DEALER"]),
  acknowledgeCompanyOpeningBalance
);

// Dealer disputes opening balance proposal
router.post(
  "/dealer/companies/:companyId/opening-balance/dispute",
  (req, res, next) => authMiddleware(req, res, next, ["DEALER"]),
  disputeCompanyOpeningBalance
);

export default router;
