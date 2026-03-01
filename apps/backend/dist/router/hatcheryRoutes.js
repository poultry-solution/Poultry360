"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const hatcherController_1 = require("../controller/hatcherController");
const middelware_1 = require("../middelware/middelware");
const router = express_1.default.Router();
// Apply authentication middleware to all routes
router.use(middelware_1.authMiddleware);
// ==================== HATCHERY ROUTES ====================
// GET /api/v1/hatcheries - Get all hatcheries for the user
router.get("/", hatcherController_1.getAllHatcheries);
// GET /api/v1/hatcheries/statistics - Get hatchery statistics
router.get("/statistics", hatcherController_1.getHatcheryStatistics);
// GET /api/v1/hatcheries/:id - Get hatchery by ID
router.get("/:id", hatcherController_1.getHatcheryById);
// GET /api/v1/hatcheries/:id/transactions - Get hatchery transactions
router.get("/:id/transactions", hatcherController_1.getHatcheryTransactions);
// POST /api/v1/hatcheries - Create new hatchery
router.post("/", hatcherController_1.createHatchery);
// PUT /api/v1/hatcheries/:id - Update hatchery
router.put("/:id", hatcherController_1.updateHatchery);
// DELETE /api/v1/hatcheries/:id - Delete hatchery
router.delete("/:id", hatcherController_1.deleteHatchery);
// POST /api/v1/hatcheries/:id/transactions - Add transaction to hatchery
router.post("/:id/transactions", hatcherController_1.addHatcheryTransaction);
// DELETE /api/v1/hatcheries/:id/transactions/:transactionId - Delete hatchery transaction
router.delete("/:id/transactions/:transactionId", hatcherController_1.deleteHatcheryTransaction);
exports.default = router;
