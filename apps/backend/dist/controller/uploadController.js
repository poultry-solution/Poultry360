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
exports.deleteUploadedImage = exports.getUploadSignature = void 0;
const cloudinary_1 = require("../utils/cloudinary");
/**
 * Get upload signature for direct browser-to-Cloudinary uploads.
 * The signature allows the frontend to upload directly to Cloudinary
 * without exposing the API secret.
 */
const getUploadSignature = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { folder = "products" } = req.query;
        // Generate signed params for the upload
        const params = (0, cloudinary_1.generateSignedUploadParams)(`poultry360/${folder}`);
        return res.status(200).json({
            success: true,
            data: params,
        });
    }
    catch (error) {
        console.error("Get upload signature error:", error);
        return res.status(500).json({ message: "Failed to generate upload signature" });
    }
});
exports.getUploadSignature = getUploadSignature;
/**
 * Delete an image from Cloudinary.
 * Can be used when a product is deleted or image needs to be replaced.
 */
const deleteUploadedImage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { imageUrl } = req.body;
        if (!imageUrl) {
            return res.status(400).json({ message: "Image URL is required" });
        }
        // Extract public ID from URL
        const publicId = (0, cloudinary_1.extractPublicIdFromUrl)(imageUrl);
        if (!publicId) {
            return res.status(400).json({ message: "Invalid Cloudinary URL" });
        }
        const success = yield (0, cloudinary_1.deleteImage)(publicId);
        if (success) {
            return res.status(200).json({
                success: true,
                message: "Image deleted successfully",
            });
        }
        else {
            return res.status(500).json({
                success: false,
                message: "Failed to delete image",
            });
        }
    }
    catch (error) {
        console.error("Delete image error:", error);
        return res.status(500).json({ message: "Failed to delete image" });
    }
});
exports.deleteUploadedImage = deleteUploadedImage;
