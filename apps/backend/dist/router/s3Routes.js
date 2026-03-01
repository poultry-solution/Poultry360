"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const s3Controller_1 = require("../controller/s3Controller");
const middelware_1 = require("../middelware/middelware");
const router = (0, express_1.Router)();
// All routes require authentication
router.use((req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, []); // Allow all authenticated users
});
// Chat attachment endpoints
router.post('/chat/upload-url', s3Controller_1.generateChatUploadUrl);
router.post('/chat/verify-upload', s3Controller_1.verifyChatUpload);
router.get('/chat/view/:attachmentKey', s3Controller_1.getAttachmentViewUrl);
router.delete('/chat/delete/:attachmentKey', s3Controller_1.deleteUploadedFile);
// Legacy test endpoints
router.get('/test', s3Controller_1.TestR2List);
router.get('/test2', s3Controller_1.TestR2Presign);
exports.default = router;
