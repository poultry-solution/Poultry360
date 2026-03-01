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
exports.getFarmerPaymentRequestStatistics = exports.respondToPaymentRequest = exports.createPaymentRequest = exports.getFarmerPaymentRequestById = exports.getFarmerPaymentRequests = exports.createDealerPaymentRequest = exports.getDealerPaymentRequestStatistics = exports.rejectPaymentRequest = exports.approvePaymentRequest = exports.getDealerPaymentRequestById = exports.getDealerPaymentRequests = void 0;
const dealerSalePaymentRequestService_1 = require("../services/dealerSalePaymentRequestService");
const prisma_1 = __importDefault(require("../utils/prisma"));
// ==================== DEALER ENDPOINTS ====================
/**
 * Get all payment requests for a dealer
 */
const getDealerPaymentRequests = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { status, page, limit } = req.query;
        // Get the dealer record
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        const result = yield dealerSalePaymentRequestService_1.DealerSalePaymentRequestService.getDealerPaymentRequests({
            dealerId: dealer.id,
            status: status,
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
        });
        return res.json({
            success: true,
            data: result.requests,
            pagination: result.pagination,
        });
    }
    catch (error) {
        console.error("Get dealer payment requests error:", error);
        return res.status(500).json({ message: error.message || "Internal server error" });
    }
});
exports.getDealerPaymentRequests = getDealerPaymentRequests;
/**
 * Get single payment request by ID (dealer side)
 */
const getDealerPaymentRequestById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const request = yield dealerSalePaymentRequestService_1.DealerSalePaymentRequestService.getPaymentRequestById(id);
        // Verify this request belongs to this dealer
        if (request.dealerId !== dealer.id) {
            return res.status(403).json({ message: "Access denied" });
        }
        return res.json({
            success: true,
            data: request,
        });
    }
    catch (error) {
        console.error("Get dealer payment request error:", error);
        return res.status(500).json({ message: error.message || "Internal server error" });
    }
});
exports.getDealerPaymentRequestById = getDealerPaymentRequestById;
/**
 * Approve a payment request (dealer side)
 */
const approvePaymentRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const result = yield dealerSalePaymentRequestService_1.DealerSalePaymentRequestService.approvePaymentRequest({
            requestId: id,
            dealerId: dealer.id,
            recordedById: userId,
        });
        return res.json({
            success: true,
            data: result,
            message: "Payment request approved successfully",
        });
    }
    catch (error) {
        console.error("Approve payment request error:", error);
        return res.status(400).json({ message: error.message || "Internal server error" });
    }
});
exports.approvePaymentRequest = approvePaymentRequest;
/**
 * Reject a payment request (dealer side)
 */
const rejectPaymentRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const { rejectionReason } = req.body;
        if (!rejectionReason || !rejectionReason.trim()) {
            return res.status(400).json({ message: "Rejection reason is required" });
        }
        // Get the dealer record
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        const result = yield dealerSalePaymentRequestService_1.DealerSalePaymentRequestService.rejectPaymentRequest({
            requestId: id,
            dealerId: dealer.id,
            rejectionReason,
        });
        return res.json({
            success: true,
            data: result,
            message: "Payment request rejected",
        });
    }
    catch (error) {
        console.error("Reject payment request error:", error);
        return res.status(400).json({ message: error.message || "Internal server error" });
    }
});
exports.rejectPaymentRequest = rejectPaymentRequest;
/**
 * Get payment request statistics (dealer side)
 */
const getDealerPaymentRequestStatistics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        // Get the dealer record
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        const [pending, approved, rejected, total, pendingAmount] = yield Promise.all([
            prisma_1.default.dealerSalePaymentRequest.count({
                where: { dealerId: dealer.id, status: "PENDING" },
            }),
            prisma_1.default.dealerSalePaymentRequest.count({
                where: { dealerId: dealer.id, status: "APPROVED" },
            }),
            prisma_1.default.dealerSalePaymentRequest.count({
                where: { dealerId: dealer.id, status: "REJECTED" },
            }),
            prisma_1.default.dealerSalePaymentRequest.count({
                where: { dealerId: dealer.id },
            }),
            prisma_1.default.dealerSalePaymentRequest.aggregate({
                _sum: { amount: true },
                where: { dealerId: dealer.id, status: "PENDING" },
            }),
        ]);
        return res.json({
            success: true,
            data: {
                pending,
                approved,
                rejected,
                total,
                pendingAmount: Number(pendingAmount._sum.amount || 0),
            },
        });
    }
    catch (error) {
        console.error("Get dealer payment request statistics error:", error);
        return res.status(500).json({ message: error.message || "Internal server error" });
    }
});
exports.getDealerPaymentRequestStatistics = getDealerPaymentRequestStatistics;
/**
 * Create a payment request to farmer (dealer side)
 */
const createDealerPaymentRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { farmerId, amount, description } = req.body;
        // Validation
        if (!farmerId) {
            return res.status(400).json({ message: "Farmer ID is required" });
        }
        if (!amount || amount <= 0) {
            return res.status(400).json({ message: "Valid amount is required" });
        }
        // Get the dealer record
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        const result = yield dealerSalePaymentRequestService_1.DealerSalePaymentRequestService.createDealerPaymentRequest({
            dealerId: dealer.id,
            farmerId,
            amount: Number(amount),
            description,
        });
        return res.status(201).json({
            success: true,
            data: result,
            message: "Payment request created successfully",
        });
    }
    catch (error) {
        console.error("Create dealer payment request error:", error);
        return res.status(400).json({ message: error.message || "Internal server error" });
    }
});
exports.createDealerPaymentRequest = createDealerPaymentRequest;
// ==================== FARMER ENDPOINTS ====================
/**
 * Get all payment requests for a farmer
 */
