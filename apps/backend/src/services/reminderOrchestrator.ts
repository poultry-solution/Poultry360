import { getReminderService } from './reminderService';
import { notificationService, NotificationType } from './webpushService';
import { getNotificationTypeForReminder } from '../utils/reminderTypeMap';

/**
 * Orchestrator for processing due reminders and sending notifications
 * This service coordinates between reminder fetching and notification sending
 */
export class ReminderOrchestrator {
  private reminderService = getReminderService();

  /**
   * Process all due reminders and send notifications
   */
  async triggerReminders(): Promise<{
    processed: number;
    successful: number;
    failed: number;
    errors: string[];
  }> {
    console.log('🔔 Starting reminder processing...');
    
    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };

    try {
      // Get newly due reminders (PENDING -> OVERDUE)
      const dueReminders = await this.reminderService.getDueReminders();
      
      // Get already overdue reminders (keep sending notifications)
      const overdueReminders = await this.reminderService.getOverdueReminders();
      
      const allReminders = [...dueReminders, ...overdueReminders];
      
      if (allReminders.length === 0) {
        console.log('✅ No due or overdue reminders found');
        return results;
      }

      console.log(`📋 Found ${dueReminders.length} newly due reminders and ${overdueReminders.length} overdue reminders`);

      // Process each reminder
      for (const reminder of allReminders) {
        results.processed++;
        
        try {
          await this.processReminder(reminder);
          results.successful++;
          console.log(`✅ Processed reminder: ${reminder.title} (Status: ${reminder.status})`);
        } catch (error: any) {
          results.failed++;
          const errorMsg = `Failed to process reminder "${reminder.title}": ${error.message}`;
          results.errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      }

      console.log(`🎯 Reminder processing completed: ${results.successful}/${results.processed} successful`);
      
    } catch (error: any) {
      const errorMsg = `Failed to fetch due reminders: ${error.message}`;
      results.errors.push(errorMsg);
      console.error(`❌ ${errorMsg}`);
    }

    return results;
  }

  /**
   * Process a single reminder
   */
  private async processReminder(reminder: any): Promise<void> {
    // Check if user has notifications enabled
    if (!reminder.user.notificationEnabled) {
      console.log(`⏭️ Skipping reminder for user ${reminder.user.name} (notifications disabled)`);
      await this.reminderService.markAsTriggered(reminder);
      return;
    }

    // Check if user has push subscription
    if (!reminder.user.pushSubscription) {
      console.log(`⏭️ Skipping reminder for user ${reminder.user.name} (no push subscription)`);
      await this.reminderService.markAsTriggered(reminder);
      return;
    }

    // Get notification type for this reminder
    const notificationType = getNotificationTypeForReminder(reminder.type);
    
    // Create notification payload with action buttons for reminders
    const payload = {
      title: reminder.title,
      body: reminder.description || 'Reminder is due!',
      type: notificationType,
      requireInteraction: true, // Keep notification visible until user interacts
      actions: [
        {
          action: 'mark-completed',
          title: '✅ Done',
          icon: '/icons/check.png'
        },
        {
          action: 'mark-not-done',
          title: '⏰ Later',
          icon: '/icons/clock.png'
        }
      ],
      data: {
        reminderId: reminder.id,
        farmId: reminder.farmId,
        batchId: reminder.batchId,
        reminderType: reminder.type,
        url: this.getReminderUrl(reminder),
        customData: reminder.data,
        notificationType: 'reminder' // Flag to identify reminder notifications
      }
    };

    // Send notification
    const notificationResult = await notificationService.sendNotification(
      reminder.userId,
      payload
    );

    if (!notificationResult.success) {
      throw new Error(`Failed to send notification: ${notificationResult.error}`);
    }

    // Only mark as triggered if it's newly due (PENDING -> OVERDUE)
    // OVERDUE reminders stay OVERDUE until user acknowledges
    if (reminder.status === 'PENDING') {
      await this.reminderService.markAsTriggered(reminder);
      console.log(`🔄 Moved reminder to OVERDUE: ${reminder.title}`);
    } else {
      console.log(`🔄 Resent notification for OVERDUE reminder: ${reminder.title}`);
    }
  }

