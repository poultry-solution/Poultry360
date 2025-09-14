import { PrismaClient, MessageType } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateMessageData {
  conversationId: string;
  senderId: string;
  text: string;
  messageType?: MessageType;
}

export interface MessageWithSender {
  id: string;
  text: string;
  messageType: MessageType;
  createdAt: Date;
  read: boolean;
  edited: boolean;
  sender: {
    id: string;
    name: string;
    role: string;
  };
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
        OR: [
          { farmerId: data.senderId },
          { doctorId: data.senderId }
        ],
        status: 'ACTIVE'
      },
      include: {
        farmer: true,
        doctor: true
      }
    });

    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        conversationId: data.conversationId,
        senderId: data.senderId,
        text: data.text.trim(),
        messageType: data.messageType || 'TEXT'
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    });

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: data.conversationId },
      data: { updatedAt: new Date() }
    });

    return {
      id: message.id,
      text: message.text,
      messageType: message.messageType,
      createdAt: message.createdAt,
      read: message.read,
      edited: message.edited,
      sender: {
        id: message.sender.id,
        name: message.sender.name,
        role: message.sender.role
      }
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
        OR: [
          { farmerId: userId },
          { doctorId: userId }
        ]
      }
    });

    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    const skip = (page - 1) * limit;

    const [messages, totalCount] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId },
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
        take: limit
      }),
      prisma.message.count({
        where: { conversationId }
      })
    ]);

    const formattedMessages: MessageWithSender[] = messages.map(msg => ({
      id: msg.id,
      text: msg.text,
      messageType: msg.messageType,
      createdAt: msg.createdAt,
      read: msg.read,
      edited: msg.edited,
      sender: {
        id: msg.sender.id,
        name: msg.sender.name,
        role: msg.sender.role
      }
    }));

    return {
      messages: formattedMessages.reverse(), // Reverse to show oldest first
      totalCount,
      hasMore: skip + messages.length < totalCount
    };
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
        OR: [
          { farmerId: userId },
          { doctorId: userId }
        ]
      }
    });

    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    const whereClause: any = {
      conversationId,
      senderId: { not: userId }, // Don't mark own messages as read
      read: false
    };

    if (messageIds && messageIds.length > 0) {
      whereClause.id = { in: messageIds };
    }

    const result = await prisma.message.updateMany({
      where: whereClause,
      data: { read: true }
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
        senderId: userId
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    });

    if (!existingMessage) {
      throw new Error('Message not found or access denied');
    }

    // Update the message
    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        text: newText.trim(),
        edited: true
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    });

    return {
      id: updatedMessage.id,
      text: updatedMessage.text,
      messageType: updatedMessage.messageType,
      createdAt: updatedMessage.createdAt,
      read: updatedMessage.read,
      edited: updatedMessage.edited,
      sender: {
        id: updatedMessage.sender.id,
        name: updatedMessage.sender.name,
        role: updatedMessage.sender.role
      }
    };
  }

  /**
   * Delete a message (soft delete by clearing text)
   */
  async deleteMessage(messageId: string, userId: string): Promise<boolean> {
    // Verify message exists and user is the sender
    const existingMessage = await prisma.message.findFirst({
      where: {
        id: messageId,
        senderId: userId
      }
    });

    if (!existingMessage) {
      throw new Error('Message not found or access denied');
    }

    // Soft delete by clearing the text
    await prisma.message.update({
      where: { id: messageId },
      data: {
        text: '[Message deleted]',
        edited: true
      }
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
        conversation: {
          OR: [
            { farmerId: userId },
            { doctorId: userId }
          ]
        }
      }
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
        OR: [
          { farmerId: userId },
          { doctorId: userId }
        ]
      },
      select: { id: true }
    });

    const conversationIds = conversations.map(c => c.id);

    const unreadCounts = await prisma.message.groupBy({
      by: ['conversationId'],
      where: {
        conversationId: { in: conversationIds },
        read: false,
        senderId: { not: userId }
      },
      _count: {
        id: true
      }
    });

    const result: { [conversationId: string]: number } = {};
    unreadCounts.forEach(item => {
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
        OR: [
          { farmerId: userId },
          { doctorId: userId }
        ]
      }
    });

    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    const skip = (page - 1) * limit;

    const [messages, totalCount] = await Promise.all([
      prisma.message.findMany({
        where: {
          conversationId,
          text: {
            contains: query,
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
        take: limit
      }),
      prisma.message.count({
        where: {
          conversationId,
          text: {
            contains: query,
            mode: 'insensitive'
          }
        }
      })
    ]);

    const formattedMessages: MessageWithSender[] = messages.map(msg => ({
      id: msg.id,
      text: msg.text,
      messageType: msg.messageType,
      createdAt: msg.createdAt,
      read: msg.read,
      edited: msg.edited,
      sender: {
        id: msg.sender.id,
        name: msg.sender.name,
        role: msg.sender.role
      }
    }));

    return {
      messages: formattedMessages.reverse(),
      totalCount,
      hasMore: skip + messages.length < totalCount
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
