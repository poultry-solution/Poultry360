import express from "express";
import {
  createProductionRun,
  getProductionRuns,
  getProductionRunById,
} from "../controller/companyProductionController";
import { authMiddleware, requireStaffPermission } from "../middelware/middelware";
import { StaffPermission } from "@prisma/client";
import { auditSuccessfulCompanyMutation } from "../middelware/companyAuditMiddleware";

const router = express.Router();

router.use((req, res, next) => {
  authMiddleware(req, res, next, ["COMPANY"]);
});
router.use(requireStaffPermission(StaffPermission.COMPANY_MANAGE_OPERATIONS));
router.use(auditSuccessfulCompanyMutation);

router.post("/", createProductionRun);
router.get("/", getProductionRuns);
router.get("/:id", getProductionRunById);

export default router;
