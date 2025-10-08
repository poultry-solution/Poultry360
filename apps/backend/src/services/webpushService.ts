import webpush from "web-push";
import prisma from "../utils/prisma";

console.log("VAPID_PUBLIC_KEY exists:", !!process.env.VAPID_PUBLIC_KEY);
console.log("VAPID_PRIVATE_KEY exists:", !!process.env.VAPID_PRIVATE_KEY);

if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
  console.error("Missing VAPID keys:");
  console.error("VAPID_PUBLIC_KEY:", process.env.VAPID_PUBLIC_KEY ? "SET" : "NOT SET");
  console.error("VAPID_PRIVATE_KEY:", process.env.VAPID_PRIVATE_KEY ? "SET" : "NOT SET");
  throw new Error("VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be set");
}

// Set VAPID details for web-push
webpush.setVapidDetails(
  "mailto:juugi202316701@gmail.com", // just an identifier
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export enum NotificationType {
  CHAT_MESSAGE = "CHAT_MESSAGE",
  BATCH_UPDATE = "BATCH_UPDATE",
  FARM_ALERT = "FARM_ALERT",
  SYSTEM = "SYSTEM",
  EXPENSE_WARNING = "EXPENSE_WARNING",
  MORTALITY_ALERT = "MORTALITY_ALERT",
  FEED_WARNING = "FEED_WARNING",
  SALES_NOTIFICATION = "SALES_NOTIFICATION",
  VACCINATION_ALERT = "VACCINATION_ALERT",
  REMINDER_ALERT = "REMINDER_ALERT",
  REQUEST_ALERT = "REQUEST_ALERT",
}

export interface NotificationPayload {
  title: string;
  body: string;
  data?: any;
  type: NotificationType;
  requireInteraction?: boolean;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

export class NotificationService {
  /**
   * Send a notification to a specific user
   */
  async sendNotification(
    userId: string,
    payload: NotificationPayload
  ): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    try {
      // Save to database first
      const notification = await prisma.notification.create({
        data: {
          userId,
          title: payload.title,
          body: payload.body,
          data: payload.data,
          type: payload.type,
        },
      });

      // Get user's push subscription
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          pushSubscription: true,
          notificationEnabled: true,
          name: true,
        },
      });

      if (!user?.pushSubscription || !user.notificationEnabled) {
        return {
          success: false,
          error: "No subscription or notifications disabled",
          notificationId: notification.id,
        };
      }

      // Prepare push payload
      const pushPayload = JSON.stringify({
        title: payload.title,
        body: payload.body,
        data: payload.data,
        type: payload.type,
        requireInteraction: payload.requireInteraction,
        actions: payload.actions,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/badge-72x72.png",
      });

      // Send push notification
      await webpush.sendNotification(user.pushSubscription as any, pushPayload);

      console.log(
        `Notification sent to user ${user.name} (${userId}): ${payload.title}`
      );
      return { success: true, notificationId: notification.id };
    } catch (error: any) {
      console.error("Failed to send notification:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notifications to multiple users
   */
  async sendBulkNotifications(
    userIds: string[],
    payload: NotificationPayload
  ): Promise<Array<{ userId: string; success: boolean; error?: string }>> {
    const results = await Promise.allSettled(
      userIds.map((userId) => this.sendNotification(userId, payload))
    );

    return results.map((result, index) => ({
      userId: userIds[index],
      success: result.status === "fulfilled" && result.value.success,
      error:
        result.status === "rejected"
          ? result.reason.message
          : result.status === "fulfilled"
            ? result.value.error
            : undefined,
    }));
  }

  /**
   * Send notification to all users in a conversation
   */
  async sendConversationNotification(
    conversationId: string,
    excludeUserId: string,
    payload: NotificationPayload
  ): Promise<{ success: boolean; sentCount: number }> {
    try {
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { farmerId: true, doctorId: true },
      });

      if (!conversation) {
        return { success: false, sentCount: 0 };
      }

      const recipientIds = [
        conversation.farmerId,
        conversation.doctorId,
      ].filter((id) => id !== excludeUserId);

      const results = await this.sendBulkNotifications(recipientIds, payload);
      const sentCount = results.filter((r) => r.success).length;

      return { success: true, sentCount };
    } catch (error) {
      console.error("Failed to send conversation notification:", error);
      return { success: false, sentCount: 0 };
    }
  }

  /**
   * Send notification to farm owner and managers
   */
  async sendFarmNotification(
    farmId: string,
    excludeUserId: string,
    payload: NotificationPayload
  ): Promise<{ success: boolean; sentCount: number }> {
    try {
      const farm = await prisma.farm.findUnique({
        where: { id: farmId },
        include: {
          owner: true,
          managers: true,
        },
      });

      if (!farm) {
        return { success: false, sentCount: 0 };
      }

      const recipientIds = [
        farm.ownerId,
        ...farm.managers.map((m) => m.id),
      ].filter((id) => id !== excludeUserId);

      const results = await this.sendBulkNotifications(recipientIds, payload);
      const sentCount = results.filter((r) => r.success).length;

      return { success: true, sentCount };
    } catch (error) {
      console.error("Failed to send farm notification:", error);
      return { success: false, sentCount: 0 };
    }
  }

  /**
   * Get user's notification history
   */
  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false
  ) {
    const skip = (page - 1) * limit;

    const [notifications, totalCount] = await Promise.all([
      prisma.notification.findMany({
        where: {
          userId,
          ...(unreadOnly && { read: false }),
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.notification.count({
        where: {
          userId,
          ...(unreadOnly && { read: false }),
        },
      }),
    ]);

    return {
      notifications,
      totalCount,
      hasMore: skip + notifications.length < totalCount,
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      await prisma.notification.updateMany({
        where: { id: notificationId, userId },
        data: { read: true },
      });
      return true;
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      return false;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    try {
      const result = await prisma.notification.updateMany({
        where: { userId, read: false },
        data: { read: true },
      });
      return result.count;
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
      return 0;
    }
  }

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      return await prisma.notification.count({
        where: { userId, read: false },
      });
    } catch (error) {
      console.error("Failed to get unread count:", error);
      return 0;
    }
  }
}

// Singleton instance
export const notificationService = new NotificationService();
