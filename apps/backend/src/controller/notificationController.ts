import { Request, Response } from "express";
import {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from "../services/notificationService";

export const getNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }

    const status = req.query.status as "UNREAD" | "READ" | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await listNotifications(userId, { status, limit, offset });
    res.json({ success: true, data: result.items, total: result.total });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getNotificationUnreadCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }

    const count = await getUnreadCount(userId);
    res.json({ success: true, data: { count } });
  } catch (error) {
    console.error("Get unread count error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const markNotificationRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }

    const { id } = req.params;
    await markAsRead(id, userId);
    res.json({ success: true });
  } catch (error) {
    console.error("Mark notification read error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const markAllNotificationsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }

    await markAllAsRead(userId);
    res.json({ success: true });
  } catch (error) {
    console.error("Mark all read error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
