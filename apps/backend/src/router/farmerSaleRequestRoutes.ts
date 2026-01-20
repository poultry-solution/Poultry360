import express from "express";
import {
  getFarmerSaleRequests,
  getFarmerSaleRequestById,
  approveSaleRequest,
  rejectSaleRequest,
  getFarmerSaleRequestStatistics,
} from "../controller/dealerSaleRequestController";
import { authMiddleware } from "../middelware/middelware";

const router = express.Router();

// Apply authentication middleware to all routes
router.use((req, res, next) => {
  authMiddleware(req, res, next, ["OWNER"]); // Only farmers (owners) can access
});

// ==================== FARMER SALE REQUEST ROUTES ====================
// Get sale request statistics for farmer
router.get("/statistics", getFarmerSaleRequestStatistics);

// Get all sale requests for the farmer
router.get("/", getFarmerSaleRequests);

// Get sale request by ID
router.get("/:id", getFarmerSaleRequestById);

// Approve sale request
router.post("/:id/approve", approveSaleRequest);

// Reject sale request
router.post("/:id/reject", rejectSaleRequest);

export default router;
