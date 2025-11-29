import express from "express";
import {
  createCompanyProduct,
  getCompanyProducts,
  getCompanyProductById,
  updateCompanyProduct,
  deleteCompanyProduct,
  getCompanyProductSummary,
  adjustCompanyProductStock,
} from "../controller/companyProductController";
import { authMiddleware } from "../middelware/middelware";

const router = express.Router();

// Apply authentication middleware to all routes
router.use((req, res, next) => {
  authMiddleware(req, res, next, ["COMPANY"]);
});

// ==================== COMPANY PRODUCT ROUTES ====================
// Create company product
router.post("/", createCompanyProduct);

// Get all company products with pagination and filters
router.get("/", getCompanyProducts);

// Get company product summary
router.get("/summary", getCompanyProductSummary);

// Get company product by ID
router.get("/:id", getCompanyProductById);

// Update company product
router.put("/:id", updateCompanyProduct);

// Delete company product
router.delete("/:id", deleteCompanyProduct);

// Adjust product stock
router.post("/:id/adjust-stock", adjustCompanyProductStock);

export default router;

