import express from "express";
import {
  getCompanyLedgerEntries,
  getCompanyLedgerParties,
  getCompanyLedgerSummary,
  addCompanyPayment,
} from "../controller/companyLedgerController";
import { authMiddleware } from "../middelware/middelware";

const router = express.Router();

// Apply authentication middleware - only companies can access
router.use((req, res, next) => {
  authMiddleware(req, res, next, ["COMPANY"]);
});

// ==================== COMPANY LEDGER ROUTES ====================
// Get ledger entries
router.get("/", getCompanyLedgerEntries);

// Get ledger parties (dealers with balances)
router.get("/parties", getCompanyLedgerParties);

// Get ledger summary
router.get("/summary", getCompanyLedgerSummary);

// Add payment
router.post("/payments", addCompanyPayment);

export default router;

