import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { getRoomService } from './roomService';
import { getMessageService } from './messageService';

const prisma = new PrismaClient();
const messageService = getMessageService();

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
  userName?: string;
}

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
        this.roomService.markUserOnline(socket.userId);
      }

      // Join conversation room
      socket.on('join_conversation', async (data: { conversationId: string }) => {
        try {
          if (!socket.userId || !socket.userRole) {
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
            socket.emit('error', { message: 'Conversation not found or access denied' });
            return;
          }

          const userRole = conversation.farmerId === socket.userId ? 'FARMER' : 'DOCTOR';
          
          const result = await this.roomService.joinRoom(
            socket.id,
            socket.userId,
            conversationId,
            userRole
          );

          if (result.success) {
            socket.emit('joined_conversation', { conversationId });
            
            // Send recent messages to the user
            const messages = await messageService.getMessages(conversationId, socket.userId, 1, 50);
            socket.emit('conversation_history', messages);
          } else {
            socket.emit('error', { message: result.error });
          }
        } catch (error) {
          console.error('Error joining conversation:', error);
          socket.emit('error', { message: 'Failed to join conversation' });
        }
      });

      // Send message
      socket.on('send_message', async (data: { conversationId: string; text: string; messageType?: string }) => {
        try {
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
          const message = await messageService.createMessage({
            conversationId,
            senderId: socket.userId,
            text: text.trim(),
            messageType: messageType as any
          });

          // Broadcast message to room
          await this.roomService.broadcastMessage(conversationId, {
            id: message.id,
            text: message.text,
            senderId: message.sender.id,
            senderName: message.sender.name,
            senderRole: message.sender.role,
            messageType: message.messageType,
            createdAt: message.createdAt
          });

          // Confirm message sent
          socket.emit('message_sent', { messageId: message.id });
        } catch (error) {
          console.error('Error sending message:', error);
          socket.emit('error', { message: 'Failed to send message' });
        }
      });

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
          await messageService.markMessagesAsRead(conversationId, socket.userId, messageIds);
        } catch (error) {
          console.error('Error marking messages as read:', error);
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
        this.roomService.markUserOffline(socket.userId);
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
    this.io.to(roomId).emit(event, data);
  }

  // Get online users count
  getOnlineUsersCount(): number {
    return this.io.sockets.sockets.size;
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

