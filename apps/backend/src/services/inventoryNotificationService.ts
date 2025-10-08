import { notificationService, NotificationType } from './webpushService';
import prisma from '../utils/prisma';

export interface InventoryThresholdConfig {
  lowStockThreshold: number; // Percentage of minStock to trigger warning (e.g., 0.2 for 20% of minStock)
  criticalStockThreshold: number; // Percentage of minStock to trigger critical warning (e.g., 0.1 for 10% of minStock)
  outOfStockThreshold: number; // Stock level to trigger out of stock warning (e.g., 0 for completely out)
  checkInterval: number; // Hours between checks
}

export interface InventoryStats {
  userId: string;
  totalItems: number;
  lowStockItems: number;
  criticalStockItems: number;
  outOfStockItems: number;
  itemsByType: {
    [key: string]: {
      total: number;
      lowStock: number;
      criticalStock: number;
      outOfStock: number;
    };
  };
  lowStockItemsList: Array<{
    id: string;
    name: string;
    currentStock: number;
    minStock: number;
    unit: string;
    itemType: string;
    categoryName: string;
    stockLevel: 'low' | 'critical' | 'out_of_stock';
    daysUntilEmpty?: number;
  }>;
}

export class InventoryNotificationService {
  private static readonly DEFAULT_CONFIG: InventoryThresholdConfig = {
    lowStockThreshold: 0.2, // 20% of minStock
    criticalStockThreshold: 0.1, // 10% of minStock
    outOfStockThreshold: 0, // Completely out of stock
    checkInterval: 24, // Check every 24 hours
  };

  /**
   * Check inventory levels for a specific user and send notifications if needed
   */
  async checkUserInventoryLevels(userId: string): Promise<{
    checked: boolean;
    notificationsSent: number;
    stats: InventoryStats;
    thresholdExceeded: 'none' | 'low_stock' | 'critical_stock' | 'out_of_stock';
  }> {
    try {
      // Get user
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      // Calculate inventory statistics
      const stats = await this.calculateInventoryStats(userId);

      console.log(`User ${user.name}: Inventory analysis - ${stats.totalItems} items, ${stats.lowStockItems} low stock, ${stats.criticalStockItems} critical, ${stats.outOfStockItems} out of stock`);

      // Determine threshold level
      let thresholdExceeded: 'none' | 'low_stock' | 'critical_stock' | 'out_of_stock' = 'none';
      
      if (stats.outOfStockItems > 0) {
        thresholdExceeded = 'out_of_stock';
      } else if (stats.criticalStockItems > 0) {
        thresholdExceeded = 'critical_stock';
      } else if (stats.lowStockItems > 0) {
        thresholdExceeded = 'low_stock';
      }

      if (thresholdExceeded === 'none') {
        return {
          checked: true,
          notificationsSent: 0,
          stats,
          thresholdExceeded: 'none',
        };
      }

      // Check if user has notifications enabled
      if (!user.notificationEnabled) {
        console.log(`Skipping inventory notification for user ${user.name} - notifications disabled`);
        return {
          checked: true,
          notificationsSent: 0,
          stats,
          thresholdExceeded,
        };
      }

      const notificationContent = this.getNotificationContent(thresholdExceeded, stats);

      const result = await notificationService.sendNotification(userId, {
        title: notificationContent.title,
        body: notificationContent.body,
        type: NotificationType.LOW_INVENTORY as NotificationType,
        data: {
          userId: user.id,
          userName: user.name,
          threshold: thresholdExceeded,
          stats: {
            totalItems: stats.totalItems,
            lowStockItems: stats.lowStockItems,
            criticalStockItems: stats.criticalStockItems,
            outOfStockItems: stats.outOfStockItems,
          },
          lowStockItems: stats.lowStockItemsList.slice(0, 5), // Include top 5 low stock items
          url: `/dashboard/inventory`,
        },
      });

      if (result.success) {
        console.log(`Inventory notification sent to ${user.name}`);
        return {
          checked: true,
          notificationsSent: 1,
          stats,
          thresholdExceeded,
        };
      } else {
        console.error(`Failed to send inventory notification to ${user.name}:`, result.error);
        return {
          checked: true,
          notificationsSent: 0,
          stats,
          thresholdExceeded,
        };
      }
    } catch (error) {
      console.error('Error checking inventory levels:', error);
      throw error;
    }
  }

