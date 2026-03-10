import prisma from "../utils/prisma";
import { notifyUser } from "./notificationService";

const BATCH_SIZE = 200;

/**
 * Dispatch notifications for all due reminders that haven't been notified yet.
 * Designed to be called on a fixed interval (e.g. every 60s).
 * Uses a "notifiedAt" field to ensure each reminder only fires once.
 */
export async function dispatchDueReminders() {
  const now = new Date();

  const dueReminders = await prisma.reminder.findMany({
    where: {
      reminderDate: { lte: now },
      isNoticed: false,
    },
    take: BATCH_SIZE,
    orderBy: { reminderDate: "asc" },
    include: { farm: true, batch: true },
  });

  if (dueReminders.length === 0) return { dispatched: 0 };

  let dispatched = 0;

  for (const reminder of dueReminders) {
    try {
      const context = [reminder.farm?.name, reminder.batch?.batchNumber]
        .filter(Boolean)
        .join(" - ");

      await notifyUser(reminder.userId, {
        type: "REMINDER_DUE",
        title: "Reminder",
        body: context ? `${reminder.title} (${context})` : reminder.title,
        data: {
          url: "/farmer/dashboard",
          reminderId: reminder.id,
          farmId: reminder.farmId,
          batchId: reminder.batchId,
        },
        sendPush: true,
      });

      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { isNoticed: true },
      });

      dispatched++;
    } catch (err) {
      console.error(`[reminder-dispatch] Failed for reminder ${reminder.id}:`, err);
    }
  }

  return { dispatched };
}

let intervalId: ReturnType<typeof setInterval> | null = null;

/** Start the reminder dispatcher loop (runs every intervalMs, default 60s). */
export function startReminderDispatcher(intervalMs = 60_000) {
  if (intervalId) return;

  console.log(`[reminder-dispatcher] Starting, interval=${intervalMs}ms`);

  // Run once immediately on startup
  dispatchDueReminders()
    .then((r) => console.log(`[reminder-dispatcher] Initial run: dispatched=${r.dispatched}`))
    .catch((e) => console.error("[reminder-dispatcher] Initial run error:", e));

  intervalId = setInterval(async () => {
    try {
      const result = await dispatchDueReminders();
      if (result.dispatched > 0) {
        console.log(`[reminder-dispatcher] dispatched=${result.dispatched}`);
      }
    } catch (e) {
      console.error("[reminder-dispatcher] tick error:", e);
    }
  }, intervalMs);
}

export function stopReminderDispatcher() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[reminder-dispatcher] Stopped");
  }
}
