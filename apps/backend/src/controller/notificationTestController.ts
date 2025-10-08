import { Request, Response } from "express";
import { notificationService, NotificationType } from "../services/webpushService";
import prisma from "../utils/prisma";

/**
 * Test endpoint to simulate chat notifications
 */
export const testChatNotification = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { targetUserId, messageType = "TEXT", messageText = "Test message" } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ error: "targetUserId is required" });
    }

    // Verify target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true }
    });

    if (!targetUser) {
      return res.status(404).json({ error: "Target user not found" });
    }

    // Get sender info
    const sender = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true }
    });

    if (!sender) {
      return res.status(404).json({ error: "Sender not found" });
    }

    // Create notification content based on message type
    let notificationContent;
    switch (messageType) {
      case "TEXT":
        notificationContent = {
          title: `New message from ${sender.name}`,
          body: messageText,
          type: NotificationType.CHAT_MESSAGE
        };
        break;
      case "IMAGE":
        notificationContent = {
          title: `Photo from ${sender.name}`,
          body: "Sent a photo",
          type: NotificationType.CHAT_MESSAGE
        };
        break;
      case "AUDIO":
        notificationContent = {
          title: `Voice message from ${sender.name}`,
          body: "Sent a voice message",
          type: NotificationType.CHAT_MESSAGE
        };
        break;
      case "BATCH_SHARE":
        notificationContent = {
          title: `Batch shared by ${sender.name}`,
          body: "Shared batch details",
          type: NotificationType.CHAT_MESSAGE
        };
        break;
      default:
        notificationContent = {
          title: `Message from ${sender.name}`,
          body: "New message",
          type: NotificationType.CHAT_MESSAGE
        };
    }

    // Send notification
    const result = await notificationService.sendNotification(targetUserId, {
      ...notificationContent,
      data: {
        conversationId: "test-conversation",
        messageId: "test-message",
        messageType,
        url: "/dashboard/chat-doctor/test-conversation",
        test: true
      }
    });

    res.json({
      success: true,
      message: "Test notification sent",
      result,
      targetUser: targetUser.name,
      sender: sender.name
    });

  } catch (error: any) {
    console.error("Error sending test chat notification:", error);
    res.status(500).json({ error: "Failed to send test notification" });
  }
};

/**
 * Test endpoint to get all users for testing
 */
export const getTestUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        role: true,
        pushSubscription: true,
        notificationEnabled: true
      },
      orderBy: { name: "asc" }
    });

    res.json({
      success: true,
      users: users.map(user => ({
        id: user.id,
        name: user.name,
        role: user.role,
        hasPushSubscription: !!user.pushSubscription,
        notificationsEnabled: user.notificationEnabled
      }))
    });

  } catch (error: any) {
    console.error("Error getting test users:", error);
    res.status(500).json({ error: "Failed to get users" });
  }
};
