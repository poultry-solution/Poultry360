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
import { authMiddleware } from "../middelware/middelware";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

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

