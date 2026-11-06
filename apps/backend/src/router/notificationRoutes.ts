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
// Each person has their own inbox: the owner sees rows with no staffUserId,
// a staff login sees only rows addressed to that staff login.
router.get("/", getNotifications);
router.get("/unread-count", getNotificationUnreadCount);
router.post("/:id/read", markNotificationRead);
router.post("/read-all", markAllNotificationsRead);

export default router;
