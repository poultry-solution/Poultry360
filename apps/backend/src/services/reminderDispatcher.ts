import { ReminderAudience, ReminderModule } from "@prisma/client";
import prisma from "../utils/prisma";
import { notifyUser } from "./notificationService";
import { isStaffAccountFeatureEnabled } from "./staffAccountService";
import {
  MANAGE_PERMISSION_BY_MODULE,
  ROLE_BY_MODULE,
  reminderInclude,
  type ReminderWithLinks,
} from "./reminderService";

const BATCH_SIZE = 200;
const MAX_ROUNDS_PER_TICK = 5;

const HOME_URL: Record<ReminderModule, string> = {
  FARMER: "/farmer/dashboard/home",
  HATCHERY: "/hatchery/dashboard/home",
};

/** Page to open when the alert is tapped: the linked record, else the module Home. */
export function reminderUrl(r: ReminderWithLinks): string {
  if (r.module === ReminderModule.FARMER) {
    if (r.batch) return `/farmer/dashboard/batches/${r.batch.id}`;
    return HOME_URL.FARMER;
  }
  if (r.hatcheryBatch) return `/hatchery/dashboard/batches/${r.hatcheryBatch.id}`;
  if (r.incubation) return `/hatchery/dashboard/incubations/${r.incubation.id}`;
  if (r.hatcheryParty) return `/hatchery/dashboard/parties/${r.hatcheryParty.id}`;
  return HOME_URL[r.module];
}

/** "Farm A - B-12", "IN-009", "Ram Traders" … or "" when not linked. */
export function reminderContext(r: ReminderWithLinks): string {
  if (r.module === ReminderModule.FARMER) {
    return [r.farm?.name, r.batch?.batchNumber].filter(Boolean).join(" - ");
  }
  return r.hatcheryBatch?.code ?? r.incubation?.code ?? r.hatcheryParty?.name ?? "";
}

/**
 * Staff logins who should get this reminder now. Skips staff who are switched
 * off, lost the module permission, or whose owner turned staff access off.
 */
async function staffRecipients(r: ReminderWithLinks): Promise<string[]> {
  const role = ROLE_BY_MODULE[r.module];
  if (!(await isStaffAccountFeatureEnabled(r.userId, role))) return [];

  const permission = MANAGE_PERMISSION_BY_MODULE[r.module];
  const base = { ownerId: r.userId, accountRole: role, isActive: true, permissions: { has: permission } };

  if (r.audience === ReminderAudience.EVERYONE) {
    const staff = await prisma.staffUser.findMany({ where: base, select: { id: true } });
    return staff.map((s) => s.id);
  }
  const ids = r.recipients.map((x) => x.staffUser.id);
  if (ids.length === 0) return [];
  const staff = await prisma.staffUser.findMany({ where: { ...base, id: { in: ids } }, select: { id: true } });
  return staff.map((s) => s.id);
}

async function sendOne(r: ReminderWithLinks) {
  const context = reminderContext(r);
  const body = context ? `${r.title} (${context})` : r.title;
  const data = {
    url: reminderUrl(r),
    reminderId: r.id,
    module: r.module,
    farmId: r.farmId,
    batchId: r.batchId,
    hatcheryBatchId: r.hatcheryBatchId,
    incubationId: r.incubationId,
    hatcheryPartyId: r.hatcheryPartyId,
  };

  if (r.notifyOwner) {
    const owner = await prisma.user.findUnique({ where: { id: r.userId }, select: { language: true } });
    const title = r.module === ReminderModule.FARMER && owner?.language === "NEPALI" ? "रिमाइन्डर" : "Reminder";
    await notifyUser(r.userId, { type: "REMINDER_DUE", title, body, data, sendPush: true });
  }

  for (const staffUserId of await staffRecipients(r)) {
    await notifyUser(r.userId, {
      type: "REMINDER_DUE",
      title: "Reminder",
      body,
      data,
      sendPush: true,
      staffUserId,
    });
  }
}

/**
 * Send alerts for reminders whose time has come. Each reminder is claimed
 * (notifiedAt set) BEFORE sending, so two server copies or overlapping ticks
 * can never send the same reminder twice.
 */
export async function dispatchDueReminders() {
  let dispatched = 0;

  for (let round = 0; round < MAX_ROUNDS_PER_TICK; round += 1) {
    const now = new Date();
    const due = await prisma.reminder.findMany({
      where: { reminderDate: { lte: now }, notifiedAt: null, doneAt: null },
      take: BATCH_SIZE,
      orderBy: { reminderDate: "asc" },
      include: reminderInclude,
    });

    for (const reminder of due) {
      const claimed = await prisma.reminder.updateMany({
        where: { id: reminder.id, notifiedAt: null, doneAt: null },
        // isNoticed kept in step for any old backend still running during a deploy.
        data: { notifiedAt: now, isNoticed: true },
      });
      if (claimed.count !== 1) continue;

      try {
        await sendOne(reminder);
        dispatched += 1;
      } catch (err) {
        // Not retried: a second try could send twice. It still shows on Home.
        console.error(`[reminder-dispatch] Failed for reminder ${reminder.id}:`, err);
      }
    }

    if (due.length < BATCH_SIZE) break;
  }

  return { dispatched };
}

let intervalId: ReturnType<typeof setInterval> | null = null;
let running = false;

async function tick(label: string) {
  if (running) return; // a slow tick is still going; skip instead of overlapping
  running = true;
  try {
    const result = await dispatchDueReminders();
    if (result.dispatched > 0 || label === "Initial run") {
      console.log(`[reminder-dispatcher] ${label}: dispatched=${result.dispatched}`);
    }
  } catch (e) {
    console.error(`[reminder-dispatcher] ${label} error:`, e);
  } finally {
    running = false;
  }
}

/** Start the reminder dispatcher loop (runs every intervalMs, default 60s). */
export function startReminderDispatcher(intervalMs = 60_000) {
  if (intervalId) return;

  console.log(`[reminder-dispatcher] Starting, interval=${intervalMs}ms`);
  void tick("Initial run");
  intervalId = setInterval(() => void tick("Tick"), intervalMs);
}

export function stopReminderDispatcher() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