  /**
   * Calculate inventory statistics for a user
   */
  private async calculateInventoryStats(userId: string): Promise<InventoryStats> {
    // Get all inventory items for the user
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: { userId },
      include: {
        category: {
          select: { name: true },
        },
      },
      orderBy: { currentStock: 'asc' },
    });

    const totalItems = inventoryItems.length;
    let lowStockItems = 0;
    let criticalStockItems = 0;
    let outOfStockItems = 0;

    const itemsByType: { [key: string]: { total: number; lowStock: number; criticalStock: number; outOfStock: number } } = {};
    const lowStockItemsList: Array<{
      id: string;
      name: string;
      currentStock: number;
      minStock: number;
      unit: string;
      itemType: string;
      categoryName: string;
      stockLevel: 'low' | 'critical' | 'out_of_stock';
      daysUntilEmpty?: number;
    }> = [];

    // Analyze each item
    for (const item of inventoryItems) {
      const currentStock = Number(item.currentStock);
      const minStock = Number(item.minStock || 0);
      const itemType = item.itemType;

      // Initialize item type counter if not exists
      if (!itemsByType[itemType]) {
        itemsByType[itemType] = { total: 0, lowStock: 0, criticalStock: 0, outOfStock: 0 };
      }

      itemsByType[itemType].total++;

      // Determine stock level
      let stockLevel: 'low' | 'critical' | 'out_of_stock' | 'normal' = 'normal';

      if (currentStock <= InventoryNotificationService.DEFAULT_CONFIG.outOfStockThreshold) {
        stockLevel = 'out_of_stock';
        outOfStockItems++;
        itemsByType[itemType].outOfStock++;
      } else if (minStock > 0 && currentStock <= (minStock * InventoryNotificationService.DEFAULT_CONFIG.criticalStockThreshold)) {
        stockLevel = 'critical';
        criticalStockItems++;
        itemsByType[itemType].criticalStock++;
      } else if (minStock > 0 && currentStock <= (minStock * InventoryNotificationService.DEFAULT_CONFIG.lowStockThreshold)) {
        stockLevel = 'low';
        lowStockItems++;
        itemsByType[itemType].lowStock++;
      }

      // Add to low stock list if applicable
      if (stockLevel !== 'normal') {
        // Calculate days until empty (rough estimate based on recent usage)
        let daysUntilEmpty: number | undefined;
        if (currentStock > 0) {
          // Get recent usage (last 30 days)
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

          const recentUsage = await prisma.inventoryUsage.aggregate({
            where: {
              itemId: item.id,
              date: { gte: thirtyDaysAgo },
            },
            _sum: { quantity: true },
          });

          const totalUsage = Number(recentUsage._sum.quantity || 0);
          const dailyUsage = totalUsage / 30;
          
          if (dailyUsage > 0) {
            daysUntilEmpty = Math.floor(currentStock / dailyUsage);
          }
        }

        lowStockItemsList.push({
          id: item.id,
          name: item.name,
          currentStock,
          minStock,
          unit: item.unit,
          itemType,
          categoryName: item.category.name,
          stockLevel,
          daysUntilEmpty,
        });
      }
    }

    return {
      userId,
      totalItems,
      lowStockItems,
      criticalStockItems,
      outOfStockItems,
      itemsByType,
      lowStockItemsList,
    };
  }

  /**
   * Get notification content based on threshold type
   */
  private getNotificationContent(
    threshold: 'low_stock' | 'critical_stock' | 'out_of_stock',
    stats: InventoryStats
  ): { title: string; body: string } {
    switch (threshold) {
      case 'out_of_stock':
        return {
          title: `🚨 Out of Stock Alert`,
          body: `${stats.outOfStockItems} item(s) are completely out of stock. Restock immediately to avoid operational delays.`,
        };
      
      case 'critical_stock':
        return {
          title: `⚠️ Critical Stock Alert`,
          body: `${stats.criticalStockItems} item(s) are critically low on stock. Consider reordering soon to prevent stockouts.`,
        };
      
      case 'low_stock':
        return {
          title: `📦 Low Stock Warning`,
          body: `${stats.lowStockItems} item(s) are running low on stock. Plan your next purchase to maintain adequate inventory levels.`,
        };
      
      default:
        return {
          title: `Inventory Alert`,
          body: `Inventory levels require attention.`,
        };
    }
  }

  /**
   * Check inventory levels for all users
   */
  async checkAllUsers(): Promise<{
    usersChecked: number;
    totalNotificationsSent: number;
    usersWithAlerts: number;
  }> {
    try {
      // Get all users
      const users = await prisma.user.findMany({
        select: { id: true, name: true },
      });

      console.log(`Checking inventory levels for ${users.length} users`);

      let totalNotificationsSent = 0;
      let usersWithAlerts = 0;

      // Check each user
      for (const user of users) {
        try {
          const result = await this.checkUserInventoryLevels(user.id);
          totalNotificationsSent += result.notificationsSent;
          
          if (result.thresholdExceeded !== 'none') {
            usersWithAlerts++;
            console.log(`Inventory alert triggered for user ${user.name}: ${result.thresholdExceeded}`);
          }
        } catch (error) {
          console.error(`Error checking inventory for user ${user.name}:`, error);
        }
      }

      return {
        usersChecked: users.length,
        totalNotificationsSent,
        usersWithAlerts,
      };
    } catch (error) {
      console.error('Error checking all users for inventory levels:', error);
      throw error;
    }
  }

  /**
   * Get inventory statistics for a user
   */
  async getUserInventoryStats(userId: string): Promise<InventoryStats> {
    return this.calculateInventoryStats(userId);
  }
}

// Singleton instance
export const inventoryNotificationService = new InventoryNotificationService();
