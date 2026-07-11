import express from "express";
import { authMiddleware } from "../middelware/middelware";
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

router.get("/today", getToday);
router.post("/setup", setup);
router.post("/movements", addMovement);
router.delete("/movements/:id", deleteMovement);
router.post("/close-day", closeDay);
router.get("/history", getHistory);
router.get("/closed-day/:bsDate", getClosedDayDetail);

export default router;
