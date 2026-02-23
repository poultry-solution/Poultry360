import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { getSocketService } from '../services/socketService';
import { generatePresignedViewUrl, deleteFile as deleteR2File } from '../services/r2Service';
import { notificationService, NotificationType } from '../services/webpushService';

// Helper function to get notification content based on message type
const getNotificationContent = (message: any) => {
  const senderName = message.sender.name;

  switch (message.messageType) {
    case 'TEXT':
      return {
        title: `New message from ${senderName}`,
        body: message.text || 'New message',
        type: NotificationType.CHAT_MESSAGE
      };
    case 'IMAGE':
      return {
        title: `Photo from ${senderName}`,
        body: 'Sent a photo',
        type: NotificationType.CHAT_MESSAGE
      };
    case 'VIDEO':
      return {
        title: `Video from ${senderName}`,
        body: 'Sent a video',
        type: NotificationType.CHAT_MESSAGE
      };
    case 'AUDIO':
      return {
        title: `Voice message from ${senderName}`,
        body: 'Sent a voice message',
        type: NotificationType.CHAT_MESSAGE
      };
    case 'PDF':
    case 'DOC':
    case 'OTHER':
      return {
        title: `File from ${senderName}`,
        body: `Sent ${message.fileName || 'a file'}`,
        type: NotificationType.CHAT_MESSAGE
      };
    case 'BATCH_SHARE':
      return {
        title: `Batch shared by ${senderName}`,
        body: 'Shared batch details',
        type: NotificationType.CHAT_MESSAGE
      };
    case 'FARM_SHARE':
      return {
        title: `Farm shared by ${senderName}`,
        body: 'Shared farm details',
        type: NotificationType.CHAT_MESSAGE
      };
    default:
      return {
        title: `Message from ${senderName}`,
        body: 'New message',
        type: NotificationType.CHAT_MESSAGE
      };
  }
};

