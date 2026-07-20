import express from "express";
import { authMiddleware } from "../middelware/middelware";
import { UserRole } from "@prisma/client";
import {
  getHatcheryAnalyticsBatches,
  getHatcheryAnalyticsIncubations,
  getHatcheryAnalyticsProduction,
  getHatcheryAnalyticsSales,
  getHatcheryAnalyticsOverview,
} from "../controller/hatcheryAnalyticsController";

const router = express.Router();

router.use((req, res, next) => {
  authMiddleware(req, res, next, [UserRole.HATCHERY] as any);
});

router.get("/overview", getHatcheryAnalyticsOverview);
router.get("/batches", getHatcheryAnalyticsBatches);
router.get("/incubations", getHatcheryAnalyticsIncubations);
router.get("/production", getHatcheryAnalyticsProduction);
router.get("/sales", getHatcheryAnalyticsSales);

export default router;
