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
exports.getMessageService = exports.MessageService = void 0;
const client_1 = require("@prisma/client");
const prisma_1 = __importDefault(require("../utils/prisma"));
class MessageService {
    /**
     * Create a new message
     */
    createMessage(data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            // Validate conversation exists and user has access
            const conversation = yield prisma_1.default.conversation.findFirst({
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
            const message = yield prisma_1.default.message.create({
                data: {
                    conversationId: data.conversationId,
                    senderId: data.senderId,
                    text: ((_a = data.text) === null || _a === void 0 ? void 0 : _a.trim()) || null,
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
            yield prisma_1.default.conversation.update({
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
        });
    }
    /**
     * Get messages for a conversation with pagination
     */
    getMessages(conversationId_1, userId_1) {
        return __awaiter(this, arguments, void 0, function* (conversationId, userId, page = 1, limit = 50) {
            // Verify user has access to conversation
            const conversation = yield prisma_1.default.conversation.findFirst({
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
                const [messages, totalCount] = yield Promise.all([
                    prisma_1.default.message.findMany({
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
                    prisma_1.default.message.count({
                        where: {
                            conversationId,
                            isDeleted: false,
                        },
                    }),
                ]);
                const formattedMessages = messages.map((msg) => ({
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
            }
            catch (error) {
                // Handle database connection errors
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                    if (error.code === "P1001") {
                        throw new Error("Database connection failed. Please check your database connection string and ensure the database server is running.");
                    }
                    throw new Error(`Database error: ${error.message}`);
                }
                // Re-throw other errors
                throw error;
            }
        });
    }
    /**
     * Mark messages as read
     */
    markMessagesAsRead(conversationId, userId, messageIds) {
        return __awaiter(this, void 0, void 0, function* () {
            // Verify user has access to conversation
            const conversation = yield prisma_1.default.conversation.findFirst({
                where: {
                    id: conversationId,
                    OR: [{ farmerId: userId }, { doctorId: userId }],
                },
            });
            if (!conversation) {
                throw new Error("Conversation not found or access denied");
            }
            const whereClause = {
                conversationId,
                senderId: { not: userId }, // Don't mark own messages as read
                read: false,
                isDeleted: false,
            };
            if (messageIds && messageIds.length > 0) {
                whereClause.id = { in: messageIds };
            }
            const result = yield prisma_1.default.message.updateMany({
                where: whereClause,
                data: { read: true },
            });
            return result.count;
        });
    }
    /**
     * Edit a message
     */
    editMessage(messageId, userId, newText) {
        return __awaiter(this, void 0, void 0, function* () {
            // Verify message exists and user is the sender
            const existingMessage = yield prisma_1.default.message.findFirst({
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
            const updatedMessage = yield prisma_1.default.message.update({
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
        });
    }
    /**
     * Delete a message (soft delete)
     */
    deleteMessage(messageId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Verify message exists and user is the sender
            const existingMessage = yield prisma_1.default.message.findFirst({
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
            yield prisma_1.default.message.update({
                where: { id: messageId },
                data: {
                    isDeleted: true,
                },
            });
            return true;
        });
    }
    /**
     * Get unread message count for a user
     */
    getUnreadCount(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma_1.default.message.count({
                where: {
                    read: false,
                    senderId: { not: userId },
                    isDeleted: false,
                    conversation: {
                        OR: [{ farmerId: userId }, { doctorId: userId }],
                    },
                },
            });
        });
    }
    /**
     * Get unread count per conversation for a user
     */
    getUnreadCountByConversation(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const conversations = yield prisma_1.default.conversation.findMany({
                where: {
                    OR: [{ farmerId: userId }, { doctorId: userId }],
                },
                select: { id: true },
            });
            const conversationIds = conversations.map((c) => c.id);
            const unreadCounts = yield prisma_1.default.message.groupBy({
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
            const result = {};
            unreadCounts.forEach((item) => {
                result[item.conversationId] = item._count.id;
            });
            return result;
        });
    }
    /**
     * Search messages in a conversation
     */
    searchMessages(conversationId_1, userId_1, query_1) {
        return __awaiter(this, arguments, void 0, function* (conversationId, userId, query, page = 1, limit = 20) {
            // Verify user has access to conversation
            const conversation = yield prisma_1.default.conversation.findFirst({
                where: {
                    id: conversationId,
                    OR: [{ farmerId: userId }, { doctorId: userId }],
                },
            });
            if (!conversation) {
                throw new Error("Conversation not found or access denied");
            }
            const skip = (page - 1) * limit;
            const [messages, totalCount] = yield Promise.all([
                prisma_1.default.message.findMany({
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
                prisma_1.default.message.count({
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
            const formattedMessages = messages.map((msg) => ({
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
        });
    }
}
exports.MessageService = MessageService;
// Singleton instance
let messageServiceInstance = null;
const getMessageService = () => {
    if (!messageServiceInstance) {
        messageServiceInstance = new MessageService();
    }
    return messageServiceInstance;
};
exports.getMessageService = getMessageService;
