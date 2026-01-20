import { Request, Response } from 'express';
import { getReminderService } from '../services/reminderService';
import { ReminderType, RecurrencePattern } from '@prisma/client';

const reminderService = getReminderService();

/**
 * Get all reminders for the authenticated user
 */
export const getUserReminders = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    const {
      status,
      type,
      farmId,
      batchId,
      page = '1',
      limit = '20'
    } = req.query;

    const options: any = {
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    };

    if (status) options.status = status as any;
    if (type) options.type = type as ReminderType;
    if (farmId) options.farmId = farmId as string;
    if (batchId) options.batchId = batchId as string;

    const result = await reminderService.getUserReminders(userId, options);

    res.json({
      success: true,
      data: result.reminders,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: result.totalCount,
        hasMore: result.hasMore
      }
    });
  } catch (error: any) {
    console.error('Error getting user reminders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get reminders'
    });
  }
};

/**
 * Create a new reminder
 */
export const createReminder = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    const {
      title,
      description,
      type,
      dueDate,
      isRecurring = false,
      recurrencePattern = 'NONE',
      recurrenceInterval = 1,
      farmId,
      batchId,
      data
    } = req.body;

    console.log('Reminder data:', req.body);

    // Validate required fields
    if (!title || !type || !dueDate) {
      return res.status(400).json({
        success: false,
        error: 'Title, type, and due date are required'
      });
    }

    // Validate enum values
    if (!Object.values(ReminderType).includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid reminder type'
      });
    }

    if (!Object.values(RecurrencePattern).includes(recurrencePattern)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid recurrence pattern'
      });
    }

    console.log("creating reminder with data2:", {
      title,
      description,
      type,
      dueDate: new Date(dueDate),
      isRecurring,
      recurrencePattern,
      recurrenceInterval,
      farmId,
      batchId,
      data
    });

    const reminder = await reminderService.createReminder(userId, {
      title,
      description,
      type,
      dueDate: new Date(dueDate),
      isRecurring,
      recurrencePattern,
      recurrenceInterval,
      farmId,
      batchId,
      data
    });

    res.status(201).json({
      success: true,
      data: reminder
    });
  } catch (error: any) {
    console.error('Error creating reminder:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create reminder'
    });
  }
};

/**


/**
 * Create a day-of-week reminder (e.g., "Remind me every Monday at 10 PM")
 */
export const createDayOfWeekReminder = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    const {
      title,
      description,
      dayOfWeek, // 0 = Sunday, 1 = Monday, etc.
      timeOfDay, // Format: "22:00" for 10 PM
      farmId,
      batchId
    } = req.body;

    // Validate required fields
    if (!title || dayOfWeek === undefined || !timeOfDay) {
      return res.status(400).json({
        success: false,
        error: 'Title, day of week, and time of day are required'
      });
    }

    // Validate day of week (0-6)
    if (dayOfWeek < 0 || dayOfWeek > 6) {
      return res.status(400).json({
        success: false,
        error: 'Day of week must be between 0 (Sunday) and 6 (Saturday)'
      });
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(timeOfDay)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid time format. Use HH:MM format (e.g., 22:00 for 10 PM)'
      });
    }

    const reminder = await reminderService.createDayOfWeekReminder(
      userId,
      title,
      description || '',
      dayOfWeek,
      timeOfDay,
      farmId,
      batchId
    );

    res.status(201).json({
      success: true,
      data: reminder
    });
  } catch (error: any) {
    console.error('Error creating day-of-week reminder:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create day-of-week reminder'
    });
  }
};

/**
 * Update an existing reminder
 */
export const updateReminder = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    const { id } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.userId;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    // Convert dueDate to Date object if provided
    if (updateData.dueDate) {
      updateData.dueDate = new Date(updateData.dueDate);
    }

    const reminder = await reminderService.updateReminder(id, userId, updateData);

    res.json({
      success: true,
      data: reminder
    });
  } catch (error: any) {
    console.error('Error updating reminder:', error);

    if (error.message === 'Reminder not found or access denied') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update reminder'
    });
  }
};

/**
 * Delete a reminder
 */
export const deleteReminder = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    const { id } = req.params;

    await reminderService.deleteReminder(id, userId);

    res.json({
      success: true,
      message: 'Reminder deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting reminder:', error);

    if (error.message === 'Reminder not found or access denied') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to delete reminder'
    });
  }
};

/**
 * Get a specific reminder by ID
 */
export const getReminderById = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    const { id } = req.params;

    const reminder = await reminderService.getReminderById(id, userId);

    if (!reminder) {
      return res.status(404).json({
        success: false,
        error: 'Reminder not found'
      });
    }

    res.json({
      success: true,
      data: reminder
    });
  } catch (error: any) {
    console.error('Error getting reminder:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get reminder'
    });
  }
};

/**
 * Get reminder statistics for the authenticated user
 */
export const getReminderStats = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;

    const stats = await reminderService.getReminderStats(userId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('Error getting reminder stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get reminder statistics'
    });
  }
};

/**
 * Mark a reminder as COMPLETED (user acknowledged completion)
 */
export const markReminderAsCompleted = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    const { id } = req.params;

    console.log("Marking reminder as completed:", id, userId);

    const reminder = await reminderService.markAsCompleted(id, userId);

    res.json({
      success: true,
      data: reminder,
      message: 'Reminder marked as completed'
    });
  } catch (error: any) {
    console.error('Error marking reminder as completed:', error);

    if (error.message === 'Reminder not found or access denied') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to mark reminder as completed'
    });
  }
};

/**
 * Mark a reminder as NOT_DONE (user didn't complete it, reschedule)
 */
export const markReminderAsNotDone = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    const { id } = req.params;

    const reschedule_minutes = 60;

    const reminder = await reminderService.markAsNotDone(id, userId, reschedule_minutes);

    res.json({
      success: true,
      data: reminder,
      message: `Reminder rescheduled for ${reschedule_minutes} minutes from now`
    });
  } catch (error: any) {
    console.error('Error marking reminder as not done:', error);

    if (error.message === 'Reminder not found or access denied') {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to mark reminder as not done'
    });
  }
};

/**
 * Get reminders that need acknowledgment (recently triggered)
 */
export const getRemindersNeedingAcknowledgment = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;

    const reminders = await reminderService.getRemindersNeedingAcknowledgment(userId);

    res.json({
      success: true,
      data: reminders,
      count: reminders.length
    });
  } catch (error: any) {
    console.error('Error getting reminders needing acknowledgment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get reminders needing acknowledgment'
    });
  }
};

/**
 * Clean up duplicate recurring reminders
 */
export const cleanupDuplicateReminders = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;

    const duplicatesRemoved = await reminderService.cleanupDuplicateReminders(userId);

    res.json({
      success: true,
      message: `Cleaned up ${duplicatesRemoved} duplicate reminders`,
      duplicatesRemoved
    });
  } catch (error: any) {
    console.error('Error cleaning up duplicate reminders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clean up duplicate reminders'
    });
  }
};
