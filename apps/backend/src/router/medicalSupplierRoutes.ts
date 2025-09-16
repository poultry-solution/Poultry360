import express from "express";
import {
  getAllMedicalSuppliers,
  getMedicalSupplierById,
  createMedicalSupplier,
  updateMedicalSupplier,
  deleteMedicalSupplier,
  addMedicalSupplierTransaction,
  getMedicalSupplierStatistics,
  getMedicalSupplierTransactions,
  deleteMedicalSupplierTransaction,
} from "../controller/medicalSupplierController";
import { authMiddleware } from "../middelware/middelware";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// ==================== MEDICAL SUPPLIER ROUTES ====================

// GET /medical-suppliers - Get all medical suppliers for the user
router.get("/", getAllMedicalSuppliers);

// GET /medical-suppliers/statistics - Get medical supplier statistics
router.get("/statistics", getMedicalSupplierStatistics);

// GET /medical-suppliers/:id - Get medical supplier by ID
router.get("/:id", getMedicalSupplierById);

// POST /medical-suppliers - Create new medical supplier
router.post("/", createMedicalSupplier);

// PUT /medical-suppliers/:id - Update medical supplier
router.put("/:id", updateMedicalSupplier);

// DELETE /medical-suppliers/:id - Delete medical supplier
router.delete("/:id", deleteMedicalSupplier);

// ==================== MEDICAL SUPPLIER TRANSACTION ROUTES ====================

// POST /medical-suppliers/:id/transactions - Add transaction to medical supplier
router.post("/:id/transactions", addMedicalSupplierTransaction);

// GET /medical-suppliers/:id/transactions - Get transactions for medical supplier
router.get("/:id/transactions", getMedicalSupplierTransactions);

// DELETE /medical-suppliers/:id/transactions/:transactionId - Delete medical supplier transaction
router.delete("/:id/transactions/:transactionId", deleteMedicalSupplierTransaction);

export default router;
