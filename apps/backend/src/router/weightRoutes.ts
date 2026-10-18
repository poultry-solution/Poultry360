import express from "express";
import {
  addBirdWeight,
  getBirdWeights,
  updateBirdWeight,
  deleteBirdWeight,
  getGrowthChartData,
} from "../controller/weightController";
import { authMiddleware, requireStaffPermission } from "../middelware/middelware";
import { StaffPermission, UserRole } from "@prisma/client";
import { auditSuccessfulFarmerMutation } from "../middelware/farmerAuditMiddleware";

const router = express.Router();

// All routes require authentication; farmer-only (staff inherit role=OWNER).
router.use((req, res, next) => {
  authMiddleware(req, res, next, [UserRole.OWNER]);
});
router.use(requireStaffPermission(StaffPermission.FARMER_MANAGE_OPERATIONS));
router.use(auditSuccessfulFarmerMutation);

// Weight management routes
router.post("/:batchId/weights", addBirdWeight);
router.get("/:batchId/weights", getBirdWeights);
router.put("/:batchId/weights/:weightId", updateBirdWeight);
router.delete("/:batchId/weights/:weightId", deleteBirdWeight);

// Growth analytics
router.get("/:batchId/growth-chart", getGrowthChartData);

export default router;
