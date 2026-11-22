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

// Writes are 410 Gone — the new /farmer/cashflow endpoints are the only
// supported way to mutate cash state. Reads stay available so any UI that
// hasn't shipped the switch yet can still render history.
router.use((req, res, next) => {
  if (req.method === "POST" || req.method === "PATCH" || req.method === "DELETE") {
    return res.status(410).json({
      message:
        "Cash-in-hand writes have moved to /farmer/cashflow. Reload to use the new cash book.",
    });
  }
  return next();
});

router.get("/today", getToday);
router.post("/setup", setup);
router.post("/movements", addMovement);
router.delete("/movements/:id", deleteMovement);
router.post("/close-day", closeDay);
router.get("/history", getHistory);
router.get("/closed-day/:bsDate", getClosedDayDetail);

export default router;
