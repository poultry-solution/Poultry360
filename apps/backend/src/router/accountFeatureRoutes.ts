import { Router } from "express";
import {
  getCurrentAccountFeatures,
  updateCurrentAccountFeature,
} from "../controller/accountFeatureController";
import { authMiddleware, requireStaffAccountOwner } from "../middelware/middelware";

const router = Router();

router.use((req, res, next) => authMiddleware(req, res, next));
router.get("/", getCurrentAccountFeatures);
// Owner-only: toggling optional features (cFCR, purchase-bill upload, public
// list-for-sale, etc.) is an account-wide setting that must not be reachable
// by any staff login, regardless of their operations permission.
router.put("/:featureKey", requireStaffAccountOwner, updateCurrentAccountFeature);

export default router;
