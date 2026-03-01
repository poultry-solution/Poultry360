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
exports.getArchivedCompanyDealers = exports.getArchivedDealerCompanies = exports.unarchiveCompanyDealerConnection = exports.archiveCompanyDealerConnection = exports.unarchiveDealerCompanyConnection = exports.archiveDealerCompanyConnection = exports.cancelVerificationRequest = exports.getCompanyDetailsForDealer = exports.getDealerCompanies = exports.acknowledgeVerificationRequest = exports.rejectVerificationRequest = exports.approveVerificationRequest = exports.getCompanyVerificationRequests = exports.getDealerVerificationRequests = exports.createVerificationRequest = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const client_1 = require("@prisma/client");
// Use type assertion for Prisma client until Prisma client is regenerated
const prismaWithVerification = prisma_1.default;
// ==================== CREATE VERIFICATION REQUEST ====================
// Used during dealer signup and retry
const createVerificationRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyId } = req.body;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Validation
        if (!companyId) {
            return res.status(400).json({
                success: false,
                message: "Company ID is required",
            });
        }
        // Get dealer for current user
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: currentUserId },
            include: {
                owner: true,
            },
        });
        if (!dealer) {
            return res.status(404).json({
                success: false,
                message: "Dealer account not found",
            });
        }
        // Only dealers can create verification requests
        if (currentUserRole !== client_1.UserRole.DEALER) {
            return res.status(403).json({
                success: false,
                message: "Only dealers can create verification requests",
            });
        }
        // Verify company exists
        const company = yield prisma_1.default.company.findUnique({
            where: { id: companyId },
        });
        if (!company) {
            return res.status(404).json({
                success: false,
                message: "Company not found",
            });
        }
        // Check if dealer already has an approved request for this company
        const approvedRequest = yield prismaWithVerification.dealerVerificationRequest.findFirst({
            where: {
                dealerId: dealer.id,
                companyId: companyId,
                status: "APPROVED",
            },
        });
        if (approvedRequest) {
            return res.status(400).json({
                success: false,
                message: "You are already approved and connected to this company",
            });
        }
        // Check if there's a pending request
        const pendingRequest = yield prismaWithVerification.dealerVerificationRequest.findFirst({
            where: {
                dealerId: dealer.id,
                companyId: companyId,
                status: "PENDING",
            },
        });
        if (pendingRequest) {
            return res.status(400).json({
                success: false,
                message: "You already have a pending request for this company",
            });
        }
        // Check for existing rejected request
        const rejectedRequest = yield prismaWithVerification.dealerVerificationRequest.findFirst({
            where: {
                dealerId: dealer.id,
                companyId: companyId,
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
                    message: "You have been rejected 3 times by this company and cannot apply again",
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
            const verificationRequest = yield prismaWithVerification.dealerVerificationRequest.update({
                where: { id: rejectedRequest.id },
                data: {
                    status: "PENDING",
                    // Keep the rejectedCount for tracking purposes
                },
                include: {
                    company: {
                        select: {
                            id: true,
                            name: true,
                            address: true,
                        },
                    },
                    dealer: {
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
        const verificationRequest = yield prismaWithVerification.dealerVerificationRequest.create({
            data: {
                dealerId: dealer.id,
                companyId: companyId,
                status: "PENDING",
                rejectedCount: 0,
            },
            include: {
                company: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                    },
                },
                dealer: {
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
        console.error("Create verification request error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
});
exports.createVerificationRequest = createVerificationRequest;
// ==================== GET DEALER'S VERIFICATION REQUESTS ====================
const getDealerVerificationRequests = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Only dealers can view their own requests
        if (currentUserRole !== client_1.UserRole.DEALER) {
            return res.status(403).json({
                success: false,
                message: "Only dealers can view their verification requests",
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
        // Get all verification requests for this dealer
        const requests = yield prismaWithVerification.dealerVerificationRequest.findMany({
            where: {
                dealerId: dealer.id,
            },
            include: {
                company: {
                    select: {
                        id: true,
                        name: true,
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
        console.error("Get dealer verification requests error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
});
exports.getDealerVerificationRequests = getDealerVerificationRequests;
// ==================== GET COMPANY'S VERIFICATION REQUESTS ====================
const getCompanyVerificationRequests = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { status, page = 1, limit = 10, search } = req.query;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Only company admins can view verification requests
        if (currentUserRole !== client_1.UserRole.COMPANY) {
            return res.status(403).json({
                success: false,
                message: "Only company admins can view verification requests",
            });
        }
        // Get company for current user
        const company = yield prisma_1.default.company.findUnique({
            where: { ownerId: currentUserId },
        });
        if (!company) {
            return res.status(404).json({
                success: false,
                message: "Company account not found",
            });
        }
        const skip = (Number(page) - 1) * Number(limit);
        // Build where clause
        const where = {
            companyId: company.id,
        };
        // Filter by status if provided
        if (status && ["PENDING", "APPROVED", "REJECTED"].includes(status)) {
            where.status = status;
        }
        // Search by dealer name or owner name
        if (search) {
            where.OR = [
                {
                    dealer: {
                        name: {
                            contains: search,
                            mode: "insensitive",
                        },
                    },
                },
                {
                    dealer: {
                        owner: {
                            name: {
                                contains: search,
                                mode: "insensitive",
                            },
                        },
                    },
                },
                {
                    dealer: {
                        contact: {
                            contains: search,
                            mode: "insensitive",
                        },
                    },
                },
            ];
        }
        const [requests, total] = yield Promise.all([
            prismaWithVerification.dealerVerificationRequest.findMany({
                where,
                skip,
                take: Number(limit),
                include: {
                    dealer: {
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
                                    status: true,
                                },
                            },
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
            }),
            prismaWithVerification.dealerVerificationRequest.count({ where }),
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
        console.error("Get company verification requests error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
});
exports.getCompanyVerificationRequests = getCompanyVerificationRequests;
// ==================== APPROVE VERIFICATION REQUEST ====================
const approveVerificationRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { balanceLimit } = req.body;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Only company admins can approve
        if (currentUserRole !== client_1.UserRole.COMPANY) {
            return res.status(403).json({
                success: false,
                message: "Only company admins can approve verification requests",
            });
        }
        // Get company for current user
        const company = yield prisma_1.default.company.findUnique({
            where: { ownerId: currentUserId },
        });
        if (!company) {
            return res.status(404).json({
                success: false,
                message: "Company account not found",
            });
        }
        // Get verification request
        const verificationRequest = yield prismaWithVerification.dealerVerificationRequest.findUnique({
            where: { id },
            include: {
                dealer: true,
                company: true,
            },
        });
        if (!verificationRequest) {
            return res.status(404).json({
                success: false,
                message: "Verification request not found",
            });
        }
        // Verify request belongs to this company
        if (verificationRequest.companyId !== company.id) {
            return res.status(403).json({
                success: false,
                message: "You can only approve requests for your own company",
            });
        }
        // Check if already approved
        if (verificationRequest.status === "APPROVED") {
            return res.status(400).json({
                success: false,
                message: "Request is already approved",
            });
        }
        // Update request to APPROVED and create DealerCompany relationship
        const updatedRequest = yield prismaWithVerification.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Update verification status
            const request = yield tx.dealerVerificationRequest.update({
                where: { id },
                data: {
                    status: "APPROVED",
                    rejectedCount: 0, // Clear rejection count on approval
                    lastRejectedAt: null,
                },
            });
            // Create or update DealerCompany relationship
            const existingLink = yield tx.dealerCompany.findUnique({
                where: {
                    dealerId_companyId: {
                        dealerId: verificationRequest.dealerId,
                        companyId: verificationRequest.companyId,
                    },
                },
            });
            if (!existingLink) {
                yield tx.dealerCompany.create({
                    data: {
                        dealerId: verificationRequest.dealerId,
                        companyId: verificationRequest.companyId,
                        connectedVia: "VERIFICATION",
                        connectedAt: new Date(),
                    },
                });
            }
            // Set balance limit if provided
            if (balanceLimit !== undefined) {
                const limitValue = balanceLimit === null || balanceLimit === "" ? null : Number(balanceLimit);
                yield tx.companyDealerAccount.upsert({
                    where: {
                        companyId_dealerId: {
                            companyId: verificationRequest.companyId,
                            dealerId: verificationRequest.dealerId,
                        },
                    },
                    update: {
                        balanceLimit: limitValue !== null ? new client_1.Prisma.Decimal(limitValue) : null,
                        balanceLimitSetAt: new Date(),
                        balanceLimitSetBy: currentUserId,
                    },
                    create: {
                        companyId: verificationRequest.companyId,
                        dealerId: verificationRequest.dealerId,
                        balance: new client_1.Prisma.Decimal(0),
                        totalSales: new client_1.Prisma.Decimal(0),
                        totalPayments: new client_1.Prisma.Decimal(0),
                        balanceLimit: limitValue !== null ? new client_1.Prisma.Decimal(limitValue) : null,
                        balanceLimitSetAt: new Date(),
                        balanceLimitSetBy: currentUserId,
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
        console.error("Approve verification request error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
});
exports.approveVerificationRequest = approveVerificationRequest;
// ==================== REJECT VERIFICATION REQUEST ====================
const rejectVerificationRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Only company admins can reject
        if (currentUserRole !== client_1.UserRole.COMPANY) {
            return res.status(403).json({
                success: false,
                message: "Only company admins can reject verification requests",
            });
        }
        // Get company for current user
        const company = yield prisma_1.default.company.findUnique({
            where: { ownerId: currentUserId },
        });
        if (!company) {
            return res.status(404).json({
                success: false,
                message: "Company account not found",
            });
        }
        // Get verification request
        const verificationRequest = yield prismaWithVerification.dealerVerificationRequest.findUnique({
            where: { id },
        });
        if (!verificationRequest) {
            return res.status(404).json({
                success: false,
                message: "Verification request not found",
            });
        }
        // Verify request belongs to this company
        if (verificationRequest.companyId !== company.id) {
            return res.status(403).json({
                success: false,
                message: "You can only reject requests for your own company",
            });
        }
        // Check if already rejected
        if (verificationRequest.status === "REJECTED") {
            return res.status(400).json({
                success: false,
                message: "Request is already rejected",
            });
        }
        // Get all previous rejections for this dealer-company pair
        const previousRejections = yield prismaWithVerification.dealerVerificationRequest.findMany({
            where: {
                dealerId: verificationRequest.dealerId,
                companyId: verificationRequest.companyId,
                status: "REJECTED",
            },
        });
        const newRejectedCount = previousRejections.length + 1;
        // Update request to REJECTED
        const updatedRequest = yield prismaWithVerification.dealerVerificationRequest.update({
            where: { id },
            data: {
                status: "REJECTED",
                rejectedCount: newRejectedCount,
                lastRejectedAt: new Date(),
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
                                id: true,
                                name: true,
                                phone: true,
                            },
                        },
                    },
                },
                company: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                    },
                },
            },
        });
        return res.json({
            success: true,
            data: updatedRequest,
            message: "Verification request rejected",
        });
    }
    catch (error) {
        console.error("Reject verification request error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
});
exports.rejectVerificationRequest = rejectVerificationRequest;
// ==================== ACKNOWLEDGE VERIFICATION REQUEST ====================
const acknowledgeVerificationRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Only dealers can acknowledge
        if (currentUserRole !== client_1.UserRole.DEALER) {
            return res.status(403).json({
                success: false,
                message: "Only dealers can acknowledge verification requests",
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
        const verificationRequest = yield prismaWithVerification.dealerVerificationRequest.findUnique({
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
                message: "You can only acknowledge your own verification requests",
            });
        }
        // Update acknowledgedAt
        const updatedRequest = yield prismaWithVerification.dealerVerificationRequest.update({
            where: { id },
            data: {
                acknowledgedAt: new Date(),
            },
        });
        return res.json({
            success: true,
            data: updatedRequest,
            message: "Verification request acknowledged",
        });
    }
    catch (error) {
        console.error("Acknowledge verification request error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
});
exports.acknowledgeVerificationRequest = acknowledgeVerificationRequest;
// ==================== GET DEALER'S APPROVED COMPANIES ====================
const getDealerCompanies = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Only dealers can view their companies
        if (currentUserRole !== client_1.UserRole.DEALER) {
            return res.status(403).json({
                success: false,
                message: "Only dealers can view their companies",
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
        // Get all active (non-archived) companies connected to this dealer via DealerCompany relationship
        const dealerCompanies = yield prisma_1.default.dealerCompany.findMany({
            where: {
                dealerId: dealer.id,
                archivedByDealer: false, // Only show active connections
            },
            include: {
                company: {
                    select: {
                        id: true,
                        name: true,
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
        // Extract companies with connection info
        const companies = dealerCompanies.map((dc) => (Object.assign(Object.assign({}, dc.company), { connectedAt: dc.connectedAt, connectedVia: dc.connectedVia, dealerCompanyId: dc.id })));
        return res.json({
            success: true,
            data: companies,
        });
    }
    catch (error) {
        console.error("Get dealer companies error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
});
exports.getDealerCompanies = getDealerCompanies;
// ==================== GET COMPANY DETAILS FOR DEALER ====================
const getCompanyDetailsForDealer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyId } = req.params;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Only dealers can access
        if (currentUserRole !== client_1.UserRole.DEALER) {
            return res.status(403).json({
                success: false,
                message: "Only dealers can view company details",
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
        // Verify dealer has connection to this company via DealerCompany relationship
        const dealerCompanyLink = yield prisma_1.default.dealerCompany.findUnique({
            where: {
                dealerId_companyId: {
                    dealerId: dealer.id,
                    companyId: companyId,
                },
            },
        });
        if (!dealerCompanyLink) {
            return res.status(403).json({
                success: false,
                message: "You are not connected to this company",
            });
        }
        // Get company details
        const company = yield prisma_1.default.company.findUnique({
            where: { id: companyId },
            select: {
                id: true,
                name: true,
                address: true,
                owner: {
                    select: {
                        name: true,
                        phone: true,
                    },
                },
                _count: {
                    select: {
                        companySales: true,
                        consignments: true,
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
        return res.json({
            success: true,
            data: company,
        });
    }
    catch (error) {
        console.error("Get company details for dealer error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
});
exports.getCompanyDetailsForDealer = getCompanyDetailsForDealer;
// ==================== CANCEL VERIFICATION REQUEST ====================
const cancelVerificationRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { requestId } = req.params;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Only dealers can cancel their own requests
        if (currentUserRole !== client_1.UserRole.DEALER) {
            return res.status(403).json({
                success: false,
                message: "Only dealers can cancel verification requests",
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
        // Get the request
        const request = yield prismaWithVerification.dealerVerificationRequest.findUnique({
            where: { id: requestId },
        });
        if (!request) {
            return res.status(404).json({
                success: false,
                message: "Verification request not found",
            });
        }
        // Check ownership
        if (request.dealerId !== dealer.id) {
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
        yield prismaWithVerification.dealerVerificationRequest.delete({
            where: { id: requestId },
        });
        return res.json({
            success: true,
            message: "Verification request cancelled successfully",
        });
    }
    catch (error) {
        console.error("Cancel verification request error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
});
exports.cancelVerificationRequest = cancelVerificationRequest;
// ==================== ARCHIVE DEALER-COMPANY CONNECTION ====================
const archiveDealerCompanyConnection = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { connectionId } = req.params;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Only dealers can archive from their side
        if (currentUserRole !== client_1.UserRole.DEALER) {
            return res.status(403).json({
                success: false,
                message: "Only dealers can archive company connections",
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
        const connection = yield prismaWithVerification.dealerCompany.findUnique({
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
        yield prismaWithVerification.dealerCompany.update({
            where: { id: connectionId },
            data: { archivedByDealer: true },
        });
        return res.json({
            success: true,
            message: "Connection archived successfully",
        });
    }
    catch (error) {
        console.error("Archive dealer-company connection error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
});
exports.archiveDealerCompanyConnection = archiveDealerCompanyConnection;
// ==================== UNARCHIVE DEALER-COMPANY CONNECTION ====================
const unarchiveDealerCompanyConnection = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { connectionId } = req.params;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Only dealers can unarchive from their side
        if (currentUserRole !== client_1.UserRole.DEALER) {
            return res.status(403).json({
                success: false,
                message: "Only dealers can unarchive company connections",
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
        const connection = yield prismaWithVerification.dealerCompany.findUnique({
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
        yield prismaWithVerification.dealerCompany.update({
            where: { id: connectionId },
            data: { archivedByDealer: false },
        });
        return res.json({
            success: true,
            message: "Connection restored successfully",
        });
    }
    catch (error) {
        console.error("Unarchive dealer-company connection error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
});
exports.unarchiveDealerCompanyConnection = unarchiveDealerCompanyConnection;
// ==================== ARCHIVE COMPANY-DEALER CONNECTION ====================
const archiveCompanyDealerConnection = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { connectionId } = req.params;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Only companies can archive from their side
        if (currentUserRole !== client_1.UserRole.COMPANY) {
            return res.status(403).json({
                success: false,
                message: "Only companies can archive dealer connections",
            });
        }
        // Get company for current user
        const company = yield prisma_1.default.company.findUnique({
            where: { ownerId: currentUserId },
        });
        if (!company) {
            return res.status(404).json({
                success: false,
                message: "Company account not found",
            });
        }
        // Get the connection
        const connection = yield prismaWithVerification.dealerCompany.findUnique({
            where: { id: connectionId },
        });
        if (!connection) {
            return res.status(404).json({
                success: false,
                message: "Connection not found",
            });
        }
        // Check ownership
        if (connection.companyId !== company.id) {
            return res.status(403).json({
                success: false,
                message: "You can only archive your own connections",
            });
        }
        // Archive the connection
        yield prismaWithVerification.dealerCompany.update({
            where: { id: connectionId },
            data: { archivedByCompany: true },
        });
        return res.json({
            success: true,
            message: "Connection archived successfully",
        });
    }
    catch (error) {
        console.error("Archive company-dealer connection error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
});
exports.archiveCompanyDealerConnection = archiveCompanyDealerConnection;
// ==================== UNARCHIVE COMPANY-DEALER CONNECTION ====================
const unarchiveCompanyDealerConnection = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { connectionId } = req.params;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Only companies can unarchive from their side
        if (currentUserRole !== client_1.UserRole.COMPANY) {
            return res.status(403).json({
                success: false,
                message: "Only companies can unarchive dealer connections",
            });
        }
        // Get company for current user
        const company = yield prisma_1.default.company.findUnique({
            where: { ownerId: currentUserId },
        });
        if (!company) {
            return res.status(404).json({
                success: false,
                message: "Company account not found",
            });
        }
        // Get the connection
        const connection = yield prismaWithVerification.dealerCompany.findUnique({
            where: { id: connectionId },
        });
        if (!connection) {
            return res.status(404).json({
                success: false,
                message: "Connection not found",
            });
        }
        // Check ownership
        if (connection.companyId !== company.id) {
            return res.status(403).json({
                success: false,
                message: "You can only unarchive your own connections",
            });
        }
        // Unarchive the connection
        yield prismaWithVerification.dealerCompany.update({
            where: { id: connectionId },
            data: { archivedByCompany: false },
        });
        return res.json({
            success: true,
            message: "Connection restored successfully",
        });
    }
    catch (error) {
        console.error("Unarchive company-dealer connection error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
});
exports.unarchiveCompanyDealerConnection = unarchiveCompanyDealerConnection;
// ==================== GET ARCHIVED DEALER COMPANIES ====================
const getArchivedDealerCompanies = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Only dealers can access
        if (currentUserRole !== client_1.UserRole.DEALER) {
            return res.status(403).json({
                success: false,
                message: "Only dealers can view archived companies",
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
        // Get archived companies
        const archivedConnections = yield prismaWithVerification.dealerCompany.findMany({
            where: {
                dealerId: dealer.id,
                archivedByDealer: true,
            },
            include: {
                company: {
                    select: {
                        id: true,
                        name: true,
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
        const companies = archivedConnections.map((connection) => ({
            id: connection.company.id,
            name: connection.company.name,
            address: connection.company.address,
            connectedAt: connection.connectedAt,
            connectedVia: connection.connectedVia,
            dealerCompanyId: connection.id,
            owner: connection.company.owner,
        }));
        return res.json({
            success: true,
            data: companies,
        });
    }
    catch (error) {
        console.error("Get archived dealer companies error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
});
exports.getArchivedDealerCompanies = getArchivedDealerCompanies;
// ==================== GET ARCHIVED COMPANY DEALERS ====================
const getArchivedCompanyDealers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Only companies can access
        if (currentUserRole !== client_1.UserRole.COMPANY) {
            return res.status(403).json({
                success: false,
                message: "Only companies can view archived dealers",
            });
        }
        // Get company for current user
        const company = yield prisma_1.default.company.findUnique({
            where: { ownerId: currentUserId },
        });
        if (!company) {
            return res.status(404).json({
                success: false,
                message: "Company account not found",
            });
        }
        // Get archived dealers
        const archivedConnections = yield prismaWithVerification.dealerCompany.findMany({
            where: {
                companyId: company.id,
                archivedByCompany: true,
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
        // Calculate balance for each dealer
        const dealersWithBalance = yield Promise.all(archivedConnections.map((connection) => __awaiter(void 0, void 0, void 0, function* () {
            const account = yield prisma_1.default.companyDealerAccount.findUnique({
                where: {
                    companyId_dealerId: {
                        companyId: company.id,
                        dealerId: connection.dealer.id,
                    },
                },
                select: {
                    balance: true,
                    totalSales: true,
                    totalPayments: true,
                },
            });
            return {
                id: connection.dealer.id,
                name: connection.dealer.name,
                contact: connection.dealer.contact,
                address: connection.dealer.address,
                balance: account ? Number(account.balance) : 0,
                totalSales: account ? Number(account.totalSales) : 0,
                totalPayments: account ? Number(account.totalPayments) : 0,
                connectedAt: connection.connectedAt,
                connectedVia: connection.connectedVia,
                connectionId: connection.id,
                connectionType: "CONNECTED",
                isOwnedDealer: !!connection.dealer.owner,
                owner: connection.dealer.owner,
            };
        })));
        return res.json({
            success: true,
            data: dealersWithBalance,
        });
    }
    catch (error) {
        console.error("Get archived company dealers error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
});
exports.getArchivedCompanyDealers = getArchivedCompanyDealers;
