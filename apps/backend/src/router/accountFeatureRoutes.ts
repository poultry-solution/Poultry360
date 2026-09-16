import { Router } from "express";
import { getCurrentAccountFeatures } from "../controller/accountFeatureController";
import { authMiddleware } from "../middelware/middelware";

const router = Router();

router.use((req, res, next) => authMiddleware(req, res, next));
router.get("/", getCurrentAccountFeatures);

export default router;
