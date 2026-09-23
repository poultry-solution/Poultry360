import express from "express";
import { authMiddleware, requireStaffPermission } from "../middelware/middelware";
import { StaffPermission } from "@prisma/client";
import { auditSuccessfulFarmerMutation } from "../middelware/farmerAuditMiddleware";
import {
  getToday,
  setup,
  addMovement,
  deleteMovement,
  closeDay,
  getHistory,
  getClosedDayDetail,
} from "../controller/farmerCashInHandController";

const router = express.Router();

router.use((req, res, next) => {
  authMiddleware(req, res, next, ["OWNER"]);
});
router.use(requireStaffPermission(StaffPermission.FARMER_VIEW_CASH_HISTORY));
router.use(auditSuccessfulFarmerMutation);

router.get("/today", getToday);
router.post("/setup", setup);
router.post("/movements", addMovement);
router.delete("/movements/:id", deleteMovement);
router.post("/close-day", closeDay);
router.get("/history", getHistory);
router.get("/closed-day/:bsDate", getClosedDayDetail);

export default router;
