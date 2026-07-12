import express from "express";

import { authMiddleware } from "../middelware/middelware";
import { Request, Response } from "express";

const router = express.Router();



const removedFarmerDealerConnectionRoute = (req: Request, res: Response) => {
  return res.status(410).json({
    success: false,
    message:
      "Farmer-dealer saleRequest workflows have been removed. Use the manual supplier/customer flow instead.",
    route: req.originalUrl,
  });
};

// Apply authentication middleware to all routes
router.use((req, res, next) => {
  authMiddleware(req, res, next, ["OWNER"]); // Only farmers (owners) can access
});

// ==================== FARMER SALE REQUEST ROUTES ====================
// Get sale request statistics for farmer
router.get("/statistics", removedFarmerDealerConnectionRoute);

// Get all sale requests for the farmer
router.get("/", removedFarmerDealerConnectionRoute);

// Get sale request by ID
router.get("/:id", removedFarmerDealerConnectionRoute);

// Approve sale request
router.post("/:id/approve", removedFarmerDealerConnectionRoute);

// Reject sale request
router.post("/:id/reject", removedFarmerDealerConnectionRoute);

export default router;
