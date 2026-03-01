import { Request, Response } from "express";
import {
  s3,
  generatePresignedUploadUrl,
  generatePresignedViewUrl,
  deleteFile,
  fileExists,
  listFiles,
  getFileTypeFromMime,
  formatFileSize
} from "../services/r2Service";

// ==================== CHAT ATTACHMENT UPLOAD ENDPOINTS ====================

/**
 * Generate presigned URL for chat attachment upload
 * This is called when user selects a file to upload (before sending message)
 * Returns upload URL and attachment key for frontend to use
 */
export const generateChatUploadUrl = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {
      conversationId,
      fileName,
      contentType,
      fileSize
    } = req.body;

    if (!conversationId || !fileName || !contentType) {
      return res.status(400).json({
        error: "Missing required fields: conversationId, fileName, contentType"
      });
    }

    // Generate unique key for the file
    const fileType = getFileTypeFromMime(contentType);
    const timestamp = Date.now();
    const attachmentKey = `chat-attachments/${conversationId}/${userId}/${fileType}/${timestamp}-${fileName}`;

    // Generate presigned upload URL
    const uploadUrl = await generatePresignedUploadUrl(
      attachmentKey,
      contentType,
      3600 // 1 hour expiration
    );

    res.json({
      success: true,
      uploadUrl,
      attachmentKey,
      fileType,
      expiresIn: 3600
    });

  } catch (error) {
    console.error("Error generating chat upload URL:", error);
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
};

/**
 * Verify file upload was successful
 * Called by frontend after successful file upload to R2
 * Returns file metadata and view URL
 */
export const verifyChatUpload = async (req: Request, res: Response) => {
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
    const fileCheck = await fileExists(attachmentKey);
    if (!fileCheck.exists) {
      return res.status(400).json({ error: "File not found in storage" });
    }

    // Generate view URL for the attachment
    const viewUrl = await generatePresignedViewUrl(attachmentKey, 86400); // 24 hours

    res.json({
      success: true,
      attachmentKey,
      attachmentUrl: viewUrl,
      fileName: attachmentKey.split('/').pop() || 'unknown',
      contentType: fileCheck.metadata?.contentType,
      fileSize: fileSize ? parseInt(fileSize) : fileCheck.metadata?.contentLength,
      durationMs: durationMs ? parseInt(durationMs) : null,
      width: width ? parseInt(width) : null,
      height: height ? parseInt(height) : null,
      fileType: getFileTypeFromMime(fileCheck.metadata?.contentType || 'application/octet-stream')
    });

  } catch (error) {
    console.error("Error verifying chat upload:", error);
    res.status(500).json({ error: "Failed to verify upload" });
  }
};

/**
 * Get attachment view URL (for viewing/downloading)
 * This can be used to get fresh URLs for existing attachments
 */
export const getAttachmentViewUrl = async (req: Request, res: Response) => {
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
    const fileCheck = await fileExists(attachmentKey);
    if (!fileCheck.exists) {
      return res.status(404).json({ error: "File not found" });
    }

    // Generate fresh view URL
    const viewUrl = await generatePresignedViewUrl(
      attachmentKey,
      parseInt(expires as string)
    );

    res.json({
      success: true,
      viewUrl,
      fileName: attachmentKey.split('/').pop() || 'unknown',
      contentType: fileCheck.metadata?.contentType,
      fileSize: fileCheck.metadata?.contentLength,
      expiresIn: parseInt(expires as string)
    });

  } catch (error) {
    console.error("Error getting attachment view URL:", error);
    res.status(500).json({ error: "Failed to get view URL" });
  }
};

/**
 * Delete uploaded file (if user cancels before sending message)
 */
export const deleteUploadedFile = async (req: Request, res: Response) => {
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
    const deleted = await deleteFile(attachmentKey);

    if (deleted) {
      res.json({ success: true, message: "File deleted successfully" });
    } else {
      res.status(500).json({ error: "Failed to delete file" });
    }

  } catch (error) {
    console.error("Error deleting uploaded file:", error);
    res.status(500).json({ error: "Failed to delete file" });
  }
};

// ==================== LEGACY TEST ENDPOINTS ====================

export const TestR2List = async (req: Request, res: Response) => {
  try {
    const bucket = process.env.R2_BUCKET as string;
    if (!bucket) {
      return res.status(500).json({ message: "R2_BUCKET env not set" });
    }
    const contents = await listFiles(undefined, 50);
    const expires = Number(req.query.expires || 600);
    const items = await Promise.all(
      contents.map(async (obj) => {
        const Key = obj.Key as string;
        const getUrl = await generatePresignedViewUrl(Key, expires);
        return {
          key: Key,
          size: obj.Size,
          lastModified: obj.LastModified,
          etag: obj.ETag,
          getUrl,
        };
      })
    );
    res.json({
      bucket,
      items,
    });
  } catch (error) {
    console.log("error", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const TestR2Presign = async (req: Request, res: Response) => {
  try {
    const bucket = process.env.R2_BUCKET as string;
    if (!bucket) {
      return res.status(500).json({ message: "R2_BUCKET env not set" });
    }

    const key = (req.query.key as string) || `uploads/${Date.now()}.bin`;
    const contentType =
      (req.query.contentType as string) || "application/octet-stream";
    const expires = Number(req.query.expires || 3600);

    const url = await generatePresignedUploadUrl(key, contentType, expires);

    console.log("url", url);
    console.log("bucket", bucket);
    console.log("key", key);
    console.log("expires", expires);
    console.log("contentType", contentType);
    return res.json({ url, bucket, key, expires, contentType });
  } catch (error) {
    console.log("error", error);
    return res
      .status(500)
      .json({ message: "Failed to generate presigned URL" });
  }
};