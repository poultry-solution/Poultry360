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

router.use((req, res, next) => {
  authMiddleware(req, res, next, [UserRole.HATCHERY] as any);
});

router.get("/hatchery/parties", listParties);
router.post("/hatchery/parties", createParty);
router.get("/hatchery/parties/:id", getParty);
router.get("/hatchery/parties/:id/txns", listPartyTxns);
router.get("/hatchery/parties/:id/payments", listPartyPayments);
router.post("/hatchery/parties/:id/payments", addPartyPayment);
router.delete("/hatchery/parties/:id/payments/:paymentId", deletePartyPayment);

export default router;
