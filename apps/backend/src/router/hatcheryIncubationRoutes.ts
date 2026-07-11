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
  listProducedChickStock,
  getHatchableStockForBatch,
} from "../controller/hatcheryIncubationController";

const router = express.Router();

/** Per-route only: this router is mounted at `/`, so a blanket `router.use` would block /notifications, /push, etc. */
const requireHatchery: express.RequestHandler = (req, res, next) => {
  void authMiddleware(req, res, next, [UserRole.HATCHERY] as any);
};

// Incubation batches
router.get("/hatchery/incubations", requireHatchery, listIncubationBatches);
router.post("/hatchery/incubations", requireHatchery, createIncubationBatch);
router.get("/hatchery/incubations/:id", requireHatchery, getIncubationBatch);

// Stage transitions
router.post("/hatchery/incubations/:id/candling", requireHatchery, recordCandling);
router.post("/hatchery/incubations/:id/transfer", requireHatchery, transferToHatcher);

// Losses
router.get("/hatchery/incubations/:id/losses", requireHatchery, listIncubationLosses);

// Hatch results
router.get("/hatchery/incubations/:id/hatch-results", requireHatchery, listHatchResults);
router.post("/hatchery/incubations/:id/hatch-results", requireHatchery, addHatchResult);
router.delete(
  "/hatchery/incubations/:id/hatch-results/:hatchResultId",
  requireHatchery,
  deleteHatchResult
);

// Chick sales
router.get("/hatchery/incubations/:id/chick-sales", requireHatchery, listChickSales);
router.post("/hatchery/incubations/:id/chick-sales", requireHatchery, addChickSale);
router.delete("/hatchery/incubations/:id/chick-sales/:saleId", requireHatchery, deleteChickSale);

// Produced chick stock (global/filterable view)
router.get("/hatchery/produced-chicks/stock", requireHatchery, listProducedChickStock);

// Helper: hatchable egg stock preview for a parent batch
router.get("/hatchery/parent-batches/:batchId/hatchable-stock", requireHatchery, getHatchableStockForBatch);

export default router;
