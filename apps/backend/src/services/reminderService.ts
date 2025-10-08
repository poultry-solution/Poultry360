import { PrismaClient, Reminder, ReminderType, ReminderStatus, RecurrencePattern } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateReminderData {
  title: string;
  description?: string;
  type: ReminderType;
  dueDate: Date;
  isRecurring?: boolean;
  recurrencePattern?: RecurrencePattern;
  recurrenceInterval?: number;
  farmId?: string;
  batchId?: string;
  data?: any;
}

export interface CustomReminderData {
  // Specific time reminders (e.g., "10 PM daily")
  specificTime?: string; // Format: "22:00" for 10 PM
  
  // Custom interval reminders (e.g., "every 3 hours")
  customInterval?: {
    unit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
    value: number;
  };
  
  // Day-of-week specific reminders (e.g., "every Monday at 10 PM")
  dayOfWeek?: number; // 0 = Sunday, 1 = Monday, etc.
  timeOfDay?: string; // Format: "22:00" for 10 PM
  
  // Additional custom data
  customFields?: Record<string, any>;
}

export interface UpdateReminderData {
  title?: string;
  description?: string;
  type?: ReminderType;
  dueDate?: Date;
  isRecurring?: boolean;
  recurrencePattern?: RecurrencePattern;
  recurrenceInterval?: number;
  status?: ReminderStatus;
  data?: any;
}

