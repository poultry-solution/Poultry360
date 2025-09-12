import { Request, Response } from "express";
import prisma from "../utils/prisma";
import {
  UserRole,
  ReminderType,
  ReminderStatus,
  RecurrencePattern,
} from "@prisma/client";

import { z } from "zod";

// ==================== SCHEMAS ====================

const CreateReminderSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  type: z.nativeEnum(ReminderType),
  dueDate: z.string().datetime(),
  isRecurring: z.boolean().optional().default(false),
  recurrencePattern: z
    .nativeEnum(RecurrencePattern)
    .optional()
    .default(RecurrencePattern.NONE),
  recurrenceInterval: z.number().int().positive().optional(),
  farmId: z.string().optional(),
  batchId: z.string().optional(),
  data: z.any().optional(), // JSON data for specific reminder types
});

const UpdateReminderSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  type: z.nativeEnum(ReminderType).optional(),
  dueDate: z.string().datetime().optional(),
  isRecurring: z.boolean().optional(),
  recurrencePattern: z.nativeEnum(RecurrencePattern).optional(),
  recurrenceInterval: z.number().int().positive().optional(),
  status: z.nativeEnum(ReminderStatus).optional(),
  farmId: z.string().nullable().optional(),
  batchId: z.string().nullable().optional(),
  data: z.any().optional(),
});

