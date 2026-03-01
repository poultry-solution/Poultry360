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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserStatistics = exports.updateUserStatus = exports.getManagerUsers = exports.getOwnerUsers = exports.updateUserPreferences = exports.deleteUser = exports.updateUser = exports.getCurrentUser = exports.getUserById = exports.getAllUsers = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const client_1 = require("@prisma/client");
const shared_types_1 = require("@myapp/shared-types");
// ==================== GET ALL USERS ====================
const getAllUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = 1, limit = 10, role, status, search } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        // Build where clause
        const where = {};
        if (role) {
            where.role = role;
        }
        if (status) {
            where.status = status;
        }
        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { phone: { contains: search, mode: "insensitive" } },
            ];
        }
        const [users, total] = yield Promise.all([
            prisma_1.default.user.findMany({
                where,
                skip,
                take: Number(limit),
                select: {
                    id: true,
                    name: true,
                    phone: true,
                    role: true,
                    status: true,
                    companyName: true,
                    CompanyFarmLocation: true,
                    createdAt: true,
                    updatedAt: true,
                    _count: {
                        select: {
                            ownedFarms: true,
                            managedFarms: true,
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
            }),
            prisma_1.default.user.count({ where }),
        ]);
        return res.json({
            success: true,
            data: users,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error("Get all users error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getAllUsers = getAllUsers;
// ==================== GET USER BY ID ====================
const getUserById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const user = yield prisma_1.default.user.findUnique({
            where: { id },
            include: {
                ownedFarms: {
                    select: {
                        id: true,
                        name: true,
                        capacity: true,
                        description: true,
                        createdAt: true,
                    },
                },
                managedFarms: {
                    select: {
                        id: true,
                        name: true,
                        capacity: true,
                        description: true,
                        createdAt: true,
                    },
                },
                categories: {
                    select: {
                        id: true,
                        name: true,
                        type: true,
                        description: true,
                    },
                },
                _count: {
                    select: {
                        customers: true,
                        dealers: true,
                        hatcheries: true,
                        medicineSuppliers: true,
                        inventoryItems: true,
                    },
                },
            },
        });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        // Remove password from response
        const { password } = user, userWithoutPassword = __rest(user, ["password"]);
        return res.json({
            success: true,
            data: userWithoutPassword,
        });
    }
    catch (error) {
        console.error("Get user by ID error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getUserById = getUserById;
// ==================== GET CURRENT USER PROFILE ====================
const getCurrentUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId; // From auth middleware
        const user = yield prisma_1.default.user.findUnique({
            where: { id: userId },
            include: {
                ownedFarms: {
                    select: {
                        id: true,
                        name: true,
                        capacity: true,
                        description: true,
                        createdAt: true,
                        _count: {
                            select: {
                                batches: true,
                                expenses: true,
                                sales: true,
                            },
                        },
                    },
                },
                managedFarms: {
                    select: {
                        id: true,
                        name: true,
                        capacity: true,
                        description: true,
                        createdAt: true,
                        _count: {
                            select: {
                                batches: true,
                                expenses: true,
                                sales: true,
                            },
                        },
                    },
                },
                categories: {
                    select: {
                        id: true,
                        name: true,
                        type: true,
                        description: true,
                    },
                },
            },
        });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        // Remove password from response
        const { password } = user, userWithoutPassword = __rest(user, ["password"]);
        return res.json({
            success: true,
            data: userWithoutPassword,
        });
    }
    catch (error) {
        console.error("Get current user error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getCurrentUser = getCurrentUser;
// ==================== UPDATE USER ====================
const updateUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Validate request body
        const { success, data, error } = shared_types_1.UpdateUserSchema.safeParse(req.body);
        if (!success) {
            return res.status(400).json({ message: error === null || error === void 0 ? void 0 : error.message });
        }
        // Check if user exists
        const existingUser = yield prisma_1.default.user.findUnique({
            where: { id },
        });
        if (!existingUser) {
            return res.status(404).json({ message: "User not found" });
        }
        // Role-based access control
        if (currentUserRole !== client_1.UserRole.OWNER && currentUserId !== id) {
            return res.status(403).json({ message: "Access denied" });
        }
        // Only OWNER can change roles and status
        if (currentUserRole !== client_1.UserRole.OWNER) {
            delete data.role;
            delete data.status;
        }
        // Build update payload with only fields that exist in Prisma User model
        const updateData = {};
        if (typeof data.name !== "undefined")
            updateData.name = data.name;
        if (typeof data.phone !== "undefined")
            updateData.phone = data.phone;
        if (typeof data.role !== "undefined")
            updateData.role = data.role;
        if (typeof data.status !== "undefined")
            updateData.status = data.status;
        if (typeof data.companyName !== "undefined")
            updateData.companyName = data.companyName;
        if (typeof data.CompanyFarmLocation !== "undefined")
            updateData.CompanyFarmLocation = data.CompanyFarmLocation;
        // Ignore fields not in Prisma model (email, gender, ownerId, CompanyFarmNumber, CompanyFarmCapacity)
        // Update user
        const updatedUser = yield prisma_1.default.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                name: true,
                phone: true,
                role: true,
                status: true,
                companyName: true,
                CompanyFarmLocation: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        return res.json({
            success: true,
            data: updatedUser,
            message: "User updated successfully",
        });
    }
    catch (error) {
        console.error("Update user error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.updateUser = updateUser;
// ==================== DELETE USER ====================
const deleteUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Check if user exists
        const existingUser = yield prisma_1.default.user.findUnique({
            where: { id },
        });
        if (!existingUser) {
            return res.status(404).json({ message: "User not found" });
        }
        // Only OWNER can delete users, and cannot delete themselves
        if (currentUserRole !== client_1.UserRole.OWNER) {
            return res.status(403).json({ message: "Access denied" });
        }
        if (currentUserId === id) {
            return res
                .status(400)
                .json({ message: "Cannot delete your own account" });
        }
        // Check if user has any farms
        const userFarms = yield prisma_1.default.farm.count({
            where: {
                OR: [{ ownerId: id }, { managers: { some: { id } } }],
            },
        });
        if (userFarms > 0) {
            return res.status(400).json({
                message: "Cannot delete user with associated farms. Please reassign farms first.",
            });
        }
        // Delete user
        yield prisma_1.default.user.delete({
            where: { id },
        });
        return res.json({
            success: true,
            message: "User deleted successfully",
        });
    }
    catch (error) {
        console.error("Delete user error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.deleteUser = deleteUser;
// ==================== UPDATE USER PREFERENCES ====================
const updateUserPreferences = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { language, calendarType } = req.body;
        // Validate input
        if (language && !['ENGLISH', 'NEPALI'].includes(language)) {
            return res.status(400).json({ message: 'Invalid language value' });
        }
        if (calendarType && !['AD', 'BS'].includes(calendarType)) {
            return res.status(400).json({ message: 'Invalid calendar type value' });
        }
        // Build update data
        const updateData = {};
        if (language)
            updateData.language = language;
        if (calendarType)
            updateData.calendarType = calendarType;
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ message: 'No valid preferences to update' });
        }
        const updatedUser = yield prisma_1.default.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                name: true,
                phone: true,
                role: true,
                status: true,
                language: true,
                calendarType: true,
                companyName: true,
                CompanyFarmLocation: true,
                updatedAt: true,
            },
        });
        return res.json({
            success: true,
            data: updatedUser,
        });
    }
    catch (error) {
        console.error('Update user preferences error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});
exports.updateUserPreferences = updateUserPreferences;
// ==================== GET OWNER USERS ====================
const getOwnerUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = 1, limit = 10, search } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const where = {
            role: client_1.UserRole.OWNER,
        };
        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { phone: { contains: search, mode: "insensitive" } },
            ];
        }
        const [owners, total] = yield Promise.all([
            prisma_1.default.user.findMany({
                where,
                skip,
                take: Number(limit),
                select: {
                    id: true,
                    name: true,
                    phone: true,
                    status: true,
                    companyName: true,
                    CompanyFarmLocation: true,
                    createdAt: true,
                    _count: {
                        select: {
                            ownedFarms: true,
                            managedFarms: true,
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
            }),
            prisma_1.default.user.count({ where }),
        ]);
        return res.json({
            success: true,
            data: owners,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error("Get owner users error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getOwnerUsers = getOwnerUsers;
// ==================== GET MANAGER USERS ====================
const getManagerUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = 1, limit = 10, search } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const where = {
            role: client_1.UserRole.MANAGER,
        };
        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { phone: { contains: search, mode: "insensitive" } },
            ];
        }
        const [managers, total] = yield Promise.all([
            prisma_1.default.user.findMany({
                where,
                skip,
                take: Number(limit),
                select: {
                    id: true,
                    name: true,
                    phone: true,
                    status: true,
                    companyName: true,
                    CompanyFarmLocation: true,
                    createdAt: true,
                    _count: {
                        select: {
                            ownedFarms: true,
                            managedFarms: true,
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
            }),
            prisma_1.default.user.count({ where }),
        ]);
        return res.json({
            success: true,
            data: managers,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error("Get manager users error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getManagerUsers = getManagerUsers;
// ==================== UPDATE USER STATUS ====================
const updateUserStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const currentUserRole = req.role;
        // Only OWNER can update user status
        if (currentUserRole !== client_1.UserRole.OWNER) {
            return res.status(403).json({ message: "Access denied" });
        }
        // Validate status
        if (!Object.values(client_1.UserStatus).includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }
        // Check if user exists
        const existingUser = yield prisma_1.default.user.findUnique({
            where: { id },
        });
        if (!existingUser) {
            return res.status(404).json({ message: "User not found" });
        }
        // Update user status
        const updatedUser = yield prisma_1.default.user.update({
            where: { id },
            data: { status },
            select: {
                id: true,
                name: true,
                role: true,
                status: true,
                updatedAt: true,
            },
        });
        return res.json({
            success: true,
            data: updatedUser,
            message: "User status updated successfully",
        });
    }
    catch (error) {
        console.error("Update user status error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.updateUserStatus = updateUserStatus;
// ==================== GET USER STATISTICS ====================
const getUserStatistics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currentUserRole = req.role;
        // Only OWNER can view statistics
        if (currentUserRole !== client_1.UserRole.OWNER) {
            return res.status(403).json({ message: "Access denied" });
        }
        const [totalUsers, totalOwners, totalManagers, activeUsers, pendingUsers, inactiveUsers,] = yield Promise.all([
            prisma_1.default.user.count(),
            prisma_1.default.user.count({ where: { role: client_1.UserRole.OWNER } }),
            prisma_1.default.user.count({ where: { role: client_1.UserRole.MANAGER } }),
            prisma_1.default.user.count({ where: { status: client_1.UserStatus.ACTIVE } }),
            prisma_1.default.user.count({ where: { status: client_1.UserStatus.PENDING_VERIFICATION } }),
            prisma_1.default.user.count({ where: { status: client_1.UserStatus.INACTIVE } }),
        ]);
        return res.json({
            success: true,
            data: {
                totalUsers,
                totalOwners,
                totalManagers,
                activeUsers,
                pendingUsers,
                inactiveUsers,
            },
        });
    }
    catch (error) {
        console.error("Get user statistics error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getUserStatistics = getUserStatistics;
