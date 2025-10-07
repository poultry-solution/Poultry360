import { Router } from 'express';
import { messageController } from '../controller/messageController';
import { authMiddleware } from '../middelware/middelware';

const router = Router();

// All routes require authentication
router.use((req, res, next) => {
  authMiddleware(req, res, next, []); // Allow all authenticated users
});

// Message CRUD operations
router.post('/', messageController.sendMessage);
router.get('/:messageId', messageController.getMessage);
router.put('/:messageId', messageController.editMessage);
router.delete('/:messageId', messageController.deleteMessage);

// Conversation-specific message operations
router.get('/conversation/:conversationId', messageController.getMessages);
router.post('/conversation/:conversationId/read', messageController.markAsRead);
router.get('/conversation/:conversationId/search', messageController.searchMessages);

export default router;
