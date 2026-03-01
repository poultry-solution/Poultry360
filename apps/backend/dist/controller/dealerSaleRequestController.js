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
exports.getFarmerSaleRequestStatistics = exports.rejectSaleRequest = exports.approveSaleRequest = exports.getFarmerSaleRequestById = exports.getFarmerSaleRequests = exports.getSaleRequestStatistics = exports.getSaleRequestById = exports.getSaleRequests = exports.createSaleRequest = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const dealerSaleRequestService_1 = require("../services/dealerSaleRequestService");
// ==================== CREATE SALE REQUEST ====================
const createSaleRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { customerId, items, paidAmount, paymentMethod, notes, date, discount, } = req.body;
        // Validation
        if (!items || items.length === 0) {
            return res.status(400).json({
                message: "At least one item is required",
            });
        }
        if (!customerId) {
            return res.status(400).json({
                message: "Customer ID is required",
            });
        }
        if (paidAmount < 0) {
            return res.status(400).json({
                message: "Paid amount cannot be negative",
            });
        }
        // Get the dealer record
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        // Get customer to verify it has farmerId (connected farmer)
        const customer = yield prisma_1.default.customer.findUnique({
            where: { id: customerId },
        });
        if (!customer) {
            return res.status(404).json({ message: "Customer not found" });
        }
        if (!customer.farmerId) {
            return res.status(400).json({
                message: "Sale requests are only for connected farmers. This customer is not linked to a farmer.",
            });
        }
        // Create sale request using service
        const request = yield dealerSaleRequestService_1.DealerSaleRequestService.createSaleRequest({
            dealerId: dealer.id,
            customerId,
            farmerId: customer.farmerId,
            items,
            paidAmount: Number(paidAmount),
            paymentMethod,
            notes,
            date: date ? new Date(date) : new Date(),
            discount: (discount === null || discount === void 0 ? void 0 : discount.value) > 0
                ? { type: discount.type, value: Number(discount.value) }
                : undefined,
        });
        return res.status(201).json({
            success: true,
            data: request,
            message: "Sale request created successfully. Waiting for farmer approval.",
        });
    }
    catch (error) {
        console.error("Create sale request error:", error);
        return res.status(400).json({ message: error.message || "Internal server error" });
    }
});
exports.createSaleRequest = createSaleRequest;
// ==================== GET SALE REQUESTS (DEALER VIEW) ====================
const getSaleRequests = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { page = 1, limit = 10, search, status, startDate, endDate, farmerId, } = req.query;
        // Get the dealer record
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        const skip = (Number(page) - 1) * Number(limit);
        // Build where clause
        const where = {
            dealerId: dealer.id,
        };
        if (search) {
            where.OR = [
                { requestNumber: { contains: search, mode: "insensitive" } },
                { notes: { contains: search, mode: "insensitive" } },
            ];
        }
        if (status) {
            where.status = status;
        }
        if (startDate || endDate) {
            where.date = {};
            if (startDate)
                where.date.gte = new Date(startDate);
            if (endDate)
                where.date.lte = new Date(endDate);
        }
        if (farmerId) {
            where.farmerId = farmerId;
        }
        const [requests, total] = yield Promise.all([
            prisma_1.default.dealerSaleRequest.findMany({
                where,
                skip,
                take: Number(limit),
                orderBy: { createdAt: "desc" },
                include: {
                    farmer: {
                        select: {
                            id: true,
                            name: true,
                            phone: true,
                            companyName: true,
                        },
                    },
                    customer: {
                        select: {
                            id: true,
                            name: true,
                            phone: true,
                        },
                    },
                    items: {
                        include: {
                            product: {
                                select: {
                                    id: true,
                                    name: true,
                                    type: true,
                                    unit: true,
                                },
                            },
                        },
                    },
                    dealerSale: {
                        select: {
                            id: true,
                            invoiceNumber: true,
                        },
                    },
                },
            }),
            prisma_1.default.dealerSaleRequest.count({ where }),
        ]);
        return res.status(200).json({
            success: true,
            data: requests,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error("Get sale requests error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getSaleRequests = getSaleRequests;
// ==================== GET SALE REQUEST BY ID ====================
const getSaleRequestById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { id } = req.params;
        // Get the dealer record
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        const request = yield prisma_1.default.dealerSaleRequest.findFirst({
            where: {
                id,
                dealerId: dealer.id,
            },
            include: {
                farmer: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        companyName: true,
                        CompanyFarmLocation: true,
                    },
                },
                customer: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        address: true,
                    },
                },
                items: {
                    include: {
                        product: true,
                    },
                },
                dealerSale: {
                    select: {
                        id: true,
                        invoiceNumber: true,
                        date: true,
                        totalAmount: true,
                        paidAmount: true,
                        dueAmount: true,
                    },
                },
                dealer: {
                    select: {
                        id: true,
                        name: true,
                        contact: true,
                        address: true,
                    },
                },
            },
        });
        if (!request) {
            return res.status(404).json({ message: "Sale request not found" });
        }
        return res.status(200).json({
            success: true,
            data: request,
        });
    }
    catch (error) {
        console.error("Get sale request by ID error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getSaleRequestById = getSaleRequestById;
// ==================== GET SALE REQUEST STATISTICS ====================
const getSaleRequestStatistics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        // Get the dealer record
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        const [pending, approved, rejected, totalRequests] = yield Promise.all([
            prisma_1.default.dealerSaleRequest.count({
                where: { dealerId: dealer.id, status: "PENDING" },
            }),
            prisma_1.default.dealerSaleRequest.count({
                where: { dealerId: dealer.id, status: "APPROVED" },
            }),
            prisma_1.default.dealerSaleRequest.count({
                where: { dealerId: dealer.id, status: "REJECTED" },
            }),
            prisma_1.default.dealerSaleRequest.count({
                where: { dealerId: dealer.id },
            }),
        ]);
        // Get total amount of pending requests
        const pendingRequests = yield prisma_1.default.dealerSaleRequest.findMany({
            where: { dealerId: dealer.id, status: "PENDING" },
            select: { totalAmount: true },
        });
        const pendingAmount = pendingRequests.reduce((sum, req) => sum + Number(req.totalAmount), 0);
        return res.status(200).json({
            success: true,
            data: {
                pending,
                approved,
                rejected,
                total: totalRequests,
                pendingAmount,
            },
        });
    }
    catch (error) {
        console.error("Get sale request statistics error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getSaleRequestStatistics = getSaleRequestStatistics;
// ==================== FARMER-SIDE ENDPOINTS ====================
// ==================== GET FARMER SALE REQUESTS ====================
const getFarmerSaleRequests = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId; // This is the farmer's user ID
        const { page = 1, limit = 10, status, startDate, endDate, dealerId, } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        // Build where clause
        const where = {
            farmerId: userId,
        };
        if (status) {
            where.status = status;
        }
        if (startDate || endDate) {
            where.date = {};
            if (startDate)
                where.date.gte = new Date(startDate);
            if (endDate)
                where.date.lte = new Date(endDate);
        }
        if (dealerId) {
            where.dealerId = dealerId;
        }
        const [requests, total] = yield Promise.all([
            prisma_1.default.dealerSaleRequest.findMany({
                where,
                skip,
                take: Number(limit),
                orderBy: { createdAt: "desc" },
                include: {
                    dealer: {
                        select: {
                            id: true,
                            name: true,
                            contact: true,
                            address: true,
                        },
                    },
                    items: {
                        include: {
                            product: {
                                select: {
                                    id: true,
                                    name: true,
                                    type: true,
                                    unit: true,
                                },
                            },
                        },
                    },
                    dealerSale: {
                        select: {
                            id: true,
                            invoiceNumber: true,
                        },
                    },
                },
            }),
            prisma_1.default.dealerSaleRequest.count({ where }),
        ]);
        return res.status(200).json({
            success: true,
            data: requests,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error("Get farmer sale requests error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getFarmerSaleRequests = getFarmerSaleRequests;
// ==================== GET FARMER SALE REQUEST BY ID ====================
const getFarmerSaleRequestById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId; // Farmer's user ID
        const { id } = req.params;
        const request = yield prisma_1.default.dealerSaleRequest.findFirst({
            where: {
                id,
                farmerId: userId,
            },
            include: {
                dealer: {
                    select: {
                        id: true,
                        name: true,
                        contact: true,
                        address: true,
                    },
                },
                items: {
                    include: {
                        product: true,
                    },
                },
                dealerSale: {
                    select: {
                        id: true,
                        invoiceNumber: true,
                        date: true,
                        totalAmount: true,
                        paidAmount: true,
                        dueAmount: true,
                    },
                },
            },
        });
        if (!request) {
            return res.status(404).json({ message: "Sale request not found" });
        }
        return res.status(200).json({
            success: true,
            data: request,
        });
    }
    catch (error) {
        console.error("Get farmer sale request by ID error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getFarmerSaleRequestById = getFarmerSaleRequestById;
// ==================== APPROVE SALE REQUEST ====================
const approveSaleRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId; // Farmer's user ID
        const { id } = req.params;
        const { purchaseCategory } = req.body || {};
        // Approve using service
        const sale = yield dealerSaleRequestService_1.DealerSaleRequestService.approveSaleRequest({
            requestId: id,
            farmerId: userId,
            purchaseCategory: purchaseCategory || undefined,
        });
        return res.status(200).json({
            success: true,
            data: sale,
            message: "Sale request approved successfully. Purchase has been added to your account.",
        });
    }
    catch (error) {
        console.error("Approve sale request error:", error);
        return res.status(400).json({ message: error.message || "Internal server error" });
    }
});
exports.approveSaleRequest = approveSaleRequest;
// ==================== REJECT SALE REQUEST ====================
const rejectSaleRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId; // Farmer's user ID
        const { id } = req.params;
        const { rejectionReason } = req.body;
        // Reject using service
        const request = yield dealerSaleRequestService_1.DealerSaleRequestService.rejectSaleRequest({
            requestId: id,
            farmerId: userId,
            rejectionReason,
        });
        return res.status(200).json({
            success: true,
            data: request,
            message: "Sale request rejected successfully.",
        });
    }
    catch (error) {
        console.error("Reject sale request error:", error);
        return res.status(400).json({ message: error.message || "Internal server error" });
    }
});
exports.rejectSaleRequest = rejectSaleRequest;
// ==================== GET FARMER SALE REQUEST STATISTICS ====================
const getFarmerSaleRequestStatistics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId; // Farmer's user ID
        const [pending, approved, rejected, totalRequests] = yield Promise.all([
            prisma_1.default.dealerSaleRequest.count({
                where: { farmerId: userId, status: "PENDING" },
            }),
            prisma_1.default.dealerSaleRequest.count({
                where: { farmerId: userId, status: "APPROVED" },
            }),
            prisma_1.default.dealerSaleRequest.count({
                where: { farmerId: userId, status: "REJECTED" },
            }),
            prisma_1.default.dealerSaleRequest.count({
                where: { farmerId: userId },
            }),
        ]);
        // Get total amount of pending requests
        const pendingRequests = yield prisma_1.default.dealerSaleRequest.findMany({
            where: { farmerId: userId, status: "PENDING" },
            select: { totalAmount: true },
        });
        const pendingAmount = pendingRequests.reduce((sum, req) => sum + Number(req.totalAmount), 0);
        return res.status(200).json({
            success: true,
            data: {
                pending,
                approved,
                rejected,
                total: totalRequests,
                pendingAmount,
            },
        });
    }
    catch (error) {
        console.error("Get farmer sale request statistics error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getFarmerSaleRequestStatistics = getFarmerSaleRequestStatistics;
