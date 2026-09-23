import { Router } from "express";
import { UserRole } from "@prisma/client";
import { authMiddleware } from "../middelware/middelware";
import { exportAccountBusinessAuditLogs, exportAdminBusinessAuditLogs, exportDealerBusinessAuditLogs, getAccountBusinessAuditLogs, getAdminBusinessAuditLogs, getDealerBusinessAuditLogs } from "../controller/businessAuditController";
import { getStaffAccountModule } from "../services/staffAccountService";

export const dealerBusinessAuditRoutes = Router();
dealerBusinessAuditRoutes.use((req, res, next) => authMiddleware(req, res, next, [UserRole.DEALER]));
dealerBusinessAuditRoutes.get("/", getDealerBusinessAuditLogs);
dealerBusinessAuditRoutes.get("/export", exportDealerBusinessAuditLogs);

export const accountBusinessAuditRoutes = Router();
accountBusinessAuditRoutes.use((req, res, next) => authMiddleware(req, res, next));
accountBusinessAuditRoutes.use((req, res, next) => {
  if (!getStaffAccountModule(req.role)) {
    return res.status(403).json({ message: "Business activity is not enabled for this account type" });
  }
  return next();
});
accountBusinessAuditRoutes.get("/", getAccountBusinessAuditLogs);
accountBusinessAuditRoutes.get("/export", exportAccountBusinessAuditLogs);

export const adminBusinessAuditRoutes = Router();
adminBusinessAuditRoutes.use((req, res, next) => authMiddleware(req, res, next, [UserRole.SUPER_ADMIN]));
adminBusinessAuditRoutes.get("/", getAdminBusinessAuditLogs);
adminBusinessAuditRoutes.get("/export", exportAdminBusinessAuditLogs);
