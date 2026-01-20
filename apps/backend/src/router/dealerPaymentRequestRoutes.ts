import { Router } from "express";
import {
  getDealerPaymentRequests,
  getDealerPaymentRequestById,
  approvePaymentRequest,
  rejectPaymentRequest,
  getDealerPaymentRequestStatistics,
} from "../controller/dealerSalePaymentRequestController";
import { authMiddleware } from "../middelware/middelware";

const router = Router();

// All routes require dealer authentication
router.use((req, res, next) => {
  authMiddleware(req, res, next, ["DEALER"]);
});

// ==================== DEALER PAYMENT REQUEST ROUTES ====================

// Statistics (must come before /:id to avoid route conflicts)
router.get("/statistics", getDealerPaymentRequestStatistics);

// List and get
router.get("/", getDealerPaymentRequests);
router.get("/:id", getDealerPaymentRequestById);

// Approve/reject
router.post("/:id/approve", approvePaymentRequest);
router.post("/:id/reject", rejectPaymentRequest);

export default router;
