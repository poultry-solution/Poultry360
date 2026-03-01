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
exports.cancelPaymentRequest = exports.createDealerPaymentRequest = exports.submitDealerPaymentProof = exports.acceptDealerPaymentRequest = exports.getDealerPaymentRequests = exports.verifyCompanyPaymentRequest = exports.acceptCompanyPaymentRequest = exports.getCompanyPaymentRequests = exports.createCompanyPaymentRequest = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const companyService_1 = require("../services/companyService");
const client_1 = require("@prisma/client");
// ==================== COMPANY: CREATE PAYMENT REQUEST ====================
// Account-based only: payment is applied to company-dealer account ledger (no sale linkage).
const createCompanyPaymentRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { dealerId, amount, description } = req.body;
        // Validation
        if (!dealerId || !amount || amount <= 0) {
            return res.status(400).json({
                message: "Dealer ID and valid amount are required",
            });
        }
        // Get company
        const company = yield prisma_1.default.company.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!company) {
            return res.status(404).json({ message: "Company not found" });
        }
        // Verify dealer exists
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { id: dealerId },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        const paymentRequest = yield companyService_1.CompanyService.createPaymentRequest({
            companyId: company.id,
            dealerId,
            requestedById: userId,
            amount: Number(amount),
            companySaleId: undefined,
            description,
            direction: client_1.PaymentRequestDirection.COMPANY_TO_DEALER,
        });
        return res.status(201).json({
            success: true,
            data: paymentRequest,
            message: "Payment request created successfully",
        });
    }
    catch (error) {
        console.error("Create company payment request error:", error);
        return res
            .status(400)
            .json({ message: error.message || "Internal server error" });
    }
});
exports.createCompanyPaymentRequest = createCompanyPaymentRequest;
// ==================== COMPANY: GET PAYMENT REQUESTS ====================
const getCompanyPaymentRequests = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { page = 1, limit = 50, status, direction, dealerId, } = req.query;
        // Get company
        const company = yield prisma_1.default.company.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!company) {
            return res.status(404).json({ message: "Company not found" });
        }
        const result = yield companyService_1.CompanyService.getPaymentRequests({
            companyId: company.id,
            dealerId: dealerId,
            status: status,
            direction: direction,
            page: Number(page),
            limit: Number(limit),
        });
        return res.status(200).json({
            success: true,
            data: result.requests,
            pagination: {
                page: result.page,
                limit: result.limit,
                total: result.total,
                totalPages: result.totalPages,
            },
        });
    }
    catch (error) {
        console.error("Get company payment requests error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getCompanyPaymentRequests = getCompanyPaymentRequests;
// ==================== COMPANY: ACCEPT PAYMENT REQUEST ====================
const acceptCompanyPaymentRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { id } = req.params;
        // Get company
        const company = yield prisma_1.default.company.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!company) {
            return res.status(404).json({ message: "Company not found" });
        }
        const updated = yield companyService_1.CompanyService.acceptPaymentRequest({
            requestId: id,
            companyId: company.id,
            acceptedById: userId,
        });
        return res.status(200).json({
            success: true,
            data: updated,
            message: "Payment request accepted successfully",
        });
    }
    catch (error) {
        console.error("Accept company payment request error:", error);
        return res
            .status(400)
            .json({ message: error.message || "Internal server error" });
    }
});
exports.acceptCompanyPaymentRequest = acceptCompanyPaymentRequest;
// ==================== COMPANY: VERIFY PAYMENT REQUEST ====================
const verifyCompanyPaymentRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const { isApproved, reviewNotes } = req.body;
        // Get company
        const company = yield prisma_1.default.company.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!company) {
            return res.status(404).json({ message: "Company not found" });
        }
        if (typeof isApproved !== "boolean") {
            return res.status(400).json({
                message: "isApproved must be a boolean",
            });
        }
        const updated = yield companyService_1.CompanyService.verifyPaymentRequest({
            requestId: id,
            companyId: company.id,
            reviewedById: userId,
            isApproved,
            reviewNotes,
        });
        return res.status(200).json({
            success: true,
            data: updated,
            message: isApproved
                ? "Payment verified and approved"
                : "Payment request rejected",
        });
    }
    catch (error) {
        console.error("Verify company payment request error:", error);
        return res
            .status(400)
            .json({ message: error.message || "Internal server error" });
    }
});
exports.verifyCompanyPaymentRequest = verifyCompanyPaymentRequest;
// ==================== DEALER: GET PAYMENT REQUESTS ====================
const getDealerPaymentRequests = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { page = 1, limit = 50, status, direction, } = req.query;
        // Get dealer
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        const result = yield companyService_1.CompanyService.getPaymentRequests({
            dealerId: dealer.id,
            status: status,
            direction: direction,
            page: Number(page),
            limit: Number(limit),
        });
        return res.status(200).json({
            success: true,
            data: result.requests,
            pagination: {
                page: result.page,
                limit: result.limit,
                total: result.total,
                totalPages: result.totalPages,
            },
        });
    }
    catch (error) {
        console.error("Get dealer payment requests error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getDealerPaymentRequests = getDealerPaymentRequests;
// ==================== DEALER: ACCEPT PAYMENT REQUEST ====================
const acceptDealerPaymentRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { id } = req.params;
        // Get dealer
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        const updated = yield companyService_1.CompanyService.acceptPaymentRequest({
            requestId: id,
            dealerId: dealer.id,
            acceptedById: userId,
        });
        return res.status(200).json({
            success: true,
            data: updated,
            message: "Payment request accepted",
        });
    }
    catch (error) {
        console.error("Accept dealer payment request error:", error);
        return res
            .status(400)
            .json({ message: error.message || "Internal server error" });
    }
});
exports.acceptDealerPaymentRequest = acceptDealerPaymentRequest;
// ==================== DEALER: SUBMIT PAYMENT PROOF ====================
const submitDealerPaymentProof = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const { paymentMethod, paymentReference, paymentReceiptUrl, paymentDate, } = req.body;
        // Validation
        if (!paymentMethod) {
            return res.status(400).json({
                message: "Payment method is required",
            });
        }
        // Get dealer
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        const updated = yield companyService_1.CompanyService.submitPaymentProof({
            requestId: id,
            dealerId: dealer.id,
            submittedById: userId,
            paymentMethod,
            paymentReference,
            paymentReceiptUrl,
            paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        });
        return res.status(200).json({
            success: true,
            data: updated,
            message: "Payment proof submitted successfully",
        });
    }
    catch (error) {
        console.error("Submit dealer payment proof error:", error);
        return res
            .status(400)
            .json({ message: error.message || "Internal server error" });
    }
});
exports.submitDealerPaymentProof = submitDealerPaymentProof;
// ==================== DEALER: CREATE PAYMENT REQUEST ====================
const createDealerPaymentRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { companyId, amount, companySaleId, description, paymentMethod, paymentReference, paymentReceiptUrl, paymentDate, } = req.body;
        // Validation
        if (!companyId || !amount || amount <= 0) {
            return res.status(400).json({
                message: "Company ID and valid amount are required",
            });
        }
        if (!paymentMethod) {
            return res.status(400).json({
                message: "Payment method is required",
            });
        }
        // Get dealer
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        // Verify company exists
        const company = yield prisma_1.default.company.findUnique({
            where: { id: companyId },
        });
        if (!company) {
            return res.status(404).json({ message: "Company not found" });
        }
        // If saleId provided, validate that it exists
        if (companySaleId) {
            const sale = yield prisma_1.default.companySale.findFirst({
                where: {
                    id: companySaleId,
                    companyId,
                    dealerId: dealer.id,
                },
            });
            if (!sale) {
                return res.status(404).json({
                    message: "Sale not found or does not belong to this company/dealer",
                });
            }
            // Note: We allow amount > sale.dueAmount because overflow will be auto-applied to other sales
        }
        // Create payment request (dealer-initiated)
        const paymentRequest = yield companyService_1.CompanyService.createPaymentRequest({
            companyId,
            dealerId: dealer.id,
            requestedById: userId,
            amount: Number(amount),
            companySaleId,
            description,
            direction: client_1.PaymentRequestDirection.DEALER_TO_COMPANY,
        });
        // Immediately submit payment proof since dealer has already paid
        const updated = yield companyService_1.CompanyService.submitPaymentProof({
            requestId: paymentRequest.id,
            dealerId: dealer.id,
            submittedById: userId,
            paymentMethod,
            paymentReference,
            paymentReceiptUrl,
            paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        });
        return res.status(201).json({
            success: true,
            data: updated,
            message: "Payment proof submitted successfully. Waiting for company verification.",
        });
    }
    catch (error) {
        console.error("Create dealer payment request error:", error);
        return res
            .status(400)
            .json({ message: error.message || "Internal server error" });
    }
});
exports.createDealerPaymentRequest = createDealerPaymentRequest;
// ==================== CANCEL PAYMENT REQUEST ====================
const cancelPaymentRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { id } = req.params;
        // Determine if company or dealer
        const company = yield prisma_1.default.company.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!company && !dealer) {
            return res.status(404).json({ message: "Company or dealer not found" });
        }
        const updated = yield companyService_1.CompanyService.cancelPaymentRequest({
            requestId: id,
            companyId: company === null || company === void 0 ? void 0 : company.id,
            dealerId: dealer === null || dealer === void 0 ? void 0 : dealer.id,
            cancelledById: userId,
        });
        return res.status(200).json({
            success: true,
            data: updated,
            message: "Payment request cancelled successfully",
        });
    }
    catch (error) {
        console.error("Cancel payment request error:", error);
        return res
            .status(400)
            .json({ message: error.message || "Internal server error" });
    }
});
exports.cancelPaymentRequest = cancelPaymentRequest;
