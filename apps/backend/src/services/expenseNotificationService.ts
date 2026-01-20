import { notificationService, NotificationType } from './webpushService';
import prisma from '../utils/prisma';

export interface ExpenseThresholdConfig {
  highExpenseThreshold: number; // Amount threshold (e.g., 10000 for Rs. 10,000)
  dailyExpenseThreshold: number; // Daily spending threshold (e.g., 5000 for Rs. 5,000)
  monthlyExpenseThreshold: number; // Monthly spending threshold (e.g., 100000 for Rs. 100,000)
  unusualSpendingMultiplier: number; // Multiplier for unusual spending (e.g., 3 for 3x average)
  checkInterval: number; // Hours between checks
}

export interface ExpenseStats {
  farmId: string;
  farmName: string;
  totalExpenses: number;
  dailyExpenses: number;
  monthlyExpenses: number;
  averageDailyExpense: number;
  averageMonthlyExpense: number;
  expenseTrend: 'increasing' | 'decreasing' | 'stable' | 'no_data';
  thresholdStatus: 'normal' | 'high_daily' | 'high_monthly' | 'unusual_spending' | 'high_single';
  recentExpenses: Array<{
    id: string;
    amount: number;
    categoryName: string;
    date: Date;
    description?: string;
  }>;
}

export class ExpenseNotificationService {
  private static readonly DEFAULT_CONFIG: ExpenseThresholdConfig = {
    highExpenseThreshold: 10000, // Rs. 10,000 for single expense
    dailyExpenseThreshold: 5000, // Rs. 5,000 per day
    monthlyExpenseThreshold: 100000, // Rs. 100,000 per month
    unusualSpendingMultiplier: 3, // 3x average spending
    checkInterval: 24, // Check every 24 hours
  };

  /**
   * Check expense patterns for a specific farm and send notifications if needed
   */
  async checkFarmExpensePatterns(farmId: string): Promise<{
    checked: boolean;
    notificationsSent: number;
    stats: ExpenseStats;
    thresholdExceeded: 'none' | 'high_daily' | 'high_monthly' | 'unusual_spending' | 'high_single';
  }> {
    try {
      // Get farm with owner and managers
      const farm = await prisma.farm.findUnique({
        where: { id: farmId },
        include: {
          owner: true,
          managers: true,
        },
      });

      if (!farm) {
        throw new Error(`Farm ${farmId} not found`);
      }

      // Calculate expense statistics
      const stats = await this.calculateExpenseStats(farmId, farm.name);

      console.log(`Farm ${farm.name}: Expense analysis - Rs. ${stats.totalExpenses} total, Rs. ${stats.dailyExpenses} today, Rs. ${stats.monthlyExpenses} this month`);

      // Determine threshold level
      let thresholdExceeded: 'none' | 'high_daily' | 'high_monthly' | 'unusual_spending' | 'high_single' = 'none';

      if (stats.thresholdStatus === 'high_single') {
        thresholdExceeded = 'high_single';
      } else if (stats.thresholdStatus === 'high_daily') {
        thresholdExceeded = 'high_daily';
      } else if (stats.thresholdStatus === 'high_monthly') {
        thresholdExceeded = 'high_monthly';
      } else if (stats.thresholdStatus === 'unusual_spending') {
        thresholdExceeded = 'unusual_spending';
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
        farm.owner,
        ...farm.managers,
      ];

      let notificationsSent = 0;

      // Send notifications to all recipients
      for (const recipient of recipients) {
        if (!recipient.notificationEnabled) {
          console.log(`Skipping expense notification for user ${recipient.name} - notifications disabled`);
          continue;
        }

        const notificationContent = this.getNotificationContent(thresholdExceeded, stats);

        const result = await notificationService.sendNotification(recipient.id, {
          title: notificationContent.title,
          body: notificationContent.body,
          type: NotificationType.EXPENSE_WARNING,
          data: {
            farmId: farm.id,
            farmName: farm.name,
            threshold: thresholdExceeded,
            stats: {
              totalExpenses: stats.totalExpenses,
              dailyExpenses: stats.dailyExpenses,
              monthlyExpenses: stats.monthlyExpenses,
              averageDailyExpense: stats.averageDailyExpense,
            },
            recentExpenses: stats.recentExpenses.slice(0, 3), // Include top 3 recent expenses
            url: `/dashboard/expenses`,
          },
        });

        if (result.success) {
          notificationsSent++;
          console.log(`Expense notification sent to ${recipient.name} for farm ${farm.name}`);
        } else {
          console.error(`Failed to send expense notification to ${recipient.name}:`, result.error);
        }
      }

      return {
        checked: true,
        notificationsSent,
        stats,
        thresholdExceeded,
      };
    } catch (error) {
      console.error('Error checking expense patterns:', error);
      throw error;
    }
  }

