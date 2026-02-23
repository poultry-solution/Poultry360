import { VaccinationStatus } from '@prisma/client';
import prisma from '../utils/prisma';
import { getReminderService } from './reminderService';

const reminderService = getReminderService();

export interface BatchAgeInfo {
  batchId: string;
  batchNumber: string;
  startDate: Date;
  currentAge: number;
  farmId?: string;
  userId: string;
}

export interface StandardVaccinationData {
  vaccineName: string;
  dayFrom: number;
  dayTo: number;
  isOptional: boolean;
  description?: string;
}

export class StandardVaccinationService {
  /**
   * Get all active standard vaccination schedules
   */
  async getStandardSchedules(): Promise<StandardVaccinationData[]> {
    const schedules = await prisma.standardVaccinationSchedule.findMany({
      where: { isActive: true },
      orderBy: { dayFrom: 'asc' },
    });

    return schedules.map(schedule => ({
      vaccineName: schedule.vaccineName,
      dayFrom: schedule.dayFrom,
      dayTo: schedule.dayTo,
      isOptional: schedule.isOptional,
      description: schedule.description || undefined,
    }));
  }

  /**
   * Calculate batch age in days
   */
  calculateBatchAge(startDate: Date): number {
    const now = new Date();
    const diffTime = now.getTime() - startDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get upcoming vaccinations for a batch based on its age
   */
  async getUpcomingVaccinationsForBatch(batchInfo: BatchAgeInfo): Promise<{
    dueToday: StandardVaccinationData[];
    dueTomorrow: StandardVaccinationData[];
    overdue: StandardVaccinationData[];
  }> {
    const schedules = await this.getStandardSchedules();
    const currentAge = batchInfo.currentAge;

    const dueToday: StandardVaccinationData[] = [];
    const dueTomorrow: StandardVaccinationData[] = [];
    const overdue: StandardVaccinationData[] = [];

    for (const schedule of schedules) {
      // Check if vaccination is due today
      if (currentAge >= schedule.dayFrom && currentAge <= schedule.dayTo) {
        dueToday.push(schedule);
      }
      // Check if vaccination is due tomorrow
      else if (currentAge === schedule.dayFrom - 1) {
        dueTomorrow.push(schedule);
      }
      // Check if vaccination is overdue
      else if (currentAge > schedule.dayTo) {
        overdue.push(schedule);
      }
    }

    return { dueToday, dueTomorrow, overdue };
  }

  /**
   * Create standard vaccination reminders for a batch
   */
  async createStandardVaccinationReminders(batchInfo: BatchAgeInfo): Promise<void> {
    const { dueToday, dueTomorrow, overdue } = await this.getUpcomingVaccinationsForBatch(batchInfo);

    // Create "tomorrow" reminders
    for (const schedule of dueTomorrow) {
      await this.createVaccinationReminder(batchInfo, schedule, 'tomorrow');
    }

    // Create "due today" reminders
    for (const schedule of dueToday) {
      await this.createVaccinationReminder(batchInfo, schedule, 'due');
    }

    // Create "overdue" reminders (retry logic)
    for (const schedule of overdue) {
      await this.createVaccinationReminder(batchInfo, schedule, 'overdue');
    }
  }

  /**
   * Create a vaccination reminder
   */
  private async createVaccinationReminder(
    batchInfo: BatchAgeInfo,
    schedule: StandardVaccinationData,
    type: 'tomorrow' | 'due' | 'overdue'
  ): Promise<void> {
    // Check if reminder already exists for this batch and vaccine
    const existingVaccination = await prisma.vaccination.findFirst({
      where: {
        batchId: batchInfo.batchId,
        vaccineName: schedule.vaccineName,
        status: { in: ['PENDING', 'OVERDUE'] },
      },
    });

    if (existingVaccination) {
      // Update retry count for overdue vaccinations
      if (type === 'overdue' && existingVaccination.retryCount < 3) {
        await prisma.vaccination.update({
          where: { id: existingVaccination.id },
          data: {
            retryCount: existingVaccination.retryCount + 1,
            status: 'OVERDUE',
          },
        });
      }
      return; // Don't create duplicate reminders
    }

    // Create vaccination record
    const vaccination = await prisma.vaccination.create({
      data: {
        vaccineName: schedule.vaccineName,
        scheduledDate: new Date(), // Due today
        batchId: batchInfo.batchId,
        farmId: batchInfo.farmId,
        userId: batchInfo.userId,
        batchAge: batchInfo.currentAge,
        status: type === 'overdue' ? 'OVERDUE' : 'PENDING',
        retryCount: type === 'overdue' ? 1 : 0,
        notes: schedule.description,
      },
    });

    // Create reminder with proper notification payload
    const reminderTitle = this.getReminderTitle(schedule.vaccineName, batchInfo.batchNumber, type);
    const reminderDescription = this.getReminderDescription(schedule, batchInfo, type);
    const notificationPayload = this.createNotificationPayload(schedule, batchInfo, type);

    await reminderService.createReminder(batchInfo.userId, {
      title: reminderTitle,
      description: reminderDescription,
      type: 'VACCINATION',
      dueDate: new Date(),
      isRecurring: false,
      recurrencePattern: 'NONE',
      farmId: batchInfo.farmId,
      batchId: batchInfo.batchId,
      data: {
        vaccinationId: vaccination.id,
        vaccineName: schedule.vaccineName,
        batchAge: batchInfo.currentAge,
        reminderType: type,
        notificationPayload, // Include the notification payload
      },
    });

    // Update vaccination with reminder info
    await prisma.vaccination.update({
      where: { id: vaccination.id },
      data: {
        reminderCreated: true,
      },
    });
  }

  /**
   * Get reminder title based on type
   */
  private getReminderTitle(vaccineName: string, batchNumber: string, type: string): string {
    switch (type) {
      case 'tomorrow':
        return `🩺 Vaccination Tomorrow: ${vaccineName}`;
      case 'due':
        return `🩺 Vaccination Due: ${vaccineName}`;
      case 'overdue':
        return `⚠️ Overdue Vaccination: ${vaccineName}`;
      default:
        return `🩺 ${vaccineName} Vaccination`;
    }
  }

  /**
   * Get reminder description
   */
  private getReminderDescription(
    schedule: StandardVaccinationData,
    batchInfo: BatchAgeInfo,
    type: string
  ): string {
    const baseDescription = `${schedule.vaccineName} vaccination for Batch ${batchInfo.batchNumber}`;

    if (schedule.description) {
      return `${baseDescription} - ${schedule.description}`;
    }

    return baseDescription;
  }

  /**
   * Create notification payload with proper actions based on type
   */
  private createNotificationPayload(
    schedule: StandardVaccinationData,
    batchInfo: BatchAgeInfo,
    type: string
  ): any {
    const basePayload = {
      type: 'VACCINATION_REMINDER',
      notificationType: 'vaccination',
      vaccinationId: null, // Will be set after vaccination is created
      vaccineName: schedule.vaccineName,
      batchId: batchInfo.batchId,
      batchNumber: batchInfo.batchNumber,
      farmId: batchInfo.farmId,
      batchAge: batchInfo.currentAge,
      reminderType: type,
      url: `/dashboard/batches/${batchInfo.batchId}?tab=vaccinations`,
    };

    // Only add actions for "due" and "overdue" notifications, NOT for "tomorrow"
    if (type === 'due' || type === 'overdue') {
      return {
        ...basePayload,
        actions: [
          {
            action: 'mark-completed',
            title: '✅ Done',
            icon: '/icons/check.png',
          },
          {
            action: 'mark-not-done',
            title: '⏰ Later',
            icon: '/icons/clock.png',
          },
        ],
        requireInteraction: true, // Keep notification visible until action is taken
      };
    }

    // For "tomorrow" notifications, no actions needed
    return {
      ...basePayload,
      actions: [], // No actions for tomorrow notifications
      requireInteraction: false, // Can be dismissed
    };
  }

  /**
   * Mark standard vaccination as completed
   */
  async markStandardVaccinationCompleted(
    vaccinationId: string,
    userId: string
  ): Promise<void> {
    const vaccination = await prisma.vaccination.findFirst({
      where: {
        id: vaccinationId,
        userId,
        standardScheduleId: { not: null }, // Only standard vaccinations
      },
    });

    if (!vaccination) {
      throw new Error('Standard vaccination not found or access denied');
    }

    // Update vaccination status
    await prisma.vaccination.update({
      where: { id: vaccinationId },
      data: {
        status: 'COMPLETED',
        completedDate: new Date(),
      },
    });

    // Mark related reminder as completed
    if (vaccination.reminderId) {
      await reminderService.markAsCompleted(vaccination.reminderId, userId);
    }
  }

  /**
   * Mark standard vaccination as missed (after 3 retries)
   */
  async markStandardVaccinationMissed(
    vaccinationId: string,
    userId: string
  ): Promise<void> {
    const vaccination = await prisma.vaccination.findFirst({
      where: {
        id: vaccinationId,
        userId,
        standardScheduleId: { not: null },
        retryCount: { gte: 3 },
      },
    });

    if (!vaccination) {
      throw new Error('Standard vaccination not found or retry limit not reached');
    }

    // Update vaccination status to MISSED
    await prisma.vaccination.update({
      where: { id: vaccinationId },
      data: {
        status: 'MISSED',
      },
    });

    // Mark related reminder as completed (to stop notifications)
    if (vaccination.reminderId) {
      await reminderService.markAsCompleted(vaccination.reminderId, userId);
    }
  }

  /**
   * Get standard vaccination statistics for a user
   */
  async getStandardVaccinationStats(userId: string): Promise<{
    total: number;
    completed: number;
    pending: number;
    overdue: number;
    missed: number;
    byBatch: Record<string, number>;
  }> {
    const [total, completed, pending, overdue, missed, byBatch] = await Promise.all([
      prisma.vaccination.count({
        where: { userId, standardScheduleId: { not: null } },
      }),
      prisma.vaccination.count({
        where: { userId, standardScheduleId: { not: null }, status: 'COMPLETED' },
      }),
      prisma.vaccination.count({
        where: { userId, standardScheduleId: { not: null }, status: 'PENDING' },
      }),
      prisma.vaccination.count({
        where: { userId, standardScheduleId: { not: null }, status: 'OVERDUE' },
      }),
      prisma.vaccination.count({
        where: { userId, standardScheduleId: { not: null }, status: 'MISSED' },
      }),
      prisma.vaccination.groupBy({
        by: ['batchId'],
        where: { userId, standardScheduleId: { not: null } },
        _count: { id: true },
      }),
    ]);

    const byBatchMap: Record<string, number> = {};
    byBatch.forEach((item) => {
      byBatchMap[item.batchId || 'general'] = item._count.id;
    });

    return {
      total,
      completed,
      pending,
      overdue,
      missed,
      byBatch: byBatchMap,
    };
  }
}

// Singleton instance
let standardVaccinationServiceInstance: StandardVaccinationService | null = null;

export const getStandardVaccinationService = (): StandardVaccinationService => {
  if (!standardVaccinationServiceInstance) {
    standardVaccinationServiceInstance = new StandardVaccinationService();
  }
  return standardVaccinationServiceInstance;
};
