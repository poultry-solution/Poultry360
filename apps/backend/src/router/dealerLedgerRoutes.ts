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
  deleteDealerManualGeneralPayment,
} from "../controller/dealerLedgerController";
import { authMiddleware, requireOperationalLedgerScope, requireStaffPermission } from "../middelware/middelware";
import { StaffPermission } from "@prisma/client";

const router = express.Router();

// Apply authentication middleware to all routes
router.use((req, res, next) => {
  authMiddleware(req, res, next, ["DEALER"]);
});

// ==================== DEALER LEDGER ROUTES ====================
// Get ledger entries with filters
router.get("/", requireOperationalLedgerScope, getLedgerEntries);

// Get current balance
router.get("/balance", requireStaffPermission(StaffPermission.DEALER_VIEW_FINANCIAL_SUMMARIES), getCurrentBalance);

// Get ledger summary
router.get("/summary", requireStaffPermission(StaffPermission.DEALER_VIEW_FINANCIAL_SUMMARIES), getLedgerSummary);

// Get parties (customers/farmers) with balances
router.get("/parties", getDealerLedgerParties);

// Export ledger
router.get("/export", requireStaffPermission(StaffPermission.DEALER_VIEW_FINANCIAL_SUMMARIES), exportLedger);

// Get party-specific ledger
router.get("/party/:partyId", getPartyLedger);

// Add payment
router.post("/payments", addDealerPayment);

// Delete account-level general payment (manual customer only; password body)
router.delete("/payments/:ledgerEntryId", deleteDealerManualGeneralPayment);

// Create manual adjustment
router.post("/adjustment", createAdjustment);

export default router;
