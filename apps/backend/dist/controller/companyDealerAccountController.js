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
exports.getAllDealerPayments = exports.getAllCompanyAccounts = exports.getAllDealerAccounts = exports.checkDealerBalanceLimit = exports.setDealerBalanceLimit = exports.recordCompanyPayment = exports.getCompanyAccountStatement = exports.getCompanyAccount = exports.recordDealerPayment = exports.getDealerAccountStatement = exports.getDealerAccount = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const companyDealerAccountService_1 = require("../services/companyDealerAccountService");
// ==================== GET DEALER ACCOUNT (COMPANY SIDE) ====================
const getDealerAccount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { dealerId } = req.params;
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
        // Get or create account
        const account = yield companyDealerAccountService_1.CompanyDealerAccountService.getOrCreateAccount(company.id, dealerId);
        return res.status(200).json({
            success: true,
            data: {
                id: account.id,
                balance: Number(account.balance),
                totalSales: Number(account.totalSales),
                totalPayments: Number(account.totalPayments),
                lastSaleDate: account.lastSaleDate,
                lastPaymentDate: account.lastPaymentDate,
                balanceLimit: account.balanceLimit != null ? Number(account.balanceLimit) : null,
                balanceLimitSetAt: account.balanceLimitSetAt,
                balanceLimitSetBy: account.balanceLimitSetBy,
                dealer: account.dealer,
                company: account.company,
            },
        });
    }
    catch (error) {
        console.error("Get dealer account error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getDealerAccount = getDealerAccount;
// ==================== GET DEALER ACCOUNT STATEMENT (COMPANY SIDE) ====================
const getDealerAccountStatement = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { dealerId } = req.params;
        const { startDate, endDate, page = 1, limit = 50 } = req.query;
        // Get company
        const company = yield prisma_1.default.company.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!company) {
            return res.status(404).json({ message: "Company not found" });
        }
        const statement = yield companyDealerAccountService_1.CompanyDealerAccountService.getAccountStatement({
            companyId: company.id,
            dealerId,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            page: Number(page),
            limit: Number(limit),
        });
        return res.status(200).json({
            success: true,
            data: statement,
        });
    }
    catch (error) {
        console.error("Get dealer account statement error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getDealerAccountStatement = getDealerAccountStatement;
// ==================== RECORD PAYMENT (COMPANY SIDE) ====================
const recordDealerPayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { dealerId } = req.params;
        const { amount, paymentMethod, paymentDate, notes, reference, receiptImageUrl, proofImageUrl, } = req.body;
        // Validation
        if (!amount || Number(amount) <= 0) {
            return res.status(400).json({
                message: "Valid payment amount is required",
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
        // Record payment
        const result = yield companyDealerAccountService_1.CompanyDealerAccountService.recordPayment({
            companyId: company.id,
            dealerId,
            amount: Number(amount),
            paymentMethod,
            paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
            notes,
            reference,
            receiptImageUrl,
            proofImageUrl,
            recordedById: userId,
        });
        return res.status(201).json({
            success: true,
            data: {
                payment: result.payment,
                account: {
                    id: result.account.id,
                    balance: Number(result.account.balance),
                    totalSales: Number(result.account.totalSales),
                    totalPayments: Number(result.account.totalPayments),
                },
            },
            message: "Payment recorded successfully",
        });
    }
    catch (error) {
        console.error("Record dealer payment error:", error);
        return res.status(500).json({
            message: error.message || "Internal server error",
        });
    }
});
exports.recordDealerPayment = recordDealerPayment;
// ==================== GET COMPANY ACCOUNT (DEALER SIDE) ====================
const getCompanyAccount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { companyId } = req.params;
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
        // Get or create account
        const account = yield companyDealerAccountService_1.CompanyDealerAccountService.getOrCreateAccount(companyId, dealer.id);
        return res.status(200).json({
            success: true,
            data: {
                id: account.id,
                balance: Number(account.balance),
                totalSales: Number(account.totalSales),
                totalPayments: Number(account.totalPayments),
                lastSaleDate: account.lastSaleDate,
                lastPaymentDate: account.lastPaymentDate,
                dealer: account.dealer,
                company: account.company,
            },
        });
    }
    catch (error) {
        console.error("Get company account error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getCompanyAccount = getCompanyAccount;
// ==================== GET COMPANY ACCOUNT STATEMENT (DEALER SIDE) ====================
const getCompanyAccountStatement = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { companyId } = req.params;
        const { startDate, endDate, page = 1, limit = 50 } = req.query;
        // Get dealer
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        const statement = yield companyDealerAccountService_1.CompanyDealerAccountService.getAccountStatement({
            companyId,
            dealerId: dealer.id,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            page: Number(page),
            limit: Number(limit),
        });
        return res.status(200).json({
            success: true,
            data: statement,
        });
    }
    catch (error) {
        console.error("Get company account statement error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getCompanyAccountStatement = getCompanyAccountStatement;
// ==================== RECORD PAYMENT (DEALER SIDE) ====================
const recordCompanyPayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { companyId } = req.params;
        const { amount, paymentMethod, paymentDate, notes, reference, receiptImageUrl, proofImageUrl, } = req.body;
        // Validation
        if (!amount || Number(amount) <= 0) {
            return res.status(400).json({
                message: "Valid payment amount is required",
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
        // Record payment
        const result = yield companyDealerAccountService_1.CompanyDealerAccountService.recordPayment({
            companyId,
            dealerId: dealer.id,
            amount: Number(amount),
            paymentMethod,
            paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
            notes,
            reference,
            receiptImageUrl,
            proofImageUrl,
            recordedById: userId,
        });
        return res.status(201).json({
            success: true,
            data: {
                payment: result.payment,
                account: {
                    id: result.account.id,
                    balance: Number(result.account.balance),
                    totalSales: Number(result.account.totalSales),
                    totalPayments: Number(result.account.totalPayments),
                },
            },
            message: "Payment recorded successfully",
        });
    }
    catch (error) {
        console.error("Record company payment error:", error);
        return res.status(500).json({
            message: error.message || "Internal server error",
        });
    }
});
exports.recordCompanyPayment = recordCompanyPayment;
// ==================== SET DEALER BALANCE LIMIT (COMPANY SIDE) ====================
const setDealerBalanceLimit = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { dealerId } = req.params;
        const { balanceLimit } = req.body;
        const company = yield prisma_1.default.company.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!company) {
            return res.status(404).json({ message: "Company not found" });
        }
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { id: dealerId },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        const normalizedLimit = balanceLimit === undefined || balanceLimit === null || balanceLimit === ""
            ? null
            : Number(balanceLimit);
        if (normalizedLimit !== null && (isNaN(normalizedLimit) || normalizedLimit < 0)) {
            return res.status(400).json({
                message: "Balance limit must be a non-negative number or null",
            });
        }
        const account = yield companyDealerAccountService_1.CompanyDealerAccountService.setBalanceLimit({
            companyId: company.id,
            dealerId,
            balanceLimit: normalizedLimit,
            setById: userId,
        });
        return res.status(200).json({
            success: true,
            data: {
                id: account.id,
                balance: Number(account.balance),
                balanceLimit: account.balanceLimit != null ? Number(account.balanceLimit) : null,
                balanceLimitSetAt: account.balanceLimitSetAt,
                balanceLimitSetBy: account.balanceLimitSetBy,
            },
            message: "Balance limit updated successfully",
        });
    }
    catch (error) {
        console.error("Set dealer balance limit error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.setDealerBalanceLimit = setDealerBalanceLimit;
// ==================== CHECK DEALER BALANCE LIMIT (COMPANY SIDE) ====================
const checkDealerBalanceLimit = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { dealerId } = req.params;
        const { saleAmount } = req.body;
        const company = yield prisma_1.default.company.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!company) {
            return res.status(404).json({ message: "Company not found" });
        }
        const parsed = Number(saleAmount);
        if (!Number.isFinite(parsed) ||
            parsed < 0) {
            return res.status(400).json({
                message: "Valid sale amount is required",
            });
        }
        const result = yield companyDealerAccountService_1.CompanyDealerAccountService.checkBalanceLimit({
            companyId: company.id,
            dealerId,
            saleAmount: parsed,
        });
        return res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        console.error("Check dealer balance limit error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.checkDealerBalanceLimit = checkDealerBalanceLimit;
// ==================== GET ALL COMPANY ACCOUNTS (COMPANY SIDE) ====================
const getAllDealerAccounts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        // Get company
        const company = yield prisma_1.default.company.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!company) {
            return res.status(404).json({ message: "Company not found" });
        }
        const accounts = yield companyDealerAccountService_1.CompanyDealerAccountService.getCompanyAccounts(company.id);
        return res.status(200).json({
            success: true,
            data: accounts,
        });
    }
    catch (error) {
        console.error("Get all dealer accounts error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getAllDealerAccounts = getAllDealerAccounts;
// ==================== GET ALL COMPANY ACCOUNTS (DEALER SIDE) ====================
const getAllCompanyAccounts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        // Get dealer
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        const accounts = yield companyDealerAccountService_1.CompanyDealerAccountService.getDealerAccounts(dealer.id);
        return res.status(200).json({
            success: true,
            data: accounts,
        });
    }
    catch (error) {
        console.error("Get all company accounts error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getAllCompanyAccounts = getAllCompanyAccounts;
// ==================== GET ALL DEALER PAYMENTS (COMPANY SIDE) ====================
const getAllDealerPayments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { startDate, endDate, page = 1, limit = 50, dealerId } = req.query;
        // Get company
        const company = yield prisma_1.default.company.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!company) {
            return res.status(404).json({ message: "Company not found" });
        }
        const result = yield companyDealerAccountService_1.CompanyDealerAccountService.getAllPayments({
            companyId: company.id,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            page: Number(page),
            limit: Number(limit),
            dealerId: dealerId,
        });
        return res.status(200).json({
            success: true,
            data: result.payments,
            pagination: result.pagination,
        });
    }
    catch (error) {
        console.error("Get all dealer payments error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getAllDealerPayments = getAllDealerPayments;
