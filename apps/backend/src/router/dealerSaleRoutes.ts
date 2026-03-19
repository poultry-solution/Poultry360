import express from "express";
import {
  createDealerSale,
  getDealerSales,
  getDealerSaleById,
  addSalePayment,
  searchCustomers,
  searchCompanies,
  createCustomer,
  getDealerCustomers,
  getSalesStatistics,
  archiveDealerCustomer,
  unarchiveDealerCustomer,
  deleteDealerCustomer,
} from "../controller/dealerSaleController";
import {
  getSaleRequests,
  getSaleRequestById,
  getSaleRequestStatistics,
} from "../controller/dealerSaleRequestController";
import { authMiddleware } from "../middelware/middelware";

const router = express.Router();

// Apply authentication middleware to all routes
router.use((req, res, next) => {
  authMiddleware(req, res, next, ["DEALER"]);
});

// ==================== DEALER SALE ROUTES ====================
// Create dealer sale
router.post("/", createDealerSale);

// Get all dealer sales with pagination and filters
router.get("/", getDealerSales);

// Get sales statistics
router.get("/statistics", getSalesStatistics);

// Get dealer customers
router.get("/customers", getDealerCustomers);

// Search customers/farmers
router.get("/customers/search", searchCustomers);

// Search companies
router.get("/companies/search", searchCompanies);

// Create customer on-the-fly
router.post("/customers", createCustomer);

// Archive / Unarchive / Delete dealer customers (non-connected only)
router.post("/customers/:id/archive", archiveDealerCustomer);
router.post("/customers/:id/unarchive", unarchiveDealerCustomer);
router.delete("/customers/:id", deleteDealerCustomer);

// ==================== SALE REQUEST ROUTES ====================
// IMPORTANT: These must come BEFORE /:id route to avoid conflicts
// Get sale request statistics
router.get("/requests/statistics", getSaleRequestStatistics);

// Get all sale requests
router.get("/requests", getSaleRequests);

// Get sale request by ID
router.get("/requests/:id", getSaleRequestById);

// ==================== SALE ID ROUTES ====================
// IMPORTANT: This must come AFTER specific routes like /requests, /statistics, etc.
// Get dealer sale by ID
router.get("/:id", getDealerSaleById);

// Add payment to sale
router.post("/:id/payments", addSalePayment);

export default router;

