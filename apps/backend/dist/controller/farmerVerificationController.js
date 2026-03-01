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
exports.getArchivedDealerFarmers = exports.getArchivedFarmerDealers = exports.unarchiveDealerFarmerConnection = exports.archiveDealerFarmerConnection = exports.unarchiveFarmerDealerConnection = exports.archiveFarmerDealerConnection = exports.cancelFarmerVerificationRequest = exports.getDealerDetailsForFarmer = exports.getDealerFarmers = exports.getFarmerDealers = exports.acknowledgeFarmerRequest = exports.rejectFarmerRequest = exports.approveFarmerRequest = exports.getDealerFarmerRequests = exports.getFarmerVerificationRequests = exports.createFarmerVerificationRequest = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const client_1 = require("@prisma/client");
const dealerFarmerAccountService_1 = require("../services/dealerFarmerAccountService");
// Use type assertion for Prisma client until Prisma client is regenerated
const prismaWithVerification = prisma_1.default;
// ==================== CREATE FARMER VERIFICATION REQUEST ====================
// Used by farmers to request connection to a dealer
const createFarmerVerificationRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { dealerId } = req.body;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Validation
        if (!dealerId) {
            return res.status(400).json({
                success: false,
                message: "Dealer ID is required",
            });
        }
        // Only farmers (OWNER role) can create verification requests
        if (currentUserRole !== client_1.UserRole.OWNER) {
            return res.status(403).json({
                success: false,
                message: "Only farmers can create verification requests",
            });
        }
        // Verify dealer exists
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { id: dealerId },
        });
        if (!dealer) {
            return res.status(404).json({
                success: false,
                message: "Dealer not found",
            });
        }
        // Check if farmer already has a connection to this dealer
        const existingConnection = yield prismaWithVerification.dealerFarmer.findUnique({
            where: {
                dealerId_farmerId: {
                    dealerId: dealerId,
                    farmerId: currentUserId,
                },
            },
        });
        if (existingConnection) {
            return res.status(400).json({
                success: false,
                message: "You are already connected to this dealer",
            });
        }
        // Check if there's a pending request
        const pendingRequest = yield prismaWithVerification.farmerVerificationRequest.findFirst({
            where: {
                farmerId: currentUserId,
                dealerId: dealerId,
                status: "PENDING",
            },
        });
        if (pendingRequest) {
            return res.status(400).json({
                success: false,
                message: "You already have a pending request for this dealer",
            });
        }
        // Check for existing rejected request
        const rejectedRequest = yield prismaWithVerification.farmerVerificationRequest.findFirst({
            where: {
                farmerId: currentUserId,
                dealerId: dealerId,
                status: "REJECTED",
            },
            orderBy: { updatedAt: "desc" },
        });
        // If there's a rejected request, check restrictions and update it instead of creating new
        if (rejectedRequest) {
            // Check 3 rejection limit
            if (rejectedRequest.rejectedCount >= 3) {
                return res.status(400).json({
                    success: false,
                    message: "You have been rejected 3 times by this dealer and cannot apply again",
                });
            }
            // Check 1-hour cooldown
            if (rejectedRequest.lastRejectedAt) {
                const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
                if (rejectedRequest.lastRejectedAt > oneHourAgo) {
                    const minutesRemaining = Math.ceil((rejectedRequest.lastRejectedAt.getTime() - oneHourAgo.getTime()) /
                        (60 * 1000));
                    return res.status(400).json({
                        success: false,
                        message: `Please wait ${minutesRemaining} more minutes before retrying`,
                    });
                }
            }
            // Update the rejected request to pending (retry)
            const verificationRequest = yield prismaWithVerification.farmerVerificationRequest.update({
                where: { id: rejectedRequest.id },
                data: {
                    status: "PENDING",
                    // Keep the rejectedCount for tracking purposes
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
                    farmer: {
                        select: {
                            id: true,
                            name: true,
                            phone: true,
                        },
                    },
                },
            });
            return res.status(201).json({
                success: true,
                data: verificationRequest,
                message: "Verification request retry sent successfully",
            });
        }
        // Create new verification request (first time)
        const verificationRequest = yield prismaWithVerification.farmerVerificationRequest.create({
            data: {
                farmerId: currentUserId,
                dealerId: dealerId,
                status: "PENDING",
                rejectedCount: 0,
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
                farmer: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                    },
                },
            },
        });
        return res.status(201).json({
            success: true,
            data: verificationRequest,
            message: "Verification request created successfully",
        });
    }
    catch (error) {
        console.error("Create farmer verification request error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
});
exports.createFarmerVerificationRequest = createFarmerVerificationRequest;
// ==================== GET FARMER'S VERIFICATION REQUESTS ====================
const getFarmerVerificationRequests = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Only farmers can view their own requests
        if (currentUserRole !== client_1.UserRole.OWNER) {
            return res.status(403).json({
                success: false,
                message: "Only farmers can view their verification requests",
            });
        }
        // Get all verification requests for this farmer
        const requests = yield prismaWithVerification.farmerVerificationRequest.findMany({
            where: {
                farmerId: currentUserId,
            },
            include: {
                dealer: {
                    select: {
                        id: true,
                        name: true,
                        contact: true,
                        address: true,
                        owner: {
                            select: {
                                name: true,
                                phone: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });
        return res.json({
            success: true,
            data: requests,
        });
    }
    catch (error) {
        console.error("Get farmer verification requests error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
});
exports.getFarmerVerificationRequests = getFarmerVerificationRequests;
// ==================== GET DEALER'S FARMER VERIFICATION REQUESTS ====================
const getDealerFarmerRequests = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { status, page = 1, limit = 10, search } = req.query;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Only dealers can view farmer verification requests
        if (currentUserRole !== client_1.UserRole.DEALER) {
            return res.status(403).json({
                success: false,
                message: "Only dealers can view farmer verification requests",
            });
        }
        // Get dealer for current user
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: currentUserId },
        });
        if (!dealer) {
            return res.status(404).json({
                success: false,
                message: "Dealer account not found",
            });
        }
        const skip = (Number(page) - 1) * Number(limit);
        // Build where clause
        const where = {
            dealerId: dealer.id,
        };
        // Filter by status if provided
        if (status && ["PENDING", "APPROVED", "REJECTED"].includes(status)) {
            where.status = status;
        }
        // Search by farmer name or phone
        if (search) {
            where.farmer = {
                OR: [
                    {
                        name: {
                            contains: search,
                            mode: "insensitive",
                        },
                    },
                    {
                        phone: {
                            contains: search,
                            mode: "insensitive",
                        },
                    },
                ],
            };
        }
        const [requests, total] = yield Promise.all([
            prismaWithVerification.farmerVerificationRequest.findMany({
                where,
                skip,
                take: Number(limit),
                include: {
                    farmer: {
                        select: {
                            id: true,
                            name: true,
                            phone: true,
                            status: true,
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
            }),
            prismaWithVerification.farmerVerificationRequest.count({ where }),
        ]);
        return res.json({
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
        console.error("Get dealer farmer requests error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
});
exports.getDealerFarmerRequests = getDealerFarmerRequests;
// ==================== APPROVE FARMER VERIFICATION REQUEST ====================
const approveFarmerRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Only dealers can approve
        if (currentUserRole !== client_1.UserRole.DEALER) {
            return res.status(403).json({
                success: false,
                message: "Only dealers can approve verification requests",
            });
        }
        // Get dealer for current user
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: currentUserId },
        });
        if (!dealer) {
            return res.status(404).json({
                success: false,
                message: "Dealer account not found",
            });
        }
        // Get verification request
        const verificationRequest = yield prismaWithVerification.farmerVerificationRequest.findUnique({
            where: { id },
            include: {
                dealer: true,
                farmer: true,
            },
        });
        if (!verificationRequest) {
            return res.status(404).json({
                success: false,
                message: "Verification request not found",
            });
        }
        // Verify request belongs to this dealer
        if (verificationRequest.dealerId !== dealer.id) {
            return res.status(403).json({
                success: false,
                message: "You can only approve requests for your own dealership",
            });
        }
        // Check if already approved
        if (verificationRequest.status === "APPROVED") {
            return res.status(400).json({
                success: false,
                message: "Request is already approved",
            });
        }
        // Update request to APPROVED and create DealerFarmer relationship
        const updatedRequest = yield prismaWithVerification.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Update verification status
            const request = yield tx.farmerVerificationRequest.update({
                where: { id },
                data: {
                    status: "APPROVED",
                    rejectedCount: 0, // Clear rejection count on approval
                    lastRejectedAt: null,
                },
            });
            // Create or update DealerFarmer relationship
            const existingLink = yield tx.dealerFarmer.findUnique({
                where: {
                    dealerId_farmerId: {
                        dealerId: verificationRequest.dealerId,
                        farmerId: verificationRequest.farmerId,
                    },
                },
            });
            if (!existingLink) {
                yield tx.dealerFarmer.create({
                    data: {
                        dealerId: verificationRequest.dealerId,
                        farmerId: verificationRequest.farmerId,
                        connectedVia: "VERIFICATION",
                        connectedAt: new Date(),
                    },
                });
            }
            3; // Auto-create Customer for connected farmer
            const existingCustomer = yield tx.customer.findFirst({
                where: {
                    userId: dealer.ownerId,
                    farmerId: verificationRequest.farmerId,
                },
            });
            if (!existingCustomer) {
                yield tx.customer.create({
                    data: {
                        userId: dealer.ownerId, // Link to dealer owner
                        farmerId: verificationRequest.farmerId, // Link to farmer
                        name: verificationRequest.farmer.name,
                        phone: verificationRequest.farmer.phone,
                        source: "CONNECTED",
                        balance: 0,
                    },
                });
            }
            return request;
        }));
        return res.json({
            success: true,
            data: updatedRequest,
            message: "Verification request approved successfully",
        });
    }
    catch (error) {
        console.error("Approve farmer verification request error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
});
exports.approveFarmerRequest = approveFarmerRequest;
// ==================== REJECT FARMER VERIFICATION REQUEST ====================
const rejectFarmerRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Only dealers can reject
        if (currentUserRole !== client_1.UserRole.DEALER) {
            return res.status(403).json({
                success: false,
                message: "Only dealers can reject verification requests",
            });
        }
        // Get dealer for current user
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: currentUserId },
        });
        if (!dealer) {
            return res.status(404).json({
                success: false,
                message: "Dealer account not found",
            });
        }
        // Get verification request
        const verificationRequest = yield prismaWithVerification.farmerVerificationRequest.findUnique({
            where: { id },
        });
        if (!verificationRequest) {
            return res.status(404).json({
                success: false,
                message: "Verification request not found",
            });
        }
        // Verify request belongs to this dealer
        if (verificationRequest.dealerId !== dealer.id) {
            return res.status(403).json({
                success: false,
                message: "You can only reject requests for your own dealership",
            });
        }
        // Check if already rejected
        if (verificationRequest.status === "REJECTED") {
            return res.status(400).json({
                success: false,
                message: "Request is already rejected",
            });
        }
        // Update request to REJECTED
        const updatedRequest = yield prismaWithVerification.farmerVerificationRequest.update({
            where: { id },
            data: {
                status: "REJECTED",
                rejectedCount: verificationRequest.rejectedCount + 1,
                lastRejectedAt: new Date(),
            },
        });
        return res.json({
            success: true,
            data: updatedRequest,
            message: "Verification request rejected",
        });
    }
    catch (error) {
        console.error("Reject farmer verification request error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
});
exports.rejectFarmerRequest = rejectFarmerRequest;
// ==================== ACKNOWLEDGE FARMER VERIFICATION REQUEST ====================
const acknowledgeFarmerRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Only farmers can acknowledge their own requests
        if (currentUserRole !== client_1.UserRole.OWNER) {
            return res.status(403).json({
                success: false,
                message: "Only farmers can acknowledge verification requests",
            });
        }
        // Get verification request
        const verificationRequest = yield prismaWithVerification.farmerVerificationRequest.findUnique({
            where: { id },
        });
        if (!verificationRequest) {
            return res.status(404).json({
                success: false,
                message: "Verification request not found",
            });
        }
        // Verify request belongs to this farmer
        if (verificationRequest.farmerId !== currentUserId) {
            return res.status(403).json({
                success: false,
                message: "You can only acknowledge your own requests",
            });
        }
        // Update acknowledgedAt timestamp
        const updatedRequest = yield prismaWithVerification.farmerVerificationRequest.update({
            where: { id },
            data: {
                acknowledgedAt: new Date(),
            },
        });
        return res.json({
            success: true,
            data: updatedRequest,
            message: "Request acknowledged",
        });
    }
    catch (error) {
        console.error("Acknowledge farmer verification request error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
});
exports.acknowledgeFarmerRequest = acknowledgeFarmerRequest;
// ==================== GET FARMER'S CONNECTED DEALERS ====================
const getFarmerDealers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Only farmers can view their dealers
        if (currentUserRole !== client_1.UserRole.OWNER) {
            return res.status(403).json({
                success: false,
                message: "Only farmers can view their connected dealers",
            });
        }
        // Get all active (non-archived) dealers connected to this farmer via DealerFarmer relationship
        const dealerFarmers = yield prismaWithVerification.dealerFarmer.findMany({
            where: {
                farmerId: currentUserId,
                archivedByFarmer: false, // Only show active connections
            },
            include: {
                dealer: {
                    select: {
                        id: true,
                        name: true,
                        contact: true,
                        address: true,
                        owner: {
                            select: {
                                name: true,
                                phone: true,
                            },
                        },
                    },
                },
            },
            orderBy: { connectedAt: "desc" },
        });
        // Get account balances for this farmer (dealerId -> balance)
        const accounts = yield dealerFarmerAccountService_1.DealerFarmerAccountService.getFarmerAccounts(currentUserId);
        const balanceByDealerId = new Map(accounts.map((a) => [a.dealerId, a.balance]));
        // Extract dealers with connection info and balance
        const dealers = dealerFarmers.map((df) => {
            var _a;
            return (Object.assign(Object.assign({}, df.dealer), { connectedAt: df.connectedAt, connectedVia: df.connectedVia, dealerFarmerId: df.id, balance: (_a = balanceByDealerId.get(df.dealer.id)) !== null && _a !== void 0 ? _a : 0 }));
        });
        return res.json({
            success: true,
            data: dealers,
        });
    }
    catch (error) {
        console.error("Get farmer dealers error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
});
exports.getFarmerDealers = getFarmerDealers;
// ==================== GET DEALER'S CONNECTED FARMERS ====================
const getDealerFarmers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Only dealers can view their farmers
        if (currentUserRole !== client_1.UserRole.DEALER) {
            return res.status(403).json({
                success: false,
                message: "Only dealers can view their connected farmers",
            });
        }
        // Get dealer for current user
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: currentUserId },
        });
        if (!dealer) {
            return res.status(404).json({
                success: false,
                message: "Dealer account not found",
            });
        }
        // Get all active (non-archived) farmers connected to this dealer via DealerFarmer relationship
        const dealerFarmers = yield prismaWithVerification.dealerFarmer.findMany({
            where: {
                dealerId: dealer.id,
                archivedByDealer: false, // Only show active connections
            },
            include: {
                farmer: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        status: true,
                    },
                },
            },
            orderBy: { connectedAt: "desc" },
        });
        // Extract farmers with connection info
        const farmers = dealerFarmers.map((df) => (Object.assign(Object.assign({}, df.farmer), { connectedAt: df.connectedAt, connectedVia: df.connectedVia, dealerFarmerId: df.id })));
        return res.json({
            success: true,
            data: farmers,
        });
    }
    catch (error) {
        console.error("Get dealer farmers error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
});
exports.getDealerFarmers = getDealerFarmers;
// ==================== GET DEALER DETAILS FOR FARMER ====================
/**
 * Single route returning everything about a dealer to the authenticated farmer:
 * dealer info, account (balance/totals), sales to this dealer, and payment/statement (transactions).
 */
