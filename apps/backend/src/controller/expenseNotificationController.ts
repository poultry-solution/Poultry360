import { Request, Response } from "express";
import { expenseNotificationService } from "../services/expenseNotificationService";
import prisma from "../utils/prisma";

/**
 * Check expense patterns for a specific farm
 */
export const checkFarmExpensePatterns = async (req: Request, res: Response) => {
  try {
    const { farmId } = req.params;
    const userId = req.userId;

    // Verify user has access to the farm
    const farm = await prisma.farm.findFirst({
      where: {
        id: farmId,
        OR: [
          { ownerId: userId },
          { managers: { some: { id: userId } } },
        ],
      },
    });

    if (!farm) {
      return res.status(404).json({ error: "Farm not found or access denied" });
    }

    const result = await expenseNotificationService.checkFarmExpensePatterns(farmId);

    res.json({
      success: true,
      data: result,
      message: `Expense pattern check completed. ${result.notificationsSent} notifications sent.`,
    });
  } catch (error: any) {
    console.error("Error checking expense patterns:", error);
    res.status(500).json({ error: "Failed to check expense patterns" });
  }
};

/**
 * Check expense patterns for all farms (admin/system endpoint)
 */
export const checkAllFarms = async (req: Request, res: Response) => {
  try {
    const result = await expenseNotificationService.checkAllFarms();

    res.json({
      success: true,
      data: result,
      message: `Checked ${result.farmsChecked} farms. ${result.totalNotificationsSent} notifications sent for ${result.farmsWithAlerts} farms with alerts.`,
    });
  } catch (error: any) {
    console.error("Error checking all farms for expense patterns:", error);
    res.status(500).json({ error: "Failed to check all farms" });
  }
};

/**
 * Get expense statistics for a farm
 */
export const getFarmExpenseStats = async (req: Request, res: Response) => {
  try {
    const { farmId } = req.params;
    const userId = req.userId;

    // Verify user has access to the farm
    const farm = await prisma.farm.findFirst({
      where: {
        id: farmId,
        OR: [
          { ownerId: userId },
          { managers: { some: { id: userId } } },
        ],
      },
    });

    if (!farm) {
      return res.status(404).json({ error: "Farm not found or access denied" });
    }

    const stats = await expenseNotificationService.getFarmExpenseStats(farmId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error("Error getting farm expense stats:", error);
    res.status(500).json({ error: "Failed to get farm expense statistics" });
  }
};

/**
 * Test expense notification for a specific farm (for testing purposes)
 */
export const testExpenseNotification = async (req: Request, res: Response) => {
  try {
    const { farmId } = req.params;
    const userId = req.userId;

    // Verify user has access to the farm
    const farm = await prisma.farm.findFirst({
      where: {
        id: farmId,
        OR: [
          { ownerId: userId },
          { managers: { some: { id: userId } } },
        ],
      },
    });

    if (!farm) {
      return res.status(404).json({ error: "Farm not found or access denied" });
    }

    // Send a test notification to the current user
    const { notificationService, NotificationType } = await import("../services/webpushService");
    
    const result = await notificationService.sendNotification(userId as string, {
      title: "🧪 Test Expense Alert",
      body: `This is a test expense notification for farm ${farm.name}`,
      type: NotificationType.EXPENSE_WARNING,
      data: {
        farmId: farm.id,
        farmName: farm.name,
        test: true,
        url: `/dashboard/expenses`,
      },
    });

    res.json({
      success: result.success,
      data: result,
      message: result.success ? "Test notification sent successfully" : "Failed to send test notification",
    });
  } catch (error: any) {
    console.error("Error sending test expense notification:", error);
    res.status(500).json({ error: "Failed to send test notification" });
  }
};
