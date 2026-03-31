import express from "express";
import {
  createDealerProduct,
  getDealerProducts,
  getDealerProductById,
  updateDealerProduct,
  deleteDealerProduct,
  hideDealerProduct,
  unhideDealerProduct,
  getInventorySummary,
  adjustProductStock,
} from "../controller/dealerProductController";
import { authMiddleware } from "../middelware/middelware";

const router = express.Router();

// Apply authentication middleware to all routes
router.use((req, res, next) => {
  authMiddleware(req, res, next, ["DEALER"]);
});

// ==================== DEALER PRODUCT ROUTES ====================
// Create dealer product
router.post("/", createDealerProduct);

// Get all dealer products with pagination and filters
router.get("/", getDealerProducts);

// Get inventory summary
router.get("/inventory/summary", getInventorySummary);

// Get dealer product by ID
router.get("/:id", getDealerProductById);

// Update dealer product
router.put("/:id", updateDealerProduct);

// Delete dealer product
router.delete("/:id", deleteDealerProduct);

// Hide / Unhide dealer product (for out-of-stock rows)
router.post("/:id/hide", hideDealerProduct);
router.post("/:id/unhide", unhideDealerProduct);

// Adjust product stock
router.post("/:id/adjust-stock", adjustProductStock);

export default router;

