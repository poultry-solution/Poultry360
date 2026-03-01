"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dealerSaleRequestController_1 = require("../controller/dealerSaleRequestController");
const middelware_1 = require("../middelware/middelware");
const router = express_1.default.Router();
// Apply authentication middleware to all routes
router.use((req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, ["OWNER"]); // Only farmers (owners) can access
});
// ==================== FARMER SALE REQUEST ROUTES ====================
// Get sale request statistics for farmer
router.get("/statistics", dealerSaleRequestController_1.getFarmerSaleRequestStatistics);
// Get all sale requests for the farmer
router.get("/", dealerSaleRequestController_1.getFarmerSaleRequests);
// Get sale request by ID
router.get("/:id", dealerSaleRequestController_1.getFarmerSaleRequestById);
// Approve sale request
router.post("/:id/approve", dealerSaleRequestController_1.approveSaleRequest);
// Reject sale request
router.post("/:id/reject", dealerSaleRequestController_1.rejectSaleRequest);
exports.default = router;
