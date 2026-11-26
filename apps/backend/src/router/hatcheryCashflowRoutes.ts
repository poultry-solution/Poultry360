import express from "express";
import { authMiddleware, requireStaffPermission } from "../middelware/middelware";
import { StaffPermission } from "@prisma/client";
import {
  createAccount,
  createMovement,
  createTransfer,
  deleteAccount,
  deleteMovement,
  getAccountOptions,
  getAccounts,
  getMovements,
  getReportHandler,
  patchAccount,
} from "../controller/hatcheryCashflowController";

const router = express.Router();

router.use((req, res, next) => {
  authMiddleware(req, res, next, ["HATCHERY"]);
});
// Any staff member of this business may load the names-only list for the
// Cash / Bank picker on payment forms (no balances). Everything below needs
// the Cash & Bank permission.
router.get("/account-options", getAccountOptions);

router.use(requireStaffPermission(StaffPermission.HATCHERY_VIEW_CASH_HISTORY));

// Note: no generic audit middleware. Each controller calls writeBusinessAudit
// with a specific action + metadata so the audit log reflects the actual
// semantic action (`hatchery.cashflow.account.created` etc.), not a generic
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
