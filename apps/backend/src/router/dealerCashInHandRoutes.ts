import express from "express";
import { authMiddleware, requireStaffPermission } from "../middelware/middelware";
import { StaffPermission } from "@prisma/client";
import {
  getToday,
  setup,
  addMovement,
  deleteMovement,
  closeDay,
  getHistory,
  getClosedDayDetail,
} from "../controller/dealerCashInHandController";

const router = express.Router();

router.use((req, res, next) => {
  authMiddleware(req, res, next, ["DEALER"]);
});

// Dealer owners have full access. Staff must be explicitly allowed to see or
// change cash in hand; new staff accounts do not receive this permission.
router.use(requireStaffPermission(StaffPermission.DEALER_VIEW_CASH_HISTORY));

// GET  /dealer/cash-in-hand/today
router.get("/today", getToday);

// POST /dealer/cash-in-hand/setup
router.post("/setup", setup);

// POST /dealer/cash-in-hand/movements
router.post("/movements", addMovement);

// DELETE /dealer/cash-in-hand/movements/:id
router.delete("/movements/:id", deleteMovement);

// POST /dealer/cash-in-hand/close-day
router.post("/close-day", closeDay);

// GET  /dealer/cash-in-hand/history
router.get("/history", getHistory);

// GET  /dealer/cash-in-hand/closed-day/:bsDate
router.get("/closed-day/:bsDate", getClosedDayDetail);

export default router;
