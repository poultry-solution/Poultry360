import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { getRoomService } from './roomService';
import { getMessageService } from './messageService';
import { notificationService, NotificationType } from './webpushService';

const prisma = new PrismaClient();
const messageService = getMessageService();

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
  userName?: string;
}

// Helper function to get notification content based on message type
const getSocketNotificationContent = (message: any, senderName: string) => {
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

export class SocketService {
  private io: SocketIOServer;
  private roomService: any;

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URLS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    this.roomService = getRoomService(this.io);
    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;

        // Verify user exists and is active
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { id: true, name: true, role: true, status: true }
        });

        if (!user || user.status !== 'ACTIVE') {
          return next(new Error('Authentication error: User not found or inactive'));
        }

        socket.userId = user.id;
        socket.userRole = user.role;
        socket.userName = user.name;

        next();
      } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`User ${socket.userId} (${socket.userName}) connected with socket ${socket.id}`);

      // Mark presence on connect
      if (socket.userId) {
        // Use async version for database sync
        this.roomService.markUserOnline(socket.userId).catch((error: any) => {
          console.error('Error marking user online:', error);
        });
      }

      // Join conversation room
      socket.on('join_conversation', async (data: { conversationId: string }) => {
        try {
          console.log(`🚪 User ${socket.userId} (${socket.userName}) attempting to join conversation ${data.conversationId}`);

          if (!socket.userId || !socket.userRole) {
            console.error('❌ Join failed: No authentication');
            socket.emit('error', { message: 'Authentication required' });
            return;
          }

          const { conversationId } = data;

          // Determine user role for this conversation
          const conversation = await prisma.conversation.findFirst({
            where: {
              id: conversationId,
              OR: [
                { farmerId: socket.userId },
                { doctorId: socket.userId }
              ]
            }
          });

          if (!conversation) {
            console.error(`❌ Conversation ${conversationId} not found or access denied for user ${socket.userId}`);
            socket.emit('error', { message: 'Conversation not found or access denied' });
            return;
          }

          const userRole = conversation.farmerId === socket.userId ? 'FARMER' : 'DOCTOR';
          console.log(`👤 User ${socket.userId} is ${userRole} in conversation ${conversationId}`);

          const result = await this.roomService.joinRoom(
            socket.id,
            socket.userId,
            conversationId,
            userRole
          );

          if (result.success) {
            console.log(`✅ User ${socket.userId} successfully joined conversation ${conversationId}`);
            socket.emit('joined_conversation', { conversationId });

            // Send recent messages to the user
            const messages = await messageService.getMessages(conversationId, socket.userId, 1, 50);
            console.log(`📜 Sending ${messages.messages?.length || 0} messages to user ${socket.userId}`);
            socket.emit('conversation_history', messages);
          } else {
            console.error(`❌ Join failed for user ${socket.userId}: ${result.error}`);
            socket.emit('error', { message: result.error });
          }
        } catch (error) {
          console.error('❌ Error joining conversation:', error);
          socket.emit('error', { message: 'Failed to join conversation' });
        }
      });

      // Send message
      socket.on('send_message', async (data: { conversationId: string; text: string; messageType?: string }) => {
        try {
          console.log(`📨 Received send_message from ${socket.userId} (${socket.userName}):`, {
            conversationId: data.conversationId,
            textLength: data.text?.length,
            socketId: socket.id
          });

          if (!socket.userId) {
            socket.emit('error', { message: 'Authentication required' });
            return;
          }

          const { conversationId, text, messageType = 'TEXT' } = data;

          if (!text || text.trim().length === 0) {
            socket.emit('error', { message: 'Message text is required' });
            return;
          }

          if (text.length > 1000) {
            socket.emit('error', { message: 'Message too long (max 1000 characters)' });
            return;
          }

          // Create message in database
          console.log(`💾 Creating message in database for conversation ${conversationId}`);
          const message = await messageService.createMessage({
            conversationId,
            senderId: socket.userId,
            text: text.trim(),
            messageType: messageType as any
          });
          console.log(`✅ Message created in DB with ID: ${message.id}`);

          // Broadcast message to room
          console.log(`📡 Broadcasting message ${message.id} to conversation ${conversationId}`);
          await this.roomService.broadcastMessage(conversationId, {
            id: message.id,
            conversationId: conversationId,  // ✅ Add conversationId for frontend matching
            text: message.text,
            senderId: message.sender.id,
            senderName: message.sender.name,
            senderRole: message.sender.role,
            messageType: message.messageType,
            createdAt: message.createdAt
          });

          // Send push notifications to conversation participants (excluding sender)
          try {
            const notificationContent = getSocketNotificationContent(message, message.sender.name);
            const result = await notificationService.sendConversationNotification(
              conversationId,
              socket.userId, // Exclude sender
              {
                ...notificationContent,
                data: {
                  conversationId,
                  messageId: message.id,
                  messageType: message.messageType,
                  url: `/dashboard/chat-doctor/${conversationId}`
                }
              }
            );

            console.log(`📱 Sent ${result.sentCount} push notifications for socket message ${message.id}`);
          } catch (notificationError) {
            console.error('Failed to send push notifications for socket message:', notificationError);
            // Don't fail the message send if notifications fail
          }

          // Confirm message sent
          console.log(`✅ Confirming message_sent to sender ${socket.userId}`);
          socket.emit('message_sent', { messageId: message.id });
        } catch (error) {
          console.error('❌ Error sending message:', error);
          socket.emit('error', { message: 'Failed to send message' });
        }
      });

      // Listen for backend-triggered message updates/deletes if needed (no-op here; backend emits directly)

      // Typing indicator
      socket.on('typing_start', (data: { conversationId: string }) => {
        const roomId = `conversation_${data.conversationId}`;
        socket.to(roomId).emit('user_typing', {
          userId: socket.userId,
          userName: socket.userName,
          isTyping: true
        });
      });

      socket.on('typing_stop', (data: { conversationId: string }) => {
        const roomId = `conversation_${data.conversationId}`;
        socket.to(roomId).emit('user_typing', {
          userId: socket.userId,
          userName: socket.userName,
          isTyping: false
        });
      });

      // Mark messages as read
      socket.on('mark_messages_read', async (data: { conversationId: string; messageIds?: string[] }) => {
        try {
          if (!socket.userId) {
            return;
          }

          const { conversationId, messageIds } = data;
          console.log(`📖 [Mark as Read] User ${socket.userId} marking messages in conversation ${conversationId}`);

          const readCount = await messageService.markMessagesAsRead(conversationId, socket.userId, messageIds);

          console.log(`✅ [Mark as Read] Marked ${readCount} messages as read`);

          // Broadcast to all users in the conversation that messages were read
          const roomId = `conversation_${conversationId}`;
          this.io.to(roomId).emit('messages_read', {
            conversationId,
            userId: socket.userId,
            readCount
          });

          console.log(`📡 [Mark as Read] Broadcasted messages_read event to room ${roomId}`);
        } catch (error) {
          console.error('Error marking messages as read:', error);
          socket.emit('error', { message: 'Failed to mark messages as read' });
        }
      });

      // Leave conversation
      socket.on('leave_conversation', (data: { conversationId: string }) => {
        this.roomService.leaveRoom(socket.id);
        socket.emit('left_conversation', { conversationId: data.conversationId });
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`User ${socket.userId} (${socket.userName}) disconnected`);
        this.roomService.leaveRoom(socket.id);
        // Use async version for database sync
        this.roomService.markUserOffline(socket.userId).catch((error: any) => {
          console.error('Error marking user offline:', error);
        });
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error('Socket error:', error);
      });
    });
  }

  // Get Socket.IO instance
  getIO(): SocketIOServer {
    return this.io;
  }

  // Get room service
  getRoomService() {
    return this.roomService;
  }

  // Broadcast to specific user
  broadcastToUser(userId: string, event: string, data: any) {
    const socketId = this.roomService.userSockets?.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  // Broadcast to conversation
  broadcastToConversation(conversationId: string, event: string, data: any) {
    const roomId = `conversation_${conversationId}`;
    console.log("broadcasting to conversation", roomId, event, data);
    this.io.to(roomId).emit(event, data);
  }

  // Get online users count
  getOnlineUsersCount(): number {
    return this.io.sockets.sockets.size;
  }

  // Get online doctors
  async getOnlineDoctors() {
    return this.roomService.getOnlineDoctors ? await this.roomService.getOnlineDoctors() : [];
  }

  // Sync online status
  async syncOnlineStatus() {
    if (this.roomService.syncOnlineStatus) {
      await this.roomService.syncOnlineStatus();
    }
  }

  // Broadcast user status change
  async broadcastUserStatusChange(userId: string, isOnline: boolean) {
    if (this.roomService.broadcastUserStatusChange) {
      await this.roomService.broadcastUserStatusChange(userId, isOnline);
    }
  }

  // Get room statistics
  getRoomStats() {
    return this.roomService.getStats();
  }
}

// Singleton instance
let socketServiceInstance: SocketService | null = null;

export const getSocketService = (server?: HTTPServer): SocketService => {
  if (!socketServiceInstance && server) {
    socketServiceInstance = new SocketService(server);
  }

  if (!socketServiceInstance) {
    throw new Error('SocketService not initialized. Call getSocketService(server) first.');
  }

  return socketServiceInstance;
};

