import express from "express";
import { UserRole } from "@prisma/client";
import {
  createFarmerProduction,
  deleteFarmerProduction,
  getFarmerProduction,
  listFarmerProduction,
} from "../controller/farmerProductionController";
import { authMiddleware } from "../middelware/middelware";
import { requireAccountFeature } from "../middelware/accountFeatureMiddleware";
import { ACCOUNT_FEATURE_KEYS } from "../services/accountFeatureService";

const router = express.Router();
router.use((req, res, next) =>
  authMiddleware(req, res, next, [UserRole.OWNER] as any)
);
router.use(requireAccountFeature(ACCOUNT_FEATURE_KEYS.SELF_FEED_PRODUCTION));
router.get("/", listFarmerProduction);
router.post("/", createFarmerProduction);
router.get("/:id", getFarmerProduction);
router.delete("/:id", deleteFarmerProduction);

export default router;
