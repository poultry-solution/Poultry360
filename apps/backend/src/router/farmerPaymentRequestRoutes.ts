import { Request, Response, Router } from "express";
import { authMiddleware } from "../middelware/middelware";

const router = Router();

const removedFarmerPaymentRequestRoute = (req: Request, res: Response) => {
  return res.status(410).json({
    success: false,
    message:
      "Farmer payment request workflows have been removed. Use the manual supplier payment flow instead.",
    route: req.originalUrl,
  });
};

// All routes require farmer (OWNER) authentication
router.use((req, res, next) => {
  authMiddleware(req, res, next, ["OWNER"]);
});

// ==================== FARMER PAYMENT REQUEST ROUTES ====================

// Statistics (must come before /:id to avoid route conflicts)
router.get("/statistics", removedFarmerPaymentRequestRoute);

// List and get
router.get("/", removedFarmerPaymentRequestRoute);
router.get("/:id", removedFarmerPaymentRequestRoute);

// Create
router.post("/", removedFarmerPaymentRequestRoute);

// Respond to dealer-initiated request with proof
router.post("/:id/respond", removedFarmerPaymentRequestRoute);

export default router;
