import express from "express";
import { UserRole } from "@prisma/client";
import { authMiddleware } from "../middelware/middelware";
import {
  archiveHatcheryProduct,
  createHatcheryProduct,
  listHatcheryProducts,
  updateHatcheryProduct,
} from "../controller/hatcheryProductController";
import { requireAccountFeature } from "../middelware/accountFeatureMiddleware";
import { ACCOUNT_FEATURE_KEYS } from "../services/accountFeatureService";

const router = express.Router();
router.use((req, res, next) => authMiddleware(req, res, next, [UserRole.HATCHERY] as any));
router.use(requireAccountFeature(ACCOUNT_FEATURE_KEYS.SELF_FEED_PRODUCTION));
router.get("/", listHatcheryProducts);
router.post("/", createHatcheryProduct);
router.put("/:id", updateHatcheryProduct);
router.delete("/:id", archiveHatcheryProduct);

export default router;
