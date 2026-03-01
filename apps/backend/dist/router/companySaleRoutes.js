"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const companySaleController_1 = require("../controller/companySaleController");
const middelware_1 = require("../middelware/middelware");
const router = express_1.default.Router();
// Apply authentication middleware to all routes - only companies can access
router.use((req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, ["COMPANY"]);
});
// ==================== COMPANY SALE ROUTES ====================
// Search dealers for company (must be before "/" to avoid conflict)
router.get("/search-dealers", companySaleController_1.searchDealersForCompany);
// Create company sale
router.post("/", companySaleController_1.createCompanySale);
// Get all company sales with pagination and filters
router.get("/", companySaleController_1.getCompanySales);
// Get sales statistics
router.get("/statistics", companySaleController_1.getCompanySalesStatistics);
// Get company sale by ID
router.get("/:id", companySaleController_1.getCompanySaleById);
// Add payment to sale
router.post("/:id/payments", companySaleController_1.addCompanySalePayment);
exports.default = router;
