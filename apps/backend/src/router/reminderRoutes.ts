import { Router } from 'express';
import { authMiddleware } from '../middelware/middelware';
import {
  getUserReminders,
  createReminder,
  createCustomTimeReminder,
  createCustomIntervalReminder,
  createDayOfWeekReminder,
  updateReminder,
  deleteReminder,
  getReminderById,
  getReminderStats,
  markReminderAsNotDone,
  getRemindersNeedingAcknowledgment,
  markReminderAsCompleted
} from '../controller/reminderController';

const router = Router();

// All reminder routes require authentication
router.use(authMiddleware);

// Basic CRUD routes
router.get('/', getUserReminders);
router.get('/stats', getReminderStats);
router.get('/needing-acknowledgment', getRemindersNeedingAcknowledgment);
router.post('/', createReminder);
router.put('/:id', updateReminder);
router.delete('/:id', deleteReminder);
router.get('/:id', getReminderById);

// Reminder acknowledgment routes
router.post('/:id/mark-completed', markReminderAsCompleted);
router.post('/:id/mark-not-done', markReminderAsNotDone);

// Custom reminder creation routes
router.post('/custom-time', createCustomTimeReminder);
router.post('/custom-interval', createCustomIntervalReminder);
router.post('/day-of-week', createDayOfWeekReminder);

export default router;
