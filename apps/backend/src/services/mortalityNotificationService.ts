import { notificationService, NotificationType } from './webpushService';
import prisma from '../utils/prisma';

export interface MortalityThresholdConfig {
  warningThreshold: number; // Percentage (e.g., 5 for 5%)
  criticalThreshold: number; // Percentage (e.g., 10 for 10%)
  checkInterval: number; // Hours between checks
}

export class MortalityNotificationService {
  private static readonly DEFAULT_CONFIG: MortalityThresholdConfig = {
    warningThreshold: 5, // 5% mortality rate
    criticalThreshold: 10, // 10% mortality rate
    checkInterval: 24, // Check every 24 hours
  };

  /**
   * Check mortality thresholds for a specific batch and send notifications if needed
   */
  async checkBatchMortalityThresholds(batchId: string): Promise<{
    checked: boolean;
    notificationsSent: number;
    mortalityRate: number;
    thresholdExceeded: 'none' | 'warning' | 'critical';
  }> {
    try {
      // Get batch with farm and mortalities
      const batch = await prisma.batch.findUnique({
        where: { id: batchId },
        include: {
          farm: {
            include: {
              owner: true,
              managers: true,
            },
          },
          mortalities: {
            where: {
              reason: {
                not: 'SLAUGHTERED_FOR_SALE', // Exclude sales from mortality rate calculation
              },
            },
          },
        },
      });

      if (!batch) {
        throw new Error(`Batch ${batchId} not found`);
      }

      // Calculate mortality rate
      const totalNaturalMortality = batch.mortalities.reduce((sum, m) => sum + m.count, 0);
      const mortalityRate = (totalNaturalMortality / batch.initialChicks) * 100;

      console.log(`Batch ${batch.batchNumber}: Mortality rate ${mortalityRate.toFixed(2)}% (${totalNaturalMortality}/${batch.initialChicks})`);

      // Determine threshold level
      let thresholdExceeded: 'none' | 'warning' | 'critical' = 'none';
      if (mortalityRate >= MortalityNotificationService.DEFAULT_CONFIG.criticalThreshold) {
        thresholdExceeded = 'critical';
      } else if (mortalityRate >= MortalityNotificationService.DEFAULT_CONFIG.warningThreshold) {
        thresholdExceeded = 'warning';
      }

      if (thresholdExceeded === 'none') {
        return {
          checked: true,
          notificationsSent: 0,
          mortalityRate,
          thresholdExceeded: 'none',
        };
      }

      // Get recipients (farm owner and managers)
      const recipients = [
        batch.farm.owner,
        ...batch.farm.managers,
      ];

      let notificationsSent = 0;

      // Send notifications to all recipients
      for (const recipient of recipients) {
        if (!recipient.notificationEnabled) {
          console.log(`Skipping notification for user ${recipient.name} - notifications disabled`);
          continue;
        }

        const notificationType = thresholdExceeded === 'critical'
          ? NotificationType.MORTALITY_ALERT
          : NotificationType.MORTALITY_ALERT;

        const title = thresholdExceeded === 'critical'
          ? `🚨 Critical Mortality Alert - Batch ${batch.batchNumber}`
          : `⚠️ High Mortality Warning - Batch ${batch.batchNumber}`;

        const body = thresholdExceeded === 'critical'
          ? `Mortality rate has reached ${mortalityRate.toFixed(2)}% (${totalNaturalMortality} deaths). Immediate attention required!`
          : `Mortality rate is ${mortalityRate.toFixed(2)}% (${totalNaturalMortality} deaths). Monitor closely.`;

        const result = await notificationService.sendNotification(recipient.id, {
          title,
          body,
          type: notificationType,
          data: {
            batchId: batch.id,
            batchNumber: batch.batchNumber,
            farmId: batch.farmId,
            farmName: batch.farm.name,
            mortalityRate,
            totalMortality: totalNaturalMortality,
            initialChicks: batch.initialChicks,
            threshold: thresholdExceeded,
            url: `/dashboard/batches/${batch.id}`,
          },
        });

        if (result.success) {
          notificationsSent++;
          console.log(`Mortality notification sent to ${recipient.name} for batch ${batch.batchNumber}`);
        } else {
          console.error(`Failed to send mortality notification to ${recipient.name}:`, result.error);
        }
      }

      return {
        checked: true,
        notificationsSent,
        mortalityRate,
        thresholdExceeded,
      };
    } catch (error) {
      console.error('Error checking mortality thresholds:', error);
      throw error;
    }
  }

  /**
   * Check mortality thresholds for all active batches
   */
  async checkAllActiveBatches(): Promise<{
    batchesChecked: number;
    totalNotificationsSent: number;
    batchesWithAlerts: number;
  }> {
    try {
      // Get all active batches
      const activeBatches = await prisma.batch.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, batchNumber: true },
      });

      console.log(`Checking mortality thresholds for ${activeBatches.length} active batches`);

      let totalNotificationsSent = 0;
      let batchesWithAlerts = 0;

      // Check each batch
      for (const batch of activeBatches) {
        try {
          const result = await this.checkBatchMortalityThresholds(batch.id);
          totalNotificationsSent += result.notificationsSent;

          if (result.thresholdExceeded !== 'none') {
            batchesWithAlerts++;
            console.log(`Alert triggered for batch ${batch.batchNumber}: ${result.thresholdExceeded} (${result.mortalityRate.toFixed(2)}%)`);
          }
        } catch (error) {
          console.error(`Error checking batch ${batch.batchNumber}:`, error);
        }
      }

      return {
        batchesChecked: activeBatches.length,
        totalNotificationsSent,
        batchesWithAlerts,
      };
    } catch (error) {
      console.error('Error checking all active batches:', error);
      throw error;
    }
  }

  /**
   * Get mortality statistics for a batch
   */
  async getBatchMortalityStats(batchId: string): Promise<{
    batchNumber: string;
    initialChicks: number;
    totalMortality: number;
    mortalityRate: number;
    currentBirds: number;
    thresholdStatus: 'safe' | 'warning' | 'critical';
  }> {
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        mortalities: {
          where: {
            reason: {
              not: 'SLAUGHTERED_FOR_SALE',
            },
          },
        },
      },
    });

    if (!batch) {
      throw new Error(`Batch ${batchId} not found`);
    }

    const totalMortality = batch.mortalities.reduce((sum, m) => sum + m.count, 0);
    const mortalityRate = (totalMortality / batch.initialChicks) * 100;
    const currentBirds = batch.initialChicks - totalMortality;

    let thresholdStatus: 'safe' | 'warning' | 'critical' = 'safe';
    if (mortalityRate >= MortalityNotificationService.DEFAULT_CONFIG.criticalThreshold) {
      thresholdStatus = 'critical';
    } else if (mortalityRate >= MortalityNotificationService.DEFAULT_CONFIG.warningThreshold) {
      thresholdStatus = 'warning';
    }

    return {
      batchNumber: batch.batchNumber,
      initialChicks: batch.initialChicks,
      totalMortality,
      mortalityRate,
      currentBirds,
      thresholdStatus,
    };
  }
}

// Singleton instance
export const mortalityNotificationService = new MortalityNotificationService();
