import {
  PrismaClient,
  Vaccination,
  VaccinationStatus,
  ReminderType,
} from "@prisma/client";
import { getReminderService } from "./reminderService";

const prisma = new PrismaClient();
const reminderService = getReminderService();

export interface CreateVaccinationData {
  vaccineName: string;
  scheduledDate: Date;
  notes?: string;
  batchId?: string;
  farmId?: string;
  userId: string;
  doseNumber?: number;
  totalDoses?: number;
  daysBetweenDoses?: number;
}

export interface MultiDoseVaccinationData {
  vaccineName: string;
  firstDoseDate: Date;
  totalDoses: number;
  daysBetweenDoses: number;
  notes?: string;
  batchId?: string;
  farmId?: string;
  userId: string;
}

export interface UpdateVaccinationData {
  vaccineName?: string;
  scheduledDate?: Date;
  completedDate?: Date;
  status?: VaccinationStatus;
  notes?: string;
  doseNumber?: number;
  totalDoses?: number;
  daysBetweenDoses?: number;
}

export class VaccinationService {
  /**
   * Create a new vaccination with auto-reminder generation
   */
  async createVaccination(data: CreateVaccinationData): Promise<Vaccination> {
    const vaccination = await prisma.vaccination.create({
      data: {
        vaccineName: data.vaccineName,
        scheduledDate: data.scheduledDate,
        notes: data.notes,
        batchId: data.batchId && data.batchId.trim() !== '' ? data.batchId : undefined,
        farmId: data.farmId && data.farmId.trim() !== '' ? data.farmId : undefined,
        userId: data.userId,
        doseNumber: data.doseNumber || 1,
        totalDoses: data.totalDoses || 1,
        daysBetweenDoses: data.daysBetweenDoses,
        status: "PENDING",
      },
      include: {
        batch: {
          select: { id: true, batchNumber: true },
        },
        farm: {
          select: { id: true, name: true },
        },
        user: {
          select: { id: true, name: true },
        },
      },
    });

    // Auto-generate reminder for this vaccination
    await this.generateVaccinationReminders(vaccination.id);

    return vaccination;
  }

  /**
   * Create multi-dose vaccination schedule
   */
  async createMultiDoseVaccination(
    data: MultiDoseVaccinationData
  ): Promise<Vaccination[]> {
    const vaccinations: Vaccination[] = [];

    for (let dose = 1; dose <= data.totalDoses; dose++) {
      const scheduledDate = new Date(data.firstDoseDate);
      scheduledDate.setDate(
        scheduledDate.getDate() + (dose - 1) * data.daysBetweenDoses
      );

      const vaccination = await this.createVaccination({
        vaccineName: data.vaccineName,
        scheduledDate,
        notes: data.notes,
        batchId: data.batchId && data.batchId.trim() !== '' ? data.batchId : undefined,
        farmId: data.farmId && data.farmId.trim() !== '' ? data.farmId : undefined,
        userId: data.userId,
        doseNumber: dose,
        totalDoses: data.totalDoses,
        daysBetweenDoses: data.daysBetweenDoses,
      });

      vaccinations.push(vaccination);
    }

    return vaccinations;
  }

  /**
   * Auto-generate reminders for vaccination
   */
  async generateVaccinationReminders(vaccinationId: string): Promise<void> {
    const vaccination = await prisma.vaccination.findUnique({
      where: { id: vaccinationId },
      include: {
        batch: {
          select: { id: true, batchNumber: true },
        },
        farm: {
          select: { id: true, name: true },
        },
        user: {
          select: { id: true, name: true },
        },
      },
    });

    if (!vaccination) {
      throw new Error("Vaccination not found");
    }

    // Don't create duplicate reminders
    if (vaccination.reminderCreated) {
      return;
    }

    // Create main vaccination reminder
    const reminder = await reminderService.createReminder(vaccination.userId, {
      title: `🩺 Vaccination: ${vaccination.vaccineName}`,
      description: this.getVaccinationDescription(vaccination as any),
      type: "VACCINATION",
      dueDate: vaccination.scheduledDate,
      isRecurring: false,
      recurrencePattern: "NONE",
      farmId: vaccination.farmId as string,
      batchId: vaccination.batchId as string,
      data: {
        vaccinationId: vaccination.id,
        vaccineName: vaccination.vaccineName,
        doseNumber: vaccination.doseNumber,
        totalDoses: vaccination.totalDoses,
        reminderType: "vaccination",
      },
    });

    // Create "vaccination tomorrow" reminder (1 day before)
    const tomorrowDate = new Date(vaccination.scheduledDate);
    tomorrowDate.setDate(tomorrowDate.getDate() - 1);

    if (tomorrowDate > new Date()) {
      await reminderService.createReminder(vaccination.userId, {
        title: `🩺 Vaccination Tomorrow: ${vaccination.vaccineName}`,
        description: `Prepare for ${vaccination.vaccineName} vaccination${vaccination.batch ? ` for Batch ${vaccination.batch.batchNumber}` : ""}`,
        type: "VACCINATION",
        dueDate: tomorrowDate,
        isRecurring: false,
        recurrencePattern: "NONE",
        farmId: vaccination.farmId as string,
        batchId: vaccination.batchId as string,
        data: {
          vaccinationId: vaccination.id,
          vaccineName: vaccination.vaccineName,
          doseNumber: vaccination.doseNumber,
          totalDoses: vaccination.totalDoses,
          reminderType: "vaccination_tomorrow",
        },
      });
    }

    // Update vaccination to mark reminder as created
    await prisma.vaccination.update({
      where: { id: vaccinationId },
      data: {
        reminderCreated: true,
        reminderId: reminder.id,
      },
    });
  }

