import { Router } from "express";
import { authMiddleware } from "../middelware/middelware";
import { UserRole } from "@prisma/client";
import {
  approveAccount,
  getAccountApprovals,
  rejectAccount,
} from "../controller/adminPaymentApprovalsController";

const router = Router();

// SUPER_ADMIN only.
router.use((req, res, next) => {
  authMiddleware(req, res, next, [UserRole.SUPER_ADMIN]);
});

router.get("/", getAccountApprovals);
router.post("/:userId/approve", approveAccount);
router.post("/:userId/reject", rejectAccount);

export default router;
