import { Request, Response } from "express";
import {
  notificationService,
  NotificationType,
} from "../services/webpushService";
import prisma from "../utils/prisma";

/**
 * Subscribe to push notifications
 */
export const subscribeToPush = async (req: Request, res: Response) => {
  try {
    const { subscription } = req.body;
    const userId = req.userId;

    console.log("Received push subscription request from user:", userId);
    console.log("Subscription data:", subscription ? "Present" : "Missing");

    if (!subscription) {
      return res.status(400).json({ error: "Push subscription is required" });
    }

    // Update user's push subscription
    await prisma.user.update({
      where: { id: userId },
      data: { pushSubscription: subscription },
    });

    console.log("Push subscription saved successfully for user:", userId);
    res.json({
      success: true,
      message: "Push subscription saved successfully",
    });
  } catch (error: any) {
    console.error("Failed to save push subscription:", error);
    res.status(500).json({ error: "Failed to save push subscription" });
  }
};

/**
 * Get user's notifications
 */
export const getUserNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    const result = await notificationService.getUserNotifications(
      userId as string,
      Number(page),
      Number(limit),
      unreadOnly === "true"
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Failed to get notifications:", error);
    res.status(500).json({ error: "Failed to get notifications" });
  }
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const success = await notificationService.markAsRead(id, userId as string);

    if (success) {
      res.json({ success: true, message: "Notification marked as read" });
    } else {
      res.status(404).json({ error: "Notification not found" });
    }
  } catch (error: any) {
    console.error("Failed to mark notification as read:", error);
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.userId;

    const count = await notificationService.markAllAsRead(userId as string);

    res.json({
      success: true,
      message: `${count} notifications marked as read`,
      count,
    });
  } catch (error: any) {
    console.error("Failed to mark all notifications as read:", error);
    res.status(500).json({ error: "Failed to mark all notifications as read" });
  }
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    const count = await notificationService.getUnreadCount(userId as string);

    res.json({
      success: true,
      count,
    });
  } catch (error: any) {
    console.error("Failed to get unread count:", error);
    res.status(500).json({ error: "Failed to get unread count" });
  }
};

/**
 * Update notification settings
 */
export const updateNotificationSettings = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.userId;
    const { notificationEnabled, notificationSettings } = req.body;

    const updateData: any = {};
    if (notificationEnabled !== undefined) {
      updateData.notificationEnabled = notificationEnabled;
    }
    if (notificationSettings !== undefined) {
      updateData.notificationSettings = notificationSettings;
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    res.json({
      success: true,
      message: "Notification settings updated successfully",
    });
  } catch (error: any) {
    console.error("Failed to update notification settings:", error);
    res.status(500).json({ error: "Failed to update notification settings" });
  }
};

/**
 * Test notification endpoint (for development)
 */
export const sendTestNotification = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { title, body, type = "SYSTEM" } = req.body;

    const result = await notificationService.sendNotification(
      userId as string,
      {
        title: title || "Test Notification",
        body: body || "This is a test notification from Poultry360",
        type: type as NotificationType,
        data: { test: true, timestamp: new Date().toISOString() },
      }
    );

    if (result.success) {
      res.json({
        success: true,
        message: "Test notification sent successfully",
        notificationId: result.notificationId,
      });
    } else {
      res.status(400).json({
        error: result.error || "Failed to send test notification",
      });
    }
  } catch (error: any) {
    console.error("Failed to send test notification:", error);
    res.status(500).json({ error: "Failed to send test notification" });
  }
};
