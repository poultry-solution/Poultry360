import express from "express";
import { getUploadSignature, deleteUploadedImage } from "../controller/uploadController";
import { authMiddleware } from "../middelware/middelware";

const router = express.Router();

// Apply authentication middleware to all routes
// All authenticated users can upload images
router.use((req, res, next) => {
    // Receipt uploads are needed during payment-gated onboarding for each role.
    // Include HATCHERY so hatchery users can upload receipts while locked.
    authMiddleware(
      req,
      res,
      next,
      ["OWNER", "MANAGER", "DEALER", "COMPANY", "HATCHERY", "SUPER_ADMIN"] as any
    );
});

// Get upload signature for direct browser-to-Cloudinary uploads
router.get("/signature", getUploadSignature);

// Delete an uploaded image
router.post("/delete", deleteUploadedImage);

export default router;