export class ReminderService {
  /**
   * Get all reminders for a user with optional filtering
   */
  async getUserReminders(
    userId: string,
    options: {
      status?: ReminderStatus;
      type?: ReminderType;
      farmId?: string;
      batchId?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    reminders: Reminder[];
    totalCount: number;
    hasMore: boolean;
  }> {
    const {
      status,
      type,
      farmId,
      batchId,
      page = 1,
      limit = 20
    } = options;

    const skip = (page - 1) * limit;

    const where: any = {
      userId,
    };

    if (status) where.status = status;
    if (type) where.type = type;
    if (farmId) where.farmId = farmId;
    if (batchId) where.batchId = batchId;

    const [reminders, totalCount] = await Promise.all([
      prisma.reminder.findMany({
        where,
        include: {
          farm: {
            select: { id: true, name: true }
          },
          batch: {
            select: { id: true, batchNumber: true }
          }
        },
        orderBy: { dueDate: 'asc' },
        skip,
        take: limit,
      }),
      prisma.reminder.count({ where }),
    ]);

    return {
      reminders,
      totalCount,
      hasMore: skip + reminders.length < totalCount,
    };
  }

  /**
   * Get reminders that are due for notification (PENDING reminders whose time has come)
   */
  async getDueReminders(): Promise<Reminder[]> {
    const now = new Date();
    
    return await prisma.reminder.findMany({
      where: {
        status: 'PENDING',
        dueDate: {
          lte: now, // Due date is less than or equal to now
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            notificationEnabled: true,
            pushSubscription: true,
          }
        },
        farm: {
          select: { id: true, name: true }
        },
        batch: {
          select: { id: true, batchNumber: true }
        }
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  /**
   * Get reminders that are overdue (time has passed but not acknowledged)
   */
  async getOverdueReminders(): Promise<Reminder[]> {
    const now = new Date();
    
    return await prisma.reminder.findMany({
      where: {
        status: 'OVERDUE',
        dueDate: {
          lte: now, // Due date is less than or equal to now
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            notificationEnabled: true,
            pushSubscription: true,
          }
        },
        farm: {
          select: { id: true, name: true }
        },
        batch: {
          select: { id: true, batchNumber: true }
        }
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  /**
   * Create a new reminder
   */
  async createReminder(userId: string, data: CreateReminderData): Promise<Reminder> {
    return await prisma.reminder.create({
      data: {
        ...data,
        userId,
      },
      include: {
        farm: {
          select: { id: true, name: true }
        },
        batch: {
          select: { id: true, batchNumber: true }
        }
      },
    });
  }

  /**
   * Update an existing reminder
   */
  async updateReminder(reminderId: string, userId: string, data: UpdateReminderData): Promise<Reminder> {
    // Verify ownership
    const existingReminder = await prisma.reminder.findFirst({
      where: {
        id: reminderId,
        userId,
      },
    });

    if (!existingReminder) {
      throw new Error('Reminder not found or access denied');
    }

    return await prisma.reminder.update({
      where: { id: reminderId },
      data,
      include: {
        farm: {
          select: { id: true, name: true }
        },
        batch: {
          select: { id: true, batchNumber: true }
        }
      },
    });
  }

  /**
   * Delete a reminder
   */
  async deleteReminder(reminderId: string, userId: string): Promise<boolean> {
    // Verify ownership
    const existingReminder = await prisma.reminder.findFirst({
      where: {
        id: reminderId,
        userId,
      },
    });

    if (!existingReminder) {
      throw new Error('Reminder not found or access denied');
    }

    await prisma.reminder.delete({
      where: { id: reminderId },
    });

    return true;
  }

  /**
   * Get a specific reminder by ID
   */
  async getReminderById(reminderId: string, userId: string): Promise<Reminder | null> {
    return await prisma.reminder.findFirst({
      where: {
        id: reminderId,
        userId,
      },
      include: {
        farm: {
          select: { id: true, name: true }
        },
        batch: {
          select: { id: true, batchNumber: true }
        }
      },
    });
  }

  /**
   * Mark a reminder as triggered (move from PENDING to OVERDUE)
   */
  async markAsTriggered(reminder: Reminder): Promise<Reminder> {
    const now = new Date();
    
    // Move from PENDING to OVERDUE (time has come, waiting for user acknowledgment)
    return await prisma.reminder.update({
      where: { id: reminder.id },
      data: {
        status: 'OVERDUE',
        lastTriggered: now,
      },
      include: {
        farm: {
          select: { id: true, name: true }
        },
        batch: {
          select: { id: true, batchNumber: true }
        }
      },
    });
  }

  /**
   * Calculate the next occurrence date for a recurring reminder
   */
  calculateNextOccurrence(reminder: Reminder): Date | null {
    if (!reminder.isRecurring || !reminder.recurrencePattern) {
      return null;
    }

    const now = new Date();
    const interval = reminder.recurrenceInterval || 1;

    switch (reminder.recurrencePattern) {
      case 'DAILY':
        return new Date(now.getTime() + (interval * 24 * 60 * 60 * 1000));
      
      case 'WEEKLY':
        return new Date(now.getTime() + (interval * 7 * 24 * 60 * 60 * 1000));
      
      case 'MONTHLY':
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + interval);
        return nextMonth;
      
      case 'CUSTOM':
        // Handle custom patterns stored in the data field
        return this.calculateCustomNextOccurrence(reminder, now);
      
      case 'NONE':
      default:
        return null;
    }
  }

  /**
   * Calculate next occurrence for custom reminder patterns
   */
  private calculateCustomNextOccurrence(reminder: Reminder, now: Date): Date | null {
    if (!reminder.data || typeof reminder.data !== 'object') {
      return null;
    }

    const customData = reminder.data as any;
    
    // Handle specific time-based custom reminders
    if (customData.specificTime) {
      return this.calculateSpecificTimeNextOccurrence(customData.specificTime, now);
    }

    // Handle custom interval patterns
    if (customData.customInterval) {
      const { unit, value } = customData.customInterval;
      return this.calculateCustomIntervalNextOccurrence(unit, value, now);
    }

    // Handle day-of-week specific reminders (e.g., "every Monday at 10 PM")
    if (customData.dayOfWeek && customData.timeOfDay) {
      return this.calculateDayOfWeekNextOccurrence(customData.dayOfWeek, customData.timeOfDay, now);
    }

    // Default to daily if no custom pattern is found
    return new Date(now.getTime() + (24 * 60 * 60 * 1000));
  }

  /**
   * Calculate next occurrence for specific time reminders (e.g., "10 PM daily")
   */
  private calculateSpecificTimeNextOccurrence(specificTime: string, now: Date): Date {
    const [hours, minutes] = specificTime.split(':').map(Number);
    const nextOccurrence = new Date(now);
    
    nextOccurrence.setHours(hours, minutes || 0, 0, 0);
    
    // If the time has already passed today, schedule for tomorrow
    if (nextOccurrence <= now) {
      nextOccurrence.setDate(nextOccurrence.getDate() + 1);
    }
    
    return nextOccurrence;
  }

  /**
   * Calculate next occurrence for custom interval patterns
   */
  private calculateCustomIntervalNextOccurrence(unit: string, value: number, now: Date): Date {
    const nextOccurrence = new Date(now);
    
    switch (unit.toLowerCase()) {
      case 'minutes':
        nextOccurrence.setMinutes(nextOccurrence.getMinutes() + value);
        break;
      case 'hours':
        nextOccurrence.setHours(nextOccurrence.getHours() + value);
        break;
      case 'days':
        nextOccurrence.setDate(nextOccurrence.getDate() + value);
        break;
      case 'weeks':
        nextOccurrence.setDate(nextOccurrence.getDate() + (value * 7));
        break;
      case 'months':
        nextOccurrence.setMonth(nextOccurrence.getMonth() + value);
        break;
      default:
        // Default to days
        nextOccurrence.setDate(nextOccurrence.getDate() + value);
    }
    
    return nextOccurrence;
  }

  /**
   * Calculate next occurrence for day-of-week specific reminders
   */
  private calculateDayOfWeekNextOccurrence(dayOfWeek: number, timeOfDay: string, now: Date): Date {
    const [hours, minutes] = timeOfDay.split(':').map(Number);
    const nextOccurrence = new Date(now);
    
    // Set the time
    nextOccurrence.setHours(hours, minutes || 0, 0, 0);
    
    // Calculate days until the target day of week
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    let daysUntilTarget = dayOfWeek - currentDay;
    
    // If the target day has passed this week or it's the same day but time has passed
    if (daysUntilTarget <= 0 || (daysUntilTarget === 0 && nextOccurrence <= now)) {
      daysUntilTarget += 7; // Schedule for next week
    }
    
    nextOccurrence.setDate(nextOccurrence.getDate() + daysUntilTarget);
    
    return nextOccurrence;
  }

  /**
   * Create a custom reminder with specific time (e.g., "Remind me to talk with dealer at 10 PM")
   */
  async createCustomTimeReminder(
    userId: string,
    title: string,
    description: string,
    specificTime: string, // Format: "22:00" for 10 PM
    isRecurring: boolean = true,
    farmId?: string,
    batchId?: string
  ): Promise<Reminder> {
    const now = new Date();
    const [hours, minutes] = specificTime.split(':').map(Number);
    const dueDate = new Date(now);
    dueDate.setHours(hours, minutes || 0, 0, 0);
    
    // If the time has already passed today, schedule for tomorrow
    if (dueDate <= now) {
      dueDate.setDate(dueDate.getDate() + 1);
    }

    return await this.createReminder(userId, {
      title,
      description,
      type: 'GENERAL', // Custom reminders are always GENERAL type
      dueDate,
      isRecurring,
      recurrencePattern: isRecurring ? 'CUSTOM' : 'NONE',
      farmId,
      batchId,
      data: {
        specificTime,
        customType: 'specificTime'
      }
    });
  }

  /**
   * Create a custom interval reminder (e.g., "Remind me every 3 hours")
   */
  async createCustomIntervalReminder(
    userId: string,
    title: string,
    description: string,
    interval: { unit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months'; value: number },
    farmId?: string,
    batchId?: string
  ): Promise<Reminder> {
    const now = new Date();
    const dueDate = this.calculateCustomIntervalNextOccurrence(interval.unit, interval.value, now);

    return await this.createReminder(userId, {
      title,
      description,
      type: 'GENERAL', // Custom reminders are always GENERAL type
      dueDate,
      isRecurring: true,
      recurrencePattern: 'CUSTOM',
      farmId,
      batchId,
      data: {
        customInterval: interval,
        customType: 'customInterval'
      }
    });
  }

  /**
   * Create a day-of-week specific reminder (e.g., "Remind me every Monday at 10 PM")
   */
  async createDayOfWeekReminder(
    userId: string,
    title: string,
    description: string,
    dayOfWeek: number, // 0 = Sunday, 1 = Monday, etc.
    timeOfDay: string, // Format: "22:00" for 10 PM
    farmId?: string,
    batchId?: string
  ): Promise<Reminder> {
    const now = new Date();
    const dueDate = this.calculateDayOfWeekNextOccurrence(dayOfWeek, timeOfDay, now);

    return await this.createReminder(userId, {
      title,
      description,
      type: 'GENERAL', // Custom reminders are always GENERAL type
      dueDate,
      isRecurring: true,
      recurrencePattern: 'CUSTOM',
      farmId,
      batchId,
      data: {
        dayOfWeek,
        timeOfDay,
        customType: 'dayOfWeek'
      }
    });
  }

  /**
   * Mark a reminder as COMPLETED (user acknowledged completion)
   */
  async markAsCompleted(reminderId: string, userId: string): Promise<Reminder> {
    // Verify ownership
    const existingReminder = await prisma.reminder.findFirst({
      where: {
        id: reminderId,
        userId,
      },
    });

    if (!existingReminder) {
      throw new Error('Reminder not found or access denied');
    }

    return await prisma.reminder.update({
      where: { id: reminderId },
      data: {
        status: 'COMPLETED',
        lastTriggered: new Date(),
      },
      include: {
        farm: {
          select: { id: true, name: true }
        },
        batch: {
          select: { id: true, batchNumber: true }
        }
      },
    });
  }

  /**
   * Mark a reminder as NOT DONE (user didn't complete it, reschedule)
   * This moves from OVERDUE back to PENDING with a new due date
   */
  async markAsNotDone(reminderId: string, userId: string, rescheduleMinutes: number = 60): Promise<Reminder> {
    // Verify ownership
    const existingReminder = await prisma.reminder.findFirst({
      where: {
        id: reminderId,
        userId,
      },
    });

    if (!existingReminder) {
      throw new Error('Reminder not found or access denied');
    }

    // Calculate new due date (reschedule for later)
    const newDueDate = new Date();
    newDueDate.setMinutes(newDueDate.getMinutes() + rescheduleMinutes);

    return await prisma.reminder.update({
      where: { id: reminderId },
      data: {
        status: 'PENDING', // Move back to PENDING with new due date
        dueDate: newDueDate,
        lastTriggered: new Date(),
      },
      include: {
        farm: {
          select: { id: true, name: true }
        },
        batch: {
          select: { id: true, batchNumber: true }
        }
      },
    });
  }

  /**
   * Get reminders that need acknowledgment (OVERDUE reminders waiting for user action)
   */
  async getRemindersNeedingAcknowledgment(userId: string): Promise<Reminder[]> {
    return await prisma.reminder.findMany({
      where: {
        userId,
        status: 'OVERDUE', // These are reminders that are overdue and need user action
      },
      include: {
        farm: {
          select: { id: true, name: true }
        },
        batch: {
          select: { id: true, batchNumber: true }
        }
      },
      orderBy: { dueDate: 'asc' }, // Show oldest overdue first
    });
  }

  /**
   * Get reminder statistics for a user
   */
  async getReminderStats(userId: string): Promise<{
    total: number;
    pending: number;
    completed: number;
    overdue: number;
    byType: Record<ReminderType, number>;
  }> {
    const [total, pending, completed, overdue, byType] = await Promise.all([
      prisma.reminder.count({ where: { userId } }),
      prisma.reminder.count({ where: { userId, status: 'PENDING' } }),
      prisma.reminder.count({ where: { userId, status: 'COMPLETED' } }),
      prisma.reminder.count({ 
        where: { 
          userId, 
          status: 'PENDING',
          dueDate: { lt: new Date() }
        } 
      }),
      prisma.reminder.groupBy({
        by: ['type'],
        where: { userId },
        _count: { id: true },
      }),
    ]);

    const byTypeMap: Record<ReminderType, number> = {} as Record<ReminderType, number>;
    byType.forEach(item => {
      byTypeMap[item.type] = item._count.id;
    });

    return {
      total,
      pending,
      completed,
      overdue,
      byType: byTypeMap,
    };
  }
}

// Singleton instance
let reminderServiceInstance: ReminderService | null = null;

export const getReminderService = (): ReminderService => {
  if (!reminderServiceInstance) {
    reminderServiceInstance = new ReminderService();
  }
  return reminderServiceInstance;
};
