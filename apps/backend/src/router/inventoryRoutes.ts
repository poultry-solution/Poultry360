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
  getInventoryForExpense,
} from "../controller/inventoryController";
import { authMiddleware, requireStaffPermission } from "../middelware/middelware";
import { StaffPermission } from "@prisma/client";
import { auditSuccessfulFarmerMutation } from "../middelware/farmerAuditMiddleware";

const router = express.Router();

// Apply authentication to all routes

router.use((req, res, next) => {
  authMiddleware(req, res, next, ["OWNER"]); // Allow all authenticated users
});
router.use(requireStaffPermission(StaffPermission.FARMER_MANAGE_OPERATIONS));
router.use(auditSuccessfulFarmerMutation);

// ==================== INVENTORY ITEMS ====================
router.get("/", getAllInventoryItems);
router.get("/for-expense", getInventoryForExpense);
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
