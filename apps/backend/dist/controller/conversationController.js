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
exports.conversationController = void 0;
const messageService_1 = require("../services/messageService");
const r2Service_1 = require("../services/r2Service");
const roomService_1 = require("../services/roomService");
const prisma_1 = __importDefault(require("../utils/prisma"));
const messageService = (0, messageService_1.getMessageService)();
exports.conversationController = {
    /**
     * Get all conversations for a user
     */
    getConversations(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.userId;
                if (!userId) {
                    return res.status(401).json({ error: 'Unauthorized' });
                }
                const { page = 1, limit = 20, status = 'ACTIVE' } = req.query;
                const skip = (Number(page) - 1) * Number(limit);
                const [conversations, totalCount] = yield Promise.all([
                    prisma_1.default.conversation.findMany({
                        where: {
                            OR: [
                                { farmerId: userId },
                                { doctorId: userId }
                            ],
                            status: status
                        },
                        include: {
                            farmer: {
                                select: {
                                    id: true,
                                    name: true,
                                    role: true
                                }
                            },
                            doctor: {
                                select: {
                                    id: true,
                                    name: true,
                                    role: true
                                }
                            },
                            messages: {
                                take: 1,
                                orderBy: { createdAt: 'desc' },
                                include: {
                                    sender: {
                                        select: {
                                            id: true,
                                            name: true
                                        }
                                    }
                                }
                            },
                            _count: {
                                select: {
                                    messages: {
                                        where: {
                                            read: false,
                                            senderId: { not: userId }
                                        }
                                    }
                                }
                            }
                        },
                        orderBy: { updatedAt: 'desc' },
                        skip,
                        take: Number(limit)
                    }),
                    prisma_1.default.conversation.count({
                        where: {
                            OR: [
                                { farmerId: userId },
                                { doctorId: userId }
                            ],
                            status: status
                        }
                    })
                ]);
                // Determine for each conversation if the current user (doctor) has ever sent a message
                const conversationIds = conversations.map(c => c.id);
                const doctorMessagesByConversation = yield prisma_1.default.message.findMany({
                    where: {
                        conversationId: { in: conversationIds },
                        senderId: userId
                    },
                    select: { conversationId: true },
                    distinct: ['conversationId']
                });
                const doctorSentSet = new Set(doctorMessagesByConversation.map(m => m.conversationId));
                const formattedConversations = conversations.map(conv => ({
                    id: conv.id,
                    farmer: conv.farmer,
                    doctor: conv.doctor,
                    status: conv.status,
                    subject: conv.subject,
                    lastMessage: conv.messages[0] ? {
                        id: conv.messages[0].id,
                        text: conv.messages[0].text,
                        senderId: conv.messages[0].senderId,
                        senderName: conv.messages[0].sender.name,
                        createdAt: conv.messages[0].createdAt
                    } : null,
                    unreadCount: conv._count.messages,
                    hasDoctorMessaged: doctorSentSet.has(conv.id),
                    updatedAt: conv.updatedAt,
                    createdAt: conv.createdAt
                }));
                res.json({
                    conversations: formattedConversations,
                    pagination: {
                        page: Number(page),
                        limit: Number(limit),
                        totalCount,
                        totalPages: Math.ceil(totalCount / Number(limit)),
                        hasMore: skip + conversations.length < totalCount
                    }
                });
            }
            catch (error) {
                console.error('Error fetching conversations:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });
    },
    /**
     * Get a specific conversation with messages
     */
    getConversation(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.userId;
                const { conversationId } = req.params;
                const { page = 1, limit = 50 } = req.query;
                if (!userId) {
                    return res.status(401).json({ error: 'Unauthorized' });
                }
                // Verify user has access to conversation
                const conversation = yield prisma_1.default.conversation.findFirst({
                    where: {
                        id: conversationId,
                        OR: [
                            { farmerId: userId },
                            { doctorId: userId }
                        ]
                    },
                    include: {
                        farmer: {
                            select: {
                                id: true,
                                name: true,
                                role: true
                            }
                        },
                        doctor: {
                            select: {
                                id: true,
                                name: true,
                                role: true
                            }
                        }
                    }
                });
                if (!conversation) {
                    return res.status(404).json({ error: 'Conversation not found' });
                }
                // Get messages
                const messagesResult = yield messageService.getMessages(conversationId, userId, Number(page), Number(limit));
                // Get room service to check online status
                const roomService = (0, roomService_1.getRoomService)();
                const participants = yield roomService.getConversationParticipants(conversationId);
                res.json({
                    conversation: {
                        id: conversation.id,
                        farmer: Object.assign(Object.assign({}, conversation.farmer), { isOnline: participants.farmer.isOnline }),
                        doctor: Object.assign(Object.assign({}, conversation.doctor), { isOnline: participants.doctor.isOnline }),
                        status: conversation.status,
                        subject: conversation.subject,
                        createdAt: conversation.createdAt,
                        updatedAt: conversation.updatedAt
                    },
                    messages: messagesResult.messages,
                    pagination: {
                        page: Number(page),
                        limit: Number(limit),
                        totalCount: messagesResult.totalCount,
                        hasMore: messagesResult.hasMore
                    }
                });
            }
            catch (error) {
                console.error('Error fetching conversation:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });
    },
    /**
     * Create a new conversation
     */
    createConversation(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.userId;
                const { doctorId, subject, initialMessage } = req.body;
                if (!userId) {
                    return res.status(401).json({ error: 'Unauthorized' });
                }
                if (!doctorId) {
                    return res.status(400).json({ error: 'Doctor ID is required' });
                }
                // Verify user is a farmer/owner/manager
                const user = yield prisma_1.default.user.findUnique({
                    where: { id: userId },
                    select: { role: true }
                });
                if (!user || !['OWNER', 'MANAGER'].includes(user.role)) {
                    return res.status(403).json({ error: 'Only farmers can initiate conversations' });
                }
                // Verify doctor exists and is a doctor
                const doctor = yield prisma_1.default.user.findFirst({
                    where: {
                        id: doctorId,
                        role: 'DOCTOR'
                    }
                });
                if (!doctor) {
                    return res.status(404).json({ error: 'Doctor not found' });
                }
                // Check if conversation already exists
                const existingConversation = yield prisma_1.default.conversation.findFirst({
                    where: {
                        farmerId: userId,
                        doctorId,
                        status: 'ACTIVE'
                    },
                    include: {
                        farmer: {
                            select: {
                                id: true,
                                name: true,
                                role: true
                            }
                        },
                        doctor: {
                            select: {
                                id: true,
                                name: true,
                                role: true
                            }
                        }
                    }
                });
                let conversation;
                let initialMessageData = null;
                if (existingConversation) {
                    // Use existing conversation
                    conversation = existingConversation;
                    // If there's an initial message, add it to the existing conversation
                    if (initialMessage && initialMessage.trim()) {
                        const message = yield prisma_1.default.message.create({
                            data: {
                                conversationId: existingConversation.id,
                                senderId: userId,
                                text: initialMessage.trim(),
                                messageType: 'TEXT',
                                read: false
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
                        initialMessageData = {
                            id: message.id,
                            text: message.text,
                            messageType: message.messageType,
                            createdAt: message.createdAt,
                            read: message.read,
                            sender: message.sender
                        };
                    }
                }
                else {
                    // Create new conversation and optionally initial message in a transaction
                    const result = yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                        // Create conversation
                        const newConversation = yield tx.conversation.create({
                            data: {
                                farmerId: userId,
                                doctorId,
                                subject: subject || null,
                                status: 'ACTIVE'
                            },
                            include: {
                                farmer: {
                                    select: {
                                        id: true,
                                        name: true,
                                        role: true
                                    }
                                },
                                doctor: {
                                    select: {
                                        id: true,
                                        name: true,
                                        role: true
                                    }
                                }
                            }
                        });
                        let messageData = null;
                        // Create initial message if provided
                        if (initialMessage && initialMessage.trim()) {
                            const message = yield tx.message.create({
                                data: {
                                    conversationId: newConversation.id,
                                    senderId: userId,
                                    text: initialMessage.trim(),
                                    messageType: 'TEXT',
                                    read: false
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
                            messageData = {
                                id: message.id,
                                text: message.text,
                                messageType: message.messageType,
                                createdAt: message.createdAt,
                                read: message.read,
                                sender: message.sender
                            };
                        }
                        return { conversation: newConversation, message: messageData };
                    }));
                    conversation = result.conversation;
                    initialMessageData = result.message;
                }
                res.status(201).json({
                    conversation: {
                        id: conversation.id,
                        farmer: conversation.farmer,
                        doctor: conversation.doctor,
                        status: conversation.status,
                        subject: conversation.subject,
                        createdAt: conversation.createdAt,
                        updatedAt: conversation.updatedAt
                    },
                    initialMessage: initialMessageData
                });
            }
            catch (error) {
                console.error('Error creating conversation:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });
    },
    /**
     * Update conversation status
     */
    updateConversation(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.userId;
                const { conversationId } = req.params;
                const { status, subject } = req.body;
                if (!userId) {
                    return res.status(401).json({ error: 'Unauthorized' });
                }
                // Verify user has access to conversation
                const conversation = yield prisma_1.default.conversation.findFirst({
                    where: {
                        id: conversationId,
                        OR: [
                            { farmerId: userId },
                            { doctorId: userId }
                        ]
                    }
                });
                if (!conversation) {
                    return res.status(404).json({ error: 'Conversation not found' });
                }
                // Update conversation
                const updatedConversation = yield prisma_1.default.conversation.update({
                    where: { id: conversationId },
                    data: Object.assign(Object.assign({}, (status && { status })), (subject !== undefined && { subject })),
                    include: {
                        farmer: {
                            select: {
                                id: true,
                                name: true,
                                role: true
                            }
                        },
                        doctor: {
                            select: {
                                id: true,
                                name: true,
                                role: true
                            }
                        }
                    }
                });
                res.json({
                    conversation: {
                        id: updatedConversation.id,
                        farmer: updatedConversation.farmer,
                        doctor: updatedConversation.doctor,
                        status: updatedConversation.status,
                        subject: updatedConversation.subject,
                        createdAt: updatedConversation.createdAt,
                        updatedAt: updatedConversation.updatedAt
                    }
                });
            }
            catch (error) {
                console.error('Error updating conversation:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });
    },
    /**
     * Delete conversation: hard-delete all messages then delete the conversation.
     * This ensures users can start a new conversation later without unique constraint violations.
     */
    deleteConversation(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.userId;
                const { conversationId } = req.params;
                if (!userId) {
                    return res.status(401).json({ error: 'Unauthorized' });
                }
                // Verify user has access to conversation
                const conversation = yield prisma_1.default.conversation.findFirst({
                    where: {
                        id: conversationId,
                        OR: [
                            { farmerId: userId },
                            { doctorId: userId }
                        ]
                    }
                });
                if (!conversation) {
                    return res.status(404).json({ error: 'Conversation not found' });
                }
                // Delete attachments from R2 for messages in this conversation
                try {
                    const messagesWithAttachments = yield prisma_1.default.message.findMany({
                        where: { conversationId, attachmentKey: { not: null } },
                        select: { attachmentKey: true },
                    });
                    for (const msg of messagesWithAttachments) {
                        const key = msg.attachmentKey;
                        if (key) {
                            try {
                                yield (0, r2Service_1.deleteFile)(key);
                            }
                            catch (r2Err) {
                                // Log but continue; DB should still be purged
                                console.error(`Failed to delete R2 object for message: ${key}`, r2Err);
                            }
                        }
                    }
                }
                catch (fetchErr) {
                    console.error('Failed to fetch/delete attachments for conversation:', fetchErr);
                }
                // Hard delete messages and the conversation in a single transaction
                yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                    yield tx.message.deleteMany({ where: { conversationId } });
                    yield tx.conversation.delete({ where: { id: conversationId } });
                }));
                res.json({
                    success: true,
                    message: 'Conversation deleted successfully'
                });
            }
            catch (error) {
                console.error('Error deleting conversation:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });
    },
    /**
     * Get available doctors for conversation
     */
    getAvailableDoctors(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.userId;
                if (!userId) {
                    return res.status(401).json({ error: 'Unauthorized' });
                }
                // Get all doctors
                const doctors = yield prisma_1.default.user.findMany({
                    where: {
                        role: 'DOCTOR',
                    },
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        companyName: true
                    }
                });
                // Get room service to check online status
                const roomService = (0, roomService_1.getRoomService)();
                const onlineUserIds = roomService.getOnlineUserIds();
                // Check which doctors are online
                const doctorsWithStatus = doctors.map(doctor => (Object.assign(Object.assign({}, doctor), { isOnline: onlineUserIds.has(doctor.id) })));
                res.json({ doctors: doctorsWithStatus });
            }
            catch (error) {
                console.error('Error fetching doctors:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });
    },
    /**
     * Mark messages as read
     */
    markMessagesAsRead(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.userId;
                const { conversationId } = req.params;
                const { messageIds } = req.body;
                if (!userId) {
                    return res.status(401).json({ error: 'Unauthorized' });
                }
                const readCount = yield messageService.markMessagesAsRead(conversationId, userId, messageIds);
                res.json({
                    message: `${readCount} messages marked as read`,
                    readCount
                });
            }
            catch (error) {
                console.error('Error marking messages as read:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });
    },
    /**
     * Get unread message count
     */
    getUnreadCount(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.userId;
                if (!userId) {
                    return res.status(401).json({ error: 'Unauthorized' });
                }
                const unreadCount = yield messageService.getUnreadCount(userId);
                const unreadByConversation = yield messageService.getUnreadCountByConversation(userId);
                res.json({
                    totalUnread: unreadCount,
                    byConversation: unreadByConversation
                });
            }
            catch (error) {
                console.error('Error fetching unread count:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });
    },
    /**
     * Search messages in conversation
     */
    searchMessages(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = req.userId;
                const { conversationId } = req.params;
                const { q: query, page = 1, limit = 20 } = req.query;
                if (!userId) {
                    return res.status(401).json({ error: 'Unauthorized' });
                }
                if (!query || typeof query !== 'string') {
                    return res.status(400).json({ error: 'Search query is required' });
                }
                const searchResult = yield messageService.searchMessages(conversationId, userId, query, Number(page), Number(limit));
                res.json({
                    messages: searchResult.messages,
                    pagination: {
                        page: Number(page),
                        limit: Number(limit),
                        totalCount: searchResult.totalCount,
                        hasMore: searchResult.hasMore
                    }
                });
            }
            catch (error) {
                console.error('Error searching messages:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });
    }
};
