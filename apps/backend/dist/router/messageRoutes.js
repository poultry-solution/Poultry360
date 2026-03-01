"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const messageController_1 = require("../controller/messageController");
const middelware_1 = require("../middelware/middelware");
const router = (0, express_1.Router)();
// All routes require authentication
router.use((req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, []); // Allow all authenticated users
});
// Message CRUD operations
router.post('/', messageController_1.messageController.sendMessage);
router.get('/:messageId', messageController_1.messageController.getMessage);
router.put('/:messageId', messageController_1.messageController.editMessage);
router.delete('/:messageId', messageController_1.messageController.deleteMessage);
// Conversation-specific message operations
router.get('/conversation/:conversationId', messageController_1.messageController.getMessages);
router.post('/conversation/:conversationId/read', messageController_1.messageController.markAsRead);
router.get('/conversation/:conversationId/search', messageController_1.messageController.searchMessages);
exports.default = router;
