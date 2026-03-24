import { Router } from "express";
import { authMiddleware } from "../middelware/middelware";
import { UserRole } from "@prisma/client";
import {
  approvePaymentSubmission,
  getPaymentApprovals,
  rejectPaymentSubmission,
} from "../controller/adminPaymentApprovalsController";

const router = Router();

// Apply authentication middleware to all routes - SUPER_ADMIN only
router.use((req, res, next) => {
  authMiddleware(req, res, next, [UserRole.SUPER_ADMIN]);
});

router.get("/", getPaymentApprovals);
router.post("/:submissionId/approve", approvePaymentSubmission);
router.post("/:submissionId/reject", rejectPaymentSubmission);

export default router;

