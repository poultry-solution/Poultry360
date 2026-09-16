import express from "express";
import { UserRole } from "@prisma/client";
import {
  archiveFarmerProduct,
  createFarmerProduct,
  listFarmerProducts,
  updateFarmerProduct,
} from "../controller/farmerProductController";
import { authMiddleware } from "../middelware/middelware";
import { requireAccountFeature } from "../middelware/accountFeatureMiddleware";
import { ACCOUNT_FEATURE_KEYS } from "../services/accountFeatureService";

const router = express.Router();
router.use((req, res, next) =>
  authMiddleware(req, res, next, [UserRole.OWNER] as any)
);
router.use(requireAccountFeature(ACCOUNT_FEATURE_KEYS.SELF_FEED_PRODUCTION));
router.get("/", listFarmerProducts);
router.post("/", createFarmerProduct);
router.put("/:id", updateFarmerProduct);
router.delete("/:id", archiveFarmerProduct);

export default router;
