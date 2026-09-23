import express from "express";
import { authMiddleware, requireStaffPermission } from "../middelware/middelware";
import { StaffPermission, UserRole } from "@prisma/client";
import { auditSuccessfulHatcheryMutation } from "../middelware/hatcheryAuditMiddleware";
import {
  listHatcherySuppliers,
  hatcherySupplierStatistics,
  getHatcherySupplierById,
  createHatcherySupplier,
  updateHatcherySupplier,
  deleteHatcherySupplier,
  setHatcherySupplierOpeningBalance,
  addHatcherySupplierTransaction,
  deleteHatcherySupplierTransaction,
  listHatcherySupplierTransactions,
} from "../controller/hatcherySupplierController";

const router = express.Router();

router.use((req, res, next) => {
  authMiddleware(req, res, next, [UserRole.HATCHERY] as any);
});
router.use(requireStaffPermission(StaffPermission.HATCHERY_MANAGE_OPERATIONS));
router.use(auditSuccessfulHatcheryMutation);

router.get("/", listHatcherySuppliers);
router.get("/statistics", hatcherySupplierStatistics);
router.get("/:id", getHatcherySupplierById);
router.get("/:id/transactions", listHatcherySupplierTransactions);
router.post("/", createHatcherySupplier);
router.put("/:id", updateHatcherySupplier);
router.delete("/:id", deleteHatcherySupplier);
router.post("/:id/opening-balance", setHatcherySupplierOpeningBalance);
router.post("/:id/transactions", addHatcherySupplierTransaction);
router.delete("/:id/transactions/:txnId", deleteHatcherySupplierTransaction);

export default router;
