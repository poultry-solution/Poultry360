import { Router } from "express";
import {
  getMortalityById,
  getBatchMortalities,
  createMortality,
  updateMortality,
  deleteMortality,
} from "../controller/mortalityController";
import { authMiddleware, requireStaffPermission } from "../middelware/middelware";
import { StaffPermission } from "@prisma/client";
import { auditSuccessfulFarmerMutation } from "../middelware/farmerAuditMiddleware";

const router = Router();

// All routes require authentication
router.use(authMiddleware);
router.use(requireStaffPermission(StaffPermission.FARMER_MANAGE_OPERATIONS));
router.use(auditSuccessfulFarmerMutation);

// Batch-specific mortalities
router.get("/batch/:batchId", getBatchMortalities);

// CRUD routes
router.get("/:id", getMortalityById);
router.post("/", createMortality);
router.put("/:id", updateMortality);
router.delete("/:id", deleteMortality);

export default router;
