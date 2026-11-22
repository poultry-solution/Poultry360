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
  reconcileHandler,
} from "../controller/farmerCashflowController";

const router = express.Router();

router.use((req, res, next) => {
  authMiddleware(req, res, next, ["OWNER"]);
});
router.use(requireStaffPermission(StaffPermission.FARMER_VIEW_CASH_HISTORY));

// Note: no generic audit middleware. Each controller calls writeBusinessAudit
// with a specific action + metadata so the audit log reflects the actual
// semantic action (`cashflow.account.created` etc.), not a generic "mutation".

router.get("/accounts", getAccounts);
router.post("/accounts", createAccount);
router.patch("/accounts/:id", patchAccount);
router.delete("/accounts/:id", deleteAccount);

router.get("/movements", getMovements);
router.post("/movements", createMovement);
router.delete("/movements/:id", deleteMovement);

router.post("/transfers", createTransfer);

router.get("/report", getReportHandler);

router.post("/reconcile", reconcileHandler);

export default router;
