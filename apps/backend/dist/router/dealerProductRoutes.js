"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dealerProductController_1 = require("../controller/dealerProductController");
const middelware_1 = require("../middelware/middelware");
const router = express_1.default.Router();
// Apply authentication middleware to all routes
router.use((req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, ["DEALER"]);
});
// ==================== DEALER PRODUCT ROUTES ====================
// Create dealer product
router.post("/", dealerProductController_1.createDealerProduct);
// Get all dealer products with pagination and filters
router.get("/", dealerProductController_1.getDealerProducts);
// Get inventory summary
router.get("/inventory/summary", dealerProductController_1.getInventorySummary);
// Get dealer product by ID
router.get("/:id", dealerProductController_1.getDealerProductById);
// Update dealer product
router.put("/:id", dealerProductController_1.updateDealerProduct);
// Delete dealer product
router.delete("/:id", dealerProductController_1.deleteDealerProduct);
// Adjust product stock
router.post("/:id/adjust-stock", dealerProductController_1.adjustProductStock);
exports.default = router;
