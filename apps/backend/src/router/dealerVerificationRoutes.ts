import { Router } from "express";
import {
  createVerificationRequest,
  getDealerVerificationRequests,
  getCompanyVerificationRequests,
  approveVerificationRequest,
  rejectVerificationRequest,
  acknowledgeVerificationRequest,
  getDealerCompanies,
  getCompanyDetailsForDealer,
} from "../controller/dealerVerificationController";
import { authMiddleware } from "../middelware/middelware";
import { UserRole } from "@prisma/client";

const router = Router();

// ==================== DEALER ROUTES (AUTHENTICATED DEALERS) ====================

// Create verification request (during signup or retry)
router.post(
  "/dealers/verification-requests",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.DEALER]);
  },
  createVerificationRequest
);

// Get dealer's own verification requests
router.get(
  "/dealers/verification-requests",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.DEALER]);
  },
  getDealerVerificationRequests
);

// Get dealer's approved companies
router.get(
  "/dealers/companies",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.DEALER]);
  },
  getDealerCompanies
);

// Get company details (if dealer is approved)
router.get(
  "/dealers/companies/:companyId",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.DEALER]);
  },
  getCompanyDetailsForDealer
);

// Acknowledge verification request (mark message as seen)
router.post(
  "/dealers/verification-requests/:id/acknowledge",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.DEALER]);
  },
  acknowledgeVerificationRequest
);

// ==================== COMPANY ROUTES (AUTHENTICATED COMPANIES) ====================

// Get company's verification requests (with filters)
router.get(
  "/companies/verification-requests",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.COMPANY]);
  },
  getCompanyVerificationRequests
);

// Approve verification request
router.post(
  "/companies/verification-requests/:id/approve",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.COMPANY]);
  },
  approveVerificationRequest
);

// Reject verification request
router.post(
  "/companies/verification-requests/:id/reject",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.COMPANY]);
  },
  rejectVerificationRequest
);

export default router;
