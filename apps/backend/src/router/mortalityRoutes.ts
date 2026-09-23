import { Router } from "express";
import {
  getAllMortalities,
  getMortalityById,
  getBatchMortalities,
  createMortality,
  updateMortality,
  deleteMortality,
  getMortalityStatistics,
} from "../controller/mortalityController";
import { authMiddleware, requireStaffPermission } from "../middelware/middelware";
import { StaffPermission } from "@prisma/client";
import { auditSuccessfulFarmerMutation } from "../middelware/farmerAuditMiddleware";

const router = Router();

// All routes require authentication
router.use(authMiddleware);
router.use(requireStaffPermission(StaffPermission.FARMER_MANAGE_OPERATIONS));
router.use(auditSuccessfulFarmerMutation);

// Statistics route (before /:id to avoid conflicts)
router.get("/statistics", getMortalityStatistics);

// Batch-specific mortalities
router.get("/batch/:batchId", getBatchMortalities);

// CRUD routes
router.get("/", getAllMortalities);
router.get("/:id", getMortalityById);
router.post("/", createMortality);
router.put("/:id", updateMortality);
router.delete("/:id", deleteMortality);

export default router;
