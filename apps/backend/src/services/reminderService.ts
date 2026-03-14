import prisma from "../utils/prisma";

export interface CreateReminderInput {
  userId: string;
  title: string;
  reminderDate: Date; // full datetime (date + time)
  farmId?: string | null;
  batchId?: string | null;
}

export async function createReminder(input: CreateReminderInput) {
  const reminder = await prisma.reminder.create({
    data: {
      userId: input.userId,
      title: input.title,
      reminderDate: input.reminderDate,
      farmId: input.farmId || undefined,
      batchId: input.batchId || undefined,
    },
    include: {
      farm: { select: { id: true, name: true } },
      batch: { select: { id: true, batchNumber: true } },
    },
  });
  return reminder;
}

export type ReminderListType = "due" | "upcoming" | "all";

export async function listReminders(userId: string, type: ReminderListType = "due") {
  const now = new Date();

  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const where: any = { userId };
  if (type === "due") {
    where.reminderDate = { lte: now };
  } else if (type === "upcoming") {
    // Upcoming = within next 24 hours only
    where.reminderDate = { gt: now, lte: in24h };
  }

  const reminders = await prisma.reminder.findMany({
    where,
    include: {
      farm: { select: { id: true, name: true } },
      batch: { select: { id: true, batchNumber: true } },
    },
    orderBy: [{ reminderDate: "asc" }, { createdAt: "desc" }],
  });
  return reminders;
}

export async function deleteReminder(reminderId: string, userId: string) {
  const deleted = await prisma.reminder.deleteMany({
    where: { id: reminderId, userId },
  });
  return deleted.count > 0;
}