  /**
   * Mark vaccination as completed
   */
  async markVaccinationCompleted(
    vaccinationId: string,
    userId: string
  ): Promise<Vaccination> {
    const vaccination = await prisma.vaccination.findFirst({
      where: {
        id: vaccinationId,
        userId,
      },
      include: {
        batch: {
          select: { id: true, batchNumber: true },
        },
        farm: {
          select: { id: true, name: true },
        },
      },
    });

    if (!vaccination) {
      throw new Error("Vaccination not found or access denied");
    }

    const completedVaccination = await prisma.vaccination.update({
      where: { id: vaccinationId },
      data: {
        status: "COMPLETED",
        completedDate: new Date(),
      },
      include: {
        batch: {
          select: { id: true, batchNumber: true },
        },
        farm: {
          select: { id: true, name: true },
        },
        user: {
          select: { id: true, name: true },
        },
      },
    });

    // Update related reminder status
    if (vaccination.reminderId) {
      await reminderService.markAsCompleted(vaccination.reminderId, userId);
    }

    // If this is a multi-dose vaccination, create next dose if needed
    if (
      vaccination.totalDoses > 1 &&
      vaccination.doseNumber < vaccination.totalDoses
    ) {
      await this.createNextDose(vaccination);
    }

    return completedVaccination;
  }

  /**
   * Create next dose for multi-dose vaccination
   */
  private async createNextDose(
    completedVaccination: Vaccination
  ): Promise<Vaccination> {
    const nextDoseNumber = completedVaccination.doseNumber + 1;
    const nextScheduledDate = new Date(completedVaccination.scheduledDate);
    nextScheduledDate.setDate(
      nextScheduledDate.getDate() + (completedVaccination.daysBetweenDoses || 0)
    );

    return await this.createVaccination({
      vaccineName: completedVaccination.vaccineName,
      scheduledDate: nextScheduledDate,
      notes: completedVaccination.notes as string,
      batchId: completedVaccination.batchId as string,
      farmId: completedVaccination.farmId as string,
      userId: completedVaccination.userId,
      doseNumber: nextDoseNumber,
      totalDoses: completedVaccination.totalDoses,
      daysBetweenDoses: completedVaccination.daysBetweenDoses as number,
    });
  }

  /**
   * Get vaccinations for a specific batch
   */
  async getBatchVaccinations(
    batchId: string,
    userId: string
  ): Promise<Vaccination[]> {
    return await prisma.vaccination.findMany({
      where: {
        batchId,
        userId,
      },
      include: {
        batch: {
          select: { id: true, batchNumber: true },
        },
        farm: {
          select: { id: true, name: true },
        },
        reminder: {
          select: { id: true, status: true, dueDate: true },
        },
      },
      orderBy: { scheduledDate: "asc" },
    });
  }

  /**
   * Get upcoming vaccinations for a user
   */
  async getUpcomingVaccinations(
    userId: string,
    days: number = 7
  ): Promise<Vaccination[]> {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    return await prisma.vaccination.findMany({
      where: {
        userId,
        status: "PENDING",
        scheduledDate: {
          gte: new Date(),
          lte: endDate,
        },
      },
      include: {
        batch: {
          select: { id: true, batchNumber: true },
        },
        farm: {
          select: { id: true, name: true },
        },
        reminder: {
          select: { id: true, status: true, dueDate: true },
        },
      },
      orderBy: { scheduledDate: "asc" },
    });
  }

