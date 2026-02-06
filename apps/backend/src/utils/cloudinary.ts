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
