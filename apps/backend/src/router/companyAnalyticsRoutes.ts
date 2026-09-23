import express from "express";
import { getCompanyAnalytics } from "../controller/companyAnalyticsController";
import { authMiddleware, requireStaffPermission } from "../middelware/middelware";
import { StaffPermission } from "@prisma/client";

const router = express.Router();

// Apply authentication middleware to all routes - only companies can access
router.use((req, res, next) => {
  authMiddleware(req, res, next, ["COMPANY"]);
});
router.use(requireStaffPermission(StaffPermission.COMPANY_VIEW_ANALYTICS));

// Get company analytics
router.get("/", getCompanyAnalytics);

export default router;
