import express from "express";
import {
  addBirdWeight,
  getBirdWeights,
  updateBirdWeight,
  deleteBirdWeight,
  getGrowthChartData,
} from "../controller/weightController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Weight management routes
router.post("/:batchId/weights", addBirdWeight);
router.get("/:batchId/weights", getBirdWeights);
router.put("/:batchId/weights/:weightId", updateBirdWeight);
router.delete("/:batchId/weights/:weightId", deleteBirdWeight);

// Growth analytics
router.get("/:batchId/growth-chart", getGrowthChartData);

export default router;

