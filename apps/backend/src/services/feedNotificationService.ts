import { notificationService, NotificationType } from './webpushService';
import prisma from '../utils/prisma';

export interface FeedThresholdConfig {
  lowConsumptionThreshold: number; // Percentage below average (e.g., 20 for 20% below)
  highConsumptionThreshold: number; // Percentage above average (e.g., 30 for 30% above)
  noConsumptionDays: number; // Days without feed consumption to trigger alert
  checkInterval: number; // Hours between checks
}

export interface FeedConsumptionStats {
  batchNumber: string;
  totalConsumption: number;
  averageDailyConsumption: number;
  currentBirds: number;
  consumptionPerBird: number;
  daysSinceLastConsumption: number;
  lastConsumptionDate: Date | null;
  consumptionTrend: 'increasing' | 'decreasing' | 'stable' | 'no_data';
  thresholdStatus: 'normal' | 'low' | 'high' | 'no_consumption';
}

export class FeedNotificationService {
  private static readonly DEFAULT_CONFIG: FeedThresholdConfig = {
    lowConsumptionThreshold: 20, // 20% below average
    highConsumptionThreshold: 30, // 30% above average
    noConsumptionDays: 2, // Alert if no consumption for 2 days
    checkInterval: 24, // Check every 24 hours
  };

