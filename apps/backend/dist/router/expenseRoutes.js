"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const expenseController_1 = require("../controller/expenseController");
const middelware_1 = require("../middelware/middelware");
const router = express_1.default.Router();
// Apply authentication middleware to all routes
router.use(middelware_1.authMiddleware);
// ==================== EXPENSE ROUTES ====================
// GET /api/expenses - Get all expenses with filtering
router.get("/", expenseController_1.getAllExpenses);
// GET /api/expenses/categories - Get expense categories
router.get("/categories", expenseController_1.getExpenseCategories);
// POST /api/expenses/categories - Create expense category
router.post("/categories", expenseController_1.createExpenseCategory);
// GET /api/expenses/statistics - Get expense statistics
router.get("/statistics", expenseController_1.getExpenseStatistics);
// GET /api/expenses/batch/:batchId - Get expenses for a specific batch
router.get("/batch/:batchId", expenseController_1.getBatchExpenses);
// GET /api/expenses/:id - Get expense by ID
router.get("/:id", expenseController_1.getExpenseById);
// POST /api/expenses - Create new expense
router.post("/", expenseController_1.createExpense);
// PUT /api/expenses/:id - Update expense
router.put("/:id", expenseController_1.updateExpense);
// DELETE /api/expenses/:id - Delete expense
router.delete("/:id", expenseController_1.deleteExpense);
exports.default = router;
