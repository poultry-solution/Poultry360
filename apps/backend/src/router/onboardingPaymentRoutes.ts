import { Router } from "express";
import { authMiddleware } from "../middelware/middelware";
import { UserRole } from "@prisma/client";
import { getOnboardingStatus } from "../controller/onboardingPaymentController";

const router = Router();

// All onboarding-status routes require auth. allowedRoles is non-empty so the
// approval-gating logic in the middleware runs (locked users are still allowed
// to read their own status).
router.use((req, res, next) => {
  authMiddleware(req, res, next, [
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.DEALER,
    UserRole.COMPANY,
    UserRole.HATCHERY,
    "DOCTOR",
    UserRole.SUPER_ADMIN,
  ] as any);
});

router.get("/status", getOnboardingStatus);

export default router;
