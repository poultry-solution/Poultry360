import express from "express";
import { authMiddleware, requireStaffPermission } from "../middelware/middelware";
import { StaffPermission, UserRole } from "@prisma/client";
import { auditSuccessfulHatcheryMutation } from "../middelware/hatcheryAuditMiddleware";
import {
  listHatcheryBatches,
  createHatcheryBatch,
  getHatcheryBatch,
  updateHatcheryBatch,
  deleteHatcheryBatch,
  closeHatcheryBatch,
  reopenHatcheryBatch,
  listHatcheryMortalities,
  addHatcheryMortality,
  deleteHatcheryMortality,
  listHatcheryExpenses,
  addHatcheryExpense,
  deleteHatcheryExpense,
  listEggProductions,
  addEggProduction,
  deleteEggProduction,
  getEggInventory,
  listEggSales,
  addEggSale,
  deleteEggSale,
  listParentSales,
  addParentSale,
  deleteParentSale,
} from "../controller/hatcheryBatchController";
import {
  listHatcheryBatchNotes,
  createHatcheryBatchNote,
  updateHatcheryBatchNote,
  deleteHatcheryBatchNote,
} from "../controller/hatcheryNoteController";

const router = express.Router();

router.use((req, res, next) => {
  authMiddleware(req, res, next, [UserRole.HATCHERY] as any);
});
router.use(requireStaffPermission(StaffPermission.HATCHERY_MANAGE_OPERATIONS));
router.use(auditSuccessfulHatcheryMutation);

// Batches
router.get("/", listHatcheryBatches);
router.post("/", createHatcheryBatch);
router.get("/egg-inventory", getEggInventory);
router.get("/:id", getHatcheryBatch);
router.put("/:id", updateHatcheryBatch);
router.delete("/:id", deleteHatcheryBatch);
router.post("/:id/close", closeHatcheryBatch);
router.post("/:id/reopen", reopenHatcheryBatch);

// Notes (owner and staff; only the writer or the owner can change one)
router.get("/:id/notes", listHatcheryBatchNotes);
router.post("/:id/notes", createHatcheryBatchNote);
router.put("/:id/notes/:noteId", updateHatcheryBatchNote);
router.delete("/:id/notes/:noteId", deleteHatcheryBatchNote);

// Mortality
router.get("/:id/mortalities", listHatcheryMortalities);
router.post("/:id/mortalities", addHatcheryMortality);
router.delete("/:id/mortalities/:mortalityId", deleteHatcheryMortality);

// Expenses
router.get("/:id/expenses", listHatcheryExpenses);
router.post("/:id/expenses", addHatcheryExpense);
router.delete("/:id/expenses/:expenseId", deleteHatcheryExpense);

// Egg production
router.get("/:id/egg-productions", listEggProductions);
router.post("/:id/egg-productions", addEggProduction);
router.delete("/:id/egg-productions/:productionId", deleteEggProduction);

// Egg sales
router.get("/:id/egg-sales", listEggSales);
router.post("/:id/egg-sales", addEggSale);
router.delete("/:id/egg-sales/:saleId", deleteEggSale);

// Parent sales
router.get("/:id/parent-sales", listParentSales);
router.post("/:id/parent-sales", addParentSale);
router.delete("/:id/parent-sales/:saleId", deleteParentSale);

export default router;
