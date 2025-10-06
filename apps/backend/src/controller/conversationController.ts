import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getMessageService } from '../services/messageService';
import { getRoomService } from '../services/roomService';

const prisma = new PrismaClient();
const messageService = getMessageService();

export const conversationController = {
  /**
   * Get all conversations for a user
   */
  async getConversations(req: Request, res: Response) {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { page = 1, limit = 20, status = 'ACTIVE' } = req.query;

      const skip = (Number(page) - 1) * Number(limit);

      const [conversations, totalCount] = await Promise.all([
        prisma.conversation.findMany({
          where: {
            OR: [
              { farmerId: userId },
              { doctorId: userId }
            ],
            status: status as any
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
        prisma.conversation.count({
          where: {
            OR: [
              { farmerId: userId },
              { doctorId: userId }
            ],
            status: status as any
          }
        })
      ]);

      // Determine for each conversation if the current user (doctor) has ever sent a message
      const conversationIds = conversations.map(c => c.id);
      const doctorMessagesByConversation = await prisma.message.findMany({
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
    } catch (error) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  /**
   * Get a specific conversation with messages
   */
  async getConversation(req: Request, res: Response) {
    try {
      const userId = req.userId;
      const { conversationId } = req.params;
      const { page = 1, limit = 50 } = req.query;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Verify user has access to conversation
      const conversation = await prisma.conversation.findFirst({
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
      const messagesResult = await messageService.getMessages(
        conversationId,
        userId,
        Number(page),
        Number(limit)
      );

      // Get room service to check online status
      const roomService = getRoomService();
      const participants = await roomService.getConversationParticipants(conversationId);

      res.json({
        conversation: {
          id: conversation.id,
          farmer: {
            ...conversation.farmer,
            isOnline: participants.farmer.isOnline
          },
          doctor: {
            ...conversation.doctor,
            isOnline: participants.doctor.isOnline
          },
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
    } catch (error) {
      console.error('Error fetching conversation:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  /**
   * Create a new conversation
   */
  async createConversation(req: Request, res: Response) {
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
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });

      if (!user || !['OWNER', 'MANAGER'].includes(user.role)) {
        return res.status(403).json({ error: 'Only farmers can initiate conversations' });
      }

      // Verify doctor exists and is a doctor
      const doctor = await prisma.user.findFirst({
        where: {
          id: doctorId,
          role: 'DOCTOR'
        }
      });

      if (!doctor) {
        return res.status(404).json({ error: 'Doctor not found' });
      }

      // Check if conversation already exists
      const existingConversation = await prisma.conversation.findFirst({
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
          const message = await prisma.message.create({
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
      } else {
        // Create new conversation and optionally initial message in a transaction
        const result = await prisma.$transaction(async (tx) => {
          // Create conversation
          const newConversation = await tx.conversation.create({
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
            const message = await tx.message.create({
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
        });

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
    } catch (error) {
      console.error('Error creating conversation:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  /**
   * Update conversation status
   */
  async updateConversation(req: Request, res: Response) {
    try {
      const userId = req.userId;
      const { conversationId } = req.params;
      const { status, subject } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

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
        return res.status(404).json({ error: 'Conversation not found' });
      }

      // Update conversation
      const updatedConversation = await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          ...(status && { status }),
          ...(subject !== undefined && { subject })
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
    } catch (error) {
      console.error('Error updating conversation:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  /**
   * Get available doctors for conversation
   */
  async getAvailableDoctors(req: Request, res: Response) {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get all doctors
      const doctors = await prisma.user.findMany({
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
      const roomService = getRoomService();
      const onlineUserIds = roomService.getOnlineUserIds();

      // Check which doctors are online
      const doctorsWithStatus = doctors.map(doctor => ({
        ...doctor,
        isOnline: onlineUserIds.has(doctor.id)
      }));

      res.json({ doctors: doctorsWithStatus });
    } catch (error) {
      console.error('Error fetching doctors:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(req: Request, res: Response) {
    try {
      const userId = req.userId;
      const { conversationId } = req.params;
      const { messageIds } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const readCount = await messageService.markMessagesAsRead(
        conversationId,
        userId,
        messageIds
      );

      res.json({ 
        message: `${readCount} messages marked as read`,
        readCount 
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  /**
   * Get unread message count
   */
  async getUnreadCount(req: Request, res: Response) {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const unreadCount = await messageService.getUnreadCount(userId);
      const unreadByConversation = await messageService.getUnreadCountByConversation(userId);

      res.json({
        totalUnread: unreadCount,
        byConversation: unreadByConversation
      });
    } catch (error) {
      console.error('Error fetching unread count:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  /**
   * Search messages in conversation
   */
  async searchMessages(req: Request, res: Response) {
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

      const searchResult = await messageService.searchMessages(
        conversationId,
        userId,
        query,
        Number(page),
        Number(limit)
      );

      res.json({
        messages: searchResult.messages,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          totalCount: searchResult.totalCount,
          hasMore: searchResult.hasMore
        }
      });
    } catch (error) {
      console.error('Error searching messages:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
};
