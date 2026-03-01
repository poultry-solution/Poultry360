"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const uploadController_1 = require("../controller/uploadController");
const middelware_1 = require("../middelware/middelware");
const router = express_1.default.Router();
// Apply authentication middleware to all routes
// All authenticated users can upload images
router.use((req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, ["OWNER", "MANAGER", "DEALER", "COMPANY", "SUPER_ADMIN"]);
});
// Get upload signature for direct browser-to-Cloudinary uploads
router.get("/signature", uploadController_1.getUploadSignature);
// Delete an uploaded image
router.post("/delete", uploadController_1.deleteUploadedImage);
exports.default = router;
