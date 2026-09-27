import express from "express";
import { authMiddleware, requireStaffPermission } from "../middelware/middelware";
import { StaffPermission, UserRole } from "@prisma/client";
import {
  getHatcheryAnalyticsBatches,
  getHatcheryAnalyticsIncubations,
  getHatcheryAnalyticsProduction,
  getHatcheryAnalyticsSales,
  getHatcheryAnalyticsOverview,
  getHatcheryTodaySummary,
} from "../controller/hatcheryAnalyticsController";

const router = express.Router();

router.use((req, res, next) => {
  authMiddleware(req, res, next, [UserRole.HATCHERY] as any);
});
router.use(requireStaffPermission(StaffPermission.HATCHERY_VIEW_ANALYTICS));

router.get("/overview", getHatcheryAnalyticsOverview);
router.get("/today", getHatcheryTodaySummary);
router.get("/batches", getHatcheryAnalyticsBatches);
router.get("/incubations", getHatcheryAnalyticsIncubations);
router.get("/production", getHatcheryAnalyticsProduction);
router.get("/sales", getHatcheryAnalyticsSales);

export default router;
