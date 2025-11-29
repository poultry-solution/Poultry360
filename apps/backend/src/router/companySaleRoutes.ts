import express from "express";
import {
  createCompanySale,
  getCompanySales,
  getCompanySaleById,
  addCompanySalePayment,
  getCompanySalesStatistics,
  searchDealersForCompany,
} from "../controller/companySaleController";
import { authMiddleware } from "../middelware/middelware";

const router = express.Router();

// Apply authentication middleware to all routes - only companies can access
router.use((req, res, next) => {
  authMiddleware(req, res, next, ["COMPANY"]);
});

// ==================== COMPANY SALE ROUTES ====================
// Search dealers for company (must be before "/" to avoid conflict)
router.get("/search-dealers", searchDealersForCompany);

// Create company sale
router.post("/", createCompanySale);

// Get all company sales with pagination and filters
router.get("/", getCompanySales);

// Get sales statistics
router.get("/statistics", getCompanySalesStatistics);

// Get company sale by ID
router.get("/:id", getCompanySaleById);

// Add payment to sale
router.post("/:id/payments", addCompanySalePayment);

export default router;

