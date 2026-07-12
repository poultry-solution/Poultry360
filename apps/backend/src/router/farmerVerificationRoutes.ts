import { Request, Response, Router } from "express";
import { authMiddleware } from "../middelware/middelware";
import { UserRole } from "@prisma/client";

const router = Router();

const removedFarmerDealerConnectionRoute = (req: Request, res: Response) => {
  return res.status(410).json({
    success: false,
    message:
      "Farmer-dealer connection workflows have been removed. Use the manual supplier/customer flow instead.",
    route: req.originalUrl,
  });
};

// ==================== FARMER ROUTES (AUTHENTICATED FARMERS/OWNERS) ====================

// Create verification request to dealer
router.post(
  "/farmers/verification-requests",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.OWNER]);
  },
  removedFarmerDealerConnectionRoute
);

// Get farmer's own verification requests
router.get(
  "/farmers/verification-requests",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.OWNER]);
  },
  removedFarmerDealerConnectionRoute
);

// Get farmer's connected dealers
router.get(
  "/farmers/dealers",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.OWNER]);
  },
  removedFarmerDealerConnectionRoute
);

// Get archived dealers (MUST be before /:dealerId to avoid route collision)
router.get(
  "/farmers/dealers/archived",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.OWNER]);
  },
  removedFarmerDealerConnectionRoute
);

// Get dealer details (if farmer is connected)
router.get(
  "/farmers/dealers/:dealerId",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.OWNER]);
  },
  removedFarmerDealerConnectionRoute
);

// Farmer acknowledges connected opening balance
router.post(
  "/farmers/dealers/:connectionId/opening-balance/ack",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.OWNER]);
  },
  removedFarmerDealerConnectionRoute
);

// Farmer disputes connected opening balance
router.post(
  "/farmers/dealers/:connectionId/opening-balance/dispute",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.OWNER]);
  },
  removedFarmerDealerConnectionRoute
);

// Acknowledge verification request (mark message as seen)
router.post(
  "/farmers/verification-requests/:id/acknowledge",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.OWNER]);
  },
  removedFarmerDealerConnectionRoute
);

// Cancel farmer verification request
router.delete(
  "/farmers/verification-requests/:requestId",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.OWNER]);
  },
  removedFarmerDealerConnectionRoute
);

// Archive farmer-dealer connection
router.post(
  "/farmers/dealers/:connectionId/archive",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.OWNER]);
  },
  removedFarmerDealerConnectionRoute
);

// Unarchive farmer-dealer connection
router.post(
  "/farmers/dealers/:connectionId/unarchive",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.OWNER]);
  },
  removedFarmerDealerConnectionRoute
);

// ==================== DEALER ROUTES (AUTHENTICATED DEALERS) ====================

// Get dealer's farmer verification requests (with filters)
router.get(
  "/dealers/farmer-requests",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.DEALER]);
  },
  removedFarmerDealerConnectionRoute
);

// Approve farmer verification request
router.post(
  "/dealers/farmer-requests/:id/approve",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.DEALER]);
  },
  removedFarmerDealerConnectionRoute
);

// Reject farmer verification request
router.post(
  "/dealers/farmer-requests/:id/reject",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.DEALER]);
  },
  removedFarmerDealerConnectionRoute
);

// Get dealer's connected farmers
router.get(
  "/dealers/farmers",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.DEALER]);
  },
  removedFarmerDealerConnectionRoute
);

// Dealer sets/edits connected opening balance
router.post(
  "/dealers/farmers/:connectionId/opening-balance",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.DEALER]);
  },
  removedFarmerDealerConnectionRoute
);

// Get archived farmers (MUST be before /:connectionId to avoid route collision)
router.get(
  "/dealers/farmers/archived",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.DEALER]);
  },
  removedFarmerDealerConnectionRoute
);

// Archive dealer-farmer connection
router.post(
  "/dealers/farmers/:connectionId/archive",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.DEALER]);
  },
  removedFarmerDealerConnectionRoute
);

// Unarchive dealer-farmer connection
router.post(
  "/dealers/farmers/:connectionId/unarchive",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.DEALER]);
  },
  removedFarmerDealerConnectionRoute
);

export default router;