  /**
   * Get the appropriate URL for a reminder based on its context
   */
  private getReminderUrl(reminder: any): string {
    if (reminder.batchId) {
      return `/dashboard/batches/${reminder.batchId}`;
    }
    
    if (reminder.farmId) {
      return `/dashboard/farms/${reminder.farmId}`;
    }
    
    return '/dashboard/reminders';
  }

  /**
   * Process reminders for a specific user (for manual triggers)
   */
  async triggerUserReminders(userId: string): Promise<{
    processed: number;
    successful: number;
    failed: number;
    errors: string[];
  }> {
    console.log(`🔔 Processing reminders for user ${userId}...`);
    
    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };

    try {
      // Get due reminders for specific user
      const userReminders = await this.reminderService.getUserReminders(userId, {
        status: 'PENDING'
      });

      const dueReminders = userReminders.reminders.filter((reminder: any) => 
        new Date(reminder.dueDate) <= new Date()
      );

      if (dueReminders.length === 0) {
        console.log(`✅ No due reminders found for user ${userId}`);
        return results;
      }

      console.log(`📋 Found ${dueReminders.length} due reminders for user ${userId}`);

      // Process each reminder
      for (const reminder of dueReminders) {
        results.processed++;
        
        try {
          await this.processReminder(reminder);
          results.successful++;
          console.log(`✅ Processed reminder: ${reminder.title}`);
        } catch (error: any) {
          results.failed++;
          const errorMsg = `Failed to process reminder "${reminder.title}": ${error.message}`;
          results.errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      }

      console.log(`🎯 User reminder processing completed: ${results.successful}/${results.processed} successful`);
      
    } catch (error: any) {
      const errorMsg = `Failed to fetch user reminders: ${error.message}`;
      results.errors.push(errorMsg);
      console.error(`❌ ${errorMsg}`);
    }

    return results;
  }

  /**
   * Process a specific reminder by ID (for manual triggers)
   */
  async triggerSpecificReminder(reminderId: string, userId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      console.log(`🔔 Processing specific reminder ${reminderId} for user ${userId}...`);
      
      const reminder = await this.reminderService.getReminderById(reminderId, userId);
      
      if (!reminder) {
        return {
          success: false,
          error: 'Reminder not found or access denied'
        };
      }

      if (reminder.status !== 'PENDING') {
        return {
          success: false,
          error: 'Reminder is not pending'
        };
      }

      if (new Date(reminder.dueDate) > new Date()) {
        return {
          success: false,
          error: 'Reminder is not yet due'
        };
      }

      await this.processReminder(reminder);
      
      console.log(`✅ Successfully processed reminder: ${reminder.title}`);
      
      return { success: true };
      
    } catch (error: any) {
      const errorMsg = `Failed to process reminder: ${error.message}`;
      console.error(`❌ ${errorMsg}`);
      return {
        success: false,
        error: errorMsg
      };
    }
  }

  /**
   * Get statistics about due reminders
   */
  async getDueReminderStats(): Promise<{
    totalDue: number;
    byType: Record<string, number>;
    byUser: Record<string, number>;
  }> {
    try {
      const dueReminders = await this.reminderService.getDueReminders();
      
      const byType: Record<string, number> = {};
      const byUser: Record<string, number> = {};
      
      dueReminders.forEach((reminder: any) => {
        // Count by type
        byType[reminder.type] = (byType[reminder.type] || 0) + 1;
        
        // Count by user
        byUser[reminder.userId] = (byUser[reminder.userId] || 0) + 1;
      });
      
      return {
        totalDue: dueReminders.length,
        byType,
        byUser
      };
      
    } catch (error: any) {
      console.error('Failed to get due reminder stats:', error);
      return {
        totalDue: 0,
        byType: {},
        byUser: {}
      };
    }
  }
}

// Singleton instance
let reminderOrchestratorInstance: ReminderOrchestrator | null = null;

export const getReminderOrchestrator = (): ReminderOrchestrator => {
  if (!reminderOrchestratorInstance) {
    reminderOrchestratorInstance = new ReminderOrchestrator();
  }
  return reminderOrchestratorInstance;
};

/**
 * Main function to trigger all due reminders
 * This is called by the cron job
 */
export const triggerReminders = async (): Promise<{
  processed: number;
  successful: number;
  failed: number;
  errors: string[];
}> => {
  const orchestrator = getReminderOrchestrator();
  return await orchestrator.triggerReminders();
};
