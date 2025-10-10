import { Request, Response } from 'express';
import { getReminderService } from '../services/reminderService';
import { getVaccinationService } from '../services/vaccinationService';
import { getStandardVaccinationService } from '../services/standardVaccinationService';

const reminderService = getReminderService();
const vaccinationService = getVaccinationService();
const standardVaccinationService = getStandardVaccinationService();

/**
 * Handle notification action clicks (for reminder acknowledgments)
 */
export const handleNotificationAction = async (req: Request, res: Response) => {
  try {
    const { action, reminderId, userId, vaccinationId } = req.body;

    if (!action || !reminderId || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: action, reminderId, userId'
      });
    }

    // Verify the reminder belongs to the user
    const reminder = await reminderService.getReminderById(reminderId, userId);
    if (!reminder) {
      return res.status(404).json({
        success: false,
        error: 'Reminder not found or access denied'
      });
    }

    let result;
    let message;

    // Special handling for vaccination reminders
    if (reminder.type === 'VACCINATION' && vaccinationId) {
      // Check if this is a standard vaccination (has standardScheduleId)
      const isStandardVaccination = reminder.data && typeof reminder.data === 'object' && 'standardScheduleId' in reminder.data;
      
      switch (action) {
        case 'mark-completed':
          if (isStandardVaccination) {
            // Handle standard vaccination completion
            await standardVaccinationService.markStandardVaccinationCompleted(vaccinationId, userId);
            message = 'Standard vaccination marked as completed';
          } else {
            // Handle custom vaccination completion
            result = await vaccinationService.markVaccinationCompleted(vaccinationId, userId);
            message = 'Vaccination marked as completed';
          }
          break;
        
        case 'mark-not-done':
          if (isStandardVaccination) {
            // For standard vaccinations, just reschedule the reminder (retry logic)
            result = await reminderService.markAsNotDone(reminderId, userId, 60); // Reschedule for 1 hour
            message = 'Standard vaccination reminder rescheduled for later';
          } else {
            // For custom vaccinations, update status and reschedule
            await vaccinationService.updateVaccinationStatus(vaccinationId, userId, 'OVERDUE');
            result = await reminderService.markAsNotDone(reminderId, userId, 60);
            message = 'Vaccination marked as overdue and reminder rescheduled for later';
          }
          break;
        
        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid action'
          });
      }
    } else {
      // Regular reminder handling
      switch (action) {
        case 'mark-completed':
          result = await reminderService.markAsCompleted(reminderId, userId);
          message = 'Reminder marked as completed';
          break;
        
        case 'mark-not-done':
          result = await reminderService.markAsNotDone(reminderId, userId, 60); // Reschedule for 1 hour
          message = 'Reminder rescheduled for later';
          break;
        
        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid action'
          });
      }
    }

    res.json({
      success: true,
      data: result,
      message
    });

  } catch (error: any) {
    console.error('Error handling notification action:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to handle notification action'
    });
  }
};

/**
 * Get notification action status (for debugging)
 */
export const getNotificationActionStatus = async (req: Request, res: Response) => {
  try {
    const { reminderId, userId } = req.query;

    if (!reminderId || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: reminderId, userId'
      });
    }

    const reminder = await reminderService.getReminderById(reminderId as string, userId as string);
    
    if (!reminder) {
      return res.status(404).json({
        success: false,
        error: 'Reminder not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: reminder.id,
        title: reminder.title,
        status: reminder.status,
        dueDate: reminder.dueDate,
        lastTriggered: reminder.lastTriggered
      }
    });

  } catch (error: any) {
    console.error('Error getting notification action status:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get notification action status'
    });
  }
};
