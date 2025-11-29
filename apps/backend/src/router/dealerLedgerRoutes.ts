import express from "express";
import {
  getLedgerEntries,
  getCurrentBalance,
  getPartyLedger,
  createAdjustment,
  getLedgerSummary,
  exportLedger,
  getDealerLedgerParties,
  addDealerPayment,
} from "../controller/dealerLedgerController";
import { authMiddleware } from "../middelware/middelware";

const router = express.Router();

// Apply authentication middleware to all routes
router.use((req, res, next) => {
  authMiddleware(req, res, next, ["DEALER"]);
});

// ==================== DEALER LEDGER ROUTES ====================
// Get ledger entries with filters
router.get("/", getLedgerEntries);

// Get current balance
router.get("/balance", getCurrentBalance);

// Get ledger summary
router.get("/summary", getLedgerSummary);

// Get parties (customers/farmers) with balances
router.get("/parties", getDealerLedgerParties);

// Export ledger
router.get("/export", exportLedger);

// Get party-specific ledger
router.get("/party/:partyId", getPartyLedger);

// Add payment
router.post("/payments", addDealerPayment);

// Create manual adjustment
router.post("/adjustment", createAdjustment);

export default router;

