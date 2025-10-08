import { Router } from 'express';
import { authMiddleware } from '../middelware/middelware';
import {
  handleNotificationAction,
  getNotificationActionStatus
} from '../controller/notificationActionController';

const router = Router();

// All notification action routes require authentication
router.use(authMiddleware);

// Handle notification action clicks (for reminder acknowledgments)
router.post('/action', handleNotificationAction);

// Get notification action status (for debugging)
router.get('/status', getNotificationActionStatus);

export default router;
