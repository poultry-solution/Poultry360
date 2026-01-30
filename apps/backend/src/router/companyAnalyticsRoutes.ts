import express from "express";
import { getCompanyAnalytics } from "../controller/companyAnalyticsController";
import { authMiddleware } from "../middelware/middelware";

const router = express.Router();

// Apply authentication middleware to all routes - only companies can access
router.use((req, res, next) => {
  authMiddleware(req, res, next, ["COMPANY"]);
});

// Get company analytics
router.get("/", getCompanyAnalytics);

export default router;
