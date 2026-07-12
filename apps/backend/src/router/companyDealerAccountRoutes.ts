import { Router } from "express";
import {
  getDealerAccount,
  getDealerAccountStatement,
  recordDealerPayment,
  setDealerBalanceLimit,
  checkDealerBalanceLimit,
  getAllDealerAccounts,
  getAllDealerPayments,
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




// Get all dealer payments for company
router.get(
  "/company/payments",
  (req, res, next) => authMiddleware(req, res, next, ["COMPANY"]),
  getAllDealerPayments
);



export default router;
