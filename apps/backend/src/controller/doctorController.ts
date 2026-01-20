import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { getSocketService } from "../services/socketService";
import { getRoomService } from "../services/roomService";

export const updateOnlineStatus = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { isOnline } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
    }

    if (typeof isOnline !== "boolean") {
      return res.status(400).json({
        success: false,
        error: "isOnline must be a boolean value",
      });
    }

    // Verify user is a doctor
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, role: true, status: true }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    if (user.role !== 'DOCTOR') {
      return res.status(403).json({
        success: false,
        error: "Only doctors can update online status",
      });
    }

    // Update the user's online status in database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isOnline,
        lastSeen: new Date()
      },
      select: {
        id: true,
        name: true,
        role: true,
        isOnline: true,
        lastSeen: true
      }
    });

    // Update room service status
    try {
      const roomService = getRoomService();
      if (isOnline) {
        roomService.markUserOnline(userId);
      } else {
        roomService.markUserOffline(userId);
      }
    } catch (error) {
      console.warn('Room service not available:', error);
    }

    // Broadcast status change to all connected clients via socket
    try {
      const socketService = getSocketService();

      // Broadcast to all users in conversations with this doctor
      const doctorConversations = await prisma.conversation.findMany({
        where: {
          doctorId: userId,
          status: 'ACTIVE'
        },
        select: {
          id: true,
          farmerId: true
        }
      });

      // Notify farmers in active conversations
      doctorConversations.forEach(conversation => {
        socketService.broadcastToConversation(conversation.id, 'doctor_status_changed', {
          doctorId: userId,
          doctorName: user.name,
          isOnline,
          lastSeen: updatedUser.lastSeen
        });
      });

      // Also broadcast to global doctor status listeners
      socketService.getIO().emit('doctor_global_status_changed', {
        doctorId: userId,
        doctorName: user.name,
        isOnline,
        lastSeen: updatedUser.lastSeen
      });

    } catch (error) {
      console.warn('Socket service not available:', error);
    }

    console.log(`Doctor ${user.name} (${userId}) is now ${isOnline ? 'online' : 'offline'}`);

    return res.status(200).json({
      success: true,
      message: `Doctor is now ${isOnline ? 'online' : 'offline'}`,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        role: updatedUser.role,
        isOnline: updatedUser.isOnline,
        lastSeen: updatedUser.lastSeen
      }
    });
  } catch (error) {
    console.error("Error updating doctor online status:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

export const getDoctorStatus = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
    }

    // Get the user's current status including online status
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        role: true,
        status: true,
        isOnline: true,
        lastSeen: true
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    if (user.role !== 'DOCTOR') {
      return res.status(403).json({
        success: false,
        error: "Only doctors can access this endpoint",
      });
    }

    // Cross-check with room service for real-time presence
    let realTimeOnline = user.isOnline;
    try {
      const roomService = getRoomService();
      const onlineUserIds = roomService.getOnlineUserIds();
      realTimeOnline = onlineUserIds.has(userId) || user.isOnline;
    } catch (error) {
      console.warn('Room service not available for status check:', error);
    }

    // Get active conversations count
    const activeConversations = await prisma.conversation.count({
      where: {
        doctorId: userId,
        status: 'ACTIVE'
      }
    });

    // Get recent messages count (unread)
    const unreadMessages = await prisma.message.count({
      where: {
        conversation: {
          doctorId: userId,
          status: 'ACTIVE'
        },
        senderId: { not: userId },
        read: false
      }
    });

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        status: user.status,
        isOnline: realTimeOnline,
        lastSeen: user.lastSeen
      },
      stats: {
        activeConversations,
        unreadMessages
      }
    });
  } catch (error) {
    console.error("Error getting doctor status:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};
