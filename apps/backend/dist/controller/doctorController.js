"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDoctorStatus = exports.updateOnlineStatus = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const socketService_1 = require("../services/socketService");
const roomService_1 = require("../services/roomService");
const updateOnlineStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const user = yield prisma_1.default.user.findUnique({
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
        const updatedUser = yield prisma_1.default.user.update({
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
            const roomService = (0, roomService_1.getRoomService)();
            if (isOnline) {
                roomService.markUserOnline(userId);
            }
            else {
                roomService.markUserOffline(userId);
            }
        }
        catch (error) {
            console.warn('Room service not available:', error);
        }
        // Broadcast status change to all connected clients via socket
        try {
            const socketService = (0, socketService_1.getSocketService)();
            // Broadcast to all users in conversations with this doctor
            const doctorConversations = yield prisma_1.default.conversation.findMany({
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
        }
        catch (error) {
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
    }
    catch (error) {
        console.error("Error updating doctor online status:", error);
        return res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
});
exports.updateOnlineStatus = updateOnlineStatus;
const getDoctorStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                error: "User not authenticated",
            });
        }
        // Get the user's current status including online status
        const user = yield prisma_1.default.user.findUnique({
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
            const roomService = (0, roomService_1.getRoomService)();
            const onlineUserIds = roomService.getOnlineUserIds();
            realTimeOnline = onlineUserIds.has(userId) || user.isOnline;
        }
        catch (error) {
            console.warn('Room service not available for status check:', error);
        }
        // Get active conversations count
        const activeConversations = yield prisma_1.default.conversation.count({
            where: {
                doctorId: userId,
                status: 'ACTIVE'
            }
        });
        // Get recent messages count (unread)
        const unreadMessages = yield prisma_1.default.message.count({
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
    }
    catch (error) {
        console.error("Error getting doctor status:", error);
        return res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
});
exports.getDoctorStatus = getDoctorStatus;
