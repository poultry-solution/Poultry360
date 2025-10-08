import { Request, Response } from "express";
import { mortalityNotificationService } from "../services/mortalityNotificationService";
import prisma from "../utils/prisma";

/**
 * Check mortality thresholds for a specific batch
 */
export const checkBatchMortalityThresholds = async (req: Request, res: Response) => {
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

    const result = await mortalityNotificationService.checkBatchMortalityThresholds(batchId);

    res.json({
      success: true,
      data: result,
      message: `Mortality check completed. ${result.notificationsSent} notifications sent.`,
    });
  } catch (error: any) {
    console.error("Error checking mortality thresholds:", error);
    res.status(500).json({ error: "Failed to check mortality thresholds" });
  }
};

/**
 * Check mortality thresholds for all active batches (admin/system endpoint)
 */
export const checkAllActiveBatches = async (req: Request, res: Response) => {
  try {
    const result = await mortalityNotificationService.checkAllActiveBatches();

    res.json({
      success: true,
      data: result,
      message: `Checked ${result.batchesChecked} batches. ${result.totalNotificationsSent} notifications sent for ${result.batchesWithAlerts} batches with alerts.`,
    });
  } catch (error: any) {
    console.error("Error checking all active batches:", error);
    res.status(500).json({ error: "Failed to check all active batches" });
  }
};

/**
 * Get mortality statistics for a batch
 */
export const getBatchMortalityStats = async (req: Request, res: Response) => {
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

    const stats = await mortalityNotificationService.getBatchMortalityStats(batchId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error("Error getting batch mortality stats:", error);
    res.status(500).json({ error: "Failed to get batch mortality statistics" });
  }
};

/**
 * Test mortality notification for a specific batch (for testing purposes)
 */
export const testMortalityNotification = async (req: Request, res: Response) => {
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
      title: "🧪 Test Mortality Alert",
      body: `This is a test mortality notification for batch ${batch.batchNumber}`,
      type: NotificationType.MORTALITY_ALERT,
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
    console.error("Error sending test mortality notification:", error);
    res.status(500).json({ error: "Failed to send test notification" });
  }
};
