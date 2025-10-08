import { Request, Response } from "express";
import { inventoryNotificationService } from "../services/inventoryNotificationService";
import prisma from "../utils/prisma";

/**
 * Check inventory levels for a specific user
 */
export const checkUserInventoryLevels = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.userId;

    // Verify user has access (users can only check their own inventory)
    if (userId !== currentUserId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const result = await inventoryNotificationService.checkUserInventoryLevels(userId);

    res.json({
      success: true,
      data: result,
      message: `Inventory level check completed. ${result.notificationsSent} notifications sent.`,
    });
  } catch (error: any) {
    console.error("Error checking inventory levels:", error);
    res.status(500).json({ error: "Failed to check inventory levels" });
  }
};

/**
 * Check inventory levels for all users (admin/system endpoint)
 */
export const checkAllUsers = async (req: Request, res: Response) => {
  try {
    const result = await inventoryNotificationService.checkAllUsers();

    res.json({
      success: true,
      data: result,
      message: `Checked ${result.usersChecked} users. ${result.totalNotificationsSent} notifications sent for ${result.usersWithAlerts} users with alerts.`,
    });
  } catch (error: any) {
    console.error("Error checking all users for inventory levels:", error);
    res.status(500).json({ error: "Failed to check all users" });
  }
};

/**
 * Get inventory statistics for a user
 */
export const getUserInventoryStats = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.userId;

    // Verify user has access (users can only check their own inventory)
    if (userId !== currentUserId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const stats = await inventoryNotificationService.getUserInventoryStats(userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error("Error getting user inventory stats:", error);
    res.status(500).json({ error: "Failed to get inventory statistics" });
  }
};

/**
 * Test inventory notification for a specific user (for testing purposes)
 */
export const testInventoryNotification = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.userId;

    // Verify user has access (users can only test their own notifications)
    if (userId !== currentUserId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Send a test notification to the current user
    const { notificationService, NotificationType } = await import("../services/webpushService");
    
    const result = await notificationService.sendNotification(userId as string, {
      title: "🧪 Test Inventory Alert",
      body: "This is a test inventory notification for low stock warnings",
      type: NotificationType.LOW_INVENTORY,
      data: {
        userId: userId,
        test: true,
        url: `/dashboard/inventory`,
      },
    });

    res.json({
      success: result.success,
      data: result,
      message: result.success ? "Test notification sent successfully" : "Failed to send test notification",
    });
  } catch (error: any) {
    console.error("Error sending test inventory notification:", error);
    res.status(500).json({ error: "Failed to send test notification" });
  }
};
