import express from "express";
import {
  getCompanyLedgerEntries,
  getCompanyLedgerParties,
  getCompanyLedgerSummary,
  addCompanyPayment,
} from "../controller/companyLedgerController";
import { authMiddleware, requireStaffPermission } from "../middelware/middelware";
import { StaffPermission } from "@prisma/client";
import { auditSuccessfulCompanyMutation } from "../middelware/companyAuditMiddleware";

const router = express.Router();

// Apply authentication middleware - only companies can access
router.use((req, res, next) => {
  authMiddleware(req, res, next, ["COMPANY"]);
});
router.use(auditSuccessfulCompanyMutation);

// ==================== COMPANY LEDGER ROUTES ====================
// Get ledger entries
router.get("/", requireStaffPermission(StaffPermission.COMPANY_MANAGE_OPERATIONS), getCompanyLedgerEntries);

// Get ledger parties (dealers with balances)
router.get("/parties", requireStaffPermission(StaffPermission.COMPANY_MANAGE_OPERATIONS), getCompanyLedgerParties);

// Get ledger summary
router.get("/summary", requireStaffPermission(StaffPermission.COMPANY_VIEW_FINANCIAL_SUMMARIES), getCompanyLedgerSummary);

// Add payment
router.post("/payments", requireStaffPermission(StaffPermission.COMPANY_MANAGE_OPERATIONS), addCompanyPayment);

export default router;
