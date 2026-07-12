import express, {Request,Response} from "express";
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
  deleteDealerSale,
} from "../controller/dealerSaleController";

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

// Archive / Unarchive / Delete dealer customers
router.post("/customers/:id/archive", archiveDealerCustomer);
router.post("/customers/:id/unarchive", unarchiveDealerCustomer);
router.delete("/customers/:id", deleteDealerCustomer);

// Removed sale-request workflow placeholder




// ==================== SALE ID ROUTES ====================
// IMPORTANT: This must come AFTER specific routes like /requests, /statistics, etc.
// Get dealer sale by ID
router.get("/:id", getDealerSaleById);

// Delete dealer sale (password required)
router.delete("/:id", deleteDealerSale);

// Sale-level payment route kept only as an explicit removed-flow marker
router.post("/:id/payments", addSalePayment);

export default router;
