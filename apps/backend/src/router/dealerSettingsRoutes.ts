import { Router } from "express";
import {
  getDealerPaymentDirectionSetting,
  updateDealerPaymentDirectionSetting,
} from "../controller/dealerSettingsController";
import {
  authMiddleware,
  requireDealerOwner,
} from "../middelware/middelware";

const router = Router();

router.use((req, res, next) => {
  authMiddleware(req, res, next, ["DEALER"]);
});

// Staff can read the setting so their payment screens match the owner account.
router.get("/payment-direction", getDealerPaymentDirectionSetting);

// Only the Dealer owner can change an account-wide setting.
router.patch(
  "/payment-direction",
  requireDealerOwner,
  updateDealerPaymentDirectionSetting,
);

export default router;
