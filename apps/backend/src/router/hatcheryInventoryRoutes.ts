import express from "express";
import { authMiddleware } from "../middelware/middelware";
import { UserRole } from "@prisma/client";
import {
  listHatcheryInventory,
  hatcheryInventoryTable,
  hatcheryInventoryStatistics,
  hatcheryLowStockItems,
  hatcheryInventoryByType,
  getHatcheryInventoryItem,
  createHatcheryInventoryItem,
  updateHatcheryInventoryItem,
  deleteHatcheryInventoryItem,
  reorderHatcheryInventoryItem,
  recordHatcheryInventoryUsage,
} from "../controller/hatcheryInventoryController";

const router = express.Router();

router.use((req, res, next) => {
  authMiddleware(req, res, next, [UserRole.HATCHERY] as any);
});

router.get("/", listHatcheryInventory);
router.get("/table", hatcheryInventoryTable);
router.get("/statistics", hatcheryInventoryStatistics);
router.get("/low-stock", hatcheryLowStockItems);
router.get("/type/:itemType", hatcheryInventoryByType);
router.get("/:id", getHatcheryInventoryItem);
router.post("/", createHatcheryInventoryItem);
router.put("/:id", updateHatcheryInventoryItem);
router.delete("/:id", deleteHatcheryInventoryItem);
router.post("/:id/reorder", reorderHatcheryInventoryItem);
router.post("/:id/usage", recordHatcheryInventoryUsage);

export default router;
