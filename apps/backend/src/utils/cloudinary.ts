import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Generate a signed upload URL for direct browser-to-Cloudinary uploads.
 * This is the optimal approach as it:
 * - Avoids server bandwidth usage (file goes directly to Cloudinary)
 * - Reduces server load (no file processing on backend)
 * - Enables larger file uploads without server timeout issues
 */
export const generateSignedUploadParams = (folder: string = "poultry360") => {
    const timestamp = Math.round(new Date().getTime() / 1000);

    // Generate the signature
    const signature = cloudinary.utils.api_sign_request(
        {
            timestamp,
            folder,
        },
        process.env.CLOUDINARY_API_SECRET as string
    );

    return {
        signature,
        timestamp,
        apiKey: process.env.CLOUDINARY_API_KEY,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        folder,
    };
};

/**
 * Delete an image from Cloudinary by its public ID.
 * Useful for cleanup when a product is deleted or image is replaced.
 */
export const deleteImage = async (publicId: string): Promise<boolean> => {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return result.result === "ok";
    } catch (error) {
        console.error("Failed to delete image from Cloudinary:", error);
        return false;
    }
};

// Only accept folder names made of safe characters so a caller cannot escape
// their scope by passing "../" or injecting Cloudinary parameters.
const SAFE_FOLDER_SEGMENT = /^[a-zA-Z0-9_-]{1,64}$/;

/**
 * Build the per-account Cloudinary folder for an upload. The owner id is
 * embedded so deletions can confirm ownership from the URL alone, without a
 * cross-table lookup for every image-bearing field in the schema.
 */
export const buildScopedUploadFolder = (folder: string, ownerId: string): string => {
    const safeFolder = SAFE_FOLDER_SEGMENT.test(folder) ? folder : "products";
    const safeOwner = SAFE_FOLDER_SEGMENT.test(ownerId) ? ownerId : "unknown";
    return `poultry360/${safeFolder}/u_${safeOwner}`;
};

/**
 * Verify that a Cloudinary URL lives inside the given owner's scoped folder.
 * Returns false for legacy (pre-scoping) uploads so the delete endpoint cannot
 * be used to remove other users' bill/receipt images.
 */
export const isUserOwnedUploadFolder = (url: string, ownerId: string): boolean => {
    if (!url || !ownerId) return false;
    return url.includes(`/poultry360/`) && url.includes(`/u_${ownerId}/`);
};

/**
 * Extract public ID from a Cloudinary URL.
 * Example: https://res.cloudinary.com/demo/image/upload/v1234/folder/image.jpg
 * Returns: folder/image
 */
export const extractPublicIdFromUrl = (url: string): string | null => {
    if (!url || !url.includes("cloudinary")) {
        return null;
    }

    try {
        // Match pattern: /upload/v{version}/{publicId}.{extension}
        const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/);
        return match ? match[1] : null;
    } catch (error) {
        return null;
    }
};

export default cloudinary;
