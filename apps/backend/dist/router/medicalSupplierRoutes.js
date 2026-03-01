"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const medicalSupplierController_1 = require("../controller/medicalSupplierController");
const middelware_1 = require("../middelware/middelware");
const router = express_1.default.Router();
// Apply authentication middleware to all routes
router.use(middelware_1.authMiddleware);
// ==================== MEDICAL SUPPLIER ROUTES ====================
// GET /medical-suppliers - Get all medical suppliers for the user
router.get("/", medicalSupplierController_1.getAllMedicalSuppliers);
// GET /medical-suppliers/statistics - Get medical supplier statistics
router.get("/statistics", medicalSupplierController_1.getMedicalSupplierStatistics);
// GET /medical-suppliers/:id - Get medical supplier by ID
router.get("/:id", medicalSupplierController_1.getMedicalSupplierById);
// POST /medical-suppliers - Create new medical supplier
router.post("/", medicalSupplierController_1.createMedicalSupplier);
// PUT /medical-suppliers/:id - Update medical supplier
router.put("/:id", medicalSupplierController_1.updateMedicalSupplier);
// DELETE /medical-suppliers/:id - Delete medical supplier
router.delete("/:id", medicalSupplierController_1.deleteMedicalSupplier);
// ==================== MEDICAL SUPPLIER TRANSACTION ROUTES ====================
// POST /medical-suppliers/:id/transactions - Add transaction to medical supplier
router.post("/:id/transactions", medicalSupplierController_1.addMedicalSupplierTransaction);
// GET /medical-suppliers/:id/transactions - Get transactions for medical supplier
router.get("/:id/transactions", medicalSupplierController_1.getMedicalSupplierTransactions);
// DELETE /medical-suppliers/:id/transactions/:transactionId - Delete medical supplier transaction
router.delete("/:id/transactions/:transactionId", medicalSupplierController_1.deleteMedicalSupplierTransaction);
exports.default = router;