  /**
   * Check feed consumption patterns for a specific batch and send notifications if needed
   */
  async checkBatchFeedConsumption(batchId: string): Promise<{
    checked: boolean;
    notificationsSent: number;
    stats: FeedConsumptionStats;
    thresholdExceeded: 'none' | 'low' | 'high' | 'no_consumption';
  }> {
    try {
      // Get batch with farm and feed consumption data
      const batch = await prisma.batch.findUnique({
        where: { id: batchId },
        include: {
          farm: {
            include: {
              owner: true,
              managers: true,
            },
          },
          feedConsumptions: {
            orderBy: { date: 'desc' },
          },
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

      // Calculate current birds (excluding sales)
      const totalNaturalMortality = batch.mortalities.reduce((sum, m) => sum + m.count, 0);
      const currentBirds = batch.initialChicks - totalNaturalMortality;

      // Calculate feed consumption statistics
      const stats = await this.calculateFeedStats(batch, currentBirds);

      console.log(`Batch ${batch.batchNumber}: Feed consumption analysis - ${stats.totalConsumption}kg total, ${stats.averageDailyConsumption.toFixed(2)}kg/day average`);

      // Determine threshold level
      let thresholdExceeded: 'none' | 'low' | 'high' | 'no_consumption' = 'none';

      if (stats.thresholdStatus === 'no_consumption') {
        thresholdExceeded = 'no_consumption';
      } else if (stats.thresholdStatus === 'low') {
        thresholdExceeded = 'low';
      } else if (stats.thresholdStatus === 'high') {
        thresholdExceeded = 'high';
      }

      if (thresholdExceeded === 'none') {
        return {
          checked: true,
          notificationsSent: 0,
          stats,
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
          console.log(`Skipping feed notification for user ${recipient.name} - notifications disabled`);
          continue;
        }

        const notificationContent = this.getNotificationContent(thresholdExceeded, stats, batch.batchNumber);

        const result = await notificationService.sendNotification(recipient.id, {
          title: notificationContent.title,
          body: notificationContent.body,
          type: NotificationType.FEED_WARNING,
          data: {
            batchId: batch.id,
            batchNumber: batch.batchNumber,
            farmId: batch.farmId,
            farmName: batch.farm.name,
            threshold: thresholdExceeded,
            stats: {
              totalConsumption: stats.totalConsumption,
              averageDailyConsumption: stats.averageDailyConsumption,
              consumptionPerBird: stats.consumptionPerBird,
              daysSinceLastConsumption: stats.daysSinceLastConsumption,
            },
            url: `/dashboard/batches/${batch.id}`,
          },
        });

        if (result.success) {
          notificationsSent++;
          console.log(`Feed consumption notification sent to ${recipient.name} for batch ${batch.batchNumber}`);
        } else {
          console.error(`Failed to send feed notification to ${recipient.name}:`, result.error);
        }
      }

      return {
        checked: true,
        notificationsSent,
        stats,
        thresholdExceeded,
      };
    } catch (error) {
      console.error('Error checking feed consumption:', error);
      throw error;
    }
  }

  /**
   * Calculate feed consumption statistics for a batch
   */
  private async calculateFeedStats(batch: any, currentBirds: number): Promise<FeedConsumptionStats> {
    const feedConsumptions = batch.feedConsumptions;

    if (feedConsumptions.length === 0) {
      return {
        batchNumber: batch.batchNumber,
        totalConsumption: 0,
        averageDailyConsumption: 0,
        currentBirds,
        consumptionPerBird: 0,
        daysSinceLastConsumption: Math.floor((Date.now() - batch.startDate.getTime()) / (1000 * 60 * 60 * 24)),
        lastConsumptionDate: null,
        consumptionTrend: 'no_data',
        thresholdStatus: 'no_consumption',
      };
    }

    // Calculate total consumption
    const totalConsumption = feedConsumptions.reduce((sum: number, fc: any) => sum + Number(fc.quantity), 0);

    // Calculate days since batch started
    const daysSinceStart = Math.floor((Date.now() - batch.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const averageDailyConsumption = daysSinceStart > 0 ? totalConsumption / daysSinceStart : 0;

    // Calculate consumption per bird
    const consumptionPerBird = currentBirds > 0 ? totalConsumption / currentBirds : 0;

    // Calculate days since last consumption
    const lastConsumptionDate = feedConsumptions[0]?.date;
    const daysSinceLastConsumption = lastConsumptionDate
      ? Math.floor((Date.now() - lastConsumptionDate.getTime()) / (1000 * 60 * 60 * 24))
      : daysSinceStart;

    // Determine consumption trend (compare last 7 days vs previous 7 days)
    const consumptionTrend = this.calculateConsumptionTrend(feedConsumptions);

    // Determine threshold status
    let thresholdStatus: 'normal' | 'low' | 'high' | 'no_consumption' = 'normal';

    if (daysSinceLastConsumption >= FeedNotificationService.DEFAULT_CONFIG.noConsumptionDays) {
      thresholdStatus = 'no_consumption';
    } else if (consumptionTrend === 'decreasing' && averageDailyConsumption > 0) {
      // Check if current consumption is significantly below average
      const recentConsumption = this.getRecentConsumption(feedConsumptions, 7);
      const recentAverage = recentConsumption / 7;
      const deviation = ((averageDailyConsumption - recentAverage) / averageDailyConsumption) * 100;

      if (deviation >= FeedNotificationService.DEFAULT_CONFIG.lowConsumptionThreshold) {
        thresholdStatus = 'low';
      }
    } else if (consumptionTrend === 'increasing' && averageDailyConsumption > 0) {
      // Check if current consumption is significantly above average
      const recentConsumption = this.getRecentConsumption(feedConsumptions, 7);
      const recentAverage = recentConsumption / 7;
      const deviation = ((recentAverage - averageDailyConsumption) / averageDailyConsumption) * 100;

      if (deviation >= FeedNotificationService.DEFAULT_CONFIG.highConsumptionThreshold) {
        thresholdStatus = 'high';
      }
    }

    return {
      batchNumber: batch.batchNumber,
      totalConsumption,
      averageDailyConsumption,
      currentBirds,
      consumptionPerBird,
      daysSinceLastConsumption,
      lastConsumptionDate,
      consumptionTrend,
      thresholdStatus,
    };
  }

  /**
   * Calculate consumption trend based on recent vs previous consumption
   */
  private calculateConsumptionTrend(feedConsumptions: any[]): 'increasing' | 'decreasing' | 'stable' | 'no_data' {
    if (feedConsumptions.length < 14) {
      return 'no_data';
    }

    // Get last 7 days consumption
    const recentConsumption = this.getRecentConsumption(feedConsumptions, 7);
    // Get previous 7 days consumption
    const previousConsumption = this.getRecentConsumption(feedConsumptions.slice(7), 7);

    const recentAverage = recentConsumption / 7;
    const previousAverage = previousConsumption / 7;

    const change = ((recentAverage - previousAverage) / previousAverage) * 100;

    if (change > 10) return 'increasing';
    if (change < -10) return 'decreasing';
    return 'stable';
  }

  /**
   * Get consumption for the last N days
   */
  private getRecentConsumption(feedConsumptions: any[], days: number): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return feedConsumptions
      .filter(fc => fc.date >= cutoffDate)
      .reduce((sum, fc) => sum + Number(fc.quantity), 0);
  }

  /**
   * Get notification content based on threshold type
   */
  private getNotificationContent(
    threshold: 'low' | 'high' | 'no_consumption',
    stats: FeedConsumptionStats,
    batchNumber: string
  ): { title: string; body: string } {
    switch (threshold) {
      case 'no_consumption':
        return {
          title: `🚨 No Feed Consumption - Batch ${batchNumber}`,
          body: `No feed consumption recorded for ${stats.daysSinceLastConsumption} days. Check feed availability and bird health.`,
        };

      case 'low':
        return {
          title: `⚠️ Low Feed Consumption - Batch ${batchNumber}`,
          body: `Feed consumption is ${stats.averageDailyConsumption.toFixed(1)}kg/day (${stats.consumptionPerBird.toFixed(2)}kg/bird). Monitor bird health and feeding schedule.`,
        };

      case 'high':
        return {
          title: `📈 High Feed Consumption - Batch ${batchNumber}`,
          body: `Feed consumption is ${stats.averageDailyConsumption.toFixed(1)}kg/day (${stats.consumptionPerBird.toFixed(2)}kg/bird). Check for feed waste or increased bird activity.`,
        };

      default:
        return {
          title: `Feed Alert - Batch ${batchNumber}`,
          body: `Feed consumption pattern requires attention.`,
        };
    }
  }

  /**
   * Check feed consumption for all active batches
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

      console.log(`Checking feed consumption for ${activeBatches.length} active batches`);

      let totalNotificationsSent = 0;
      let batchesWithAlerts = 0;

      // Check each batch
      for (const batch of activeBatches) {
        try {
          const result = await this.checkBatchFeedConsumption(batch.id);
          totalNotificationsSent += result.notificationsSent;

          if (result.thresholdExceeded !== 'none') {
            batchesWithAlerts++;
            console.log(`Feed alert triggered for batch ${batch.batchNumber}: ${result.thresholdExceeded}`);
          }
        } catch (error) {
          console.error(`Error checking feed consumption for batch ${batch.batchNumber}:`, error);
        }
      }

      return {
        batchesChecked: activeBatches.length,
        totalNotificationsSent,
        batchesWithAlerts,
      };
    } catch (error) {
      console.error('Error checking all active batches for feed consumption:', error);
      throw error;
    }
  }

  /**
   * Get feed consumption statistics for a batch
   */
  async getBatchFeedStats(batchId: string): Promise<FeedConsumptionStats> {
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        feedConsumptions: {
          orderBy: { date: 'desc' },
        },
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

    const totalNaturalMortality = batch.mortalities.reduce((sum, m) => sum + m.count, 0);
    const currentBirds = batch.initialChicks - totalNaturalMortality;

    return this.calculateFeedStats(batch, currentBirds);
  }
}

// Singleton instance
export const feedNotificationService = new FeedNotificationService();
