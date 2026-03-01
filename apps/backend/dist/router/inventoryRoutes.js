"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const inventoryController_1 = require("../controller/inventoryController");
const middelware_1 = require("../middelware/middelware");
const router = express_1.default.Router();
// Apply authentication to all routes
router.use((req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, ["OWNER"]); // Allow all authenticated users
});
// ==================== INVENTORY ITEMS ====================
router.get("/", inventoryController_1.getAllInventoryItems);
router.get("/table", inventoryController_1.getInventoryTableData);
router.get("/statistics", inventoryController_1.getInventoryStatistics);
router.get("/low-stock", inventoryController_1.getLowStockItems);
router.get("/type/:itemType", inventoryController_1.getInventoryByType);
router.get("/:id", inventoryController_1.getInventoryItemById);
router.post("/", inventoryController_1.createInventoryItem);
router.put("/:id", inventoryController_1.updateInventoryItem);
router.delete("/:id", inventoryController_1.deleteInventoryItem);
// ==================== INVENTORY TRANSACTIONS (FOR TESTING) ====================
router.post("/:itemId/transactions", inventoryController_1.addInventoryTransaction);
router.get("/:itemId/transactions", inventoryController_1.getInventoryTransactions);
// ==================== INVENTORY USAGE (FOR TESTING) ====================
router.post("/:itemId/usage", inventoryController_1.recordInventoryUsage);
router.get("/:itemId/usage", inventoryController_1.getInventoryUsages);
exports.default = router;
