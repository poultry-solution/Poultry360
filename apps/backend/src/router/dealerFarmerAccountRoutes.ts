import { Router } from "express";
import {
  getDealerFarmerAccounts,
  getDealerFarmerAccount,
  getDealerFarmerAccountStatement,
  recordDealerFarmerPayment,
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

// Get account statement for a farmer
router.get("/:farmerId/statement", getDealerFarmerAccountStatement);

// Record direct payment to a farmer's account
router.post("/:farmerId/payments", recordDealerFarmerPayment);

export default router;