const getFarmerPaymentRequests = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const farmerId = req.userId;
        const { status, page, limit } = req.query;
        const result = yield dealerSalePaymentRequestService_1.DealerSalePaymentRequestService.getFarmerPaymentRequests({
            farmerId: farmerId,
            status: status,
            page: page ? Number(page) : undefined,
            limit: limit ? Number(limit) : undefined,
        });
        return res.json({
            success: true,
            data: result.requests,
            pagination: result.pagination,
        });
    }
    catch (error) {
        console.error("Get farmer payment requests error:", error);
        return res.status(500).json({ message: error.message || "Internal server error" });
    }
});
exports.getFarmerPaymentRequests = getFarmerPaymentRequests;
/**
 * Get single payment request by ID (farmer side)
 */
const getFarmerPaymentRequestById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const farmerId = req.userId;
        const { id } = req.params;
        const request = yield dealerSalePaymentRequestService_1.DealerSalePaymentRequestService.getPaymentRequestById(id);
        // Verify this request belongs to this farmer
        if (request.farmerId !== farmerId) {
            return res.status(403).json({ message: "Access denied" });
        }
        return res.json({
            success: true,
            data: request,
        });
    }
    catch (error) {
        console.error("Get farmer payment request error:", error);
        return res.status(500).json({ message: error.message || "Internal server error" });
    }
});
exports.getFarmerPaymentRequestById = getFarmerPaymentRequestById;
/**
 * Create a payment request (farmer side)
 * Account-based only: requires dealerId; payment is applied to dealer-farmer account ledger.
 */
const createPaymentRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const farmerId = req.userId;
        const { dealerId, amount, paymentDate, paymentReference, paymentMethod, description, receiptImageUrl, } = req.body;
        // Validation
        if (!amount || amount <= 0) {
            return res.status(400).json({
                message: "Valid amount is required",
            });
        }
        if (!dealerId) {
            return res.status(400).json({
                message: "Dealer ID is required",
            });
        }
        // Find dealer and get their ownerId
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { id: dealerId },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        if (!dealer.ownerId) {
            return res.status(400).json({
                message: "This dealer is not registered and cannot receive payment requests",
            });
        }
        // Find customer record where farmer is linked
        // Customer.userId = dealer's ownerId, Customer.farmerId = current farmer
        const customer = yield prisma_1.default.customer.findFirst({
            where: {
                userId: dealer.ownerId,
                farmerId: farmerId,
            },
        });
        if (!customer) {
            return res.status(404).json({
                message: "No customer record found for this dealer-farmer connection",
            });
        }
        const result = yield dealerSalePaymentRequestService_1.DealerSalePaymentRequestService.createLedgerLevelPaymentRequest({
            dealerId,
            farmerId: farmerId,
            customerId: customer.id,
            amount: Number(amount),
            paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
            paymentReference,
            paymentMethod,
            description,
            proofOfPaymentUrl: receiptImageUrl,
        });
        return res.status(201).json({
            success: true,
            data: result,
            message: "Payment request created successfully",
        });
    }
    catch (error) {
        console.error("Create payment request error:", error);
        return res.status(400).json({ message: error.message || "Internal server error" });
    }
});
exports.createPaymentRequest = createPaymentRequest;
/**
 * Respond to a dealer-initiated payment request (farmer side)
 */
const respondToPaymentRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const farmerId = req.userId;
        const { id } = req.params;
        const { paymentMethod, paymentReference, paymentDate, proofOfPaymentUrl } = req.body;
        if (!paymentMethod && !paymentReference) {
            return res.status(400).json({
                message: "Please provide payment method or reference",
            });
        }
        const result = yield dealerSalePaymentRequestService_1.DealerSalePaymentRequestService.respondToPaymentRequest({
            requestId: id,
            farmerId: farmerId,
            paymentMethod,
            paymentReference,
            paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
            proofOfPaymentUrl,
        });
        return res.json({
            success: true,
            data: result,
            message: "Payment proof submitted successfully",
        });
    }
    catch (error) {
        console.error("Respond to payment request error:", error);
        return res.status(400).json({ message: error.message || "Internal server error" });
    }
});
exports.respondToPaymentRequest = respondToPaymentRequest;
/**
 * Get payment request statistics (farmer side)
 */
const getFarmerPaymentRequestStatistics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const farmerId = req.userId;
        const [pending, approved, rejected, total, pendingAmount] = yield Promise.all([
            prisma_1.default.dealerSalePaymentRequest.count({
                where: { farmerId, status: "PENDING" },
            }),
            prisma_1.default.dealerSalePaymentRequest.count({
                where: { farmerId, status: "APPROVED" },
            }),
            prisma_1.default.dealerSalePaymentRequest.count({
                where: { farmerId, status: "REJECTED" },
            }),
            prisma_1.default.dealerSalePaymentRequest.count({
                where: { farmerId },
            }),
            prisma_1.default.dealerSalePaymentRequest.aggregate({
                _sum: { amount: true },
                where: { farmerId, status: "PENDING" },
            }),
        ]);
        return res.json({
            success: true,
            data: {
                pending,
                approved,
                rejected,
                total,
                pendingAmount: Number(pendingAmount._sum.amount || 0),
            },
        });
    }
    catch (error) {
        console.error("Get farmer payment request statistics error:", error);
        return res.status(500).json({ message: error.message || "Internal server error" });
    }
});
exports.getFarmerPaymentRequestStatistics = getFarmerPaymentRequestStatistics;
