import { Router } from 'express';
import { conversationController } from '../controller/conversationController';
import { authMiddleware } from '../middelware/middelware';

const router = Router();

// All routes require authentication
router.use((req, res, next) => {
  authMiddleware(req, res, next, []); // Allow all authenticated users
});

// Conversation CRUD operations
router.get('/', conversationController.getConversations);
router.post('/', conversationController.createConversation);
router.get('/doctors', conversationController.getAvailableDoctors);
router.get('/unread-count', conversationController.getUnreadCount);

// Specific conversation operations
router.get('/:conversationId', conversationController.getConversation);
router.put('/:conversationId', conversationController.updateConversation);
router.delete('/:conversationId', conversationController.deleteConversation);
router.post('/:conversationId/mark-read', conversationController.markMessagesAsRead);
router.get('/:conversationId/search', conversationController.searchMessages);

export default router;
