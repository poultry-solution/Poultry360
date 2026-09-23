import express from "express";
import {
  listSuppliers,
  createSupplier,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
  getSupplierLedger,
  recordSupplierPayment,
} from "../controller/companySupplierController";
import { authMiddleware, requireStaffPermission } from "../middelware/middelware";
import { StaffPermission } from "@prisma/client";
import { auditSuccessfulCompanyMutation } from "../middelware/companyAuditMiddleware";

const router = express.Router();

router.use((req, res, next) => {
  authMiddleware(req, res, next, ["COMPANY"]);
});
router.use(requireStaffPermission(StaffPermission.COMPANY_MANAGE_OPERATIONS));
router.use(auditSuccessfulCompanyMutation);

router.get("/", listSuppliers);
router.post("/", createSupplier);
router.get("/:id/ledger", getSupplierLedger);
router.post("/:id/payments", recordSupplierPayment);
router.get("/:id", getSupplierById);
router.put("/:id", updateSupplier);
router.delete("/:id", deleteSupplier);

export default router;