  /**
   * Calculate expense statistics for a farm
   */
  private async calculateExpenseStats(farmId: string, farmName: string): Promise<ExpenseStats> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

    // Get expenses for different periods
    const [
      totalExpenses,
      todayExpenses,
      thisMonthExpenses,
      lastMonthExpenses,
      recentExpenses,
    ] = await Promise.all([
      // Total expenses
      prisma.expense.aggregate({
        where: { farmId },
        _sum: { amount: true },
      }),

      // Today's expenses
      prisma.expense.aggregate({
        where: {
          farmId,
          date: { gte: today },
        },
        _sum: { amount: true },
      }),

      // This month's expenses
      prisma.expense.aggregate({
        where: {
          farmId,
          date: { gte: thisMonth },
        },
        _sum: { amount: true },
      }),

      // Last month's expenses (for comparison)
      prisma.expense.aggregate({
        where: {
          farmId,
          date: { gte: lastMonth, lt: thisMonth },
        },
        _sum: { amount: true },
      }),

      // Recent expenses (last 7 days)
      prisma.expense.findMany({
        where: {
          farmId,
          date: { gte: new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)) },
        },
        include: {
          category: {
            select: { name: true },
          },
        },
        orderBy: { date: 'desc' },
        take: 10,
      }),
    ]);

    const totalExpensesAmount = Number(totalExpenses._sum.amount || 0);
    const dailyExpensesAmount = Number(todayExpenses._sum.amount || 0);
    const monthlyExpensesAmount = Number(thisMonthExpenses._sum.amount || 0);
    const lastMonthExpensesAmount = Number(lastMonthExpenses._sum.amount || 0);

    // Calculate averages
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysPassed = now.getDate();
    const averageDailyExpense = daysPassed > 0 ? monthlyExpensesAmount / daysPassed : 0;
    const averageMonthlyExpense = lastMonthExpensesAmount;

    // Determine expense trend
    let expenseTrend: 'increasing' | 'decreasing' | 'stable' | 'no_data' = 'no_data';
    if (averageMonthlyExpense > 0) {
      const change = ((monthlyExpensesAmount - averageMonthlyExpense) / averageMonthlyExpense) * 100;
      if (change > 20) expenseTrend = 'increasing';
      else if (change < -20) expenseTrend = 'decreasing';
      else expenseTrend = 'stable';
    }

    // Determine threshold status
    let thresholdStatus: 'normal' | 'high_daily' | 'high_monthly' | 'unusual_spending' | 'high_single' = 'normal';

    // Check for high single expense
    const maxRecentExpense = Math.max(...recentExpenses.map(e => Number(e.amount)));
    if (maxRecentExpense >= ExpenseNotificationService.DEFAULT_CONFIG.highExpenseThreshold) {
      thresholdStatus = 'high_single';
    }
    // Check for high daily expenses
    else if (dailyExpensesAmount >= ExpenseNotificationService.DEFAULT_CONFIG.dailyExpenseThreshold) {
      thresholdStatus = 'high_daily';
    }
    // Check for high monthly expenses
    else if (monthlyExpensesAmount >= ExpenseNotificationService.DEFAULT_CONFIG.monthlyExpenseThreshold) {
      thresholdStatus = 'high_monthly';
    }
    // Check for unusual spending (3x average)
    else if (averageDailyExpense > 0 && dailyExpensesAmount >= (averageDailyExpense * ExpenseNotificationService.DEFAULT_CONFIG.unusualSpendingMultiplier)) {
      thresholdStatus = 'unusual_spending';
    }

    return {
      farmId,
      farmName,
      totalExpenses: totalExpensesAmount,
      dailyExpenses: dailyExpensesAmount,
      monthlyExpenses: monthlyExpensesAmount,
      averageDailyExpense,
      averageMonthlyExpense,
      expenseTrend,
      thresholdStatus,
      recentExpenses: recentExpenses.map(expense => ({
        id: expense.id,
        amount: Number(expense.amount),
        categoryName: expense.category.name,
        date: expense.date,
        description: expense.description || undefined,
      })),
    };
  }

  /**
   * Get notification content based on threshold type
   */
  private getNotificationContent(
    threshold: 'high_daily' | 'high_monthly' | 'unusual_spending' | 'high_single',
    stats: ExpenseStats
  ): { title: string; body: string } {
    switch (threshold) {
      case 'high_single':
        const maxExpense = Math.max(...stats.recentExpenses.map(e => e.amount));
        return {
          title: `💰 High Single Expense - ${stats.farmName}`,
          body: `A single expense of Rs. ${maxExpense.toLocaleString()} was recorded. Review recent transactions.`,
        };

      case 'high_daily':
        return {
          title: `📊 High Daily Expenses - ${stats.farmName}`,
          body: `Daily expenses reached Rs. ${stats.dailyExpenses.toLocaleString()} (avg: Rs. ${stats.averageDailyExpense.toLocaleString()}/day). Monitor spending.`,
        };

      case 'high_monthly':
        return {
          title: `📈 High Monthly Expenses - ${stats.farmName}`,
          body: `Monthly expenses reached Rs. ${stats.monthlyExpenses.toLocaleString()} (avg: Rs. ${stats.averageMonthlyExpense.toLocaleString()}/month). Review budget.`,
        };

      case 'unusual_spending':
        return {
          title: `⚠️ Unusual Spending Pattern - ${stats.farmName}`,
          body: `Today's expenses (Rs. ${stats.dailyExpenses.toLocaleString()}) are ${(stats.dailyExpenses / stats.averageDailyExpense).toFixed(1)}x higher than average.`,
        };

      default:
        return {
          title: `Expense Alert - ${stats.farmName}`,
          body: `Expense pattern requires attention.`,
        };
    }
  }

  /**
   * Check expense patterns for all farms
   */
  async checkAllFarms(): Promise<{
    farmsChecked: number;
    totalNotificationsSent: number;
    farmsWithAlerts: number;
  }> {
    try {
      // Get all farms
      const farms = await prisma.farm.findMany({
        select: { id: true, name: true },
      });

      console.log(`Checking expense patterns for ${farms.length} farms`);

      let totalNotificationsSent = 0;
      let farmsWithAlerts = 0;

      // Check each farm
      for (const farm of farms) {
        try {
          const result = await this.checkFarmExpensePatterns(farm.id);
          totalNotificationsSent += result.notificationsSent;

          if (result.thresholdExceeded !== 'none') {
            farmsWithAlerts++;
            console.log(`Expense alert triggered for farm ${farm.name}: ${result.thresholdExceeded}`);
          }
        } catch (error) {
          console.error(`Error checking farm ${farm.name}:`, error);
        }
      }

      return {
        farmsChecked: farms.length,
        totalNotificationsSent,
        farmsWithAlerts,
      };
    } catch (error) {
      console.error('Error checking all farms for expense patterns:', error);
      throw error;
    }
  }

  /**
   * Get expense statistics for a farm
   */
  async getFarmExpenseStats(farmId: string): Promise<ExpenseStats> {
    const farm = await prisma.farm.findUnique({
      where: { id: farmId },
      select: { name: true },
    });

    if (!farm) {
      throw new Error(`Farm ${farmId} not found`);
    }

    return this.calculateExpenseStats(farmId, farm.name);
  }
}

// Singleton instance
export const expenseNotificationService = new ExpenseNotificationService();
