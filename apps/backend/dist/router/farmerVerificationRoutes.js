"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const farmerVerificationController_1 = require("../controller/farmerVerificationController");
const middelware_1 = require("../middelware/middelware");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
// ==================== FARMER ROUTES (AUTHENTICATED FARMERS/OWNERS) ====================
// Create verification request to dealer
router.post("/farmers/verification-requests", (req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, [client_1.UserRole.OWNER]);
}, farmerVerificationController_1.createFarmerVerificationRequest);
// Get farmer's own verification requests
router.get("/farmers/verification-requests", (req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, [client_1.UserRole.OWNER]);
}, farmerVerificationController_1.getFarmerVerificationRequests);
// Get farmer's connected dealers
router.get("/farmers/dealers", (req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, [client_1.UserRole.OWNER]);
}, farmerVerificationController_1.getFarmerDealers);
// Get archived dealers (MUST be before /:dealerId to avoid route collision)
router.get("/farmers/dealers/archived", (req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, [client_1.UserRole.OWNER]);
}, farmerVerificationController_1.getArchivedFarmerDealers);
// Get dealer details (if farmer is connected)
router.get("/farmers/dealers/:dealerId", (req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, [client_1.UserRole.OWNER]);
}, farmerVerificationController_1.getDealerDetailsForFarmer);
// Acknowledge verification request (mark message as seen)
router.post("/farmers/verification-requests/:id/acknowledge", (req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, [client_1.UserRole.OWNER]);
}, farmerVerificationController_1.acknowledgeFarmerRequest);
// Cancel farmer verification request
router.delete("/farmers/verification-requests/:requestId", (req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, [client_1.UserRole.OWNER]);
}, farmerVerificationController_1.cancelFarmerVerificationRequest);
// Archive farmer-dealer connection
router.post("/farmers/dealers/:connectionId/archive", (req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, [client_1.UserRole.OWNER]);
}, farmerVerificationController_1.archiveFarmerDealerConnection);
// Unarchive farmer-dealer connection
router.post("/farmers/dealers/:connectionId/unarchive", (req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, [client_1.UserRole.OWNER]);
}, farmerVerificationController_1.unarchiveFarmerDealerConnection);
// ==================== DEALER ROUTES (AUTHENTICATED DEALERS) ====================
// Get dealer's farmer verification requests (with filters)
router.get("/dealers/farmer-requests", (req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, [client_1.UserRole.DEALER]);
}, farmerVerificationController_1.getDealerFarmerRequests);
// Approve farmer verification request
router.post("/dealers/farmer-requests/:id/approve", (req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, [client_1.UserRole.DEALER]);
}, farmerVerificationController_1.approveFarmerRequest);
// Reject farmer verification request
router.post("/dealers/farmer-requests/:id/reject", (req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, [client_1.UserRole.DEALER]);
}, farmerVerificationController_1.rejectFarmerRequest);
// Get dealer's connected farmers
router.get("/dealers/farmers", (req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, [client_1.UserRole.DEALER]);
}, farmerVerificationController_1.getDealerFarmers);
// Get archived farmers (MUST be before /:connectionId to avoid route collision)
router.get("/dealers/farmers/archived", (req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, [client_1.UserRole.DEALER]);
}, farmerVerificationController_1.getArchivedDealerFarmers);
// Archive dealer-farmer connection
router.post("/dealers/farmers/:connectionId/archive", (req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, [client_1.UserRole.DEALER]);
}, farmerVerificationController_1.archiveDealerFarmerConnection);
// Unarchive dealer-farmer connection
router.post("/dealers/farmers/:connectionId/unarchive", (req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, [client_1.UserRole.DEALER]);
}, farmerVerificationController_1.unarchiveDealerFarmerConnection);
exports.default = router;
