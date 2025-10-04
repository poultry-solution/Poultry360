import express from "express";
import {
  getAllSales,
  getSaleById,
  getBatchSales,
  createSale,
  updateSale,
  deleteSale,
  addSalePayment,
  getSaleStatistics,
  getSalesCategories,
  createSalesCategory,
  getCustomersForSales,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerById,
} from "../controller/salesController";
import { authMiddleware } from "../middelware/middelware";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// ==================== SALES ROUTES ====================

// GET /api/sales - Get all sales with filtering
router.get("/", getAllSales);

// GET /api/sales/categories - Get sales categories
router.get("/categories", getSalesCategories);

// POST /api/sales/categories - Create sales category
router.post("/categories", createSalesCategory);

// GET /api/sales/customers - Get customers for sales dropdown
router.get("/customers", getCustomersForSales);

// GET /api/sales/statistics - Get sales statistics
router.get("/statistics", getSaleStatistics);

// ==================== CUSTOMER MANAGEMENT ROUTES ====================

// GET /api/sales/customers/:id - Get customer by ID
router.get("/customers/:id", getCustomerById);

// POST /api/sales/customers - Create new customer
router.post("/customers", createCustomer);

// PUT /api/sales/customers/:id - Update customer
router.put("/customers/:id", updateCustomer);

// DELETE /api/sales/customers/:id - Delete customer
router.delete("/customers/:id", deleteCustomer);

// GET /api/sales/batch/:batchId - Get sales for a specific batch
router.get("/batch/:batchId", getBatchSales);

// POST /api/sales - Create a new sale
router.post("/", createSale);

// GET /api/sales/:id - Get sale by ID
router.get("/:id", getSaleById);

// PUT /api/sales/:id - Update sale by ID
router.put("/:id", updateSale);

// DELETE /api/sales/:id - Delete sale by ID
router.delete("/:id", deleteSale);

// POST /api/sales/:id/payments - Add payment to sale
router.post("/:id/payments", addSalePayment);

export default router;
