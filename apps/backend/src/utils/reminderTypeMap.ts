import { ReminderType } from '@prisma/client';
import { NotificationType } from '../services/webpushService';

/**
 * Maps ReminderType enum values to their corresponding NotificationType values
 * This ensures proper notification categorization for different reminder types
 */
export const reminderTypeMap: Record<ReminderType, NotificationType> = {
  VACCINATION: NotificationType.VACCINATION_REMINDER,
  FEEDING: NotificationType.FEEDING_REMINDER,
  MEDICATION: NotificationType.MEDICATION_REMINDER,
  CLEANING: NotificationType.CLEANING_REMINDER,
  WEIGHING: NotificationType.WEIGHING_REMINDER,
  SUPPLIER_PAYMENT: NotificationType.SUPPLIER_PAYMENT_REMINDER,
  CUSTOMER_PAYMENT: NotificationType.CUSTOMER_PAYMENT_REMINDER,
  GENERAL: NotificationType.GENERAL_REMINDER,
};

/**
 * Get the notification type for a given reminder type
 */
export const getNotificationTypeForReminder = (reminderType: ReminderType): NotificationType => {
  return reminderTypeMap[reminderType];
};

/**
 * Get all reminder types that map to a specific notification type
 */
export const getReminderTypesForNotification = (notificationType: NotificationType): ReminderType[] => {
  return Object.entries(reminderTypeMap)
    .filter(([_, type]) => type === notificationType)
    .map(([reminderType, _]) => reminderType as ReminderType);
};
