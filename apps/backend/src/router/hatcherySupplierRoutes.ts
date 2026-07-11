import express from "express";
import { authMiddleware } from "../middelware/middelware";
import { UserRole } from "@prisma/client";
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
