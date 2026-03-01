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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestR2Presign = exports.TestR2List = exports.deleteUploadedFile = exports.getAttachmentViewUrl = exports.verifyChatUpload = exports.generateChatUploadUrl = void 0;
const r2Service_1 = require("../services/r2Service");
// ==================== CHAT ATTACHMENT UPLOAD ENDPOINTS ====================
/**
 * Generate presigned URL for chat attachment upload
 * This is called when user selects a file to upload (before sending message)
 * Returns upload URL and attachment key for frontend to use
 */
const generateChatUploadUrl = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const { conversationId, fileName, contentType, fileSize } = req.body;
        if (!conversationId || !fileName || !contentType) {
            return res.status(400).json({
                error: "Missing required fields: conversationId, fileName, contentType"
            });
        }
        // Generate unique key for the file
        const fileType = (0, r2Service_1.getFileTypeFromMime)(contentType);
        const timestamp = Date.now();
        const attachmentKey = `chat-attachments/${conversationId}/${userId}/${fileType}/${timestamp}-${fileName}`;
        // Generate presigned upload URL
        const uploadUrl = yield (0, r2Service_1.generatePresignedUploadUrl)(attachmentKey, contentType, 3600 // 1 hour expiration
        );
        res.json({
            success: true,
            uploadUrl,
            attachmentKey,
            fileType,
            expiresIn: 3600
        });
    }
    catch (error) {
        console.error("Error generating chat upload URL:", error);
        res.status(500).json({ error: "Failed to generate upload URL" });
    }
});
exports.generateChatUploadUrl = generateChatUploadUrl;
/**
 * Verify file upload was successful
 * Called by frontend after successful file upload to R2
 * Returns file metadata and view URL
 */
const verifyChatUpload = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const { attachmentKey, fileSize, durationMs, width, height } = req.body;
        if (!attachmentKey) {
            return res.status(400).json({
                error: "Missing required field: attachmentKey"
            });
        }
        // Verify file exists in R2
        const fileCheck = yield (0, r2Service_1.fileExists)(attachmentKey);
        if (!fileCheck.exists) {
            return res.status(400).json({ error: "File not found in storage" });
        }
        // Generate view URL for the attachment
        const viewUrl = yield (0, r2Service_1.generatePresignedViewUrl)(attachmentKey, 86400); // 24 hours
        res.json({
            success: true,
            attachmentKey,
            attachmentUrl: viewUrl,
            fileName: attachmentKey.split('/').pop() || 'unknown',
            contentType: (_a = fileCheck.metadata) === null || _a === void 0 ? void 0 : _a.contentType,
            fileSize: fileSize ? parseInt(fileSize) : (_b = fileCheck.metadata) === null || _b === void 0 ? void 0 : _b.contentLength,
            durationMs: durationMs ? parseInt(durationMs) : null,
            width: width ? parseInt(width) : null,
            height: height ? parseInt(height) : null,
            fileType: (0, r2Service_1.getFileTypeFromMime)(((_c = fileCheck.metadata) === null || _c === void 0 ? void 0 : _c.contentType) || 'application/octet-stream')
        });
    }
    catch (error) {
        console.error("Error verifying chat upload:", error);
        res.status(500).json({ error: "Failed to verify upload" });
    }
});
exports.verifyChatUpload = verifyChatUpload;
/**
 * Get attachment view URL (for viewing/downloading)
 * This can be used to get fresh URLs for existing attachments
 */
const getAttachmentViewUrl = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const { attachmentKey } = req.params;
        const { expires = 3600 } = req.query;
        if (!attachmentKey) {
            return res.status(400).json({ error: "Missing attachmentKey parameter" });
        }
        // Verify file exists in R2
        const fileCheck = yield (0, r2Service_1.fileExists)(attachmentKey);
        if (!fileCheck.exists) {
            return res.status(404).json({ error: "File not found" });
        }
        // Generate fresh view URL
        const viewUrl = yield (0, r2Service_1.generatePresignedViewUrl)(attachmentKey, parseInt(expires));
        res.json({
            success: true,
            viewUrl,
            fileName: attachmentKey.split('/').pop() || 'unknown',
            contentType: (_a = fileCheck.metadata) === null || _a === void 0 ? void 0 : _a.contentType,
            fileSize: (_b = fileCheck.metadata) === null || _b === void 0 ? void 0 : _b.contentLength,
            expiresIn: parseInt(expires)
        });
    }
    catch (error) {
        console.error("Error getting attachment view URL:", error);
        res.status(500).json({ error: "Failed to get view URL" });
    }
});
exports.getAttachmentViewUrl = getAttachmentViewUrl;
/**
 * Delete uploaded file (if user cancels before sending message)
 */
const deleteUploadedFile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const { attachmentKey } = req.params;
        if (!attachmentKey) {
            return res.status(400).json({ error: "Missing attachmentKey parameter" });
        }
        // Verify file exists and belongs to user (check path contains userId)
        if (!attachmentKey.includes(`/${userId}/`)) {
            return res.status(403).json({ error: "Access denied" });
        }
        // Delete file from R2
        const deleted = yield (0, r2Service_1.deleteFile)(attachmentKey);
        if (deleted) {
            res.json({ success: true, message: "File deleted successfully" });
        }
        else {
            res.status(500).json({ error: "Failed to delete file" });
        }
    }
    catch (error) {
        console.error("Error deleting uploaded file:", error);
        res.status(500).json({ error: "Failed to delete file" });
    }
});
exports.deleteUploadedFile = deleteUploadedFile;
// ==================== LEGACY TEST ENDPOINTS ====================
const TestR2List = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const bucket = process.env.R2_BUCKET;
        if (!bucket) {
            return res.status(500).json({ message: "R2_BUCKET env not set" });
        }
        const contents = yield (0, r2Service_1.listFiles)(undefined, 50);
        const expires = Number(req.query.expires || 600);
        const items = yield Promise.all(contents.map((obj) => __awaiter(void 0, void 0, void 0, function* () {
            const Key = obj.Key;
            const getUrl = yield (0, r2Service_1.generatePresignedViewUrl)(Key, expires);
            return {
                key: Key,
                size: obj.Size,
                lastModified: obj.LastModified,
                etag: obj.ETag,
                getUrl,
            };
        })));
        res.json({
            bucket,
            items,
        });
    }
    catch (error) {
        console.log("error", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.TestR2List = TestR2List;
const TestR2Presign = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const bucket = process.env.R2_BUCKET;
        if (!bucket) {
            return res.status(500).json({ message: "R2_BUCKET env not set" });
        }
        const key = req.query.key || `uploads/${Date.now()}.bin`;
        const contentType = req.query.contentType || "application/octet-stream";
        const expires = Number(req.query.expires || 3600);
        const url = yield (0, r2Service_1.generatePresignedUploadUrl)(key, contentType, expires);
        console.log("url", url);
        console.log("bucket", bucket);
        console.log("key", key);
        console.log("expires", expires);
        console.log("contentType", contentType);
        return res.json({ url, bucket, key, expires, contentType });
    }
    catch (error) {
        console.log("error", error);
        return res
            .status(500)
            .json({ message: "Failed to generate presigned URL" });
    }
});
exports.TestR2Presign = TestR2Presign;
