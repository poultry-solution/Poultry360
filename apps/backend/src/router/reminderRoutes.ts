import { Router } from 'express';
import { authMiddleware } from '../middelware/middelware';
import {
  getUserReminders,
  createReminder,
  createDayOfWeekReminder,
  updateReminder,
  deleteReminder,
  getReminderById,
  getReminderStats,
  markReminderAsNotDone,
  getRemindersNeedingAcknowledgment,
  markReminderAsCompleted,
  cleanupDuplicateReminders
} from '../controller/reminderController';

const router = Router();

// All reminder routes require authentication
router.use(authMiddleware);

// Basic CRUD routes
router.get('/', getUserReminders);
router.get('/stats', getReminderStats);
router.get('/needing-acknowledgment', getRemindersNeedingAcknowledgment);
router.post('/cleanup-duplicates', cleanupDuplicateReminders);
router.post('/', createReminder);
router.put('/:id', updateReminder);
router.delete('/:id', deleteReminder);
router.get('/:id', getReminderById);

// Reminder acknowledgment routes
router.post('/:id/mark-completed', markReminderAsCompleted);
router.post('/:id/mark-not-done', markReminderAsNotDone);

// Custom reminder creation routes
router.post('/day-of-week', createDayOfWeekReminder);

export default router;
