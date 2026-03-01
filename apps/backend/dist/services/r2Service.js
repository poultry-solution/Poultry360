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
exports.formatFileSize = exports.getFileTypeFromMime = exports.generateChatAttachmentKey = exports.listFiles = exports.fileExists = exports.deleteFile = exports.generatePresignedViewUrl = exports.generatePresignedUploadUrl = exports.s3 = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const endpoint = process.env.R2_ENDPOINT; // e.g. https://<account_id>.r2.cloudflarestorage.com
const access_key_id = process.env.R2_ACCESS_KEY_ID;
const access_key_secret = process.env.R2_ACCESS_KEY_SECRET;
const bucket = process.env.R2_BUCKET;
if (!endpoint || !access_key_id || !access_key_secret || !bucket) {
    throw new Error("R2 credentials are not set");
}
exports.s3 = new client_s3_1.S3Client({
    endpoint,
    region: "auto",
    credentials: {
        accessKeyId: access_key_id,
        secretAccessKey: access_key_secret,
    },
    forcePathStyle: false,
});
// ==================== CORE R2 FUNCTIONS ====================
/**
 * Generate a presigned URL for uploading a file
 * @param key - The object key (path) in the bucket
 * @param contentType - MIME type of the file
 * @param expires - Expiration time in seconds (default: 1 hour)
 * @returns Presigned PUT URL
 */
const generatePresignedUploadUrl = (key_1, contentType_1, ...args_1) => __awaiter(void 0, [key_1, contentType_1, ...args_1], void 0, function* (key, contentType, expires = 3600) {
    try {
        const command = new client_s3_1.PutObjectCommand({
            Bucket: bucket,
            Key: key,
            ContentType: contentType,
        });
        const url = yield (0, s3_request_presigner_1.getSignedUrl)(exports.s3, command, { expiresIn: expires });
        return url;
    }
    catch (error) {
        console.error("Error generating presigned upload URL:", error);
        throw new Error("Failed to generate upload URL");
    }
});
exports.generatePresignedUploadUrl = generatePresignedUploadUrl;
/**
 * Generate a presigned URL for downloading/viewing a file
 * @param key - The object key (path) in the bucket
 * @param expires - Expiration time in seconds (default: 1 hour)
 * @returns Presigned GET URL
 */
const generatePresignedViewUrl = (key_1, ...args_1) => __awaiter(void 0, [key_1, ...args_1], void 0, function* (key, expires = 3600) {
    try {
        const command = new client_s3_1.GetObjectCommand({
            Bucket: bucket,
            Key: key,
        });
        const url = yield (0, s3_request_presigner_1.getSignedUrl)(exports.s3, command, { expiresIn: expires });
        return url;
    }
    catch (error) {
        console.error("Error generating presigned view URL:", error);
        throw new Error("Failed to generate view URL");
    }
});
exports.generatePresignedViewUrl = generatePresignedViewUrl;
/**
 * Delete a file from R2
 * @param key - The object key (path) in the bucket
 * @returns Success status
 */
const deleteFile = (key) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield exports.s3.send(new client_s3_1.DeleteObjectCommand({
            Bucket: bucket,
            Key: key,
        }));
        return true;
    }
    catch (error) {
        console.error("Error deleting file:", error);
        return false;
    }
});
exports.deleteFile = deleteFile;
/**
 * Check if a file exists in R2
 * @param key - The object key (path) in the bucket
 * @returns File exists status and metadata
 */
const fileExists = (key) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const result = yield exports.s3.send(new client_s3_1.HeadObjectCommand({
            Bucket: bucket,
            Key: key,
        }));
        return {
            exists: true,
            metadata: {
                contentType: result.ContentType,
                contentLength: result.ContentLength,
                lastModified: result.LastModified,
                etag: result.ETag,
            },
        };
    }
    catch (error) {
        if (error.name === "NotFound" || ((_a = error.$metadata) === null || _a === void 0 ? void 0 : _a.httpStatusCode) === 404) {
            return { exists: false };
        }
        console.error("Error checking file existence:", error);
        throw new Error("Failed to check file existence");
    }
});
exports.fileExists = fileExists;
/**
 * List files in a specific folder/prefix
 * @param prefix - The folder prefix to list
 * @param maxKeys - Maximum number of keys to return (default: 1000)
 * @returns List of objects
 */
const listFiles = (prefix_1, ...args_1) => __awaiter(void 0, [prefix_1, ...args_1], void 0, function* (prefix, maxKeys = 1000) {
    try {
        const result = yield exports.s3.send(new client_s3_1.ListObjectsV2Command(Object.assign({ Bucket: bucket, MaxKeys: maxKeys }, (prefix && { Prefix: prefix }))));
        return result.Contents || [];
    }
    catch (error) {
        console.error("Error listing files:", error);
        throw new Error("Failed to list files");
    }
});
exports.listFiles = listFiles;
/**
 * Generate a unique key for chat attachments
 * @param conversationId - The conversation ID
 * @param messageId - The message ID
 * @param fileName - Original file name
 * @param fileType - File type (image, video, audio, pdf, doc, other)
 * @returns Unique key for the file
 */
const generateChatAttachmentKey = (conversationId, messageId, fileName, fileType) => {
    const timestamp = Date.now();
    const extension = fileName.split('.').pop() || '';
    return `chat-attachments/${conversationId}/${messageId}/${fileType}/${timestamp}-${fileName}`;
};
exports.generateChatAttachmentKey = generateChatAttachmentKey;
/**
 * Get file type from MIME type
 * @param contentType - MIME type
 * @returns File type category
 */
const getFileTypeFromMime = (contentType) => {
    if (contentType.startsWith('image/'))
        return 'image';
    if (contentType.startsWith('video/'))
        return 'video';
    if (contentType.startsWith('audio/'))
        return 'audio';
    if (contentType === 'application/pdf')
        return 'pdf';
    if (contentType.includes('document') || contentType.includes('text/'))
        return 'doc';
    return 'other';
};
exports.getFileTypeFromMime = getFileTypeFromMime;
/**
 * Get file size in human readable format
 * @param bytes - File size in bytes
 * @returns Human readable size
 */
const formatFileSize = (bytes) => {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
exports.formatFileSize = formatFileSize;
