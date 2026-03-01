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
exports.getSocketService = exports.SocketService = void 0;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const roomService_1 = require("./roomService");
const messageService_1 = require("./messageService");
const messageService = (0, messageService_1.getMessageService)();
class SocketService {
    constructor(server) {
        var _a;
        this.io = new socket_io_1.Server(server, {
            cors: {
                origin: ((_a = process.env.FRONTEND_URLS) === null || _a === void 0 ? void 0 : _a.split(',')) || ['http://localhost:3000', 'http://localhost:3001'],
                methods: ['GET', 'POST'],
                credentials: true
            }
        });
        this.roomService = (0, roomService_1.getRoomService)(this.io);
        this.setupMiddleware();
        this.setupEventHandlers();
    }
    setupMiddleware() {
        // Authentication middleware
        this.io.use((socket, next) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const token = socket.handshake.auth.token || ((_a = socket.handshake.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', ''));
                if (!token) {
                    return next(new Error('Authentication error: No token provided'));
                }
                const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
                // Verify user exists and is active
                const user = yield prisma_1.default.user.findUnique({
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
            }
            catch (error) {
                console.error('Socket authentication error:', error);
                next(new Error('Authentication error: Invalid token'));
            }
        }));
    }
    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`User ${socket.userId} (${socket.userName}) connected with socket ${socket.id}`);
            // Mark presence on connect
            if (socket.userId) {
                // Use async version for database sync
                this.roomService.markUserOnline(socket.userId).catch((error) => {
                    console.error('Error marking user online:', error);
                });
            }
            // Join conversation room
            socket.on('join_conversation', (data) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                try {
                    console.log(`🚪 User ${socket.userId} (${socket.userName}) attempting to join conversation ${data.conversationId}`);
                    if (!socket.userId || !socket.userRole) {
                        console.error('❌ Join failed: No authentication');
                        socket.emit('error', { message: 'Authentication required' });
                        return;
                    }
                    const { conversationId } = data;
                    // Determine user role for this conversation
                    const conversation = yield prisma_1.default.conversation.findFirst({
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
                    const result = yield this.roomService.joinRoom(socket.id, socket.userId, conversationId, userRole);
                    if (result.success) {
                        console.log(`✅ User ${socket.userId} successfully joined conversation ${conversationId}`);
                        socket.emit('joined_conversation', { conversationId });
                        // Send recent messages to the user
                        const messages = yield messageService.getMessages(conversationId, socket.userId, 1, 50);
                        console.log(`📜 Sending ${((_a = messages.messages) === null || _a === void 0 ? void 0 : _a.length) || 0} messages to user ${socket.userId}`);
                        socket.emit('conversation_history', messages);
                    }
                    else {
                        console.error(`❌ Join failed for user ${socket.userId}: ${result.error}`);
                        socket.emit('error', { message: result.error });
                    }
                }
                catch (error) {
                    console.error('❌ Error joining conversation:', error);
                    socket.emit('error', { message: 'Failed to join conversation' });
                }
            }));
            // Send message
            socket.on('send_message', (data) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                try {
                    console.log(`📨 Received send_message from ${socket.userId} (${socket.userName}):`, {
                        conversationId: data.conversationId,
                        textLength: (_a = data.text) === null || _a === void 0 ? void 0 : _a.length,
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
                    const message = yield messageService.createMessage({
                        conversationId,
                        senderId: socket.userId,
                        text: text.trim(),
                        messageType: messageType
                    });
                    console.log(`✅ Message created in DB with ID: ${message.id}`);
                    // Broadcast message to room
                    console.log(`📡 Broadcasting message ${message.id} to conversation ${conversationId}`);
                    yield this.roomService.broadcastMessage(conversationId, {
                        id: message.id,
                        conversationId: conversationId, // ✅ Add conversationId for frontend matching
                        text: message.text,
                        senderId: message.sender.id,
                        senderName: message.sender.name,
                        senderRole: message.sender.role,
                        messageType: message.messageType,
                        createdAt: message.createdAt
                    });
                    // Confirm message sent
                    console.log(`✅ Confirming message_sent to sender ${socket.userId}`);
                    socket.emit('message_sent', { messageId: message.id });
                }
                catch (error) {
                    console.error('❌ Error sending message:', error);
                    socket.emit('error', { message: 'Failed to send message' });
                }
            }));
            // Listen for backend-triggered message updates/deletes if needed (no-op here; backend emits directly)
            // Typing indicator
            socket.on('typing_start', (data) => {
                const roomId = `conversation_${data.conversationId}`;
                socket.to(roomId).emit('user_typing', {
                    userId: socket.userId,
                    userName: socket.userName,
                    isTyping: true
                });
            });
            socket.on('typing_stop', (data) => {
                const roomId = `conversation_${data.conversationId}`;
                socket.to(roomId).emit('user_typing', {
                    userId: socket.userId,
                    userName: socket.userName,
                    isTyping: false
                });
            });
            // Mark messages as read
            socket.on('mark_messages_read', (data) => __awaiter(this, void 0, void 0, function* () {
                try {
                    if (!socket.userId) {
                        return;
                    }
                    const { conversationId, messageIds } = data;
                    console.log(`📖 [Mark as Read] User ${socket.userId} marking messages in conversation ${conversationId}`);
                    const readCount = yield messageService.markMessagesAsRead(conversationId, socket.userId, messageIds);
                    console.log(`✅ [Mark as Read] Marked ${readCount} messages as read`);
                    // Broadcast to all users in the conversation that messages were read
                    const roomId = `conversation_${conversationId}`;
                    this.io.to(roomId).emit('messages_read', {
                        conversationId,
                        userId: socket.userId,
                        readCount
                    });
                    console.log(`📡 [Mark as Read] Broadcasted messages_read event to room ${roomId}`);
                }
                catch (error) {
                    console.error('Error marking messages as read:', error);
                    socket.emit('error', { message: 'Failed to mark messages as read' });
                }
            }));
            // Leave conversation
            socket.on('leave_conversation', (data) => {
                this.roomService.leaveRoom(socket.id);
                socket.emit('left_conversation', { conversationId: data.conversationId });
            });
            // Handle disconnect
            socket.on('disconnect', () => {
                console.log(`User ${socket.userId} (${socket.userName}) disconnected`);
                this.roomService.leaveRoom(socket.id);
                // Use async version for database sync
                this.roomService.markUserOffline(socket.userId).catch((error) => {
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
    getIO() {
        return this.io;
    }
    // Get room service
    getRoomService() {
        return this.roomService;
    }
    // Broadcast to specific user
    broadcastToUser(userId, event, data) {
        var _a;
        const socketId = (_a = this.roomService.userSockets) === null || _a === void 0 ? void 0 : _a.get(userId);
        if (socketId) {
            this.io.to(socketId).emit(event, data);
        }
    }
    // Broadcast to conversation
    broadcastToConversation(conversationId, event, data) {
        const roomId = `conversation_${conversationId}`;
        console.log("broadcasting to conversation", roomId, event, data);
        this.io.to(roomId).emit(event, data);
    }
    // Get online users count
    getOnlineUsersCount() {
        return this.io.sockets.sockets.size;
    }
    // Get online doctors
    getOnlineDoctors() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.roomService.getOnlineDoctors ? yield this.roomService.getOnlineDoctors() : [];
        });
    }
    // Sync online status
    syncOnlineStatus() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.roomService.syncOnlineStatus) {
                yield this.roomService.syncOnlineStatus();
            }
        });
    }
    // Broadcast user status change
    broadcastUserStatusChange(userId, isOnline) {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.roomService.broadcastUserStatusChange) {
                yield this.roomService.broadcastUserStatusChange(userId, isOnline);
            }
        });
    }
    // Get room statistics
    getRoomStats() {
        return this.roomService.getStats();
    }
}
exports.SocketService = SocketService;
// Singleton instance
let socketServiceInstance = null;
const getSocketService = (server) => {
    if (!socketServiceInstance && server) {
        socketServiceInstance = new SocketService(server);
    }
    if (!socketServiceInstance) {
        throw new Error('SocketService not initialized. Call getSocketService(server) first.');
    }
    return socketServiceInstance;
};
exports.getSocketService = getSocketService;
