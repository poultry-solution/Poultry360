import { Request, Response } from "express";
import {
  createReminder,
  listReminders,
  deleteReminder,
  ReminderListType,
} from "../services/reminderService";

export const createReminderHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { title, reminderDate, farmId, batchId } = req.body;
    if (!title || !reminderDate)
      return res
        .status(400)
        .json({ message: "title and reminderDate are required" });

    const date = new Date(reminderDate);
    if (isNaN(date.getTime()))
      return res.status(400).json({ message: "Invalid reminderDate" });

    const reminder = await createReminder({
      userId,
      title: String(title).trim(),
      reminderDate: date,
      farmId: farmId || null,
      batchId: batchId || null,
    });
    return res.status(201).json({ success: true, data: reminder });
  } catch (error) {
    console.error("Create reminder error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const listRemindersHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const type = (req.query.type as ReminderListType) || "due";
    if (!["due", "upcoming", "all"].includes(type))
      return res.status(400).json({ message: "Invalid type" });

    const reminders = await listReminders(userId, type);
    return res.json({ success: true, data: reminders });
  } catch (error) {
    console.error("List reminders error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteReminderHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;
    const deleted = await deleteReminder(id, userId);
    if (!deleted) return res.status(404).json({ message: "Reminder not found" });
    return res.json({ success: true });
  } catch (error) {
    console.error("Delete reminder error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
