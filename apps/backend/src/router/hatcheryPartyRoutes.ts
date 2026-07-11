import express from "express";
import { authMiddleware } from "../middelware/middelware";
import { UserRole } from "@prisma/client";
import {
  listParties,
  createParty,
  getParty,
  listPartyTxns,
  listPartyPayments,
  addPartyPayment,
  deletePartyPayment,
} from "../controller/hatcheryPartyController";

const router = express.Router();

/** Per-route only: router is mounted at `/` — see hatcheryIncubationRoutes. */
const requireHatchery: express.RequestHandler = (req, res, next) => {
  void authMiddleware(req, res, next, [UserRole.HATCHERY] as any);
};

router.get("/hatchery/parties", requireHatchery, listParties);
router.post("/hatchery/parties", requireHatchery, createParty);
router.get("/hatchery/parties/:id", requireHatchery, getParty);
router.get("/hatchery/parties/:id/txns", requireHatchery, listPartyTxns);
router.get("/hatchery/parties/:id/payments", requireHatchery, listPartyPayments);
router.post("/hatchery/parties/:id/payments", requireHatchery, addPartyPayment);
router.delete("/hatchery/parties/:id/payments/:paymentId", requireHatchery, deletePartyPayment);

export default router;
