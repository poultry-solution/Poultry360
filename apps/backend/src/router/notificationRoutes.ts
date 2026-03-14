import express from "express";
import { authMiddleware } from "../middelware/middelware";
import {
  getNotifications,
  getNotificationUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "../controller/notificationController";

const router = express.Router();
router.use(authMiddleware);

router.get("/", getNotifications);
router.get("/unread-count", getNotificationUnreadCount);
router.post("/:id/read", markNotificationRead);
router.post("/read-all", markAllNotificationsRead);

export default router;
