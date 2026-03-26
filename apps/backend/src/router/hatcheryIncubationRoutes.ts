import express from "express";
import { authMiddleware } from "../middelware/middelware";
import { UserRole } from "@prisma/client";
import {
  listIncubationBatches,
  createIncubationBatch,
  getIncubationBatch,
  recordCandling,
  transferToHatcher,
  listHatchResults,
  addHatchResult,
  deleteHatchResult,
  listIncubationLosses,
  listChickSales,
  addChickSale,
  deleteChickSale,
  getHatchableStockForBatch,
} from "../controller/hatcheryIncubationController";

const router = express.Router();

router.use((req, res, next) => {
  authMiddleware(req, res, next, [UserRole.HATCHERY] as any);
});

// Incubation batches
router.get("/hatchery/incubations", listIncubationBatches);
router.post("/hatchery/incubations", createIncubationBatch);
router.get("/hatchery/incubations/:id", getIncubationBatch);

// Stage transitions
router.post("/hatchery/incubations/:id/candling", recordCandling);
router.post("/hatchery/incubations/:id/transfer", transferToHatcher);

// Losses
router.get("/hatchery/incubations/:id/losses", listIncubationLosses);

// Hatch results
router.get("/hatchery/incubations/:id/hatch-results", listHatchResults);
router.post("/hatchery/incubations/:id/hatch-results", addHatchResult);
router.delete("/hatchery/incubations/:id/hatch-results/:hatchResultId", deleteHatchResult);

// Chick sales
router.get("/hatchery/incubations/:id/chick-sales", listChickSales);
router.post("/hatchery/incubations/:id/chick-sales", addChickSale);
router.delete("/hatchery/incubations/:id/chick-sales/:saleId", deleteChickSale);

// Helper: hatchable egg stock preview for a parent batch
router.get("/hatchery/parent-batches/:batchId/hatchable-stock", getHatchableStockForBatch);

export default router;
