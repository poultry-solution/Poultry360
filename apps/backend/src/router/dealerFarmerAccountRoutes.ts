import { Router } from "express";
import {
  getDealerFarmerAccounts,
  getDealerFarmerAccount,
  getDealerFarmerAccountStatement,
  recordDealerFarmerPayment,
  setFarmerBalanceLimit,
  checkFarmerBalanceLimit,
} from "../controller/dealerFarmerAccountController";
import { authMiddleware } from "../middelware/middelware";

const router = Router();

// All routes require dealer authentication
router.use((req, res, next) => {
  authMiddleware(req, res, next, ["DEALER"]);
});

// List all farmer accounts for the authenticated dealer
router.get("/", getDealerFarmerAccounts);

// Get a specific farmer account
router.get("/:farmerId", getDealerFarmerAccount);

// Set farmer balance limit
router.put("/:farmerId/balance-limit", setFarmerBalanceLimit);

// Check farmer balance limit (e.g. before creating sale)
router.post("/:farmerId/check-balance-limit", checkFarmerBalanceLimit);

// Get account statement for a farmer
router.get("/:farmerId/statement", getDealerFarmerAccountStatement);

// Record direct payment to a farmer's account
router.post("/:farmerId/payments", recordDealerFarmerPayment);

export default router;
