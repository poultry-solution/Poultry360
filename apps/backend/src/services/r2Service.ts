import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const endpoint = process.env.R2_ENDPOINT; // e.g. https://<account_id>.r2.cloudflarestorage.com
const access_key_id = process.env.R2_ACCESS_KEY_ID;
const access_key_secret = process.env.R2_ACCESS_KEY_SECRET;
const bucket = process.env.R2_BUCKET;

if (!endpoint || !access_key_id || !access_key_secret || !bucket) {
  throw new Error("R2 credentials are not set");
}

export const s3 = new S3Client({
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
export const generatePresignedUploadUrl = async (
  key: string,
  contentType: string,
  expires: number = 3600
): Promise<string> => {
  try {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: expires });
    return url;
  } catch (error) {
    console.error("Error generating presigned upload URL:", error);
    throw new Error("Failed to generate upload URL");
  }
};

/**
 * Generate a presigned URL for downloading/viewing a file
 * @param key - The object key (path) in the bucket
 * @param expires - Expiration time in seconds (default: 1 hour)
 * @returns Presigned GET URL
 */
export const generatePresignedViewUrl = async (
  key: string,
  expires: number = 3600
): Promise<string> => {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: expires });
    return url;
  } catch (error) {
    console.error("Error generating presigned view URL:", error);
    throw new Error("Failed to generate view URL");
  }
};

/**
 * Delete a file from R2
 * @param key - The object key (path) in the bucket
 * @returns Success status
 */
export const deleteFile = async (key: string): Promise<boolean> => {
  try {
    await s3.send(new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }));
    return true;
  } catch (error) {
    console.error("Error deleting file:", error);
    return false;
  }
};

/**
 * Check if a file exists in R2
 * @param key - The object key (path) in the bucket
 * @returns File exists status and metadata
 */
export const fileExists = async (key: string): Promise<{ exists: boolean; metadata?: any }> => {
  try {
    const result = await s3.send(new HeadObjectCommand({
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
  } catch (error: any) {
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      return { exists: false };
    }
    console.error("Error checking file existence:", error);
    throw new Error("Failed to check file existence");
  }
};

/**
 * List files in a specific folder/prefix
 * @param prefix - The folder prefix to list
 * @param maxKeys - Maximum number of keys to return (default: 1000)
 * @returns List of objects
 */
export const listFiles = async (prefix?: string, maxKeys: number = 1000) => {
  try {
    const result = await s3.send(new ListObjectsV2Command({
      Bucket: bucket,
      MaxKeys: maxKeys,
      ...(prefix && { Prefix: prefix }),
    }));
    return result.Contents || [];
  } catch (error) {
    console.error("Error listing files:", error);
    throw new Error("Failed to list files");
  }
};

/**
 * Generate a unique key for chat attachments
 * @param conversationId - The conversation ID
 * @param messageId - The message ID
 * @param fileName - Original file name
 * @param fileType - File type (image, video, audio, pdf, doc, other)
 * @returns Unique key for the file
 */
export const generateChatAttachmentKey = (
  conversationId: string,
  messageId: string,
  fileName: string,
  fileType: string
): string => {
  const timestamp = Date.now();
  const extension = fileName.split('.').pop() || '';
  return `chat-attachments/${conversationId}/${messageId}/${fileType}/${timestamp}-${fileName}`;
};

/**
 * Get file type from MIME type
 * @param contentType - MIME type
 * @returns File type category
 */
export const getFileTypeFromMime = (contentType: string): string => {
  if (contentType.startsWith('image/')) return 'image';
  if (contentType.startsWith('video/')) return 'video';
  if (contentType.startsWith('audio/')) return 'audio';
  if (contentType === 'application/pdf') return 'pdf';
  if (contentType.includes('document') || contentType.includes('text/')) return 'doc';
  return 'other';
};

/**
 * Get file size in human readable format
 * @param bytes - File size in bytes
 * @returns Human readable size
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
