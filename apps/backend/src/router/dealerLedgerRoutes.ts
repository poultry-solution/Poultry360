import express from "express";
import {
  getLedgerEntries,
  getCurrentBalance,
  getPartyLedger,
  createAdjustment,
  getLedgerSummary,
  exportLedger,
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

// Export ledger
router.get("/export", exportLedger);

// Get party-specific ledger
router.get("/party/:partyId", getPartyLedger);

// Create manual adjustment
router.post("/adjustment", createAdjustment);

export default router;

