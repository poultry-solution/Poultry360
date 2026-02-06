import express from "express";
import { getUploadSignature, deleteUploadedImage } from "../controller/uploadController";
import { authMiddleware } from "../middelware/middelware";

const router = express.Router();

// Apply authentication middleware to all routes
// All authenticated users can upload images
router.use((req, res, next) => {
    authMiddleware(req, res, next, ["OWNER", "MANAGER", "DEALER", "COMPANY", "SUPER_ADMIN"]);
});

// Get upload signature for direct browser-to-Cloudinary uploads
router.get("/signature", getUploadSignature);

// Delete an uploaded image
router.post("/delete", deleteUploadedImage);

export default router;
