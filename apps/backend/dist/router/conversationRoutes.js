"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const conversationController_1 = require("../controller/conversationController");
const middelware_1 = require("../middelware/middelware");
const router = (0, express_1.Router)();
// All routes require authentication
router.use((req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, []); // Allow all authenticated users
});
// Conversation CRUD operations
router.get('/', conversationController_1.conversationController.getConversations);
router.post('/', conversationController_1.conversationController.createConversation);
router.get('/doctors', conversationController_1.conversationController.getAvailableDoctors);
router.get('/unread-count', conversationController_1.conversationController.getUnreadCount);
// Specific conversation operations
router.get('/:conversationId', conversationController_1.conversationController.getConversation);
router.put('/:conversationId', conversationController_1.conversationController.updateConversation);
router.delete('/:conversationId', conversationController_1.conversationController.deleteConversation);
router.post('/:conversationId/mark-read', conversationController_1.conversationController.markMessagesAsRead);
router.get('/:conversationId/search', conversationController_1.conversationController.searchMessages);
exports.default = router;
