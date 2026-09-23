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
// Notifications belong to a User account. Login-capable staff do not yet have
// an independent notification inbox, so never expose or modify the owner's.
router.use((req, res, next) => {
  if (req.actorType === "STAFF") {
    return res.status(403).json({
      code: "STAFF_NOTIFICATIONS_UNAVAILABLE",
      message: "Notifications are only available to the account owner.",
    });
  }
  return next();
});

router.get("/", getNotifications);
router.get("/unread-count", getNotificationUnreadCount);
router.post("/:id/read", markNotificationRead);
router.post("/read-all", markAllNotificationsRead);

export default router;
