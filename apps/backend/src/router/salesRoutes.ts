import express from "express";
import {
  getAllSales,
  getSaleById,
  getBatchSales,
  createSale,
  deleteSale,
  addSalePayment,
  getSalesCategories,
  createSalesCategory,
  getCustomersForSales,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerById,
  setCustomerOpeningBalance,
  addCustomerPayment,
  softDeleteCustomerPayment,
  getAllSalePayments,
} from "../controller/salesController";
import { authMiddleware } from "../middelware/middelware";
import { auditSuccessfulFarmerMutation } from "../middelware/farmerAuditMiddleware";
import { UserRole } from "@prisma/client";

const router = express.Router();

// Apply authentication middleware to all routes. Farmer sales are OWNER-only
// (staff of farmer accounts inherit role=OWNER via middleware).
router.use((req, res, next) => {
  authMiddleware(req, res, next, [UserRole.OWNER]);
});

// Customer and sales operations are deliberately available to all active
// staff, within their owner's data scope. Each business module uses these
// operations for day-to-day sales, account payments, and customer handling.
// Financial summaries, cash history, analytics, and staff administration stay
// behind their dedicated permissions in their own routers.
router.use(auditSuccessfulFarmerMutation);

// ==================== SALES ROUTES ====================

// GET /api/sales/payments - Get all sale payments
router.get("/payments", getAllSalePayments);

// GET /api/sales - Get all sales with filtering
router.get("/", getAllSales);

// GET /api/sales/categories - Get sales categories
router.get("/categories", getSalesCategories);

// POST /api/sales/categories - Create sales category
router.post("/categories", createSalesCategory);

// GET /api/sales/customers - Get customers for sales dropdown
router.get("/customers", getCustomersForSales);

// GET /api/sales/customers/:id - Get one customer account
router.get("/customers/:id", getCustomerById);

// ==================== CUSTOMER MANAGEMENT ROUTES ====================

// POST /api/sales/customers - Create new customer
router.post("/customers", createCustomer);

// PUT /api/sales/customers/:id - Update customer
router.put("/customers/:id", updateCustomer);

// POST /api/sales/customers/:id/opening-balance - Set/update opening balance (history preserved)
router.post("/customers/:id/opening-balance", setCustomerOpeningBalance);

// POST /api/sales/customers/:id/payments - Record payment without sale
router.post("/customers/:id/payments", addCustomerPayment);

// DELETE /api/sales/customers/:id/payments/:transactionId - Soft delete customer payment
router.delete("/customers/:id/payments/:transactionId", softDeleteCustomerPayment);

// DELETE /api/sales/customers/:id - Delete customer
router.delete("/customers/:id", deleteCustomer);

// GET /api/sales/batch/:batchId - Get sales for a specific batch
router.get("/batch/:batchId", getBatchSales);

// POST /api/sales - Create a new sale
router.post("/", createSale);

// GET /api/sales/:id - Get sale by ID
router.get("/:id", getSaleById);

// DELETE /api/sales/:id - Delete sale by ID
router.delete("/:id", deleteSale);

// POST /api/sales/:id/payments - Add payment to sale
router.post("/:id/payments", addSalePayment);

export default router;
