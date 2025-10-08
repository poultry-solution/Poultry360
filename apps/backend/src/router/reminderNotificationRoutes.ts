import { Router } from 'express';
import { authMiddleware } from '../middelware/middelware';
import {
  sendTestReminderNotification,
  triggerAllDueReminders,
  getDueReminders,
  triggerSpecificReminder,
  getDueReminderStats,
  triggerUserReminders,
  getCronStatus,
  triggerCronNow
} from '../controller/reminderNotificationController';

const router = Router();

// All reminder notification routes require authentication
router.use(authMiddleware);

// Test and manual trigger routes
router.post('/test', sendTestReminderNotification);
router.post('/trigger-all', triggerAllDueReminders);
router.post('/trigger-user', triggerUserReminders);
router.post('/trigger/:id', triggerSpecificReminder);

// Information routes
router.get('/due', getDueReminders);
router.get('/stats', getDueReminderStats);
router.get('/cron-status', getCronStatus);

// Debug routes
router.post('/trigger-cron', triggerCronNow);

export default router;
