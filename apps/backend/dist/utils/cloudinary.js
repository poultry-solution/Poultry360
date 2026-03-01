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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractPublicIdFromUrl = exports.deleteImage = exports.generateSignedUploadParams = void 0;
const cloudinary_1 = require("cloudinary");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Configure Cloudinary
cloudinary_1.v2.config({
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
const generateSignedUploadParams = (folder = "poultry360") => {
    const timestamp = Math.round(new Date().getTime() / 1000);
    // Generate the signature
    const signature = cloudinary_1.v2.utils.api_sign_request({
        timestamp,
        folder,
    }, process.env.CLOUDINARY_API_SECRET);
    return {
        signature,
        timestamp,
        apiKey: process.env.CLOUDINARY_API_KEY,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        folder,
    };
};
exports.generateSignedUploadParams = generateSignedUploadParams;
/**
 * Delete an image from Cloudinary by its public ID.
 * Useful for cleanup when a product is deleted or image is replaced.
 */
const deleteImage = (publicId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield cloudinary_1.v2.uploader.destroy(publicId);
        return result.result === "ok";
    }
    catch (error) {
        console.error("Failed to delete image from Cloudinary:", error);
        return false;
    }
});
exports.deleteImage = deleteImage;
/**
 * Extract public ID from a Cloudinary URL.
 * Example: https://res.cloudinary.com/demo/image/upload/v1234/folder/image.jpg
 * Returns: folder/image
 */
const extractPublicIdFromUrl = (url) => {
    if (!url || !url.includes("cloudinary")) {
        return null;
    }
    try {
        // Match pattern: /upload/v{version}/{publicId}.{extension}
        const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/);
        return match ? match[1] : null;
    }
    catch (error) {
        return null;
    }
};
exports.extractPublicIdFromUrl = extractPublicIdFromUrl;
exports.default = cloudinary_1.v2;
