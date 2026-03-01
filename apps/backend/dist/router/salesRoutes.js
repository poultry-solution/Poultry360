"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const salesController_1 = require("../controller/salesController");
const middelware_1 = require("../middelware/middelware");
const router = express_1.default.Router();
// Apply authentication middleware to all routes
router.use(middelware_1.authMiddleware);
// ==================== SALES ROUTES ====================
// GET /api/sales/payments - Get all sale payments
router.get("/payments", salesController_1.getAllSalePayments);
// GET /api/sales - Get all sales with filtering
router.get("/", salesController_1.getAllSales);
// GET /api/sales/categories - Get sales categories
router.get("/categories", salesController_1.getSalesCategories);
// POST /api/sales/categories - Create sales category
router.post("/categories", salesController_1.createSalesCategory);
// GET /api/sales/customers - Get customers for sales dropdown
router.get("/customers", salesController_1.getCustomersForSales);
// GET /api/sales/statistics - Get sales statistics
router.get("/statistics", salesController_1.getSaleStatistics);
// ==================== CUSTOMER MANAGEMENT ROUTES ====================
// GET /api/sales/customers/:id - Get customer by ID
router.get("/customers/:id", salesController_1.getCustomerById);
// POST /api/sales/customers - Create new customer
router.post("/customers", salesController_1.createCustomer);
// PUT /api/sales/customers/:id - Update customer
router.put("/customers/:id", salesController_1.updateCustomer);
// DELETE /api/sales/customers/:id - Delete customer
router.delete("/customers/:id", salesController_1.deleteCustomer);
// GET /api/sales/batch/:batchId - Get sales for a specific batch
router.get("/batch/:batchId", salesController_1.getBatchSales);
// POST /api/sales - Create a new sale
router.post("/", salesController_1.createSale);
// GET /api/sales/:id - Get sale by ID
router.get("/:id", salesController_1.getSaleById);
// PUT /api/sales/:id - Update sale by ID
router.put("/:id", salesController_1.updateSale);
// DELETE /api/sales/:id - Delete sale by ID
router.delete("/:id", salesController_1.deleteSale);
// POST /api/sales/:id/payments - Add payment to sale
router.post("/:id/payments", salesController_1.addSalePayment);
exports.default = router;
