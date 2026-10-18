import express from "express";
import { authMiddleware, requireStaffPermission } from "../middelware/middelware";
import { StaffPermission, UserRole } from "@prisma/client";
import {
  getFarmerAnalyticsOverview,
  getFarmerFinanceAnalytics,
  getFarmerFlockComparisonAnalytics,
  getFarmerOperationsAnalytics,
  getFarmerProductionAnalytics,
  getFarmerReportAnalytics,
} from "../controller/farmerAnalyticsController";

const router = express.Router();

// Farmer analytics only (staff inherit role=OWNER).
router.use((req, res, next) => {
  authMiddleware(req, res, next, [UserRole.OWNER]);
});
router.use(requireStaffPermission(StaffPermission.FARMER_VIEW_ANALYTICS));

router.get("/farmer/overview", getFarmerAnalyticsOverview);
router.get("/farmer/finance", getFarmerFinanceAnalytics);
router.get("/farmer/flock-comparison", getFarmerFlockComparisonAnalytics);
router.get("/farmer/operations", getFarmerOperationsAnalytics);
router.get("/farmer/production", getFarmerProductionAnalytics);
router.get("/farmer/reports", getFarmerReportAnalytics);

export default router;
