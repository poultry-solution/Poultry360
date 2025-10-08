import { Router } from "express";
import { authMiddleware } from "../middelware/middelware";
import {
  subscribeToPush,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadCount,
  updateNotificationSettings,
  sendTestNotification,
} from "../controller/notificationController";

const router = Router();

// All notification routes require authentication
router.use(authMiddleware);

// Push subscription management
router.post("/subscribe", subscribeToPush);

// Notification retrieval
router.get("/", getUserNotifications);
router.get("/unread-count", getUnreadCount);

// Notification actions
router.patch("/:id/read", markNotificationAsRead);
router.patch("/mark-all-read", markAllNotificationsAsRead);

// Settings
router.patch("/settings", updateNotificationSettings);

// Development/testing
router.post("/test", sendTestNotification);

export default router;
