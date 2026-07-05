import express from "express";
import { authMiddleware } from "../middelware/middelware";
import {
  getFarmerAnalyticsOverview,
  getFarmerFinanceAnalytics,
  getFarmerFlockComparisonAnalytics,
  getFarmerOperationsAnalytics,
  getFarmerProductionAnalytics,
} from "../controller/farmerAnalyticsController";

const router = express.Router();

router.use(authMiddleware);

router.get("/farmer/overview", getFarmerAnalyticsOverview);
router.get("/farmer/finance", getFarmerFinanceAnalytics);
router.get("/farmer/flock-comparison", getFarmerFlockComparisonAnalytics);
router.get("/farmer/operations", getFarmerOperationsAnalytics);
router.get("/farmer/production", getFarmerProductionAnalytics);

export default router;
