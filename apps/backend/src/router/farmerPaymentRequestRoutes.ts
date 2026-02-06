import { Router } from "express";
import {
  getFarmerPaymentRequests,
  getFarmerPaymentRequestById,
  createPaymentRequest,
  getFarmerPaymentRequestStatistics,
  respondToPaymentRequest,
} from "../controller/dealerSalePaymentRequestController";
import { authMiddleware } from "../middelware/middelware";

const router = Router();

// All routes require farmer (OWNER) authentication
router.use((req, res, next) => {
  authMiddleware(req, res, next, ["OWNER"]);
});

// ==================== FARMER PAYMENT REQUEST ROUTES ====================

// Statistics (must come before /:id to avoid route conflicts)
router.get("/statistics", getFarmerPaymentRequestStatistics);

// List and get
router.get("/", getFarmerPaymentRequests);
router.get("/:id", getFarmerPaymentRequestById);

// Create
router.post("/", createPaymentRequest);

// Respond to dealer-initiated request with proof
router.post("/:id/respond", respondToPaymentRequest);

export default router;
