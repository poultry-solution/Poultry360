import { PrismaClient } from '@prisma/client';
import { Server as SocketIOServer } from 'socket.io';

const prisma = new PrismaClient();

export interface RoomUser {
  userId: string;
  socketId: string;
  role: 'FARMER' | 'DOCTOR';
  name: string;
}

export interface RoomData {
  conversationId: string;
  farmerId: string;
  doctorId: string;
  users: Map<string, RoomUser>;
  isActive: boolean;
}

export class RoomService {
  private rooms: Map<string, RoomData> = new Map();
  private userSockets: Map<string, string> = new Map(); // userId -> socketId
  private socketUsers: Map<string, string> = new Map(); // socketId -> userId
  private onlineUserIds: Set<string> = new Set(); // presence by connection, independent of rooms

  constructor(private io: SocketIOServer) {}

  /**
   * Create or get a conversation room
   */
  async getOrCreateRoom(farmerId: string, doctorId: string): Promise<string> {
    // Check if conversation already exists in database
    let conversation = await prisma.conversation.findFirst({
      where: {
        farmerId,
        doctorId,
        status: 'ACTIVE'
      }
    });

    // Create conversation if it doesn't exist
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          farmerId,
          doctorId,
          status: 'ACTIVE'
        }
      });
    }

    const roomId = `conversation_${conversation.id}`;

    // Initialize room if it doesn't exist
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        conversationId: conversation.id,
        farmerId,
        doctorId,
        users: new Map(),
        isActive: true
      });
    }

    return roomId;
  }

  /**
   * Join a user to a conversation room
   */
  async joinRoom(
    socketId: string,
    userId: string,
    conversationId: string,
    userRole: 'FARMER' | 'DOCTOR'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify user has access to this conversation
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          OR: [
            { farmerId: userId },
            { doctorId: userId }
          ]
        },
        include: {
          farmer: true,
          doctor: true
        }
      });

      if (!conversation) {
        return { success: false, error: 'Conversation not found or access denied' };
      }

      // Verify user role matches conversation
      const isFarmer = conversation.farmerId === userId;
      const isDoctor = conversation.doctorId === userId;

      if ((userRole === 'FARMER' && !isFarmer) || (userRole === 'DOCTOR' && !isDoctor)) {
        return { success: false, error: 'Role mismatch' };
      }

      const roomId = `conversation_${conversationId}`;

      // Get or create room
      let room = this.rooms.get(roomId);
      if (!room) {
        room = {
          conversationId,
          farmerId: conversation.farmerId,
          doctorId: conversation.doctorId,
          users: new Map(),
          isActive: true
        };
        this.rooms.set(roomId, room);
      }

      // Remove user from any previous socket
      const previousSocketId = this.userSockets.get(userId);
      if (previousSocketId) {
        this.leaveRoom(previousSocketId);
      }

      // Add user to room
      const userData: RoomUser = {
        userId,
        socketId,
        role: userRole,
        name: userRole === 'FARMER' ? conversation.farmer.name : conversation.doctor.name
      };

      room.users.set(socketId, userData);
      this.userSockets.set(userId, socketId);
      this.socketUsers.set(socketId, userId);

      // Join socket.io room
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        await socket.join(roomId);
        console.log(`✅ Socket ${socketId} (${userRole} ${userData.name}) joined room ${roomId}`);
        console.log(`📊 Room ${roomId} now has ${room.users.size} user(s)`);
      } else {
        console.error(`❌ Socket ${socketId} not found, cannot join room ${roomId}`);
      }

      // Notify other users in the room
      socket?.to(roomId).emit('user_joined', {
        userId,
        name: userData.name,
        role: userRole
      });

      return { success: true };
    } catch (error) {
      console.error('Error joining room:', error);
      return { success: false, error: 'Internal server error' };
    }
  }

  /**
   * Remove a user from a room
   */
  leaveRoom(socketId: string): void {
    const userId = this.socketUsers.get(socketId);
    if (!userId) return;

    // Find which room the user is in
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.users.has(socketId)) {
        const userData = room.users.get(socketId);
        room.users.delete(socketId);

        // Notify other users
        this.io.to(roomId).emit('user_left', {
          userId,
          name: userData?.name,
          role: userData?.role
        });

        // Clean up empty rooms
        if (room.users.size === 0) {
          this.rooms.delete(roomId);
        }

        break;
      }
    }

    // Clean up user mappings
    this.userSockets.delete(userId);
    this.socketUsers.delete(socketId);
  }

  /**
   * Explicitly mark a user online on socket connect
   */
  async markUserOnline(userId: string): Promise<void> {
    this.onlineUserIds.add(userId);
    
    // Update database status
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          isOnline: true,
          lastSeen: new Date()
        }
      });

      // Emit status change to relevant conversations
      // await this.broadcastUserStatusChange(userId, true);
    } catch (error) {
      console.error('Error updating user online status in database:', error);
    }
  }

  /**
   * Explicitly mark a user offline on socket disconnect
   */
  async markUserOffline(userId: string | undefined): Promise<void> {
    if (!userId) return;
    this.onlineUserIds.delete(userId);
    
    // Update database status
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          isOnline: false,
          lastSeen: new Date()
        }
      });

      // Emit status change to relevant conversations
      // await this.broadcastUserStatusChange(userId, false);
    } catch (error) {
      console.error('Error updating user offline status in database:', error);
    }
  }

  /**
   * Get set of online user IDs (presence union: global presence OR present in any room)
   */
  getOnlineUserIds(): Set<string> {
    const online = new Set<string>(this.onlineUserIds);
    for (const room of this.rooms.values()) {
      for (const user of room.users.values()) {
        online.add(user.userId);
      }
    }
    return online;
  }

  /**
   * Get room data
   */
  getRoom(conversationId: string): RoomData | undefined {
    const roomId = `conversation_${conversationId}`;
    return this.rooms.get(roomId);
  }

  /**
   * Get all users in a room
   */
  getRoomUsers(conversationId: string): RoomUser[] {
    const room = this.getRoom(conversationId);
    return room ? Array.from(room.users.values()) : [];
  }

  /**
   * Check if user is in a specific room
   */
  isUserInRoom(userId: string, conversationId: string): boolean {
    const room = this.getRoom(conversationId);
    if (!room) return false;

    return Array.from(room.users.values()).some(user => user.userId === userId);
  }

  /**
   * Get user's current room
   */
  getUserRoom(userId: string): string | null {
    const socketId = this.userSockets.get(userId);
    if (!socketId) return null;

    for (const [roomId, room] of this.rooms.entries()) {
      if (room.users.has(socketId)) {
        return roomId;
      }
    }

    return null;
  }

  /**
   * Broadcast message to room
   */
  async broadcastMessage(
    conversationId: string,
    message: {
      id: string;
      conversationId: string;  // ✅ Add this field
      text: string;
      senderId: string;
      senderName: string;
      senderRole: string;
      messageType: 'TEXT' | 'IMAGE' | 'FILE';
      createdAt: Date;
    }
  ): Promise<void> {
    const roomId = `conversation_${conversationId}`;
    let room = this.rooms.get(roomId);

    // If room doesn't exist, create it (happens when users haven't joined yet or after server restart)
    if (!room) {
      console.log(`🔄 Room not in memory, creating it for conversation ${conversationId}`);
      
      // Fetch conversation details from DB
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          farmer: true,
          doctor: true
        }
      });

      if (!conversation) {
        console.error(`❌ Cannot broadcast: Conversation ${conversationId} not found in database`);
        return;
      }

      // Create the room in memory
      room = {
        conversationId,
        farmerId: conversation.farmerId,
        doctorId: conversation.doctorId,
        users: new Map(),
        isActive: true
      };
      this.rooms.set(roomId, room);
      console.log(`✅ Created room ${roomId} for broadcasting`);
    }

    // Broadcast to all users in the room (even if no one is in it yet, socket.io will handle it)
    console.log(`📡 Broadcasting message ${message.id} to room ${roomId}. Users in room: ${room.users.size}`);
    this.io.to(roomId).emit('new_message', message);

    // Mark message as delivered to online users
    const onlineUserIds = Array.from(room.users.values()).map(user => user.userId);
    
    // Update message read status for online users (except sender)
    if (onlineUserIds.length > 1) {
      await prisma.message.updateMany({
        where: {
          id: message.id,
          senderId: { not: message.senderId }
        },
        data: {
          read: true
        }
      });
    }
  }

  /**
   * Get conversation participants
   */
  async getConversationParticipants(conversationId: string): Promise<{
    farmer: { id: string; name: string; isOnline: boolean };
    doctor: { id: string; name: string; isOnline: boolean };
  }> {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        farmer: { select: { id: true, name: true } },
        doctor: { select: { id: true, name: true } }
      }
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const room = this.getRoom(conversationId);
    const onlineUserIds = room ? Array.from(room.users.values()).map(user => user.userId) : [];

    return {
      farmer: {
        id: conversation.farmer.id,
        name: conversation.farmer.name,
        isOnline: onlineUserIds.includes(conversation.farmer.id)
      },
      doctor: {
        id: conversation.doctor.id,
        name: conversation.doctor.name,
        isOnline: onlineUserIds.includes(conversation.doctor.id)
      }
    };
  }

  /**
   * Clean up inactive rooms
   */
  cleanupInactiveRooms(): void {
    const now = Date.now();
    const INACTIVE_THRESHOLD = 30 * 60 * 1000; // 30 minutes

    for (const [roomId, room] of this.rooms.entries()) {
      if (room.users.size === 0) {
        this.rooms.delete(roomId);
      }
    }
  }

  /**
   * Get room statistics
   */
  getStats(): {
    totalRooms: number;
    totalUsers: number;
    activeConversations: number;
  } {
    const totalRooms = this.rooms.size;
    const totalUsers = Array.from(this.rooms.values()).reduce(
      (sum, room) => sum + room.users.size,
      0
    );
    const activeConversations = Array.from(this.rooms.values()).filter(
      room => room.isActive
    ).length;

    return {
      totalRooms,
      totalUsers,
      activeConversations
    };
  }
}

// Singleton instance
let roomServiceInstance: RoomService | null = null;

export const getRoomService = (io?: SocketIOServer): RoomService => {
  if (!roomServiceInstance && io) {
    roomServiceInstance = new RoomService(io);
  }
  
  if (!roomServiceInstance) {
    throw new Error('RoomService not initialized. Call getRoomService(io) first.');
  }
  
  return roomServiceInstance;
};
