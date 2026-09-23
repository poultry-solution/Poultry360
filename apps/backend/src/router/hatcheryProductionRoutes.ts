import express from "express";
import { UserRole } from "@prisma/client";
import { authMiddleware, requireStaffPermission } from "../middelware/middelware";
import { StaffPermission } from "@prisma/client";
import { auditSuccessfulHatcheryMutation } from "../middelware/hatcheryAuditMiddleware";
import {
  createHatcheryProduction,
  deleteHatcheryProduction,
  getHatcheryProduction,
  listHatcheryProduction,
} from "../controller/hatcheryProductionController";
import { requireAccountFeature } from "../middelware/accountFeatureMiddleware";
import { ACCOUNT_FEATURE_KEYS } from "../services/accountFeatureService";

const router = express.Router();
router.use((req, res, next) => authMiddleware(req, res, next, [UserRole.HATCHERY] as any));
router.use(requireStaffPermission(StaffPermission.HATCHERY_MANAGE_OPERATIONS));
router.use(requireAccountFeature(ACCOUNT_FEATURE_KEYS.SELF_FEED_PRODUCTION));
router.use(auditSuccessfulHatcheryMutation);
router.get("/", listHatcheryProduction);
router.post("/", createHatcheryProduction);
router.get("/:id", getHatcheryProduction);
router.delete("/:id", deleteHatcheryProduction);

export default router;
