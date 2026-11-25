import express from "express";
import { authMiddleware, requireStaffPermission } from "../middelware/middelware";
import { StaffPermission } from "@prisma/client";
import {
  createAccount,
  createMovement,
  createTransfer,
  deleteAccount,
  deleteMovement,
  getAccounts,
  getMovements,
  getReportHandler,
  patchAccount,
} from "../controller/dealerCashflowController";

const router = express.Router();

router.use((req, res, next) => {
  authMiddleware(req, res, next, ["DEALER"]);
});
router.use(requireStaffPermission(StaffPermission.DEALER_VIEW_CASH_HISTORY));

// Note: no generic audit middleware. Each controller calls writeBusinessAudit
// with a specific action + metadata so the audit log reflects the actual
// semantic action (`dealer.cashflow.account.created` etc.), not a generic
// "mutation".

router.get("/accounts", getAccounts);
router.post("/accounts", createAccount);
router.patch("/accounts/:id", patchAccount);
router.delete("/accounts/:id", deleteAccount);

router.get("/movements", getMovements);
router.post("/movements", createMovement);
router.delete("/movements/:id", deleteMovement);

router.post("/transfers", createTransfer);

router.get("/report", getReportHandler);

export default router;
