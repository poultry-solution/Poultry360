import express from "express";
import {
  getAllReminders,
  getReminderById,
  createReminder,
  updateReminder,
  deleteReminder,
  markReminderCompleted,
  getUpcomingReminders,
  getOverdueReminders,
  getReminderStatistics,
} from "../controller/remainderController";
import { authMiddleware } from "../middelware/middelware";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// ==================== REMINDER ROUTES ====================

// GET /api/reminders - Get all reminders with filters
router.get("/", getAllReminders);

// GET /api/reminders/upcoming - Get upcoming reminders
router.get("/upcoming", getUpcomingReminders);

// GET /api/reminders/overdue - Get overdue reminders
router.get("/overdue", getOverdueReminders);

// GET /api/reminders/statistics - Get reminder statistics
router.get("/statistics", getReminderStatistics);

// GET /api/reminders/:id - Get reminder by ID
router.get("/:id", getReminderById);

// POST /api/reminders - Create new reminder
router.post("/", createReminder);

// PUT /api/reminders/:id - Update reminder
router.put("/:id", updateReminder);

// PATCH /api/reminders/:id/complete - Mark reminder as completed
router.patch("/:id/complete", markReminderCompleted);

// DELETE /api/reminders/:id - Delete reminder
router.delete("/:id", deleteReminder);

export default router;
