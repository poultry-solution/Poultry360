import { Request, Response } from 'express';
import { getReminderOrchestrator } from '../services/reminderOrchestrator';
import { getReminderService } from '../services/reminderService';
import { notificationService, NotificationType } from '../services/webpushService';
import { getNotificationTypeForReminder } from '../utils/reminderTypeMap';
import { reminderCronService } from '../services/reminderCron';

const reminderOrchestrator = getReminderOrchestrator();
const reminderService = getReminderService();

/**
 * Send a test reminder notification
 */
export const sendTestReminderNotification = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    const {
      title = 'Test Reminder',
      body = 'This is a test reminder notification',
      type = 'GENERAL_REMINDER'
    } = req.body;

    const result = await notificationService.sendNotification(userId, {
      title,
      body,
      type: type as NotificationType,
      data: {
        test: true,
        url: '/dashboard/reminders'
      }
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to send test notification'
      });
    }

    res.json({
      success: true,
      message: 'Test reminder notification sent successfully',
      notificationId: result.notificationId
    });
  } catch (error: any) {
    console.error('Error sending test reminder notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test notification'
    });
  }
};

/**
 * Manually trigger all due reminders
 */
export const triggerAllDueReminders = async (req: Request, res: Response) => {
  try {
    console.log('🔔 [MANUAL] Triggering all due reminders...');

    const results = await reminderOrchestrator.triggerReminders();

    res.json({
      success: true,
      message: 'Reminder processing completed',
      results: {
        processed: results.processed,
        successful: results.successful,
        failed: results.failed,
        errors: results.errors
      }
    });
  } catch (error: any) {
    console.error('Error triggering due reminders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger due reminders'
    });
  }
};

/**
 * Get currently due reminders
 */
export const getDueReminders = async (req: Request, res: Response) => {
  try {
    const dueReminders = await reminderService.getDueReminders();

    res.json({
      success: true,
      data: dueReminders,
      count: dueReminders.length
    });
  } catch (error: any) {
    console.error('Error getting due reminders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get due reminders'
    });
  }
};

/**
 * Manually trigger a specific reminder
 */
export const triggerSpecificReminder = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    const { id } = req.params;

    const result = await reminderOrchestrator.triggerSpecificReminder(id, userId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Reminder triggered successfully'
    });
  } catch (error: any) {
    console.error('Error triggering specific reminder:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger reminder'
    });
  }
};

/**
 * Get due reminder statistics
 */
export const getDueReminderStats = async (req: Request, res: Response) => {
  try {
    const stats = await reminderOrchestrator.getDueReminderStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('Error getting due reminder stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get due reminder statistics'
    });
  }
};

/**
 * Trigger reminders for a specific user
 */
export const triggerUserReminders = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;

    const results = await reminderOrchestrator.triggerUserReminders(userId);

    res.json({
      success: true,
      message: 'User reminder processing completed',
      results: {
        processed: results.processed,
        successful: results.successful,
        failed: results.failed,
        errors: results.errors
      }
    });
  } catch (error: any) {
    console.error('Error triggering user reminders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger user reminders'
    });
  }
};

/**
 * Get cron job status and debug information
 */
export const getCronStatus = async (req: Request, res: Response) => {
  try {
    const debugInfo = reminderCronService.getDebugInfo();

    res.json({
      success: true,
      data: debugInfo
    });
  } catch (error: any) {
    console.error('Error getting cron status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cron status'
    });
  }
};

/**
 * Manually trigger cron job (for testing)
 */
export const triggerCronNow = async (req: Request, res: Response) => {
  try {
    await reminderCronService.triggerNow();

    res.json({
      success: true,
      message: 'Cron job triggered manually'
    });
  } catch (error: any) {
    console.error('Error triggering cron job:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger cron job'
    });
  }
};
