import express from "express";
import {
  getAllInventoryItems,
  getInventoryItemById,
  getInventoryByType,
  getLowStockItems,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  addInventoryTransaction,
  recordInventoryUsage,
  getInventoryTransactions,
  getInventoryUsages,
  getInventoryStatistics,
  getInventoryTableData,
} from "../controller/inventoryController";
import { authMiddleware } from "../middelware/middelware";

const router = express.Router();

// Apply authentication to all routes

router.use((req, res, next) => {
  authMiddleware(req, res, next, ["OWNER"]); // Allow all authenticated users
});

// ==================== INVENTORY ITEMS ====================
router.get("/", getAllInventoryItems);
router.get("/table", getInventoryTableData);
router.get("/statistics", getInventoryStatistics);
router.get("/low-stock", getLowStockItems);
router.get("/type/:itemType", getInventoryByType);
router.get("/:id", getInventoryItemById);
router.post("/", createInventoryItem);
router.put("/:id", updateInventoryItem);
router.delete("/:id", deleteInventoryItem);

// ==================== INVENTORY TRANSACTIONS (FOR TESTING) ====================
router.post("/:itemId/transactions", addInventoryTransaction);
router.get("/:itemId/transactions", getInventoryTransactions);

// ==================== INVENTORY USAGE (FOR TESTING) ====================
router.post("/:itemId/usage", recordInventoryUsage);
router.get("/:itemId/usage", getInventoryUsages);

export default router;
