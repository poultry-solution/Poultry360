import express from "express";
import { authMiddleware } from "../middelware/middelware";
import {
  getDashboardOverview,
  getDashboardFinancialSummary,
  getDashboardPerformanceMetrics,
  getMoneyToReceiveDetails,
  getMoneyToPayDetails,
} from "../controller/dashboardController";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// ==================== DASHBOARD ROUTES ====================

// GET /api/dashboard/overview - Get dashboard overview statistics
router.get("/overview", getDashboardOverview);

// GET /api/dashboard/financial-summary - Get financial summary
router.get("/financial-summary", getDashboardFinancialSummary);

// GET /api/dashboard/performance-metrics - Get performance metrics
router.get("/performance-metrics", getDashboardPerformanceMetrics);

// GET /api/dashboard/money-to-receive - Get money to receive details
router.get("/money-to-receive", getMoneyToReceiveDetails);

// GET /api/dashboard/money-to-pay - Get money to pay details
router.get("/money-to-pay", getMoneyToPayDetails);

export default router;
