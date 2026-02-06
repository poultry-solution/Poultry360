import { Request, Response } from "express";
import { generateSignedUploadParams, deleteImage, extractPublicIdFromUrl } from "../utils/cloudinary";

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

        // Generate signed params for the upload
        const params = generateSignedUploadParams(`poultry360/${folder}`);

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

        if (!imageUrl) {
            return res.status(400).json({ message: "Image URL is required" });
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