  /**
   * Get overdue vaccinations
   */
  async getOverdueVaccinations(userId: string): Promise<Vaccination[]> {
    return await prisma.vaccination.findMany({
      where: {
        userId,
        status: "PENDING",
        scheduledDate: {
          lt: new Date(),
        },
      },
      include: {
        batch: {
          select: { id: true, batchNumber: true },
        },
        farm: {
          select: { id: true, name: true },
        },
        reminder: {
          select: { id: true, status: true, dueDate: true },
        },
      },
      orderBy: { scheduledDate: "asc" },
    });
  }

  /**
   * Update vaccination
   */
  async updateVaccination(
    vaccinationId: string,
    userId: string,
    data: UpdateVaccinationData
  ): Promise<Vaccination> {
    // Verify ownership
    const existingVaccination = await prisma.vaccination.findFirst({
      where: {
        id: vaccinationId,
        userId,
      },
    });

    if (!existingVaccination) {
      throw new Error("Vaccination not found or access denied");
    }

    return await prisma.vaccination.update({
      where: { id: vaccinationId },
      data,
      include: {
        batch: {
          select: { id: true, batchNumber: true },
        },
        farm: {
          select: { id: true, name: true },
        },
        user: {
          select: { id: true, name: true },
        },
        reminder: {
          select: { id: true, status: true, dueDate: true },
        },
      },
    });
  }

  /**
   * Update vaccination status only
   */
  async updateVaccinationStatus(
    vaccinationId: string,
    userId: string,
    status: VaccinationStatus
  ): Promise<Vaccination> {
    // Verify ownership
    const existingVaccination = await prisma.vaccination.findFirst({
      where: {
        id: vaccinationId,
        userId,
      },
    });

    if (!existingVaccination) {
      throw new Error("Vaccination not found or access denied");
    }

    // Update only the status
    const updatedVaccination = await prisma.vaccination.update({
      where: { id: vaccinationId },
      data: { status },
      include: {
        batch: {
          select: { id: true, batchNumber: true },
        },
        farm: {
          select: { id: true, name: true },
        },
        user: {
          select: { id: true, name: true },
        },
        reminder: {
          select: { id: true, status: true, dueDate: true },
        },
      },
    });

    return updatedVaccination;
  }

  /**
   * Delete vaccination
   */
  async deleteVaccination(
    vaccinationId: string,
    userId: string
  ): Promise<boolean> {
    // Verify ownership
    const existingVaccination = await prisma.vaccination.findFirst({
      where: {
        id: vaccinationId,
        userId,
      },
    });

    if (!existingVaccination) {
      throw new Error("Vaccination not found or access denied");
    }

    // Delete related reminder if exists
    if (existingVaccination.reminderId) {
      await reminderService.deleteReminder(
        existingVaccination.reminderId,
        userId
      );
    }

    // Delete vaccination
    await prisma.vaccination.delete({
      where: { id: vaccinationId },
    });

    return true;
  }

  /**
   * Delete an entire vaccination schedule (all doses)
   */
  async deleteVaccinationSchedule(scheduleId: string, userId: string): Promise<void> {
    // Get the first vaccination to identify the schedule
    const firstVaccination = await prisma.vaccination.findFirst({
      where: { id: scheduleId, userId },
    });

    if (!firstVaccination) {
      throw new Error("Vaccination schedule not found or access denied");
    }

    // Find all vaccinations in this schedule
    const vaccinations = await prisma.vaccination.findMany({
      where: {
        userId,
        vaccineName: firstVaccination.vaccineName,
        batchId: firstVaccination.batchId,
        farmId: firstVaccination.farmId,
      },
    });

    // Delete all reminders and vaccinations in the schedule
    for (const vaccination of vaccinations) {
      if (vaccination.reminderId) {
        await reminderService.deleteReminder(vaccination.reminderId, userId);
      }
      
      await prisma.vaccination.delete({
        where: { id: vaccination.id },
      });
    }
  }

  /**
   * Sync vaccination reminders (for cron job)
   */
  async syncVaccinationReminders(): Promise<void> {
    // Find vaccinations that need reminders created
    const vaccinationsNeedingReminders = await prisma.vaccination.findMany({
      where: {
        reminderCreated: false,
        status: "PENDING",
      },
      include: {
        batch: {
          select: { id: true, batchNumber: true },
        },
        farm: {
          select: { id: true, name: true },
        },
        user: {
          select: { id: true, name: true },
        },
      },
    });

    for (const vaccination of vaccinationsNeedingReminders) {
      await this.generateVaccinationReminders(vaccination.id);
    }
  }

