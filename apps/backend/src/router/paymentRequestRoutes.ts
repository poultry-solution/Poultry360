import express from "express";
import {
  createCompanyPaymentRequest,
  getCompanyPaymentRequests,
  acceptCompanyPaymentRequest,
  verifyCompanyPaymentRequest,
  getDealerPaymentRequests,
  acceptDealerPaymentRequest,
  submitDealerPaymentProof,
  createDealerPaymentRequest,
  cancelPaymentRequest,
} from "../controller/paymentRequestController";
import { authMiddleware } from "../middelware/middelware";

const router = express.Router();

// ==================== COMPANY PAYMENT REQUEST ROUTES ====================
const companyRouter = express.Router();
companyRouter.use((req, res, next) => {
  authMiddleware(req, res, next, ["COMPANY"]);
});

companyRouter.post("/", createCompanyPaymentRequest);
companyRouter.get("/", getCompanyPaymentRequests);
companyRouter.post("/:id/accept", acceptCompanyPaymentRequest);
companyRouter.post("/:id/verify", verifyCompanyPaymentRequest);
companyRouter.post("/:id/cancel", cancelPaymentRequest);

// ==================== DEALER PAYMENT REQUEST ROUTES ====================
const dealerRouter = express.Router();
dealerRouter.use((req, res, next) => {
  authMiddleware(req, res, next, ["DEALER"]);
});

dealerRouter.get("/", getDealerPaymentRequests);
dealerRouter.post("/", createDealerPaymentRequest);
dealerRouter.post("/:id/accept", acceptDealerPaymentRequest);
dealerRouter.post("/:id/submit-proof", submitDealerPaymentProof);
dealerRouter.post("/:id/cancel", cancelPaymentRequest);

// Mount routers
router.use("/company", companyRouter);
router.use("/dealer", dealerRouter);

export default router;

