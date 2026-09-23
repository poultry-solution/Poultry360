import express from "express";
import {
  createCompanyPurchase,
  getCompanyPurchases,
  getCompanyPurchasesAggregated,
  getCompanyPurchaseById,
} from "../controller/companyPurchaseController";
import { authMiddleware, requireStaffPermission } from "../middelware/middelware";
import { StaffPermission } from "@prisma/client";
import { auditSuccessfulCompanyMutation } from "../middelware/companyAuditMiddleware";

const router = express.Router();

router.use((req, res, next) => {
  authMiddleware(req, res, next, ["COMPANY"]);
});
router.use(requireStaffPermission(StaffPermission.COMPANY_MANAGE_OPERATIONS));
router.use(auditSuccessfulCompanyMutation);

router.post("/", createCompanyPurchase);
router.get("/", getCompanyPurchases);
router.get("/aggregated", getCompanyPurchasesAggregated);
router.get("/:id", getCompanyPurchaseById);

export default router;
