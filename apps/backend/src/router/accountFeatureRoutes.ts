import { Router } from "express";
import {
  getCurrentAccountFeatures,
  updateCurrentAccountFeature,
} from "../controller/accountFeatureController";
import { authMiddleware } from "../middelware/middelware";

const router = Router();

router.use((req, res, next) => authMiddleware(req, res, next));
router.get("/", getCurrentAccountFeatures);
router.put("/:featureKey", updateCurrentAccountFeature);

export default router;
