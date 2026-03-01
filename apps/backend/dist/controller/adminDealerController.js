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
exports.deleteDealer = exports.updateDealer = exports.createDealer = exports.getDealerById = exports.getAllDealers = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
// ==================== GET ALL DEALERS ====================
const getAllDealers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = 1, limit = 10, search, status } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        // Build where clause - only get dealers with owners (ownerId is not null)
        const where = {
            ownerId: { not: null },
            owner: {
                role: client_1.UserRole.DEALER,
            },
        };
        // Filter by owner status
        if (status) {
            where.owner = Object.assign(Object.assign({}, where.owner), { status: status });
        }
        // Search by dealer name, owner name, owner phone, or contact
        if (search) {
            where.AND = [
                {
                    OR: [
                        { name: { contains: search, mode: "insensitive" } },
                        { contact: { contains: search, mode: "insensitive" } },
                        {
                            owner: {
                                name: { contains: search, mode: "insensitive" },
                            },
                        },
                        {
                            owner: {
                                phone: { contains: search, mode: "insensitive" },
                            },
                        },
                    ],
                },
            ];
        }
        const [dealers, total] = yield Promise.all([
            prisma_1.default.dealer.findMany({
                where,
                skip,
                take: Number(limit),
                orderBy: { createdAt: "desc" },
                include: {
                    owner: {
                        select: {
                            id: true,
                            name: true,
                            phone: true,
                            status: true,
                            createdAt: true,
                        },
                    },
                    companies: {
                        select: {
                            company: {
                                select: {
                                    id: true,
                                    name: true,
                                },
                            },
                        },
                    },
                    _count: {
                        select: {
                            products: true,
                            sales: true,
                            consignmentsFrom: true,
                            consignmentsTo: true,
                            ledgerEntries: true,
                            paymentRequests: true,
                        },
                    },
                },
            }),
            prisma_1.default.dealer.count({ where }),
        ]);
        return res.json({
            success: true,
            data: dealers,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error("Get all dealers error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getAllDealers = getAllDealers;
// ==================== GET DEALER BY ID ====================
const getDealerById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { id },
            include: {
                owner: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        status: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                },
                _count: {
                    select: {
                        products: true,
                        sales: true,
                        consignmentsFrom: true,
                        consignmentsTo: true,
                        ledgerEntries: true,
                        paymentRequests: true,
                        companySales: true,
                    },
                },
                managers: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        status: true,
                    },
                },
            },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        // Only return dealers with owners for admin management
        if (!dealer.ownerId) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        // Get companies linked to this dealer via DealerCompany
        const dealerCompanies = yield prisma_1.default.dealerCompany.findMany({
            where: { dealerId: dealer.id },
            include: {
                company: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                    },
                },
            },
        });
        // Add companies array to dealer response
        const dealerWithCompanies = Object.assign(Object.assign({}, dealer), { companies: dealerCompanies.map((dc) => dc.company) });
        return res.json({
            success: true,
            data: dealerWithCompanies,
        });
    }
    catch (error) {
        console.error("Get dealer by ID error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getDealerById = getDealerById;
// ==================== CREATE DEALER ====================
const createDealer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ownerName, ownerPhone, ownerPassword, dealerName, dealerContact, dealerAddress, companyId, ownerStatus, } = req.body;
        // Validation
        if (!ownerName ||
            !ownerPhone ||
            !ownerPassword ||
            !dealerName ||
            !dealerContact) {
            return res.status(400).json({
                success: false,
                message: "Owner name, phone, password, dealer name, and contact are required",
            });
        }
        if (ownerPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long",
            });
        }
        // Check if phone number already exists
        const existingUser = yield prisma_1.default.user.findUnique({
            where: { phone: ownerPhone },
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
        const hashedPassword = yield bcrypt_1.default.hash(ownerPassword, 10);
        // Create user and dealer in a transaction
        const result = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Create user
            const user = yield tx.user.create({
                data: {
                    name: ownerName,
                    phone: ownerPhone,
                    password: hashedPassword,
                    role: client_1.UserRole.DEALER,
                    status: ownerStatus || client_1.UserStatus.ACTIVE,
                    language: "ENGLISH",
                    calendarType: "AD",
                },
            });
            // Create dealer
            const dealer = yield tx.dealer.create({
                data: {
                    name: dealerName,
                    contact: dealerContact,
                    address: dealerAddress || null,
                    ownerId: user.id,
                    // Don't set companyId - use DealerCompany relationship instead
                },
                include: {
                    owner: {
                        select: {
                            id: true,
                            name: true,
                            phone: true,
                            status: true,
                        },
                    },
                },
            });
            // Create DealerCompany link if companyId provided
            if (companyId) {
                yield tx.dealerCompany.create({
                    data: {
                        dealerId: dealer.id,
                        companyId: companyId,
                        connectedVia: "MANUAL",
                        connectedAt: new Date(),
                    },
                });
            }
            return dealer;
        }));
        return res.status(201).json({
            success: true,
            data: result,
            message: "Dealer created successfully",
        });
    }
    catch (error) {
        console.error("Create dealer error:", error);
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
exports.createDealer = createDealer;
// ==================== UPDATE DEALER ====================
const updateDealer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { ownerName, ownerPhone, ownerPassword, dealerName, dealerContact, dealerAddress, companyId, ownerStatus, } = req.body;
        // Check if dealer exists and has owner
        const existingDealer = yield prisma_1.default.dealer.findUnique({
            where: { id },
            include: { owner: true },
        });
        if (!existingDealer) {
            return res.status(404).json({
                success: false,
                message: "Dealer not found",
            });
        }
        if (!existingDealer.ownerId) {
            return res.status(404).json({
                success: false,
                message: "Dealer not found",
            });
        }
        // Check phone uniqueness if phone is being updated
        if (ownerPhone &&
            existingDealer.owner &&
            ownerPhone !== existingDealer.owner.phone) {
            const phoneExists = yield prisma_1.default.user.findUnique({
                where: { phone: ownerPhone },
            });
            if (phoneExists) {
                return res.status(400).json({
                    success: false,
                    message: "Phone number already registered",
                });
            }
        }
        // Validate company exists if companyId is provided
        if (companyId !== undefined && companyId !== null) {
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
        }
        // Hash password if provided
        let hashedPassword;
        if (ownerPassword) {
            if (ownerPassword.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: "Password must be at least 6 characters long",
                });
            }
            hashedPassword = yield bcrypt_1.default.hash(ownerPassword, 10);
        }
        // Update dealer and owner in a transaction
        const result = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            // Update user
            const userUpdateData = {};
            if (ownerName)
                userUpdateData.name = ownerName;
            if (ownerPhone)
                userUpdateData.phone = ownerPhone;
            if (hashedPassword)
                userUpdateData.password = hashedPassword;
            if (ownerStatus)
                userUpdateData.status = ownerStatus;
            if (Object.keys(userUpdateData).length > 0 && existingDealer.ownerId) {
                yield tx.user.update({
                    where: { id: (_a = existingDealer.ownerId) !== null && _a !== void 0 ? _a : undefined },
                    data: userUpdateData,
                });
            }
            // Update dealer
            const dealerUpdateData = {};
            if (dealerName)
                dealerUpdateData.name = dealerName;
            if (dealerContact)
                dealerUpdateData.contact = dealerContact;
            if (dealerAddress !== undefined)
                dealerUpdateData.address = dealerAddress || null;
            // Don't update companyId - use DealerCompany relationship instead
            if (Object.keys(dealerUpdateData).length > 0) {
                yield tx.dealer.update({
                    where: { id },
                    data: dealerUpdateData,
                });
            }
            // Handle company link via DealerCompany relationship
            if (companyId !== undefined) {
                if (companyId) {
                    // Create or update DealerCompany link
                    const existingLink = yield tx.dealerCompany.findUnique({
                        where: {
                            dealerId_companyId: {
                                dealerId: id,
                                companyId: companyId,
                            },
                        },
                    });
                    if (!existingLink) {
                        yield tx.dealerCompany.create({
                            data: {
                                dealerId: id,
                                companyId: companyId,
                                connectedVia: "MANUAL",
                                connectedAt: new Date(),
                            },
                        });
                    }
                }
                // If companyId is null, we leave existing links intact (admin can manually manage)
            }
            // Fetch updated dealer with owner
            const updatedDealer = yield tx.dealer.findUnique({
                where: { id },
                include: {
                    owner: {
                        select: {
                            id: true,
                            name: true,
                            phone: true,
                            status: true,
                        },
                    },
                },
            });
            return updatedDealer;
        }));
        return res.json({
            success: true,
            data: result,
            message: "Dealer updated successfully",
        });
    }
    catch (error) {
        console.error("Update dealer error:", error);
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
exports.updateDealer = updateDealer;
// ==================== DELETE DEALER ====================
const deleteDealer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Check if dealer exists and has owner
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { id },
            include: {
                owner: true,
                _count: {
                    select: {
                        products: true,
                        sales: true,
                        consignmentsFrom: true,
                        consignmentsTo: true,
                        ledgerEntries: true,
                        paymentRequests: true,
                        companySales: true,
                    },
                },
            },
        });
        if (!dealer) {
            return res.status(404).json({
                success: false,
                message: "Dealer not found",
            });
        }
        if (!dealer.ownerId) {
            return res.status(404).json({
                success: false,
                message: "Dealer not found",
            });
        }
        // Check for active consignments
        const hasActiveConsignments = yield prisma_1.default.consignmentRequest.count({
            where: {
                OR: [{ fromDealerId: id }, { toDealerId: id }],
                status: {
                    notIn: ["SETTLED", "CANCELLED", "REJECTED"],
                },
            },
        });
        if (dealer._count.products > 0 ||
            dealer._count.sales > 0 ||
            hasActiveConsignments > 0 ||
            dealer._count.paymentRequests > 0) {
            return res.status(400).json({
                success: false,
                message: "Cannot delete dealer with associated products, sales, active consignments, or payment requests. Please remove all related data first.",
            });
        }
        // Delete dealer and user in a transaction
        yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            // Delete dealer (this will cascade delete related data due to onDelete: Cascade)
            yield tx.dealer.delete({
                where: { id },
            });
            // Delete user
            if (dealer.ownerId) {
                yield tx.user.delete({
                    where: { id: (_a = dealer.ownerId) !== null && _a !== void 0 ? _a : undefined },
                });
            }
        }));
        return res.json({
            success: true,
            message: "Dealer deleted successfully",
        });
    }
    catch (error) {
        console.error("Delete dealer error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
});
exports.deleteDealer = deleteDealer;
