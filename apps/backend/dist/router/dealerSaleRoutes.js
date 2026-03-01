"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dealerSaleController_1 = require("../controller/dealerSaleController");
const dealerSaleRequestController_1 = require("../controller/dealerSaleRequestController");
const middelware_1 = require("../middelware/middelware");
const router = express_1.default.Router();
// Apply authentication middleware to all routes
router.use((req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, ["DEALER"]);
});
// ==================== DEALER SALE ROUTES ====================
// Create dealer sale
router.post("/", dealerSaleController_1.createDealerSale);
// Get all dealer sales with pagination and filters
router.get("/", dealerSaleController_1.getDealerSales);
// Get sales statistics
router.get("/statistics", dealerSaleController_1.getSalesStatistics);
// Get dealer customers
router.get("/customers", dealerSaleController_1.getDealerCustomers);
// Search customers/farmers
router.get("/customers/search", dealerSaleController_1.searchCustomers);
// Search companies
router.get("/companies/search", dealerSaleController_1.searchCompanies);
// Create customer on-the-fly
router.post("/customers", dealerSaleController_1.createCustomer);
// ==================== SALE REQUEST ROUTES ====================
// IMPORTANT: These must come BEFORE /:id route to avoid conflicts
// Get sale request statistics
router.get("/requests/statistics", dealerSaleRequestController_1.getSaleRequestStatistics);
// Get all sale requests
router.get("/requests", dealerSaleRequestController_1.getSaleRequests);
// Get sale request by ID
router.get("/requests/:id", dealerSaleRequestController_1.getSaleRequestById);
// ==================== SALE ID ROUTES ====================
// IMPORTANT: This must come AFTER specific routes like /requests, /statistics, etc.
// Get dealer sale by ID
router.get("/:id", dealerSaleController_1.getDealerSaleById);
// Add payment to sale
router.post("/:id/payments", dealerSaleController_1.addSalePayment);
exports.default = router;
