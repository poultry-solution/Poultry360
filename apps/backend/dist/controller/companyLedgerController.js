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
exports.addCompanyPayment = exports.getCompanyLedgerSummary = exports.getCompanyLedgerParties = exports.getCompanyLedgerEntries = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const companyService_1 = require("../services/companyService");
const companyDealerAccountService_1 = require("../services/companyDealerAccountService");
// ==================== GET COMPANY LEDGER ENTRIES ====================
const getCompanyLedgerEntries = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { page = 1, limit = 50, type, partyId, startDate, endDate, } = req.query;
        // Get company
        const company = yield prisma_1.default.company.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!company) {
            return res.status(404).json({ message: "Company not found" });
        }
        const result = yield companyService_1.CompanyService.getLedgerEntries({
            companyId: company.id,
            type: type,
            partyId: partyId,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            page: Number(page),
            limit: Number(limit),
        });
        return res.status(200).json({
            success: true,
            data: result.entries,
            pagination: {
                page: result.page,
                limit: result.limit,
                total: result.total,
                totalPages: result.totalPages,
            },
        });
    }
    catch (error) {
        console.error("Get company ledger entries error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getCompanyLedgerEntries = getCompanyLedgerEntries;
// ==================== GET COMPANY LEDGER PARTIES ====================
const getCompanyLedgerParties = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { search } = req.query;
        // Get company
        const company = yield prisma_1.default.company.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!company) {
            return res.status(404).json({ message: "Company not found" });
        }
        // Get all dealers with accounts
        const dealers = yield prisma_1.default.dealer.findMany({
            where: Object.assign({ OR: [
                    { userId: userId }, // Static dealers
                    { ownerId: { not: null } }, // Platform dealers
                ] }, (search
                ? {
                    OR: [
                        { name: { contains: search, mode: "insensitive" } },
                        { contact: { contains: search, mode: "insensitive" } },
                    ],
                }
                : {})),
            include: {
                companyAccounts: {
                    where: { companyId: company.id },
                    select: {
                        balance: true,
                        totalSales: true,
                        lastSaleDate: true,
                        lastPaymentDate: true,
                    },
                },
            },
        });
        // Map dealers with their account balances
        const partiesWithBalance = dealers.map((dealer) => {
            const account = dealer.companyAccounts[0]; // One account per company-dealer pair
            return {
                id: dealer.id,
                name: dealer.name,
                contact: dealer.contact,
                address: dealer.address,
                balance: account ? Number(account.balance) : 0,
                lastTransactionDate: (account === null || account === void 0 ? void 0 : account.lastSaleDate) || (account === null || account === void 0 ? void 0 : account.lastPaymentDate) || null,
                totalSales: account ? Number(account.totalSales) : 0,
            };
        });
        // Filter out dealers with no balance and no sales
        const activeParties = partiesWithBalance.filter((p) => p.balance !== 0 || p.totalSales > 0);
        return res.status(200).json({
            success: true,
            data: activeParties,
        });
    }
    catch (error) {
        console.error("Get company ledger parties error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getCompanyLedgerParties = getCompanyLedgerParties;
// ==================== GET COMPANY LEDGER SUMMARY ====================
const getCompanyLedgerSummary = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { startDate, endDate } = req.query;
        // Get company
        const company = yield prisma_1.default.company.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!company) {
            return res.status(404).json({ message: "Company not found" });
        }
        const stats = yield companyService_1.CompanyService.getStatistics(company.id, startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined);
        // Get pending payment requests
        const pendingRequests = yield prisma_1.default.paymentRequest.count({
            where: {
                companyId: company.id,
                status: { in: ["PENDING", "ACCEPTED", "PAYMENT_SUBMITTED"] },
            },
        });
        // Get total outstanding from all dealer accounts
        const accountsBalance = yield prisma_1.default.companyDealerAccount.aggregate({
            where: { companyId: company.id },
            _sum: { balance: true },
        });
        // Get total payments received
        const totalPayments = yield prisma_1.default.companyDealerPayment.aggregate({
            where: Object.assign({ account: {
                    companyId: company.id,
                } }, (startDate || endDate
                ? {
                    paymentDate: Object.assign(Object.assign({}, (startDate ? { gte: new Date(startDate) } : {})), (endDate ? { lte: new Date(endDate) } : {})),
                }
                : {})),
            _sum: {
                amount: true,
            },
        });
        return res.status(200).json({
            success: true,
            data: {
                totalSales: stats.totalSales,
                totalRevenue: stats.totalRevenue,
                totalOutstanding: Number(accountsBalance._sum.balance || 0),
                totalReceived: Number(totalPayments._sum.amount || 0),
                pendingRequests,
                activeConsignments: stats.activeConsignments,
            },
        });
    }
    catch (error) {
        console.error("Get company ledger summary error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getCompanyLedgerSummary = getCompanyLedgerSummary;
// ==================== ADD COMPANY PAYMENT ====================
const addCompanyPayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { dealerId, saleId, amount, paymentMethod, date, notes } = req.body;
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
        // Record payment to dealer's account (account-based system only)
        yield companyDealerAccountService_1.CompanyDealerAccountService.recordPayment({
            companyId: company.id,
            dealerId,
            amount: Number(amount),
            paymentMethod: paymentMethod || "CASH",
            paymentDate: date ? new Date(date) : new Date(),
            notes,
            recordedById: userId,
        });
        return res.status(201).json({
            success: true,
            message: "Payment recorded successfully",
        });
    }
    catch (error) {
        console.error("Add company payment error:", error);
        return res
            .status(400)
            .json({ message: error.message || "Internal server error" });
    }
});
exports.addCompanyPayment = addCompanyPayment;
