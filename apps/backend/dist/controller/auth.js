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
exports.registerEntity = exports.verifyPassword = exports.getCrossPortAuth = exports.storeCrossPortAuth = exports.validateToken = exports.getUserInfo = exports.logout = exports.refreshToken = exports.register = exports.login = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const client_1 = require("@prisma/client");
const shared_types_1 = require("@myapp/shared-types");
const generateTokens = (userId, role) => {
    const accessToken = jsonwebtoken_1.default.sign({ userId, role }, process.env.JWT_SECRET || "mysupersecretkey", {
        expiresIn: "1h",
    });
    const refreshToken = jsonwebtoken_1.default.sign({ userId, role }, process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key", {
        expiresIn: "7d",
    });
    return { accessToken, refreshToken };
};
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { success, data, error } = shared_types_1.LoginSchema.safeParse(req.body);
        if (!success) {
            return res.status(400).json({ message: error === null || error === void 0 ? void 0 : error.message });
        }
        const { emailOrPhone, password } = data;
        console.log("emailOrPhone", emailOrPhone);
        // Find user by phone
        const user = yield prisma_1.default.user.findFirst({
            where: {
                phone: emailOrPhone,
            },
            include: {
                managedFarms: true,
                ownedFarms: true,
                dealer: true,
                company: true,
            },
        });
        console.log("user", user);
        console.log("user.dealer", user === null || user === void 0 ? void 0 : user.dealer);
        console.log("user.company", user === null || user === void 0 ? void 0 : user.company);
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        // Verify password
        const isValidPassword = yield bcrypt_1.default.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        // Generate tokens
        const tokens = generateTokens(user.id, user.role);
        res.cookie("refreshToken", tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            path: "/",
            domain: process.env.NODE_ENV === "production" ? ".myapp.com" : undefined, // Allow subdomains in production
        });
        let userWithFarms = {
            id: user.id,
            name: user.name,
            phone: user.phone,
            companyName: user.companyName,
            companyFarmLocation: user.CompanyFarmLocation,
            role: user.role,
            status: user.status,
            language: user.language,
            calendarType: user.calendarType,
            managedFarms: (_a = user.managedFarms) === null || _a === void 0 ? void 0 : _a.map((farm) => farm.id),
            ownedFarms: (_b = user.ownedFarms) === null || _b === void 0 ? void 0 : _b.map((farm) => farm.id),
            dealer: user.dealer,
            company: user.company,
        };
        console.log("userWithFarms", userWithFarms);
        // Return access token and user data
        console.log("tokens", tokens);
        console.log("userWithFarms", userWithFarms);
        return res.json({
            accessToken: tokens.accessToken,
            user: userWithFarms,
        });
    }
    catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.login = login;
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { success, data, error } = shared_types_1.SignupSchema.safeParse(req.body);
        if (!success) {
            return res.status(400).json({ message: error === null || error === void 0 ? void 0 : error.message });
        }
        const { name, phone, password, role, companyName, companyFarmLocation, language, calendarType, } = data;
        // Get optional dealerId from request body (not in schema validation)
        const { dealerId } = req.body;
        // Check if phone number already exists (phone must be unique)
        const existingUser = yield prisma_1.default.user.findUnique({
            where: {
                phone: phone,
            },
        });
        if (existingUser) {
            return res
                .status(400)
                .json({ message: "Phone number already registered" });
        }
        // Validate dealer exists if dealerId is provided
        if (dealerId) {
            const dealer = yield prisma_1.default.dealer.findUnique({
                where: { id: dealerId },
            });
            if (!dealer) {
                return res.status(400).json({
                    success: false,
                    message: "Dealer not found",
                });
            }
        }
        // Hash password
        const hashedPassword = yield bcrypt_1.default.hash(password, 10);
        // Create user and verification request in a transaction
        const result = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Create user
            const user = yield tx.user.create({
                data: {
                    name: name,
                    phone: phone,
                    password: hashedPassword,
                    // if user is owner then marked as verified else pending verification
                    status: role === client_1.UserRole.OWNER
                        ? client_1.UserStatus.ACTIVE
                        : client_1.UserStatus.PENDING_VERIFICATION,
                    role: role || client_1.UserRole.OWNER,
                    companyName: companyName,
                    CompanyFarmLocation: companyFarmLocation,
                    language: language || "ENGLISH",
                    calendarType: calendarType || "BS",
                },
                include: {
                    managedFarms: {
                        select: {
                            id: true,
                            name: true,
                            capacity: true,
                            description: true,
                        },
                    },
                    ownedFarms: true,
                },
            });
            // If dealerId provided and user is owner/farmer, create verification request
            if (dealerId && (role === client_1.UserRole.OWNER || !role)) {
                yield tx.farmerVerificationRequest.create({
                    data: {
                        farmerId: user.id,
                        dealerId: dealerId,
                        status: "PENDING",
                        rejectedCount: 0,
                    },
                });
            }
            return user;
        }));
        const user = result;
        // Generate tokens
        const tokens = generateTokens(user.id, user.role);
        res.cookie("refreshToken", tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            path: "/",
            // Remove domain in development to allow cross-port access
        });
        // Return access token and user data
        return res.status(201).json({
            accessToken: tokens.accessToken,
            user: {
                id: user.id,
                name: user.name,
                phone: user.phone,
                companyName: user.companyName,
                companyFarmLocation: user.CompanyFarmLocation,
                role: user.role,
                status: user.status,
                language: user.language,
                calendarType: user.calendarType,
                managedFarms: user.managedFarms,
                ownedFarms: user.ownedFarms,
            },
        });
    }
    catch (error) {
        console.error("Registration error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.register = register;
const refreshToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        console.log("🔄 Refresh token request headers:", req.headers.cookie);
        console.log("🔄 Refresh token parsed cookies:", req.cookies);
        console.log("🔄 Refresh token value:", (_a = req.cookies) === null || _a === void 0 ? void 0 : _a.refreshToken);
        const refreshToken = (_b = req.cookies) === null || _b === void 0 ? void 0 : _b.refreshToken;
        if (!refreshToken) {
            return res.status(401).json({ message: "Refresh token not found" });
        }
        // Verify refresh token
        const decoded = jsonwebtoken_1.default.verify(refreshToken, process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key");
        const user = yield prisma_1.default.user.findUnique({
            where: { id: decoded.userId },
        });
        if (!user) {
            return res.status(401).json({ message: "Invalid refresh token" });
        }
        // Generate new tokens
        const tokens = generateTokens(user.id, user.role);
        // Set new refresh token
        res.cookie("refreshToken", tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            path: "/",
            // Remove domain in development to allow cross-port access
        });
        // Return new access token
        return res.json({ accessToken: tokens.accessToken });
    }
    catch (error) {
        return res.status(401).json({ message: "Invalid refresh token" });
    }
});
exports.refreshToken = refreshToken;
const logout = (req, res) => {
    // Clear refresh token cookie
    res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path: "/",
        domain: process.env.NODE_ENV === "production" ? ".myapp.com" : undefined, // Allow subdomains in production
    });
    return res.json({ message: "Logged out successfully" });
};
exports.logout = logout;
const getUserInfo = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: "No token provided" });
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
        return res.status(401).json({ error: "No token provided" });
    }
    try {
        jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
    }
    catch (err) {
        return res.status(403).json({ error: "Access denied" });
    }
    const userId = jsonwebtoken_1.default.decode(token).userId || "";
    if (!userId) {
        return res.status(404).json({ error: "User not found" });
    }
    const userData = yield prisma_1.default.user.findUnique({
        where: { id: userId },
        include: {
            managedFarms: {
                select: {
                    id: true,
                    name: true,
                    capacity: true,
                    description: true,
                },
            },
            ownedFarms: true,
            dealer: true,
            company: true,
        },
    });
    if (!userData) {
        return res.status(404).json({ error: "User not found" });
    }
    return res.json({
        id: userData.id,
        name: userData.name,
        phone: userData.phone,
        companyName: userData.companyName,
        companyFarmLocation: userData.CompanyFarmLocation,
        status: userData.status,
        language: userData.language,
        calendarType: userData.calendarType,
        managedFarms: userData.managedFarms,
        ownedFarms: userData.ownedFarms,
        role: userData.role,
        dealer: userData.dealer,
        company: userData.company,
    });
});
exports.getUserInfo = getUserInfo;
const validateToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({
            isValid: false,
            error: "No token provided",
        });
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
        return res.status(401).json({
            isValid: false,
            error: "No token provided",
        });
    }
    try {
        // Verify the token
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        // Get fresh user data from database
        const userData = yield prisma_1.default.user.findUnique({
            where: { id: decoded.userId },
            include: {
                managedFarms: {
                    select: {
                        id: true,
                        name: true,
                        capacity: true,
                        description: true,
                    },
                },
                ownedFarms: true,
                dealer: true,
                company: true,
            },
        });
        if (!userData) {
            return res.status(401).json({
                isValid: false,
                error: "User not found",
            });
        }
        // Check if user is active
        if (userData.status !== client_1.UserStatus.ACTIVE) {
            return res.status(401).json({
                isValid: false,
                error: "User account is not active",
            });
        }
        // Prepare user response
        let userResponse = {
            id: userData.id,
            name: userData.name,
            phone: userData.phone,
            companyName: userData.companyName,
            companyFarmLocation: userData.CompanyFarmLocation,
            role: userData.role,
            status: userData.status,
            language: userData.language,
            calendarType: userData.calendarType,
            managedFarms: userData.managedFarms,
            ownedFarms: userData.ownedFarms,
            dealer: userData.dealer,
            company: userData.company,
        };
        // Add storeId for farm managers
        if (userData.role === client_1.UserRole.MANAGER) {
            const farm = yield prisma_1.default.farm.findMany({
                where: { managers: { some: { id: userData.id } } },
            });
            if (farm) {
                userResponse.managedFarms = farm.map((farm) => farm.id);
            }
        }
        return res.json({
            isValid: true,
            user: userResponse,
        });
    }
    catch (error) {
        return res.status(401).json({
            isValid: false,
            error: "Invalid token",
        });
    }
});
exports.validateToken = validateToken;
// In-memory storage for cross-port auth data (in production, use Redis or database)
const crossPortAuthStorage = new Map();
const storeCrossPortAuth = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { authData, timestamp, source } = req.body;
        if (!authData || !authData.accessToken || !authData.user) {
            return res.status(400).json({
                success: false,
                error: "Invalid auth data",
            });
        }
        // Generate a unique session ID
        const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        // Store the auth data with expiration (5 minutes)
        crossPortAuthStorage.set(sessionId, {
            authData,
            timestamp,
            source,
            expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
        });
        // Clean up expired sessions
        for (const [key, value] of crossPortAuthStorage.entries()) {
            if (value.expiresAt < Date.now()) {
                crossPortAuthStorage.delete(key);
            }
        }
        return res.status(200).json({
            success: true,
            sessionId,
        });
    }
    catch (error) {
        console.error("Error storing cross-port auth:", error);
        return res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
});
exports.storeCrossPortAuth = storeCrossPortAuth;
const getCrossPortAuth = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { session } = req.query;
        if (!session) {
            return res.status(400).json({
                success: false,
                error: "Session ID required",
            });
        }
        const sessionData = crossPortAuthStorage.get(session);
        if (!sessionData) {
            return res.status(404).json({
                success: false,
                error: "Session not found or expired",
            });
        }
        // Check if session is expired
        if (sessionData.expiresAt < Date.now()) {
            crossPortAuthStorage.delete(session);
            return res.status(404).json({
                success: false,
                error: "Session expired",
            });
        }
        // Return the auth data and clean up the session
        crossPortAuthStorage.delete(session);
        return res.status(200).json({
            success: true,
            authData: sessionData.authData,
        });
    }
    catch (error) {
        console.error("Error getting cross-port auth:", error);
        return res.status(500).json({
            success: false,
            error: "Internal server error",
        });
    }
});
exports.getCrossPortAuth = getCrossPortAuth;
// ==================== VERIFY PASSWORD ====================
const verifyPassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { password } = req.body;
        const currentUserId = req.userId;
        if (!password) {
            return res.status(400).json({
                success: false,
                message: "Password is required",
            });
        }
        if (!currentUserId) {
            return res.status(401).json({
                success: false,
                message: "User not authenticated",
            });
        }
        // Get user from database
        const user = yield prisma_1.default.user.findUnique({
            where: { id: currentUserId },
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        // Verify password
        const isValidPassword = yield bcrypt_1.default.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: "Invalid password",
            });
        }
        return res.json({
            success: true,
            message: "Password verified successfully",
        });
    }
    catch (error) {
        console.error("Password verification error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
});
exports.verifyPassword = verifyPassword;
// ==================== REGISTER ENTITY (DEALER/COMPANY) ====================
const registerEntity = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, phone, password, entityType, entityName, entityContact, entityAddress, companyId, } = req.body;
        // Validation
        if (!name || !phone || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, phone, and password are required",
            });
        }
        if (!entityType || !["DEALER", "COMPANY"].includes(entityType)) {
            return res.status(400).json({
                success: false,
                message: "Entity type must be either DEALER or COMPANY",
            });
        }
        if (!entityName) {
            return res.status(400).json({
                success: false,
                message: "Entity name is required",
            });
        }
        // Contact is required only for Dealers
        if (entityType === "DEALER" && !entityContact) {
            return res.status(400).json({
                success: false,
                message: "Dealer contact is required",
            });
        }
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long",
            });
        }
        // Check if phone number already exists
        const existingUser = yield prisma_1.default.user.findUnique({
            where: { phone },
        });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "Phone number already registered",
            });
        }
        // Validate company exists if companyId is provided
        if (companyId) {
            const company = yield prisma_1.default.company.findUnique({
                where: { id: companyId },
            });
            if (!company) {
                return res.status(400).json({
                    success: false,
                    message: "Company not found",
                });
            }
        }
        // Hash password
        const hashedPassword = yield bcrypt_1.default.hash(password, 10);
        // Determine user role based on entity type
        const userRole = entityType === "DEALER" ? client_1.UserRole.DEALER : client_1.UserRole.COMPANY;
        // Create user and entity in a transaction
        const result = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Create user
            const user = yield tx.user.create({
                data: {
                    name,
                    phone,
                    password: hashedPassword,
                    role: userRole,
                    status: client_1.UserStatus.ACTIVE, // Active by default for dealer/company
                    language: "ENGLISH",
                    calendarType: "AD",
                },
            });
            // Create entity (Dealer or Company)
            if (entityType === "DEALER") {
                // Check if owner already has a dealer
                const existingDealer = yield tx.dealer.findUnique({
                    where: { ownerId: user.id },
                });
                if (existingDealer) {
                    throw new Error("User already owns a dealer account");
                }
                const dealer = yield tx.dealer.create({
                    data: {
                        name: entityName,
                        contact: entityContact,
                        address: entityAddress || null,
                        ownerId: user.id,
                    },
                });
                // If companyId provided, create verification request instead of direct link
                if (companyId) {
                    yield tx.dealerVerificationRequest.create({
                        data: {
                            dealerId: dealer.id,
                            companyId: companyId,
                            status: "PENDING",
                            rejectedCount: 0,
                        },
                    });
                }
                return { user, entity: dealer, entityType: "DEALER" };
            }
            else {
                // COMPANY
                // Check if owner already has a company
                const existingCompany = yield tx.company.findUnique({
                    where: { ownerId: user.id },
                });
                if (existingCompany) {
                    throw new Error("User already owns a company account");
                }
                const company = yield tx.company.create({
                    data: {
                        name: entityName,
                        address: entityAddress || null,
                        ownerId: user.id,
                    },
                });
                return { user, entity: company, entityType: "COMPANY" };
            }
        }));
        // Generate tokens
        const tokens = generateTokens(result.user.id, result.user.role);
        res.cookie("refreshToken", tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            path: "/",
        });
        // Return access token and user data
        return res.status(201).json({
            success: true,
            accessToken: tokens.accessToken,
            user: {
                id: result.user.id,
                name: result.user.name,
                phone: result.user.phone,
                role: result.user.role,
                status: result.user.status,
            },
            entity: {
                id: result.entity.id,
                name: result.entity.name,
                type: result.entityType,
            },
            message: `${result.entityType} account created successfully`,
        });
    }
    catch (error) {
        console.error("Entity registration error:", error);
        // Handle Prisma unique constraint errors
        if (error.code === "P2002") {
            return res.status(400).json({
                success: false,
                message: "A record with this information already exists",
            });
        }
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
});
exports.registerEntity = registerEntity;
