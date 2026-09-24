import { Router } from "express";
import { UserRole } from "@prisma/client";
import { createAdminExpense, getAdminFinanceOverview } from "../controller/adminFinanceController";
import { authMiddleware } from "../middelware/middelware";

const router = Router();

router.use((req, res, next) => {
  authMiddleware(req, res, next, [UserRole.SUPER_ADMIN]);
});

router.get("/", getAdminFinanceOverview);
router.post("/expenses", createAdminExpense);

export default router;
