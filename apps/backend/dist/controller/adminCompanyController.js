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
exports.deleteCompany = exports.updateCompany = exports.createCompany = exports.getCompanyById = exports.getAllCompanies = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
// ==================== GET ALL COMPANIES ====================
const getAllCompanies = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = 1, limit = 10, search, status } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        // Build where clause
        const where = {
            owner: {
                role: client_1.UserRole.COMPANY,
            },
        };
        // Filter by owner status
        if (status) {
            where.owner = Object.assign(Object.assign({}, where.owner), { status: status });
        }
        // Search by company name, owner name, or owner phone
        if (search) {
            where.AND = [
                {
                    OR: [
                        { name: { contains: search, mode: "insensitive" } },
                        { owner: { name: { contains: search, mode: "insensitive" } } },
                        { owner: { phone: { contains: search, mode: "insensitive" } } },
                    ],
                },
            ];
        }
        const [companies, total] = yield Promise.all([
            prisma_1.default.company.findMany({
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
                    _count: {
                        select: {
                            dealerCompanies: true,
                            companySales: true,
                            consignments: true,
                            ledgerEntries: true,
                        },
                    },
                },
            }),
            prisma_1.default.company.count({ where }),
        ]);
        return res.json({
            success: true,
            data: companies,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error("Get all companies error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getAllCompanies = getAllCompanies;
// ==================== GET COMPANY BY ID ====================
const getCompanyById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const company = yield prisma_1.default.company.findUnique({
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
                        companySales: true,
                        consignments: true,
                        ledgerEntries: true,
                        paymentRequests: true,
                    },
                },
                managedBy: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        status: true,
                    },
                },
            },
        });
        if (!company) {
            return res.status(404).json({ message: "Company not found" });
        }
        return res.json({
            success: true,
            data: company,
        });
    }
    catch (error) {
        console.error("Get company by ID error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getCompanyById = getCompanyById;
// ==================== CREATE COMPANY ====================
const createCompany = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ownerName, ownerPhone, ownerPassword, companyName, companyAddress, ownerStatus, } = req.body;
        // Validation
        if (!ownerName || !ownerPhone || !ownerPassword || !companyName) {
            return res.status(400).json({
                success: false,
                message: "Owner name, phone, password, and company name are required",
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
        // Hash password
        const hashedPassword = yield bcrypt_1.default.hash(ownerPassword, 10);
        // Create user and company in a transaction
        const result = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Create user
            const user = yield tx.user.create({
                data: {
                    name: ownerName,
                    phone: ownerPhone,
                    password: hashedPassword,
                    role: client_1.UserRole.COMPANY,
                    status: ownerStatus || client_1.UserStatus.ACTIVE,
                    language: "ENGLISH",
                    calendarType: "AD",
                },
            });
            // Create company
            const company = yield tx.company.create({
                data: {
                    name: companyName,
                    address: companyAddress || null,
                    ownerId: user.id,
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
            return company;
        }));
        return res.status(201).json({
            success: true,
            data: result,
            message: "Company created successfully",
        });
    }
    catch (error) {
        console.error("Create company error:", error);
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
exports.createCompany = createCompany;
// ==================== UPDATE COMPANY ====================
const updateCompany = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { ownerName, ownerPhone, ownerPassword, companyName, companyAddress, ownerStatus, } = req.body;
        // Check if company exists
        const existingCompany = yield prisma_1.default.company.findUnique({
            where: { id },
            include: { owner: true },
        });
        if (!existingCompany) {
            return res.status(404).json({
                success: false,
                message: "Company not found",
            });
        }
        // Check phone uniqueness if phone is being updated
        if (ownerPhone && ownerPhone !== existingCompany.owner.phone) {
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
        // Update company and owner in a transaction
        const result = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
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
            if (Object.keys(userUpdateData).length > 0) {
                yield tx.user.update({
                    where: { id: existingCompany.ownerId },
                    data: userUpdateData,
                });
            }
            // Update company
            const companyUpdateData = {};
            if (companyName)
                companyUpdateData.name = companyName;
            if (companyAddress !== undefined)
                companyUpdateData.address = companyAddress || null;
            if (Object.keys(companyUpdateData).length > 0) {
                yield tx.company.update({
                    where: { id },
                    data: companyUpdateData,
                });
            }
            // Fetch updated company with owner
            const updatedCompany = yield tx.company.findUnique({
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
            return updatedCompany;
        }));
        return res.json({
            success: true,
            data: result,
            message: "Company updated successfully",
        });
    }
    catch (error) {
        console.error("Update company error:", error);
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
exports.updateCompany = updateCompany;
// ==================== DELETE COMPANY ====================
const deleteCompany = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        // Check if company exists
        const company = yield prisma_1.default.company.findUnique({
            where: { id },
            include: {
                owner: true,
                dealerCompanies: {
                    select: {
                        id: true,
                    },
                },
                _count: {
                    select: {
                        companySales: true,
                        dealerCompanies: true,
                        consignments: true,
                        ledgerEntries: true,
                        paymentRequests: true,
                    },
                },
            },
        });
        if (!company) {
            return res.status(404).json({
                success: false,
                message: "Company not found",
            });
        }
        // Check for related data
        const hasProducts = yield prisma_1.default.product.count({
            where: { supplierId: company.ownerId },
        });
        // Check for active consignments
        const dealerIds = ((_a = company.dealers) === null || _a === void 0 ? void 0 : _a.map((d) => d.id)) || [];
        const hasActiveConsignments = yield prisma_1.default.consignmentRequest.count({
            where: {
                OR: [
                    { fromCompanyId: id },
                    ...(dealerIds.length > 0 ? [{ toDealerId: { in: dealerIds } }] : []),
                ],
                status: {
                    notIn: ["SETTLED", "CANCELLED", "REJECTED"],
                },
            },
        });
        if (hasProducts > 0 ||
            company._count.companySales > 0 ||
            hasActiveConsignments > 0 ||
            company._count.dealerCompanies > 0) {
            return res.status(400).json({
                success: false,
                message: "Cannot delete company with associated products, sales, active consignments, or dealers. Please remove all related data first.",
            });
        }
        // Delete company and user in a transaction
        yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Delete company (this will cascade delete related data due to onDelete: Cascade)
            yield tx.company.delete({
                where: { id },
            });
            // Delete user
            yield tx.user.delete({
                where: { id: company.ownerId },
            });
        }));
        return res.json({
            success: true,
            message: "Company deleted successfully",
        });
    }
    catch (error) {
        console.error("Delete company error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
});
exports.deleteCompany = deleteCompany;
