import { Request, Response } from "express";
import { generateSignedUploadParams, deleteImage, extractPublicIdFromUrl, buildScopedUploadFolder, isUserOwnedUploadFolder } from "../utils/cloudinary";

/**
 * Get upload signature for direct browser-to-Cloudinary uploads.
 * The signature allows the frontend to upload directly to Cloudinary
 * without exposing the API secret.
 */
export const getUploadSignature = async (
    req: Request,
    res: Response
): Promise<any> => {
    try {
        const { folder = "products" } = req.query;
        const ownerId = req.userId;

        if (!ownerId) {
            return res.status(401).json({ message: "Authentication required" });
        }

        // Scope the Cloudinary folder to the acting account so deletions can
        // verify ownership without a per-field DB lookup. Staff act under the
        // owner's scope (middleware sets req.userId = ownerId), so uploads are
        // keyed to the business, not the individual staff identity.
        const scopedFolder = buildScopedUploadFolder(String(folder), ownerId);
        const params = generateSignedUploadParams(scopedFolder);

        return res.status(200).json({
            success: true,
            data: params,
        });
    } catch (error: any) {
        console.error("Get upload signature error:", error);
        return res.status(500).json({ message: "Failed to generate upload signature" });
    }
};

/**
 * Delete an image from Cloudinary.
 * Can be used when a product is deleted or image needs to be replaced.
 */
export const deleteUploadedImage = async (
    req: Request,
    res: Response
): Promise<any> => {
    try {
        const { imageUrl } = req.body;
        const ownerId = req.userId;

        if (!imageUrl) {
            return res.status(400).json({ message: "Image URL is required" });
        }
        if (!ownerId) {
            return res.status(401).json({ message: "Authentication required" });
        }

        // Restrict deletion to images in this app's own Cloudinary account and folder.
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
        if (
            !cloudName ||
            !imageUrl.includes(`res.cloudinary.com/${cloudName}`) ||
            !imageUrl.includes("/poultry360/")
        ) {
            return res.status(400).json({ message: "Invalid image URL" });
        }

        // Ownership check: the URL must sit inside the caller's own
        // per-account folder. This stops a user from deleting another user's
        // bill or receipt image just because it is in our Cloudinary account.
        if (!isUserOwnedUploadFolder(imageUrl, ownerId)) {
            return res.status(403).json({ message: "You do not own this image" });
        }

        // Extract public ID from URL
        const publicId = extractPublicIdFromUrl(imageUrl);

        if (!publicId) {
            return res.status(400).json({ message: "Invalid Cloudinary URL" });
        }

        const success = await deleteImage(publicId);

        if (success) {
            return res.status(200).json({
                success: true,
                message: "Image deleted successfully",
            });
        } else {
            return res.status(500).json({
                success: false,
                message: "Failed to delete image",
            });
        }
    } catch (error: any) {
        console.error("Delete image error:", error);
        return res.status(500).json({ message: "Failed to delete image" });
    }
};
