import * as cron from "node-cron";
import { triggerReminders } from "./reminderOrchestrator";

/**
 * Reminder Cron Job Scheduler
 *
 * This service handles the scheduling of reminder checks using node-cron.
 * It can be easily replaced with a queue-based system later.
 */

class ReminderCronService {
  private isRunning = false;
  private cronJob: cron.ScheduledTask | null = null;
  private lastRun: Date | null = null;
  private nextRun: Date | null = null;
  private runCount = 0;

  /**
   * Start the reminder cron job
   */
  start(): void {
    if (this.isRunning) {
      console.log("⚠️ Reminder cron job is already running");
      return;
    }

    // Calculate next run time
    this.calculateNextRun();

    // Schedule reminder checks every 5 minutes
    // Format: minute hour day month dayOfWeek
    // '*/5 * * * *' means every 5 minutes
    this.cronJob = cron.schedule(
      "*/5 * * * *",
      async () => {
        this.runCount++;
        this.lastRun = new Date();

        console.log("🔔 [CRON] ===========================================");
        console.log(
          `🔔 [CRON] Run #${this.runCount} - ${this.lastRun.toISOString()}`
        );
        console.log("🔔 [CRON] Checking for due reminders...");

        try {
          const results = await triggerReminders();

          if (results.processed > 0) {
            console.log(
              `✅ [CRON] Processed ${results.processed} reminders: ${results.successful} successful, ${results.failed} failed`
            );

            if (results.errors.length > 0) {
              console.error("❌ [CRON] Errors:", results.errors);
            }
          } else {
            console.log("✅ [CRON] No due reminders found");
          }

          // Calculate next run time
          this.calculateNextRun();
          console.log(
            `⏰ [CRON] Next run scheduled for: ${this.nextRun?.toISOString()}`
          );
          console.log("🔔 [CRON] ===========================================");
        } catch (error: any) {
          console.error(
            "❌ [CRON] Failed to process reminders:",
            error.message
          );
          console.log("🔔 [CRON] ===========================================");
        }
      },
      {
        timezone: "UTC", // Use UTC timezone
      }
    );

    // Start the cron job
    this.cronJob.start();
    this.isRunning = true;

    console.log("📅 [CRON] Reminder cron job started (every 5 minutes)");
    console.log(
      `⏰ [CRON] Next run scheduled for: ${this.nextRun?.toISOString()}`
    );
    console.log(`📊 [CRON] Current time: ${new Date().toISOString()}`);
  }

  /**
   * Stop the reminder cron job
   */
  stop(): void {
    if (!this.isRunning || !this.cronJob) {
      console.log("⚠️ Reminder cron job is not running");
      return;
    }

    this.cronJob.stop();
    this.cronJob.destroy();
    this.cronJob = null;
    this.isRunning = false;

    console.log("🛑 [CRON] Reminder cron job stopped");
  }

  /**
   * Restart the reminder cron job
   */
  restart(): void {
    console.log("🔄 [CRON] Restarting reminder cron job...");
    this.stop();
    this.start();
  }

  /**
   * Calculate the next run time based on the cron schedule
   */
  private calculateNextRun(): void {
    const now = new Date();
    const nextRun = new Date(now);

    // For '*/5 * * * *' schedule (every 5 minutes)
    const currentMinute = now.getMinutes();
    const nextMinute = currentMinute + (5 - (currentMinute % 5));

    if (nextMinute >= 60) {
      nextRun.setHours(nextRun.getHours() + 1);
      nextRun.setMinutes(nextMinute - 60);
    } else {
      nextRun.setMinutes(nextMinute);
    }

    nextRun.setSeconds(0);
    nextRun.setMilliseconds(0);

    this.nextRun = nextRun;
  }

  /**
   * Get the status of the cron job
   */
  getStatus(): {
    isRunning: boolean;
    nextRun?: Date;
    lastRun?: Date;
    runCount: number;
    timeUntilNextRun?: number; // in milliseconds
  } {
    const timeUntilNextRun = this.nextRun
      ? this.nextRun.getTime() - new Date().getTime()
      : undefined;

    return {
      isRunning: this.isRunning,
      nextRun: this.nextRun || undefined,
      lastRun: this.lastRun || undefined,
      runCount: this.runCount,
      timeUntilNextRun: timeUntilNextRun,
    };
  }