const getDealerDetailsForFarmer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const dealerId = req.params.dealerId;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        if (!dealerId || !currentUserId) {
            return res.status(400).json({
                success: false,
                message: "Dealer ID is required",
            });
        }
        // Only farmers can access
        if (currentUserRole !== client_1.UserRole.OWNER) {
            return res.status(403).json({
                success: false,
                message: "Only farmers can view dealer details",
            });
        }
        // Verify farmer has connection to this dealer via DealerFarmer relationship
        const dealerFarmerLink = yield prismaWithVerification.dealerFarmer.findUnique({
            where: {
                dealerId_farmerId: {
                    dealerId: dealerId,
                    farmerId: currentUserId,
                },
            },
        });
        if (!dealerFarmerLink) {
            return res.status(403).json({
                success: false,
                message: "You are not connected to this dealer",
            });
        }
        // Get dealer details
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { id: dealerId },
            select: {
                id: true,
                name: true,
                contact: true,
                address: true,
                owner: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                    },
                },
                _count: {
                    select: {
                        products: true,
                        sales: true,
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
        // Get dealer-farmer account (balance, totals)
        const accountRecord = yield dealerFarmerAccountService_1.DealerFarmerAccountService.getOrCreateAccount(dealerId, currentUserId);
        const account = {
            id: accountRecord.id,
            balance: Number(accountRecord.balance),
            totalSales: Number(accountRecord.totalSales),
            totalPayments: Number(accountRecord.totalPayments),
            lastSaleDate: accountRecord.lastSaleDate,
            lastPaymentDate: accountRecord.lastPaymentDate,
            balanceLimit: accountRecord.balanceLimit != null
                ? Number(accountRecord.balanceLimit)
                : null,
        };
        // Get full statement (sales + payments, merged as transactions) - one call
        const statement = yield dealerFarmerAccountService_1.DealerFarmerAccountService.getAccountStatement({
            dealerId: dealerId,
            farmerId: currentUserId,
            page: 1,
            limit: 500,
        });
        return res.json({
            success: true,
            data: {
                dealer,
                account,
                sales: statement.sales,
                payments: statement.payments,
                transactions: statement.transactions,
                statementPagination: statement.pagination,
            },
        });
    }
    catch (error) {
        console.error("Get dealer details for farmer error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
});
exports.getDealerDetailsForFarmer = getDealerDetailsForFarmer;
// ==================== CANCEL FARMER VERIFICATION REQUEST ====================
const cancelFarmerVerificationRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { requestId } = req.params;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Only farmers can cancel their own requests
        if (currentUserRole !== client_1.UserRole.OWNER) {
            return res.status(403).json({
                success: false,
                message: "Only farmers can cancel verification requests",
            });
        }
        // Get the request
        const request = yield prismaWithVerification.farmerVerificationRequest.findUnique({
            where: { id: requestId },
        });
        if (!request) {
            return res.status(404).json({
                success: false,
                message: "Verification request not found",
            });
        }
        // Check ownership
        if (request.farmerId !== currentUserId) {
            return res.status(403).json({
                success: false,
                message: "You can only cancel your own verification requests",
            });
        }
        // Only pending requests can be cancelled
        if (request.status !== "PENDING") {
            return res.status(400).json({
                success: false,
                message: "Only pending requests can be cancelled",
            });
        }
        // Delete the request
        yield prismaWithVerification.farmerVerificationRequest.delete({
            where: { id: requestId },
        });
        return res.json({
            success: true,
            message: "Verification request cancelled successfully",
        });
    }
    catch (error) {
        console.error("Cancel farmer verification request error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
});
exports.cancelFarmerVerificationRequest = cancelFarmerVerificationRequest;
// ==================== ARCHIVE FARMER-DEALER CONNECTION ====================
const archiveFarmerDealerConnection = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { connectionId } = req.params;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Only farmers can archive from their side
        if (currentUserRole !== client_1.UserRole.OWNER) {
            return res.status(403).json({
                success: false,
                message: "Only farmers can archive dealer connections",
            });
        }
        // Get the connection
        const connection = yield prismaWithVerification.dealerFarmer.findUnique({
            where: { id: connectionId },
        });
        if (!connection) {
            return res.status(404).json({
                success: false,
                message: "Connection not found",
            });
        }
        // Check ownership
        if (connection.farmerId !== currentUserId) {
            return res.status(403).json({
                success: false,
                message: "You can only archive your own connections",
            });
        }
        // Archive the connection
        yield prismaWithVerification.dealerFarmer.update({
            where: { id: connectionId },
            data: { archivedByFarmer: true },
        });
        return res.json({
            success: true,
            message: "Connection archived successfully",
        });
    }
    catch (error) {
        console.error("Archive farmer-dealer connection error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
});
exports.archiveFarmerDealerConnection = archiveFarmerDealerConnection;
// ==================== UNARCHIVE FARMER-DEALER CONNECTION ====================
const unarchiveFarmerDealerConnection = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { connectionId } = req.params;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Only farmers can unarchive from their side
        if (currentUserRole !== client_1.UserRole.OWNER) {
            return res.status(403).json({
                success: false,
                message: "Only farmers can unarchive dealer connections",
            });
        }
        // Get the connection
        const connection = yield prismaWithVerification.dealerFarmer.findUnique({
            where: { id: connectionId },
        });
        if (!connection) {
            return res.status(404).json({
                success: false,
                message: "Connection not found",
            });
        }
        // Check ownership
        if (connection.farmerId !== currentUserId) {
            return res.status(403).json({
                success: false,
                message: "You can only unarchive your own connections",
            });
        }
        // Unarchive the connection
        yield prismaWithVerification.dealerFarmer.update({
            where: { id: connectionId },
            data: { archivedByFarmer: false },
        });
        return res.json({
            success: true,
            message: "Connection restored successfully",
        });
    }
    catch (error) {
        console.error("Unarchive farmer-dealer connection error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
});
exports.unarchiveFarmerDealerConnection = unarchiveFarmerDealerConnection;
// ==================== ARCHIVE DEALER-FARMER CONNECTION ====================
const archiveDealerFarmerConnection = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { connectionId } = req.params;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Only dealers can archive from their side
        if (currentUserRole !== client_1.UserRole.DEALER) {
            return res.status(403).json({
                success: false,
                message: "Only dealers can archive farmer connections",
            });
        }
        // Get dealer for current user
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: currentUserId },
        });
        if (!dealer) {
            return res.status(404).json({
                success: false,
                message: "Dealer account not found",
            });
        }
        // Get the connection
        const connection = yield prismaWithVerification.dealerFarmer.findUnique({
            where: { id: connectionId },
        });
        if (!connection) {
            return res.status(404).json({
                success: false,
                message: "Connection not found",
            });
        }
        // Check ownership
        if (connection.dealerId !== dealer.id) {
            return res.status(403).json({
                success: false,
                message: "You can only archive your own connections",
            });
        }
        // Archive the connection
        yield prismaWithVerification.dealerFarmer.update({
            where: { id: connectionId },
            data: { archivedByDealer: true },
        });
        return res.json({
            success: true,
            message: "Connection archived successfully",
        });
    }
    catch (error) {
        console.error("Archive dealer-farmer connection error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
});
exports.archiveDealerFarmerConnection = archiveDealerFarmerConnection;
// ==================== UNARCHIVE DEALER-FARMER CONNECTION ====================
const unarchiveDealerFarmerConnection = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { connectionId } = req.params;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Only dealers can unarchive from their side
        if (currentUserRole !== client_1.UserRole.DEALER) {
            return res.status(403).json({
                success: false,
                message: "Only dealers can unarchive farmer connections",
            });
        }
        // Get dealer for current user
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: currentUserId },
        });
        if (!dealer) {
            return res.status(404).json({
                success: false,
                message: "Dealer account not found",
            });
        }
        // Get the connection
        const connection = yield prismaWithVerification.dealerFarmer.findUnique({
            where: { id: connectionId },
        });
        if (!connection) {
            return res.status(404).json({
                success: false,
                message: "Connection not found",
            });
        }
        // Check ownership
        if (connection.dealerId !== dealer.id) {
            return res.status(403).json({
                success: false,
                message: "You can only unarchive your own connections",
            });
        }
        // Unarchive the connection
        yield prismaWithVerification.dealerFarmer.update({
            where: { id: connectionId },
            data: { archivedByDealer: false },
        });
        return res.json({
            success: true,
            message: "Connection restored successfully",
        });
    }
    catch (error) {
        console.error("Unarchive dealer-farmer connection error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
});
exports.unarchiveDealerFarmerConnection = unarchiveDealerFarmerConnection;
// ==================== GET ARCHIVED FARMER DEALERS ====================
const getArchivedFarmerDealers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Only farmers can access
        if (currentUserRole !== client_1.UserRole.OWNER) {
            return res.status(403).json({
                success: false,
                message: "Only farmers can view archived dealers",
            });
        }
        // Get archived dealers
        const archivedConnections = yield prismaWithVerification.dealerFarmer.findMany({
            where: {
                farmerId: currentUserId,
                archivedByFarmer: true,
            },
            include: {
                dealer: {
                    select: {
                        id: true,
                        name: true,
                        contact: true,
                        address: true,
                        owner: {
                            select: {
                                name: true,
                                phone: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                updatedAt: "desc",
            },
        });
        // Format the response
        const dealers = archivedConnections.map((connection) => ({
            id: connection.dealer.id,
            name: connection.dealer.name,
            contact: connection.dealer.contact,
            address: connection.dealer.address,
            connectedAt: connection.connectedAt,
            connectedVia: connection.connectedVia,
            dealerFarmerId: connection.id,
            owner: connection.dealer.owner,
        }));
        return res.json({
            success: true,
            data: dealers,
        });
    }
    catch (error) {
        console.error("Get archived farmer dealers error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
});
exports.getArchivedFarmerDealers = getArchivedFarmerDealers;
// ==================== GET ARCHIVED DEALER FARMERS ====================
const getArchivedDealerFarmers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Only dealers can access
        if (currentUserRole !== client_1.UserRole.DEALER) {
            return res.status(403).json({
                success: false,
                message: "Only dealers can view archived farmers",
            });
        }
        // Get dealer for current user
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: currentUserId },
        });
        if (!dealer) {
            return res.status(404).json({
                success: false,
                message: "Dealer account not found",
            });
        }
        // Get archived farmers
        const archivedConnections = yield prismaWithVerification.dealerFarmer.findMany({
            where: {
                dealerId: dealer.id,
                archivedByDealer: true,
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
            },
            orderBy: {
                updatedAt: "desc",
            },
        });
        // Format the response
        const farmers = archivedConnections.map((connection) => ({
            id: connection.farmer.id,
            name: connection.farmer.name,
            phone: connection.farmer.phone,
            farmName: connection.farmer.companyName,
            location: connection.farmer.CompanyFarmLocation,
            connectedAt: connection.connectedAt,
            connectedVia: connection.connectedVia,
            dealerFarmerId: connection.id,
        }));
        return res.json({
            success: true,
            data: farmers,
        });
    }
    catch (error) {
        console.error("Get archived dealer farmers error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
});
exports.getArchivedDealerFarmers = getArchivedDealerFarmers;
