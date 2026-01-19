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

// Get dealer details (if farmer is connected)
router.get(
  "/farmers/dealers/:dealerId",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.OWNER]);
  },
  getDealerDetailsForFarmer
);

// Acknowledge verification request (mark message as seen)
router.post(
  "/farmers/verification-requests/:id/acknowledge",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.OWNER]);
  },
  acknowledgeFarmerRequest
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

export default router;
