import { Request, Response } from "express";
import { feedNotificationService } from "../services/feedNotificationService";
import prisma from "../utils/prisma";

/**
 * Check feed consumption patterns for a specific batch
 */
export const checkBatchFeedConsumption = async (req: Request, res: Response) => {
  try {
    const { batchId } = req.params;
    const userId = req.userId;

    // Verify user has access to the batch
    const batch = await prisma.batch.findFirst({
      where: {
        id: batchId,
        farm: {
          OR: [
            { ownerId: userId },
            { managers: { some: { id: userId } } },
          ],
        },
      },
    });

    if (!batch) {
      return res.status(404).json({ error: "Batch not found or access denied" });
    }

    const result = await feedNotificationService.checkBatchFeedConsumption(batchId);

    res.json({
      success: true,
      data: result,
      message: `Feed consumption check completed. ${result.notificationsSent} notifications sent.`,
    });
  } catch (error: any) {
    console.error("Error checking feed consumption:", error);
    res.status(500).json({ error: "Failed to check feed consumption" });
  }
};

/**
 * Check feed consumption for all active batches (admin/system endpoint)
 */
export const checkAllActiveBatches = async (req: Request, res: Response) => {
  try {
    const result = await feedNotificationService.checkAllActiveBatches();

    res.json({
      success: true,
      data: result,
      message: `Checked ${result.batchesChecked} batches. ${result.totalNotificationsSent} notifications sent for ${result.batchesWithAlerts} batches with alerts.`,
    });
  } catch (error: any) {
    console.error("Error checking all active batches for feed consumption:", error);
    res.status(500).json({ error: "Failed to check all active batches" });
  }
};

/**
 * Get feed consumption statistics for a batch
 */
export const getBatchFeedStats = async (req: Request, res: Response) => {
  try {
    const { batchId } = req.params;
    const userId = req.userId;

    // Verify user has access to the batch
    const batch = await prisma.batch.findFirst({
      where: {
        id: batchId,
        farm: {
          OR: [
            { ownerId: userId },
            { managers: { some: { id: userId } } },
          ],
        },
      },
    });

    if (!batch) {
      return res.status(404).json({ error: "Batch not found or access denied" });
    }

    const stats = await feedNotificationService.getBatchFeedStats(batchId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error("Error getting batch feed stats:", error);
    res.status(500).json({ error: "Failed to get batch feed statistics" });
  }
};

/**
 * Test feed consumption notification for a specific batch (for testing purposes)
 */
export const testFeedNotification = async (req: Request, res: Response) => {
  try {
    const { batchId } = req.params;
    const userId = req.userId;

    // Verify user has access to the batch
    const batch = await prisma.batch.findFirst({
      where: {
        id: batchId,
        farm: {
          OR: [
            { ownerId: userId },
            { managers: { some: { id: userId } } },
          ],
        },
      },
    });

    if (!batch) {
      return res.status(404).json({ error: "Batch not found or access denied" });
    }

    // Send a test notification to the current user
    const { notificationService, NotificationType } = await import("../services/webpushService");
    
    const result = await notificationService.sendNotification(userId as string, {
      title: "🧪 Test Feed Consumption Alert",
      body: `This is a test feed consumption notification for batch ${batch.batchNumber}`,
      type: NotificationType.FEED_WARNING,
      data: {
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        test: true,
        url: `/dashboard/batches/${batch.id}`,
      },
    });

    res.json({
      success: result.success,
      data: result,
      message: result.success ? "Test notification sent successfully" : "Failed to send test notification",
    });
  } catch (error: any) {
    console.error("Error sending test feed notification:", error);
    res.status(500).json({ error: "Failed to send test notification" });
  }
};
