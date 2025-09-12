import express from "express";
import {
  getAllExpenses,
  getExpenseById,
  getBatchExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseStatistics,
  getExpenseCategories,
  createExpenseCategory,
} from "../controller/expenseController";
import { authMiddleware } from "../middelware/middelware";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// ==================== EXPENSE ROUTES ====================
// GET /api/expenses - Get all expenses with filtering
router.get("/", getAllExpenses);

// GET /api/expenses/categories - Get expense categories
router.get("/categories", getExpenseCategories);

// POST /api/expenses/categories - Create expense category
router.post("/categories", createExpenseCategory);

// GET /api/expenses/statistics - Get expense statistics
router.get("/statistics", getExpenseStatistics);

// GET /api/expenses/batch/:batchId - Get expenses for a specific batch
router.get("/batch/:batchId", getBatchExpenses);

// GET /api/expenses/:id - Get expense by ID
router.get("/:id", getExpenseById);

// POST /api/expenses - Create new expense
router.post("/", createExpense);

// PUT /api/expenses/:id - Update expense
router.put("/:id", updateExpense);

// DELETE /api/expenses/:id - Delete expense
router.delete("/:id", deleteExpense);

export default router;
