import { PrismaClient, MessageType, Prisma } from "@prisma/client";
import prisma from "../utils/prisma";

export interface CreateMessageData {
  conversationId: string;
  senderId: string;
  text?: string;
  messageType?: MessageType;
  attachmentKey?: string;
  fileName?: string;
  contentType?: string;
  fileSize?: number;
  durationMs?: number;
  width?: number;
  height?: number;
  batchShareId?: string;
}

export interface MessageWithSender {
  id: string;
  text?: string;
  messageType: MessageType;
  createdAt: Date;
  read: boolean;
  edited: boolean;
  isDeleted: boolean;
  attachmentUrl?: string;
  attachmentKey?: string;
  fileName?: string;
  contentType?: string;
  fileSize?: number;
  durationMs?: number;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
  batchShareId?: string;
  sender: {
    id: string;
    name: string;
    role: string;
  };
  batchShare?: any;
}

export class MessageService {
  /**
   * Create a new message
   */
  async createMessage(data: CreateMessageData): Promise<MessageWithSender> {
    // Validate conversation exists and user has access
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: data.conversationId,
        OR: [{ farmerId: data.senderId }, { doctorId: data.senderId }],
        status: "ACTIVE",
      },
      include: {
        farmer: true,
        doctor: true,
      },
    });

    if (!conversation) {
      throw new Error("Conversation not found or access denied");
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        conversationId: data.conversationId,
        senderId: data.senderId,
        text: data.text?.trim() || null,
        messageType: data.messageType || "TEXT",
        attachmentKey: data.attachmentKey || null,
        fileName: data.fileName || null,
        contentType: data.contentType || null,
        fileSize: data.fileSize || null,
        durationMs: data.durationMs || null,
        width: data.width || null,
        height: data.height || null,
        batchShareId: data.batchShareId || null,
        isDeleted: false,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        batchShare: data.batchShareId ? true : false,
      },
    });

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: data.conversationId },
      data: { updatedAt: new Date() },
    });

    return {
      id: message.id,
      text: message.text || "",
      messageType: message.messageType,
      createdAt: message.createdAt,
      read: message.read,
      edited: message.edited,
      isDeleted: message.isDeleted,
      attachmentUrl: message.attachmentUrl || undefined,
      attachmentKey: message.attachmentKey || undefined,
      fileName: message.fileName || undefined,
      contentType: message.contentType || undefined,
      fileSize: message.fileSize || undefined,
      durationMs: message.durationMs || undefined,
      width: message.width || undefined,
      height: message.height || undefined,
      thumbnailUrl: message.thumbnailUrl || undefined,
      batchShareId: message.batchShareId || undefined,
      sender: {
        id: message.sender.id,
        name: message.sender.name,
        role: message.sender.role,
      },
      batchShare: message.batchShare,
    };
  }

  /**
   * Get messages for a conversation with pagination
   */
  async getMessages(
    conversationId: string,
    userId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{
    messages: MessageWithSender[];
    totalCount: number;
    hasMore: boolean;
  }> {
    // Verify user has access to conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ farmerId: userId }, { doctorId: userId }],
      },
    });

    if (!conversation) {
      throw new Error("Conversation not found or access denied");
    }

    const skip = (page - 1) * limit;

    try {
      const [messages, totalCount] = await Promise.all([
        prisma.message.findMany({
          where: {
            conversationId,
            isDeleted: false,
          },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
            batchShare: true,
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.message.count({
          where: {
            conversationId,
            isDeleted: false,
          },
        }),
      ]);

    const formattedMessages: MessageWithSender[] = messages.map((msg) => ({
      id: msg.id,
      text: msg.text || "",
      messageType: msg.messageType,
      createdAt: msg.createdAt,
      read: msg.read,
      edited: msg.edited,
      isDeleted: msg.isDeleted,
      attachmentUrl: msg.attachmentUrl || undefined,
      attachmentKey: msg.attachmentKey || undefined,
      fileName: msg.fileName || undefined,
      contentType: msg.contentType || undefined,
      fileSize: msg.fileSize || undefined,
      durationMs: msg.durationMs || undefined,
      width: msg.width || undefined,
      height: msg.height || undefined,
      thumbnailUrl: msg.thumbnailUrl || undefined,
      batchShareId: msg.batchShareId || undefined,
      sender: {
        id: msg.sender.id,
        name: msg.sender.name,
        role: msg.sender.role,
      },
      batchShare: msg.batchShare || undefined,
    }));

      return {
        messages: formattedMessages.reverse(), // Reverse to show oldest first
        totalCount,
        hasMore: skip + messages.length < totalCount,
      };
    } catch (error) {
      // Handle database connection errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P1001") {
          throw new Error(
            "Database connection failed. Please check your database connection string and ensure the database server is running."
          );
        }
        throw new Error(`Database error: ${error.message}`);
      }
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(
    conversationId: string,
    userId: string,
    messageIds?: string[]
  ): Promise<number> {
    // Verify user has access to conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ farmerId: userId }, { doctorId: userId }],
      },
    });

    if (!conversation) {
      throw new Error("Conversation not found or access denied");
    }

    const whereClause: any = {
      conversationId,
      senderId: { not: userId }, // Don't mark own messages as read
      read: false,
      isDeleted: false,
    };

    if (messageIds && messageIds.length > 0) {
      whereClause.id = { in: messageIds };
    }

    const result = await prisma.message.updateMany({
      where: whereClause,
      data: { read: true },
    });

    return result.count;
  }

  /**
   * Edit a message
   */
  async editMessage(
    messageId: string,
    userId: string,
    newText: string
  ): Promise<MessageWithSender> {
    // Verify message exists and user is the sender
    const existingMessage = await prisma.message.findFirst({
      where: {
        id: messageId,
        senderId: userId,
        isDeleted: false,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        batchShare: true,
      },
    });

    if (!existingMessage) {
      throw new Error("Message not found or access denied");
    }

    // Only allow editing text messages for now
    if (existingMessage.messageType !== "TEXT") {
      throw new Error("Only text messages can be edited");
    }

    // Update the message
    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        text: newText.trim(),
        edited: true,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        batchShare: true,
      },
    });

    return {
      id: updatedMessage.id,
      text: updatedMessage.text || "",
      messageType: updatedMessage.messageType,
      createdAt: updatedMessage.createdAt,
      read: updatedMessage.read,
      edited: updatedMessage.edited,
      isDeleted: updatedMessage.isDeleted,
      attachmentUrl: updatedMessage.attachmentUrl || undefined,
      attachmentKey: updatedMessage.attachmentKey || undefined,
      fileName: updatedMessage.fileName || undefined,
      contentType: updatedMessage.contentType || undefined,
      fileSize: updatedMessage.fileSize || undefined,
      durationMs: updatedMessage.durationMs || undefined,
      width: updatedMessage.width || undefined,
      height: updatedMessage.height || undefined,
      thumbnailUrl: updatedMessage.thumbnailUrl || undefined,
      batchShareId: updatedMessage.batchShareId || undefined,
      sender: {
        id: updatedMessage.sender.id,
        name: updatedMessage.sender.name || "",
        role: updatedMessage.sender.role,
      },
      batchShare: updatedMessage.batchShare || undefined,
    };
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(messageId: string, userId: string): Promise<boolean> {
    // Verify message exists and user is the sender
    const existingMessage = await prisma.message.findFirst({
      where: {
        id: messageId,
        senderId: userId,
        isDeleted: false,
      },
    });

    if (!existingMessage) {
      throw new Error("Message not found or access denied");
    }

    // Soft delete by setting isDeleted flag
    await prisma.message.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
      },
    });

    return true;
  }

  /**
   * Get unread message count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return await prisma.message.count({
      where: {
        read: false,
        senderId: { not: userId },
        isDeleted: false,
        conversation: {
          OR: [{ farmerId: userId }, { doctorId: userId }],
        },
      },
    });
  }

  /**
   * Get unread count per conversation for a user
   */
  async getUnreadCountByConversation(userId: string): Promise<{
    [conversationId: string]: number;
  }> {
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [{ farmerId: userId }, { doctorId: userId }],
      },
      select: { id: true },
    });

    const conversationIds = conversations.map((c) => c.id);

    const unreadCounts = await prisma.message.groupBy({
      by: ["conversationId"],
      where: {
        conversationId: { in: conversationIds },
        read: false,
        senderId: { not: userId },
        isDeleted: false,
      },
      _count: {
        id: true,
      },
    });

    const result: { [conversationId: string]: number } = {};
    unreadCounts.forEach((item) => {
      result[item.conversationId] = item._count.id;
    });

    return result;
  }

  /**
   * Search messages in a conversation
   */
  async searchMessages(
    conversationId: string,
    userId: string,
    query: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    messages: MessageWithSender[];
    totalCount: number;
    hasMore: boolean;
  }> {
    // Verify user has access to conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ farmerId: userId }, { doctorId: userId }],
      },
    });

    if (!conversation) {
      throw new Error("Conversation not found or access denied");
    }

    const skip = (page - 1) * limit;

    const [messages, totalCount] = await Promise.all([
      prisma.message.findMany({
        where: {
          conversationId,
          isDeleted: false,
          text: {
            contains: query,
            mode: "insensitive",
          },
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
          batchShare: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.message.count({
        where: {
          conversationId,
          isDeleted: false,
          text: {
            contains: query,
            mode: "insensitive",
          },
        },
      }),
    ]);

    const formattedMessages: MessageWithSender[] = messages.map((msg) => ({
      id: msg.id,
      text: msg.text || "",
      messageType: msg.messageType,
      createdAt: msg.createdAt,
      read: msg.read,
      edited: msg.edited,
      isDeleted: msg.isDeleted,
      attachmentUrl: msg.attachmentUrl || undefined,
      attachmentKey: msg.attachmentKey || undefined,
      fileName: msg.fileName || undefined,
      contentType: msg.contentType || undefined,
      fileSize: msg.fileSize || undefined,
      durationMs: msg.durationMs || undefined,
      width: msg.width || undefined,
      height: msg.height || undefined,
      thumbnailUrl: msg.thumbnailUrl || undefined,
      batchShareId: msg.batchShareId || undefined,
      sender: {
        id: msg.sender.id,
        name: msg.sender.name,
        role: msg.sender.role,
      },
      batchShare: msg.batchShare || undefined,
    }));

    return {
      messages: formattedMessages.reverse(),
      totalCount,
      hasMore: skip + messages.length < totalCount,
    };
  }
}

// Singleton instance
let messageServiceInstance: MessageService | null = null;

export const getMessageService = (): MessageService => {
  if (!messageServiceInstance) {
    messageServiceInstance = new MessageService();
  }
  return messageServiceInstance;
};
