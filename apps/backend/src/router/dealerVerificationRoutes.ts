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
  cancelVerificationRequest,
  archiveDealerCompanyConnection,
  unarchiveDealerCompanyConnection,
  archiveCompanyDealerConnection,
  unarchiveCompanyDealerConnection,
  getArchivedDealerCompanies,
  getArchivedCompanyDealers,
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

// Get archived companies (MUST be before /:companyId to avoid route collision)
router.get(
  "/dealers/companies/archived",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.DEALER]);
  },
  getArchivedDealerCompanies
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

// Cancel verification request
router.delete(
  "/dealers/verification-requests/:requestId",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.DEALER]);
  },
  cancelVerificationRequest
);

// Archive dealer-company connection
router.post(
  "/dealers/companies/:connectionId/archive",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.DEALER]);
  },
  archiveDealerCompanyConnection
);

// Unarchive dealer-company connection
router.post(
  "/dealers/companies/:connectionId/unarchive",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.DEALER]);
  },
  unarchiveDealerCompanyConnection
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

// Archive company-dealer connection
router.post(
  "/companies/dealers/:connectionId/archive",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.COMPANY]);
  },
  archiveCompanyDealerConnection
);

// Unarchive company-dealer connection
router.post(
  "/companies/dealers/:connectionId/unarchive",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.COMPANY]);
  },
  unarchiveCompanyDealerConnection
);

// Get archived dealers for company
router.get(
  "/companies/dealers/archived",
  (req, res, next) => {
    authMiddleware(req, res, next, [UserRole.COMPANY]);
  },
  getArchivedCompanyDealers
);

export default router;