  /**
   * Get all vaccination schedules (grouped by vaccine name and context)
   */
  async getAllVaccinationSchedules(userId: string): Promise<any[]> {
    const vaccinations = await prisma.vaccination.findMany({
      where: { userId },
      include: {
        batch: true,
        farm: true,
        reminder: true,
      },
      orderBy: [
        { vaccineName: 'asc' },
        { scheduledDate: 'asc' }
      ],
    });

    // Group vaccinations by vaccine name and context (batch/farm)
    const scheduleMap = new Map<string, any>();

    vaccinations.forEach((vaccination) => {
      // Create a unique key for each schedule
      const key = `${vaccination.vaccineName}-${vaccination.batchId || 'no-batch'}-${vaccination.farmId || 'no-farm'}`;
      
      if (!scheduleMap.has(key)) {
        // Create schedule entry with first vaccination as template
        scheduleMap.set(key, {
          id: vaccination.id, // Use first vaccination ID as schedule ID
          vaccineName: vaccination.vaccineName,
          totalDoses: vaccination.totalDoses,
          daysBetweenDoses: vaccination.daysBetweenDoses,
          notes: vaccination.notes,
          batchId: vaccination.batchId,
          farmId: vaccination.farmId,
          batch: vaccination.batch,
          farm: vaccination.farm,
          firstDoseDate: vaccination.scheduledDate,
          lastDoseDate: vaccination.scheduledDate,
          doses: [],
          status: vaccination.status,
          completedDoses: 0,
          pendingDoses: 0,
          overdueDoses: 0,
        });
      }

      const schedule = scheduleMap.get(key)!;
      
      // Add dose to schedule
      schedule.doses.push({
        id: vaccination.id,
        doseNumber: vaccination.doseNumber,
        scheduledDate: vaccination.scheduledDate,
        completedDate: vaccination.completedDate,
        status: vaccination.status,
        reminder: vaccination.reminder,
      });

      // Update schedule statistics
      if (vaccination.status === "COMPLETED") {
        schedule.completedDoses++;
      } else if (vaccination.status === "PENDING") {
        const now = new Date();
        if (vaccination.scheduledDate < now) {
          schedule.overdueDoses++;
        } else {
          schedule.pendingDoses++;
        }
      }

      // Update date range
      if (vaccination.scheduledDate < schedule.firstDoseDate) {
        schedule.firstDoseDate = vaccination.scheduledDate;
      }
      if (vaccination.scheduledDate > schedule.lastDoseDate) {
        schedule.lastDoseDate = vaccination.scheduledDate;
      }

      // Update overall status
      if (vaccination.status === "PENDING" && schedule.status !== "OVERDUE") {
        const now = new Date();
        if (vaccination.scheduledDate < now) {
          schedule.status = "OVERDUE";
        } else {
          schedule.status = "PENDING";
        }
      }
    });

    return Array.from(scheduleMap.values());
  }

  /**
   * Get vaccination statistics
   */
  async getVaccinationStats(userId: string): Promise<{
    total: number;
    pending: number;
    completed: number;
    overdue: number;
    byBatch: Record<string, number>;
  }> {
    const [total, pending, completed, overdue, byBatch] = await Promise.all([
      prisma.vaccination.count({ where: { userId } }),
      prisma.vaccination.count({
        where: {
          userId,
          status: "PENDING",
          scheduledDate: { gte: new Date() },
        },
      }),
      prisma.vaccination.count({ where: { userId, status: "COMPLETED" } }),
      prisma.vaccination.count({
        where: {
          userId,
          status: "PENDING",
          scheduledDate: { lt: new Date() },
        },
      }),
      prisma.vaccination.groupBy({
        by: ["batchId"],
        where: { userId },
        _count: { id: true },
      }),
    ]);

    const byBatchMap: Record<string, number> = {};
    byBatch.forEach((item) => {
      byBatchMap[item.batchId || "general"] = item._count.id;
    });

    return {
      total,
      pending,
      completed,
      overdue,
      byBatch: byBatchMap,
    };
  }

  /**
   * Helper method to generate vaccination description
   */
  private getVaccinationDescription(
    vaccination: Vaccination & {
      batch?: { batchNumber: string };
      farm?: { name: string };
    }
  ): string {
    let description = `${vaccination.vaccineName} vaccination`;

    if (vaccination.totalDoses > 1) {
      description += ` (Dose ${vaccination.doseNumber}/${vaccination.totalDoses})`;
    }

    if (vaccination.batch) {
      description += ` for Batch ${vaccination.batch.batchNumber}`;
    } else if (vaccination.farm) {
      description += ` for ${vaccination.farm.name}`;
    }

    if (vaccination.notes) {
      description += ` - ${vaccination.notes}`;
    }

    return description;
  }
}

// Singleton instance
let vaccinationServiceInstance: VaccinationService | null = null;

export const getVaccinationService = (): VaccinationService => {
  if (!vaccinationServiceInstance) {
    vaccinationServiceInstance = new VaccinationService();
  }
  return vaccinationServiceInstance;
};