// ==================== GET ALL REMINDERS ====================
export const getAllReminders = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      status,
      farmId,
      batchId,
      dueDate,
      search,
    } = req.query;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause
    const where: any = {
      userId: currentUserId,
    };

    if (type) {
      where.type = type as ReminderType;
    }

    if (status) {
      where.status = status as ReminderStatus;
    }

    if (farmId) {
      where.farmId = farmId as string;
    }

    if (batchId) {
      where.batchId = batchId as string;
    }

    if (dueDate) {
      const date = new Date(dueDate as string);
      where.dueDate = {
        gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
        lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
      };
    }

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: "insensitive" } },
        { description: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const [reminders, total] = await Promise.all([
      prisma.reminder.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          farm: {
            select: {
              id: true,
              name: true,
            },
          },
          batch: {
            select: {
              id: true,
              batchNumber: true,
            },
          },
        },
        orderBy: { dueDate: "asc" },
      }),
      prisma.reminder.count({ where }),
    ]);

    return res.json({
      success: true,
      data: reminders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get all reminders error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET REMINDER BY ID ====================
export const getReminderById = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;

    const reminder = await prisma.reminder.findFirst({
      where: {
        id,
        userId: currentUserId,
      },
      include: {
        farm: {
          select: {
            id: true,
            name: true,
          },
        },
        batch: {
          select: {
            id: true,
            batchNumber: true,
          },
        },
      },
    });

    if (!reminder) {
      return res.status(404).json({ message: "Reminder not found" });
    }

    return res.json({
      success: true,
      data: reminder,
    });
  } catch (error) {
    console.error("Get reminder by ID error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== CREATE REMINDER ====================
export const createReminder = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const currentUserId = req.userId;

    // Validate request body
    const { success, data, error } = CreateReminderSchema.safeParse(req.body);
    if (!success) {
      return res.status(400).json({ message: error?.message });
    }

    // Validate farm access if farmId is provided
    if (data.farmId) {
      const farm = await prisma.farm.findFirst({
        where: {
          id: data.farmId,
          OR: [
            { ownerId: currentUserId },
            { managers: { some: { id: currentUserId } } },
          ],
        },
      });

      if (!farm) {
        return res.status(403).json({ message: "Access denied to farm" });
      }
    }

    // Validate batch access if batchId is provided
    if (data.batchId) {
      const batch = await prisma.batch.findFirst({
        where: {
          id: data.batchId,
          farm: {
            OR: [
              { ownerId: currentUserId },
              { managers: { some: { id: currentUserId } } },
            ],
          },
        },
      });

      if (!batch) {
        return res.status(403).json({ message: "Access denied to batch" });
      }
    }

    // Create reminder
    const reminder = await prisma.reminder.create({
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        dueDate: new Date(data.dueDate),
        isRecurring: data.isRecurring,
        recurrencePattern: data.recurrencePattern,
        recurrenceInterval: data.recurrenceInterval,
        farmId: data.farmId || null,
        batchId: data.batchId || null,
        data: data.data || null,
        userId: currentUserId as string,
      },
      include: {
        farm: {
          select: {
            id: true,
            name: true,
          },
        },
        batch: {
          select: {
            id: true,
            batchNumber: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      data: reminder,
      message: "Reminder created successfully",
    });
  } catch (error) {
    console.error("Create reminder error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== UPDATE REMINDER ====================
export const updateReminder = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;

    // Validate request body
    const { success, data, error } = UpdateReminderSchema.safeParse(req.body);
    if (!success) {
      return res.status(400).json({ message: error?.message });
    }

    // Check if reminder exists and belongs to user
    const existingReminder = await prisma.reminder.findFirst({
      where: {
        id,
        userId: currentUserId,
      },
    });

    if (!existingReminder) {
      return res.status(404).json({ message: "Reminder not found" });
    }

    // Validate farm access if farmId is being updated
    if (data.farmId) {
      const farm = await prisma.farm.findFirst({
        where: {
          id: data.farmId,
          OR: [
            { ownerId: currentUserId },
            { managers: { some: { id: currentUserId } } },
          ],
        },
      });

      if (!farm) {
        return res.status(403).json({ message: "Access denied to farm" });
      }
    }

    // Validate batch access if batchId is being updated
    if (data.batchId) {
      const batch = await prisma.batch.findFirst({
        where: {
          id: data.batchId,
          farm: {
            OR: [
              { ownerId: currentUserId },
              { managers: { some: { id: currentUserId } } },
            ],
          },
        },
      });

      if (!batch) {
        return res.status(403).json({ message: "Access denied to batch" });
      }
    }

    // Update reminder
    const updateData: any = { ...data };
    if (data.dueDate) {
      updateData.dueDate = new Date(data.dueDate);
    }

    const updatedReminder = await prisma.reminder.update({
      where: { id },
      data: updateData,
      include: {
        farm: {
          select: {
            id: true,
            name: true,
          },
        },
        batch: {
          select: {
            id: true,
            batchNumber: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      data: updatedReminder,
      message: "Reminder updated successfully",
    });
  } catch (error) {
    console.error("Update reminder error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== DELETE REMINDER ====================
export const deleteReminder = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;

    // Check if reminder exists and belongs to user
    const existingReminder = await prisma.reminder.findFirst({
      where: {
        id,
        userId: currentUserId,
      },
    });

    if (!existingReminder) {
      return res.status(404).json({ message: "Reminder not found" });
    }

    // Delete reminder
    await prisma.reminder.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: "Reminder deleted successfully",
    });
  } catch (error) {
    console.error("Delete reminder error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== MARK REMINDER AS COMPLETED ====================
export const markReminderCompleted = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;

    // Check if reminder exists and belongs to user
    const existingReminder = await prisma.reminder.findFirst({
      where: {
        id,
        userId: currentUserId,
      },
    });

    if (!existingReminder) {
      return res.status(404).json({ message: "Reminder not found" });
    }

    // Update reminder status
    const updatedReminder = await prisma.reminder.update({
      where: { id },
      data: {
        status: ReminderStatus.COMPLETED,
        lastTriggered: new Date(),
      },
      include: {
        farm: {
          select: {
            id: true,
            name: true,
          },
        },
        batch: {
          select: {
            id: true,
            batchNumber: true,
          },
        },
      },
    });

    // If it's a recurring reminder, create the next occurrence
    if (
      existingReminder.isRecurring &&
      existingReminder.recurrencePattern !== RecurrencePattern.NONE
    ) {
      await createNextRecurringReminder(existingReminder);
    }

    return res.json({
      success: true,
      data: updatedReminder,
      message: "Reminder marked as completed",
    });
  } catch (error) {
    console.error("Mark reminder completed error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET UPCOMING REMINDERS ====================
export const getUpcomingReminders = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { days = 7 } = req.query;
    const currentUserId = req.userId;

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + Number(days));

    const reminders = await prisma.reminder.findMany({
      where: {
        userId: currentUserId,
        status: ReminderStatus.PENDING,
        dueDate: {
          gte: new Date(),
          lte: endDate,
        },
      },
      include: {
        farm: {
          select: {
            id: true,
            name: true,
          },
        },
        batch: {
          select: {
            id: true,
            batchNumber: true,
          },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    return res.json({
      success: true,
      data: reminders,
    });
  } catch (error) {
    console.error("Get upcoming reminders error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET OVERDUE REMINDERS ====================
export const getOverdueReminders = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const currentUserId = req.userId;

    const reminders = await prisma.reminder.findMany({
      where: {
        userId: currentUserId,
        status: ReminderStatus.PENDING,
        dueDate: {
          lt: new Date(),
        },
      },
      include: {
        farm: {
          select: {
            id: true,
            name: true,
          },
        },
        batch: {
          select: {
            id: true,
            batchNumber: true,
          },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    // Update status to OVERDUE for overdue reminders
    if (reminders.length > 0) {
      await prisma.reminder.updateMany({
        where: {
          id: { in: reminders.map((r) => r.id) },
        },
        data: {
          status: ReminderStatus.OVERDUE,
        },
      });

      // Update the returned data
      reminders.forEach((reminder) => {
        reminder.status = ReminderStatus.OVERDUE;
      });
    }

    return res.json({
      success: true,
      data: reminders,
    });
  } catch (error) {
    console.error("Get overdue reminders error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET REMINDER STATISTICS ====================
export const getReminderStatistics = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const currentUserId = req.userId;

    const [
      totalReminders,
      pendingReminders,
      completedReminders,
      overdueReminders,
      todayReminders,
    ] = await Promise.all([
      prisma.reminder.count({ where: { userId: currentUserId } }),
      prisma.reminder.count({
        where: {
          userId: currentUserId,
          status: ReminderStatus.PENDING,
        },
      }),
      prisma.reminder.count({
        where: {
          userId: currentUserId,
          status: ReminderStatus.COMPLETED,
        },
      }),
      prisma.reminder.count({
        where: {
          userId: currentUserId,
          status: ReminderStatus.OVERDUE,
        },
      }),
      prisma.reminder.count({
        where: {
          userId: currentUserId,
          status: ReminderStatus.PENDING,
          dueDate: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        totalReminders,
        pendingReminders,
        completedReminders,
        overdueReminders,
        todayReminders,
      },
    });
  } catch (error) {
    console.error("Get reminder statistics error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== HELPER FUNCTIONS ====================

async function createNextRecurringReminder(reminder: any) {
  const nextDueDate = calculateNextDueDate(
    reminder.dueDate,
    reminder.recurrencePattern,
    reminder.recurrenceInterval
  );

  if (nextDueDate) {
    await prisma.reminder.create({
      data: {
        title: reminder.title,
        description: reminder.description,
        type: reminder.type,
        dueDate: nextDueDate,
        isRecurring: reminder.isRecurring,
        recurrencePattern: reminder.recurrencePattern,
        recurrenceInterval: reminder.recurrenceInterval,
        farmId: reminder.farmId,
        batchId: reminder.batchId,
        data: reminder.data,
        userId: reminder.userId,
        status: ReminderStatus.PENDING,
      },
    });
  }
}

function calculateNextDueDate(
  currentDueDate: Date,
  pattern: RecurrencePattern,
  interval: number = 1
): Date | null {
  const nextDate = new Date(currentDueDate);

  switch (pattern) {
    case RecurrencePattern.DAILY:
      nextDate.setDate(nextDate.getDate() + interval);
      break;
    case RecurrencePattern.WEEKLY:
      nextDate.setDate(nextDate.getDate() + 7 * interval);
      break;
    case RecurrencePattern.MONTHLY:
      nextDate.setMonth(nextDate.getMonth() + interval);
      break;
    default:
      return null;
  }

  return nextDate;
}
