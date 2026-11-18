import { Request, Response } from "express";
import {
  ReminderActor,
  ReminderError,
  ReminderListType,
  createReminder,
  deleteReminder,
  listActiveReminders,
  listDoneReminders,
  listReminderPeople,
  listRemindersLegacy,
  markReminderDone,
  snoozeReminder,
  undoReminderDone,
  updateReminder,
} from "../services/reminderService";

function actorOf(req: Request): ReminderActor | null {
  if (!req.userId) return null;
  return { ownerId: req.userId, role: req.role, staffUserId: req.staffUserId ?? null };
}

/** Send a clear message for known problems; hide everything else. */
function handle(res: Response, label: string, error: unknown) {
  if (error instanceof ReminderError) {
    return res.status(error.status).json({ success: false, message: error.message, error: error.message });
  }
  console.error(`${label} error:`, error);
  return res.status(500).json({ success: false, message: "Something went wrong. Please try again." });
}

function withActor(
  label: string,
  run: (req: Request, res: Response, actor: ReminderActor) => Promise<unknown>
) {
  return async (req: Request, res: Response) => {
    const actor = actorOf(req);
    if (!actor) return res.status(401).json({ success: false, message: "Unauthorized" });
    try {
      await run(req, res, actor);
    } catch (error) {
      handle(res, label, error);
    }
  };
}

export const listRemindersHandler = withActor("List reminders", async (req, res, actor) => {
  // Old app versions send ?type=due|upcoming|all.
  if (req.query.type !== undefined) {
    const type = String(req.query.type) as ReminderListType;
    if (!["due", "upcoming", "all"].includes(type)) {
      return res.status(400).json({ success: false, message: "Invalid type" });
    }
    const data = await listRemindersLegacy(actor, type);
    return res.json({ success: true, data });
  }

  const view = String(req.query.view ?? "active");
  if (view === "done") {
    const limit = Math.min(Math.max(parseInt(String(req.query.limit), 10) || 20, 1), 50);
    const offset = Math.max(parseInt(String(req.query.offset), 10) || 0, 0);
    const { items, total } = await listDoneReminders(actor, limit, offset);
    return res.json({ success: true, data: items, total });
  }
  if (view !== "active") return res.status(400).json({ success: false, message: "Invalid view" });
  const data = await listActiveReminders(actor);
  return res.json({ success: true, data });
});

export const listReminderPeopleHandler = withActor("List reminder people", async (_req, res, actor) => {
  const data = await listReminderPeople(actor);
  return res.json({ success: true, data });
});

export const createReminderHandler = withActor("Create reminder", async (req, res, actor) => {
  const data = await createReminder(actor, req.body ?? {});
  res.locals.auditTargetId = data.id;
  return res.status(201).json({ success: true, data });
});

export const updateReminderHandler = withActor("Update reminder", async (req, res, actor) => {
  const data = await updateReminder(actor, req.params.id, req.body ?? {});
  return res.json({ success: true, data });
});

export const doneReminderHandler = withActor("Mark reminder done", async (req, res, actor) => {
  const result = await markReminderDone(actor, req.params.id);
  return res.json({
    success: true,
    data: result.reminder,
    alreadyDone: result.alreadyDone,
    next: result.next,
  });
});

export const undoReminderHandler = withActor("Undo reminder", async (req, res, actor) => {
  const result = await undoReminderDone(actor, req.params.id);
  return res.json({ success: true, data: result.reminder, nextAlreadyMade: result.nextAlreadyMade });
});

export const snoozeReminderHandler = withActor("Snooze reminder", async (req, res, actor) => {
  const data = await snoozeReminder(actor, req.params.id, req.body?.until);
  return res.json({ success: true, data });
});

export const deleteReminderHandler = withActor("Delete reminder", async (req, res, actor) => {
  const deleted = await deleteReminder(actor, req.params.id);
  if (!deleted) return res.status(404).json({ success: false, message: "Reminder not found" });
  return res.json({ success: true });
});
