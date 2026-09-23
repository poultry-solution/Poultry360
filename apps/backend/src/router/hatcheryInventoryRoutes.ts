import express from "express";
import { authMiddleware, requireStaffPermission } from "../middelware/middelware";
import { StaffPermission, UserRole } from "@prisma/client";
import { auditSuccessfulHatcheryMutation } from "../middelware/hatcheryAuditMiddleware";
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
} from "../controller/hatcheryInventoryController";

const router = express.Router();

router.use((req, res, next) => {
  authMiddleware(req, res, next, [UserRole.HATCHERY] as any);
});
router.use(requireStaffPermission(StaffPermission.HATCHERY_MANAGE_OPERATIONS));
router.use(auditSuccessfulHatcheryMutation);

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

export default router;
