import express from "express";
import {
  createDealerSale,
  getDealerSales,
  getDealerSaleById,
  addSalePayment,
  searchCustomers,
  createCustomer,
  getDealerCustomers,
  getSalesStatistics,
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

// Create customer on-the-fly
router.post("/customers", createCustomer);

// Get dealer sale by ID
router.get("/:id", getDealerSaleById);

// Add payment to sale
router.post("/:id/payments", addSalePayment);

export default router;

