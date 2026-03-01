"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dealerController_1 = require("../controller/dealerController");
const middelware_1 = require("../middelware/middelware");
const router = express_1.default.Router();
// Apply authentication middleware to all routes
router.use((req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, ["OWNER", "COMPANY"]); // Allow owners and companies
});
// ==================== DEALER ROUTES ====================
// Get all dealers for the authenticated user
router.get("/", dealerController_1.getAllDealers);
// Get dealer statistics
router.get("/statistics", dealerController_1.getDealerStatistics);
// Get dealer by ID
router.get("/:id", dealerController_1.getDealerById);
// Get dealer transactions
router.get("/:id/transactions", dealerController_1.getDealerTransactions);
// Create new dealer
router.post("/", dealerController_1.createDealer);
// Add transaction to dealer
router.post("/:id/transactions", dealerController_1.addDealerTransaction);
// Delete a dealer transaction by transaction id
router.delete("/:id/transactions/:transactionId", dealerController_1.deleteDealerTransaction);
// Update dealer
router.put("/:id", dealerController_1.updateDealer);
// Delete dealer
router.delete("/:id", dealerController_1.deleteDealer);
exports.default = router;
