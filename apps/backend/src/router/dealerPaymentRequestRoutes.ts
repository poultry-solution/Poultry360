import { Request, Response, Router } from "express";
import { authMiddleware } from "../middelware/middelware";

const router = Router();

const removedDealerPaymentRequestRoute = (req: Request, res: Response) => {
  return res.status(410).json({
    success: false,
    message:
      "Dealer payment request workflows have been removed. Use the manual customer payment flow instead.",
    route: req.originalUrl,
  });
};

// All routes require dealer authentication
router.use((req, res, next) => {
  authMiddleware(req, res, next, ["DEALER"]);
});

// ==================== DEALER PAYMENT REQUEST ROUTES ====================

// Statistics (must come before /:id to avoid route conflicts)
router.get("/statistics", removedDealerPaymentRequestRoute);

// Create payment request (dealer → farmer)
router.post("/", removedDealerPaymentRequestRoute);

// List and get
router.get("/", removedDealerPaymentRequestRoute);
router.get("/:id", removedDealerPaymentRequestRoute);

// Approve/reject
router.post("/:id/approve", removedDealerPaymentRequestRoute);
router.post("/:id/reject", removedDealerPaymentRequestRoute);

export default router;
