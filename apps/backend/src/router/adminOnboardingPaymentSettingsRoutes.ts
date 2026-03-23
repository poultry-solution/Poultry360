import { Router } from "express";
import { authMiddleware } from "../middelware/middelware";
import { UserRole } from "@prisma/client";
import {
  getAdminOnboardingPaymentSettings,
  updateAdminOnboardingPaymentSettings,
} from "../controller/adminOnboardingPaymentSettingsController";

const router = Router();

router.use((req, res, next) => {
  authMiddleware(req, res, next, [UserRole.SUPER_ADMIN]);
});

router.get("/", getAdminOnboardingPaymentSettings);
router.put("/", updateAdminOnboardingPaymentSettings);

export default router;