  /**
   * Manually trigger reminder check (for testing)
   */
  async triggerNow(): Promise<void> {
    console.log("🔔 [MANUAL] ===========================================");
    console.log(`🔔 [MANUAL] Manual trigger - ${new Date().toISOString()}`);
    console.log("🔔 [MANUAL] Manually triggering reminder check...");

    try {
      const results = await triggerReminders();
      console.log(
        `✅ [MANUAL] Processed ${results.processed} reminders: ${results.successful} successful, ${results.failed} failed`
      );

      if (results.errors.length > 0) {
        console.error("❌ [MANUAL] Errors:", results.errors);
      }

      console.log("🔔 [MANUAL] ===========================================");
    } catch (error: any) {
      console.error("❌ [MANUAL] Failed to process reminders:", error.message);
      console.log("🔔 [MANUAL] ===========================================");
    }
  }

  /**
   * Get detailed cron job information for debugging
   */
  getDebugInfo(): {
    status: any;
    currentTime: Date;
    timeUntilNextRunFormatted?: string;
  } {
    const status = this.getStatus();
    const currentTime = new Date();

    let timeUntilNextRunFormatted;
    if (status.timeUntilNextRun) {
      const minutes = Math.floor(status.timeUntilNextRun / 60000);
      const seconds = Math.floor((status.timeUntilNextRun % 60000) / 1000);
      timeUntilNextRunFormatted = `${minutes}m ${seconds}s`;
    }

    return {
      status,
      currentTime,
      timeUntilNextRunFormatted,
    };
  }

  /**
   * Update the cron schedule
   */
  updateSchedule(cronExpression: string): void {
    if (!this.isRunning) {
      console.log("⚠️ Cannot update schedule - cron job is not running");
      return;
    }

    console.log(`🔄 [CRON] Updating schedule to: ${cronExpression}`);

    // Stop current job
    this.stop();

    // Create new job with new schedule
    this.cronJob = cron.schedule(
      cronExpression,
      async () => {
        this.runCount++;
        this.lastRun = new Date();

        console.log("🔔 [CRON] ===========================================");
        console.log(
          `🔔 [CRON] Run #${this.runCount} - ${this.lastRun.toISOString()}`
        );
        console.log("🔔 [CRON] Checking for due reminders...");

        try {
          const results = await triggerReminders();

          if (results.processed > 0) {
            console.log(
              `✅ [CRON] Processed ${results.processed} reminders: ${results.successful} successful, ${results.failed} failed`
            );

            if (results.errors.length > 0) {
              console.error("❌ [CRON] Errors:", results.errors);
            }
          } else {
            console.log("✅ [CRON] No due reminders found");
          }

          // Calculate next run time
          this.calculateNextRun();
          console.log(
            `⏰ [CRON] Next run scheduled for: ${this.nextRun?.toISOString()}`
          );
          console.log("🔔 [CRON] ===========================================");
        } catch (error: any) {
          console.error(
            "❌ [CRON] Failed to process reminders:",
            error.message
          );
          console.log("🔔 [CRON] ===========================================");
        }
      },
      {
        timezone: "UTC",
      }
    );

    // Start the new job
    this.cronJob.start();
    this.isRunning = true;

    console.log(
      `📅 [CRON] Reminder cron job updated and started with schedule: ${cronExpression}`
    );
  }
}

// Singleton instance
let reminderCronInstance: ReminderCronService | null = null;

export const getReminderCronService = (): ReminderCronService => {
  if (!reminderCronInstance) {
    reminderCronInstance = new ReminderCronService();
  }
  return reminderCronInstance;
};

/**
 * Initialize the reminder cron service
 * This should be called when the server starts
 */
export const initializeReminderCron = (): void => {
  const cronService = getReminderCronService();
  cronService.start();
};

/**
 * Gracefully shutdown the reminder cron service
 * This should be called when the server shuts down
 */
export const shutdownReminderCron = (): void => {
  const cronService = getReminderCronService();
  cronService.stop();
};

// Export the service instance for direct access
export const reminderCronService = getReminderCronService();
