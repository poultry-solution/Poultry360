import { Router } from "express";
import {
  createFarmerVerificationRequest,
  getFarmerVerificationRequests,
  getDealerFarmerRequests,
  approveFarmerRequest,
  rejectFarmerRequest,
  acknowledgeFarmerRequest,
  getFarmerDealers,
  getDealerFarmers,
  getDealerDetailsForFarmer,
  cancelFarmerVerificationRequest,
  archiveFarmerDealerConnection,
  unarchiveFarmerDealerConnection,
  archiveDealerFarmerConnection,
  unarchiveDealerFarmerConnection,
  setConnectedOpeningBalanceByDealer,
  acknowledgeConnectedOpeningBalance,
  disputeConnectedOpeningBalance,
  getArchivedFarmerDealers,
  getArchivedDealerFarmers,
} from "../controller/farmerVerificationController";
import { authMiddleware } from "../middelware/middelware";
import { UserRole } from "@prisma/client";

const router = Router();

// ==================== FARMER ROUTES (AUTHENTICATED FARMERS/OWNERS) ====================

// Create verification request to dealer
router.post(
  "/farmers/verification-requests",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.OWNER]);
  },
  createFarmerVerificationRequest
);

// Get farmer's own verification requests
router.get(
  "/farmers/verification-requests",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.OWNER]);
  },
  getFarmerVerificationRequests
);

// Get farmer's connected dealers
router.get(
  "/farmers/dealers",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.OWNER]);
  },
  getFarmerDealers
);

// Get archived dealers (MUST be before /:dealerId to avoid route collision)
router.get(
  "/farmers/dealers/archived",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.OWNER]);
  },
  getArchivedFarmerDealers
);

// Get dealer details (if farmer is connected)
router.get(
  "/farmers/dealers/:dealerId",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.OWNER]);
  },
  getDealerDetailsForFarmer
);

// Farmer acknowledges connected opening balance
router.post(
  "/farmers/dealers/:connectionId/opening-balance/ack",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.OWNER]);
  },
  acknowledgeConnectedOpeningBalance
);

// Farmer disputes connected opening balance
router.post(
  "/farmers/dealers/:connectionId/opening-balance/dispute",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.OWNER]);
  },
  disputeConnectedOpeningBalance
);

// Acknowledge verification request (mark message as seen)
router.post(
  "/farmers/verification-requests/:id/acknowledge",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.OWNER]);
  },
  acknowledgeFarmerRequest
);

// Cancel farmer verification request
router.delete(
  "/farmers/verification-requests/:requestId",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.OWNER]);
  },
  cancelFarmerVerificationRequest
);

// Archive farmer-dealer connection
router.post(
  "/farmers/dealers/:connectionId/archive",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.OWNER]);
  },
  archiveFarmerDealerConnection
);

// Unarchive farmer-dealer connection
router.post(
  "/farmers/dealers/:connectionId/unarchive",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.OWNER]);
  },
  unarchiveFarmerDealerConnection
);

// ==================== DEALER ROUTES (AUTHENTICATED DEALERS) ====================

// Get dealer's farmer verification requests (with filters)
router.get(
  "/dealers/farmer-requests",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.DEALER]);
  },
  getDealerFarmerRequests
);

// Approve farmer verification request
router.post(
  "/dealers/farmer-requests/:id/approve",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.DEALER]);
  },
  approveFarmerRequest
);

// Reject farmer verification request
router.post(
  "/dealers/farmer-requests/:id/reject",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.DEALER]);
  },
  rejectFarmerRequest
);

// Get dealer's connected farmers
router.get(
  "/dealers/farmers",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.DEALER]);
  },
  getDealerFarmers
);

// Dealer sets/edits connected opening balance
router.post(
  "/dealers/farmers/:connectionId/opening-balance",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.DEALER]);
  },
  setConnectedOpeningBalanceByDealer
);

// Get archived farmers (MUST be before /:connectionId to avoid route collision)
router.get(
  "/dealers/farmers/archived",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.DEALER]);
  },
  getArchivedDealerFarmers
);

// Archive dealer-farmer connection
router.post(
  "/dealers/farmers/:connectionId/archive",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.DEALER]);
  },
  archiveDealerFarmerConnection
);

// Unarchive dealer-farmer connection
router.post(
  "/dealers/farmers/:connectionId/unarchive",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.DEALER]);
  },
  unarchiveDealerFarmerConnection
);

export default router;
