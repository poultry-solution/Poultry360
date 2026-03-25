import { Router } from "express";
import { authMiddleware } from "../middelware/middelware";
import { UserRole } from "@prisma/client";
import {
  getOnboardingPaymentContext,
  getOnboardingPaymentHistory,
  startOnboardingTrial,
  submitOnboardingPayment,
} from "../controller/onboardingPaymentController";

const router = Router();

// Apply authentication middleware to all onboarding payment routes
// (allowedRoles non-empty so onboarding-gating middleware logic is enforced).
router.use((req, res, next) => {
  authMiddleware(req, res, next, [
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.DEALER,
    UserRole.COMPANY,
    // shared-types UserRole union might not include DOCTOR at compile-time;
    // runtime role checks still work because the JWT stores the string value.
    "DOCTOR",
    UserRole.SUPER_ADMIN,
  ] as any);
});

router.get("/context", getOnboardingPaymentContext);
router.post("/start-trial", startOnboardingTrial);
router.post("/submit", submitOnboardingPayment);
router.get("/history", getOnboardingPaymentHistory);

export default router;

