"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dealerVerificationController_1 = require("../controller/dealerVerificationController");
const middelware_1 = require("../middelware/middelware");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
// ==================== DEALER ROUTES (AUTHENTICATED DEALERS) ====================
// Create verification request (during signup or retry)
router.post("/dealers/verification-requests", (req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, [client_1.UserRole.DEALER]);
}, dealerVerificationController_1.createVerificationRequest);
// Get dealer's own verification requests
router.get("/dealers/verification-requests", (req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, [client_1.UserRole.DEALER]);
}, dealerVerificationController_1.getDealerVerificationRequests);
// Get dealer's approved companies
router.get("/dealers/companies", (req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, [client_1.UserRole.DEALER]);
}, dealerVerificationController_1.getDealerCompanies);
// Get archived companies (MUST be before /:companyId to avoid route collision)
router.get("/dealers/companies/archived", (req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, [client_1.UserRole.DEALER]);
}, dealerVerificationController_1.getArchivedDealerCompanies);
// Get company details (if dealer is approved)
router.get("/dealers/companies/:companyId", (req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, [client_1.UserRole.DEALER]);
}, dealerVerificationController_1.getCompanyDetailsForDealer);
// Acknowledge verification request (mark message as seen)
router.post("/dealers/verification-requests/:id/acknowledge", (req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, [client_1.UserRole.DEALER]);
}, dealerVerificationController_1.acknowledgeVerificationRequest);
// Cancel verification request
router.delete("/dealers/verification-requests/:requestId", (req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, [client_1.UserRole.DEALER]);
}, dealerVerificationController_1.cancelVerificationRequest);
// Archive dealer-company connection
router.post("/dealers/companies/:connectionId/archive", (req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, [client_1.UserRole.DEALER]);
}, dealerVerificationController_1.archiveDealerCompanyConnection);
// Unarchive dealer-company connection
router.post("/dealers/companies/:connectionId/unarchive", (req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, [client_1.UserRole.DEALER]);
}, dealerVerificationController_1.unarchiveDealerCompanyConnection);
// ==================== COMPANY ROUTES (AUTHENTICATED COMPANIES) ====================
// Get company's verification requests (with filters)
router.get("/companies/verification-requests", (req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, [client_1.UserRole.COMPANY]);
}, dealerVerificationController_1.getCompanyVerificationRequests);
// Approve verification request
router.post("/companies/verification-requests/:id/approve", (req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, [client_1.UserRole.COMPANY]);
}, dealerVerificationController_1.approveVerificationRequest);
// Reject verification request
router.post("/companies/verification-requests/:id/reject", (req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, [client_1.UserRole.COMPANY]);
}, dealerVerificationController_1.rejectVerificationRequest);
// Archive company-dealer connection
router.post("/companies/dealers/:connectionId/archive", (req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, [client_1.UserRole.COMPANY]);
}, dealerVerificationController_1.archiveCompanyDealerConnection);
// Unarchive company-dealer connection
router.post("/companies/dealers/:connectionId/unarchive", (req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, [client_1.UserRole.COMPANY]);
}, dealerVerificationController_1.unarchiveCompanyDealerConnection);
// Get archived dealers for company
router.get("/companies/dealers/archived", (req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, [client_1.UserRole.COMPANY]);
}, dealerVerificationController_1.getArchivedCompanyDealers);
exports.default = router;