export const messageController = {
  /**
   * Send a new message (text or with attachment)
   */
  async sendMessage(req: Request, res: Response) {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const {
        conversationId,
        text,
        messageType = 'TEXT',
        attachmentKey,
        fileName,
        contentType,
        fileSize,
        durationMs,
        width,
        height,
        batchShareId
      } = req.body;

      if (!conversationId) {
        return res.status(400).json({ error: 'Conversation ID is required' });
      }

      // For attachment messages, validate required fields
      if (messageType !== 'TEXT' && messageType !== 'BATCH_SHARE' && messageType !== 'FARM_SHARE') {
        if (!attachmentKey) {
          return res.status(400).json({ error: 'Attachment key is required for attachment messages' });
        }
      }

      // Verify conversation exists and user has access
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          OR: [
            { farmerId: userId },
            { doctorId: userId }
          ]
        }
      });

      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found or access denied' });
      }

      // Generate attachment URL if attachment key is provided
      let attachmentUrl = null;
      if (attachmentKey) {
        attachmentUrl = await generatePresignedViewUrl(attachmentKey, 86400); // 24 hours
      }

      // Create the message
      const message = await prisma.message.create({
        data: {
          conversationId,
          senderId: userId,
          text: text || null,
          messageType: messageType as any,
          attachmentKey: attachmentKey || null,
          attachmentUrl,
          fileName: fileName || null,
          contentType: contentType || null,
          fileSize: fileSize ? parseInt(fileSize) : null,
          durationMs: durationMs ? parseInt(durationMs) : null,
          width: width ? parseInt(width) : null,
          height: height ? parseInt(height) : null,
          batchShareId: batchShareId || null,
          isDeleted: false
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              role: true
            }
          },
          conversation: true,
          batchShare: batchShareId ? true : false
        }
      });

      // Broadcast the message to conversation participants
      const socketService = getSocketService();
      await socketService.getRoomService().broadcastMessage(
        message.conversationId,
        {
          id: message.id,
          conversationId: message.conversationId,
          senderId: message.senderId,
          senderName: message.sender.name,
          senderRole: message.sender.role,
          text: message.text || '',
          messageType: message.messageType as any,
          attachmentUrl: message.attachmentUrl,
          attachmentKey: message.attachmentKey,
          fileName: message.fileName,
          contentType: message.contentType,
          fileSize: message.fileSize,
          durationMs: message.durationMs,
          width: message.width,
          height: message.height,
          batchShareId: message.batchShareId,
          createdAt: message.createdAt,
        }
      );

      // Send push notifications to conversation participants (excluding sender)
      try {
        const notificationContent = getNotificationContent(message);
        const result = await notificationService.sendConversationNotification(
          message.conversationId,
          message.senderId, // Exclude sender
          {
            ...notificationContent,
            data: {
              conversationId: message.conversationId,
              messageId: message.id,
              messageType: message.messageType,
              url: `/dashboard/chat-doctor/${message.conversationId}`
            }
          }
        );

        console.log(`📱 Sent ${result.sentCount} push notifications for message ${message.id}`);
      } catch (notificationError) {
        console.error('Failed to send push notifications:', notificationError);
        // Don't fail the message send if notifications fail
      }

      res.status(201).json({
        success: true,
        message
      });

    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  },

  /**
   * Get messages for a conversation with pagination
   */
  async getMessages(req: Request, res: Response) {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { conversationId } = req.params;
      const { page = 1, limit = 50, before } = req.query;

      const skip = (Number(page) - 1) * Number(limit);

      // Verify conversation access
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          OR: [
            { farmerId: userId },
            { doctorId: userId }
          ]
        }
      });

      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found or access denied' });
      }

      // Build where clause for pagination
      const whereClause: any = {
        conversationId,
        isDeleted: false
      };

      if (before) {
        whereClause.createdAt = {
          lt: new Date(before as string)
        };
      }

      const [messages, totalCount] = await Promise.all([
        prisma.message.findMany({
          where: whereClause,
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                role: true
              }
            },
            batchShare: true
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: Number(limit)
        }),
        prisma.message.count({
          where: whereClause
        })
      ]);

      res.json({
        success: true,
        messages: messages.reverse(), // Return in chronological order
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: totalCount,
          hasMore: skip + messages.length < totalCount
        }
      });

    } catch (error) {
      console.error('Error getting messages:', error);
      res.status(500).json({ error: 'Failed to get messages' });
    }
  },

  /**
   * Edit a message (only text messages for now)
   */
  async editMessage(req: Request, res: Response) {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { messageId } = req.params;
      const { text } = req.body;

      if (!text) {
        return res.status(400).json({ error: 'Text is required' });
      }

      // Find and verify message ownership
      const message = await prisma.message.findFirst({
        where: {
          id: messageId,
          senderId: userId,
          isDeleted: false
        },
        include: {
          conversation: true
        }
      });

      if (!message) {
        return res.status(404).json({ error: 'Message not found or access denied' });
      }

      // Only allow editing text messages for now
      if (message.messageType !== 'TEXT') {
        return res.status(400).json({ error: 'Only text messages can be edited' });
      }

      // Update the message
      const updatedMessage = await prisma.message.update({
        where: { id: messageId },
        data: {
          text,
          edited: true
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              role: true
            }
          },
          conversation: true
        }
      });

      console.log("updatedMessage", updatedMessage);
      // Broadcast the edit to conversation participants
      const socketService = getSocketService();
      socketService.broadcastToConversation(updatedMessage.conversationId, 'message_updated', {
        success: true,
        message: updatedMessage
      });

      res.json({
        success: true,
        message: updatedMessage
      });

    } catch (error) {
      console.error('Error editing message:', error);
      res.status(500).json({ error: 'Failed to edit message' });
    }
  },

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(req: Request, res: Response) {
    try {
      const userId = req.userId;

      console.log("userId", userId);

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { messageId } = req.params;

      // Find and verify message ownership
      const message = await prisma.message.findFirst({
        where: {
          id: messageId,
          senderId: userId,
          isDeleted: false
        },
        include: {
          conversation: true
        }
      });

      if (!message) {
        return res.status(404).json({ error: 'Message not found or access denied' });
      }

      // If there is an attachment, attempt to remove the file from R2 first (best-effort)
      if (message.attachmentKey) {
        try {
          const deleted = await deleteR2File(message.attachmentKey);
          console.log("R2 attachment delete", {
            key: message.attachmentKey,
            success: deleted,
          });
        } catch (r2Err) {
          console.warn("Failed to delete attachment from R2 (continuing soft delete)", r2Err);
        }
      }

      // Soft delete the message in DB
      await prisma.message.update({
        where: { id: messageId },
        data: { isDeleted: true }
      });

      console.log("message deleted", message);
      // Broadcast the deletion to conversation participants
      const socketService = getSocketService();
      socketService.broadcastToConversation(message.conversationId, 'message_deleted', {
        success: true,
        messageId: message.id,
        conversationId: message.conversationId
      });

      res.json({
        success: true,
        message: 'Message deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting message:', error);
      res.status(500).json({ error: 'Failed to delete message' });
    }
  },

  /**
   * Mark messages as read
   */
  async markAsRead(req: Request, res: Response) {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { conversationId } = req.params;
      const { messageIds } = req.body;

      // Verify conversation access
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          OR: [
            { farmerId: userId },
            { doctorId: userId }
          ]
        }
      });

      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found or access denied' });
      }

      // Mark messages as read
      const updateResult = await prisma.message.updateMany({
        where: {
          id: { in: messageIds },
          conversationId,
          senderId: { not: userId }, // Don't mark own messages as read
          read: false
        },
        data: { read: true }
      });

      // Broadcast read status to conversation participants
      const socketService = getSocketService();
      await socketService.getRoomService().broadcastMessage({
        conversationId,
        userId,
        readCount: updateResult.count,
        type: 'messages_read'
      });

      res.json({
        success: true,
        readCount: updateResult.count
      });

    } catch (error) {
      console.error('Error marking messages as read:', error);
      res.status(500).json({ error: 'Failed to mark messages as read' });
    }
  },

  /**
   * Get message by ID (for viewing attachments, etc.)
   */
  async getMessage(req: Request, res: Response) {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { messageId } = req.params;

      const message = await prisma.message.findFirst({
        where: {
          id: messageId,
          conversation: {
            OR: [
              { farmerId: userId },
              { doctorId: userId }
            ]
          },
          isDeleted: false
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              role: true
            }
          },
          conversation: true,
          batchShare: true
        }
      });

      if (!message) {
        return res.status(404).json({ error: 'Message not found' });
      }

      res.json({
        success: true,
        message
      });

    } catch (error) {
      console.error('Error getting message:', error);
      res.status(500).json({ error: 'Failed to get message' });
    }
  },

  /**
   * Search messages in a conversation
   */
  async searchMessages(req: Request, res: Response) {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { conversationId } = req.params;
      const { query, page = 1, limit = 20 } = req.query;

      if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
      }

      // Verify conversation access
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          OR: [
            { farmerId: userId },
            { doctorId: userId }
          ]
        }
      });

      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found or access denied' });
      }

      const skip = (Number(page) - 1) * Number(limit);

      const messages = await prisma.message.findMany({
        where: {
          conversationId,
          isDeleted: false,
          text: {
            contains: query as string,
            mode: 'insensitive'
          }
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit)
      });

      res.json({
        success: true,
        messages,
        query: query as string
      });

    } catch (error) {
      console.error('Error searching messages:', error);
      res.status(500).json({ error: 'Failed to search messages' });
    }
  }
};
