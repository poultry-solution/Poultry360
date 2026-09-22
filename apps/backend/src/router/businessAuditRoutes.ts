import { Router } from "express";
import { UserRole } from "@prisma/client";
import { authMiddleware } from "../middelware/middelware";
import { exportAdminBusinessAuditLogs, exportDealerBusinessAuditLogs, getAdminBusinessAuditLogs, getDealerBusinessAuditLogs } from "../controller/businessAuditController";

export const dealerBusinessAuditRoutes = Router();
dealerBusinessAuditRoutes.use((req, res, next) => authMiddleware(req, res, next, [UserRole.DEALER]));
dealerBusinessAuditRoutes.get("/", getDealerBusinessAuditLogs);
dealerBusinessAuditRoutes.get("/export", exportDealerBusinessAuditLogs);

export const adminBusinessAuditRoutes = Router();
adminBusinessAuditRoutes.use((req, res, next) => authMiddleware(req, res, next, [UserRole.SUPER_ADMIN]));
adminBusinessAuditRoutes.get("/", getAdminBusinessAuditLogs);
adminBusinessAuditRoutes.get("/export", exportAdminBusinessAuditLogs);
