"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const middelware_1 = require("../middelware/middelware");
const dashboardController_1 = require("../controller/dashboardController");
const router = express_1.default.Router();
// Apply authentication middleware to all routes
router.use(middelware_1.authMiddleware);
// ==================== DASHBOARD ROUTES ====================
// GET /api/dashboard/overview - Get dashboard overview statistics
router.get("/overview", dashboardController_1.getDashboardOverview);
// GET /api/dashboard/financial-summary - Get financial summary
router.get("/financial-summary", dashboardController_1.getDashboardFinancialSummary);
// GET /api/dashboard/performance-metrics - Get performance metrics
router.get("/performance-metrics", dashboardController_1.getDashboardPerformanceMetrics);
// GET /api/dashboard/money-to-receive - Get money to receive details
router.get("/money-to-receive", dashboardController_1.getMoneyToReceiveDetails);
// GET /api/dashboard/money-to-pay - Get money to pay details
router.get("/money-to-pay", dashboardController_1.getMoneyToPayDetails);
// GET /api/dashboard/batch-performance - Get batch performance list
router.get("/batch-performance", dashboardController_1.getBatchPerformanceList);
exports.default = router;
