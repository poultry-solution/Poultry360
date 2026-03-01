"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController_1 = require("../controller/userController");
const middelware_1 = require("../middelware/middelware");
const client_1 = require("@prisma/client");
const userRouter = (0, express_1.Router)();
// Apply auth middleware to all routes
userRouter.use((req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, []); // Allow all authenticated users
});
// ==================== USER ROUTES ====================
// Get all users (with pagination, filtering, search)
userRouter.get("/", (req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, [client_1.UserRole.OWNER]); // Only OWNER can view all users
}, userController_1.getAllUsers);
// Get current user profile
userRouter.get("/me", userController_1.getCurrentUser);
// Update user preferences (language, calendar type)
userRouter.patch("/preferences", userController_1.updateUserPreferences);
// Get user by ID
userRouter.get("/:id", userController_1.getUserById);
// Update user
userRouter.put("/:id", userController_1.updateUser);
// Delete user (only OWNER, cannot delete self)
userRouter.delete("/:id", (req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, [client_1.UserRole.OWNER]);
}, userController_1.deleteUser);
// ==================== ROLE-SPECIFIC ROUTES ====================
// Get all owner users
userRouter.get("/owners/list", (req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, [client_1.UserRole.OWNER]);
}, userController_1.getOwnerUsers);
// Get all manager users
userRouter.get("/managers/list", (req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, [client_1.UserRole.OWNER]);
}, userController_1.getManagerUsers);
// ==================== ADMIN ROUTES ====================
// Update user status (only OWNER)
userRouter.patch("/:id/status", (req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, [client_1.UserRole.OWNER]);
}, userController_1.updateUserStatus);
// Get user statistics (only OWNER)
userRouter.get("/stats/overview", (req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, [client_1.UserRole.OWNER]);
}, userController_1.getUserStatistics);
exports.default = userRouter;
