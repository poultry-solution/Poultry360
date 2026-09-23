import { UserRole } from "@prisma/client";
import { Router } from "express";
import { getAdminOverview } from "../controller/adminDashboardController";
import { authMiddleware } from "../middelware/middelware";

const router = Router();

router.use((req, res, next) => {
  authMiddleware(req, res, next, [UserRole.SUPER_ADMIN]);
});

router.get("/overview", getAdminOverview);

export default router;
