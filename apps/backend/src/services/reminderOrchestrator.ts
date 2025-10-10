import { getReminderService } from './reminderService';
import { getVaccinationService } from './vaccinationService';
import { getStandardVaccinationService } from './standardVaccinationService';
import { notificationService, NotificationType } from './webpushService';
import { getNotificationTypeForReminder } from '../utils/reminderTypeMap';
import prisma from '../utils/prisma';

/**
 * Orchestrator for processing due reminders and sending notifications
 * This service coordinates between reminder fetching and notification sending
 */
export class ReminderOrchestrator {
  private reminderService = getReminderService();
  private vaccinationService = getVaccinationService();
  private standardVaccinationService = getStandardVaccinationService();

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
      // First, sync vaccination reminders to ensure all vaccinations have reminders
      console.log('🩺 Syncing vaccination reminders...');
      await this.vaccinationService.syncVaccinationReminders();

      // Process standard vaccination reminders for all active batches
      console.log('🩺 Processing standard vaccination reminders...');
      await this.processStandardVaccinationReminders();

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
    
    // Create notification payload - special handling for vaccination reminders
    const payload = this.createNotificationPayload(reminder, notificationType);

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
   * Create notification payload with special handling for vaccination reminders
   */
  private createNotificationPayload(reminder: any, notificationType: NotificationType): any {
    // Special handling for vaccination reminders
    if (reminder.type === 'VACCINATION' && reminder.data?.reminderType) {
      return this.createVaccinationNotificationPayload(reminder, notificationType);
    }

    // Default reminder notification payload
    return {
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
  }

  /**
   * Create special vaccination notification payload
   */
  private createVaccinationNotificationPayload(reminder: any, notificationType: NotificationType): any {
    // Check if this is a standard vaccination with custom notification payload
    if (reminder.data?.notificationPayload) {
      const payload = reminder.data.notificationPayload;
      
      // Update vaccinationId in the payload if it's available
      if (reminder.data?.vaccinationId) {
        payload.vaccinationId = reminder.data.vaccinationId;
      }
      
      return {
        title: reminder.title,
        body: reminder.description,
        type: notificationType,
        requireInteraction: payload.requireInteraction || false,
        actions: payload.actions || [], // Use actions from payload (empty for tomorrow notifications)
        data: {
          reminderId: reminder.id,
          ...payload, // Spread the custom payload
          customData: reminder.data,
        }
      };
    }

    // Fallback for custom vaccinations (existing logic)
    const isTomorrowReminder = reminder.data?.reminderType === 'vaccination_tomorrow';
    
    // Different titles and bodies for tomorrow vs due vaccinations
    const title = isTomorrowReminder 
      ? `🩺 Vaccination Tomorrow: ${reminder.data?.vaccineName || 'Vaccination'}`
      : `🩺 Vaccination Due: ${reminder.data?.vaccineName || 'Vaccination'}`;

    const body = isTomorrowReminder
      ? `Prepare for ${reminder.data?.vaccineName || 'vaccination'}${reminder.batch ? ` for Batch ${reminder.batch.batchNumber}` : ''}`
      : `${reminder.data?.vaccineName || 'Vaccination'} is due now${reminder.batch ? ` for Batch ${reminder.batch.batchNumber}` : ''}`;

    // Add dose information if available
    const doseInfo = reminder.data?.totalDoses > 1 
      ? ` (Dose ${reminder.data?.doseNumber}/${reminder.data?.totalDoses})`
      : '';

    return {
      title: title + doseInfo,
      body: body + doseInfo,
      type: notificationType,
      requireInteraction: true,
      actions: [
        {
          action: 'mark-completed',
          title: '✅ Vaccinated',
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
        vaccinationId: reminder.data?.vaccinationId,
        farmId: reminder.farmId,
        batchId: reminder.batchId,
        reminderType: reminder.type,
        vaccineName: reminder.data?.vaccineName,
        doseNumber: reminder.data?.doseNumber,
        totalDoses: reminder.data?.totalDoses,
        url: this.getVaccinationUrl(reminder),
        customData: reminder.data,
        notificationType: 'reminder' // Flag to identify reminder notifications
      }
    };
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
   * Get the appropriate URL for vaccination reminders
   */
  private getVaccinationUrl(reminder: any): string {
    // For vaccination reminders, prioritize batch context
    if (reminder.batchId) {
      return `/dashboard/batches/${reminder.batchId}?tab=vaccinations`;
    }
    
    if (reminder.farmId) {
      return `/dashboard/farms/${reminder.farmId}?tab=vaccinations`;
    }
    
    return '/dashboard/vaccinations';
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

  /**
   * Process vaccination-specific reminders (for manual triggers)
   */
  async triggerVaccinationReminders(): Promise<{
    processed: number;
    successful: number;
    failed: number;
    errors: string[];
  }> {
    console.log('🩺 Starting vaccination reminder processing...');
    
    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };

    try {
      // Sync vaccination reminders first
      await this.vaccinationService.syncVaccinationReminders();

      // Get vaccination reminders specifically
      const vaccinationReminders = await this.reminderService.getDueReminders();
      const filteredReminders = vaccinationReminders.filter((reminder: any) => 
        reminder.type === 'VACCINATION'
      );

      if (filteredReminders.length === 0) {
        console.log('✅ No due vaccination reminders found');
        return results;
      }

      console.log(`📋 Found ${filteredReminders.length} due vaccination reminders`);

      // Process each vaccination reminder
      for (const reminder of filteredReminders) {
        results.processed++;
        
        try {
          await this.processReminder(reminder);
          results.successful++;
          console.log(`✅ Processed vaccination reminder: ${reminder.title}`);
        } catch (error: any) {
          results.failed++;
          const errorMsg = `Failed to process vaccination reminder "${reminder.title}": ${error.message}`;
          results.errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      }

      console.log(`🎯 Vaccination reminder processing completed: ${results.successful}/${results.processed} successful`);
      
    } catch (error: any) {
      const errorMsg = `Failed to process vaccination reminders: ${error.message}`;
      results.errors.push(errorMsg);
      console.error(`❌ ${errorMsg}`);
    }

    return results;
  }

  /**
   * Process standard vaccination reminders for all active batches
   */
  private async processStandardVaccinationReminders(): Promise<void> {
    try {
      console.log('🩺 Processing standard vaccination reminders for all active batches...');
      
      // Get all active batches
      const activeBatches = await prisma.batch.findMany({
        where: { status: 'ACTIVE' },
        include: { farm: true },
      });

      console.log(`📊 Found ${activeBatches.length} active batches to process`);

      for (const batch of activeBatches) {
        try {
          // Calculate batch age
          const currentAge = this.standardVaccinationService.calculateBatchAge(batch.startDate);
          
          // Create batch info
          const batchInfo = {
            batchId: batch.id,
            batchNumber: batch.batchNumber,
            startDate: batch.startDate,
            currentAge,
            farmId: batch.farmId,
            userId: batch.farm.ownerId,
          };

          // Create standard vaccination reminders for this batch
          await this.standardVaccinationService.createStandardVaccinationReminders(batchInfo);
          
          console.log(`✅ Processed standard vaccination reminders for batch ${batch.batchNumber} (age: ${currentAge} days)`);
        } catch (batchError: any) {
          console.error(`❌ Failed to process standard vaccination reminders for batch ${batch.batchNumber}:`, batchError.message);
        }
      }

      console.log('✅ Standard vaccination reminder processing completed');
    } catch (error: any) {
      console.error('❌ Failed to process standard vaccination reminders:', error.message);
      throw error;
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

/**
 * Main function to trigger vaccination reminders specifically
 * This can be called by the cron job or manually
 */
export const triggerVaccinationReminders = async (): Promise<{
  processed: number;
  successful: number;
  failed: number;
  errors: string[];
}> => {
  const orchestrator = getReminderOrchestrator();
  return await orchestrator.triggerVaccinationReminders();
};
