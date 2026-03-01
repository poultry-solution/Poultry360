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
exports.checkFarmerBalanceLimit = exports.setFarmerBalanceLimit = exports.getDealerFarmerAccountStatement = exports.getDealerFarmerAccount = exports.getDealerFarmerAccounts = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const dealerFarmerAccountService_1 = require("../services/dealerFarmerAccountService");
const client_1 = require("@prisma/client");
// ==================== LIST FARMER ACCOUNTS (DEALER SIDE) ====================
const getDealerFarmerAccounts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        const accounts = yield dealerFarmerAccountService_1.DealerFarmerAccountService.getDealerAccounts(dealer.id);
        return res.status(200).json({
            success: true,
            data: accounts,
        });
    }
    catch (error) {
        console.error("Get dealer farmer accounts error:", error);
        return res.status(500).json({ message: error.message || "Internal server error" });
    }
});
exports.getDealerFarmerAccounts = getDealerFarmerAccounts;
// ==================== GET FARMER ACCOUNT (DEALER SIDE) ====================
const getDealerFarmerAccount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { farmerId } = req.params;
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        const account = yield dealerFarmerAccountService_1.DealerFarmerAccountService.getOrCreateAccount(dealer.id, farmerId);
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
                farmer: account.farmer,
            },
        });
    }
    catch (error) {
        console.error("Get dealer farmer account error:", error);
        return res.status(500).json({ message: error.message || "Internal server error" });
    }
});
exports.getDealerFarmerAccount = getDealerFarmerAccount;
// ==================== GET FARMER ACCOUNT STATEMENT (DEALER SIDE) ====================
const getDealerFarmerAccountStatement = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { farmerId } = req.params;
        const { startDate, endDate, page = 1, limit = 50 } = req.query;
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        const statement = yield dealerFarmerAccountService_1.DealerFarmerAccountService.getAccountStatement({
            dealerId: dealer.id,
            farmerId,
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
        console.error("Get dealer farmer account statement error:", error);
        return res.status(500).json({ message: error.message || "Internal server error" });
    }
});
exports.getDealerFarmerAccountStatement = getDealerFarmerAccountStatement;
// ==================== SET FARMER BALANCE LIMIT (DEALER SIDE) ====================
const setFarmerBalanceLimit = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { farmerId } = req.params;
        const { balanceLimit } = req.body;
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        const farmer = yield prisma_1.default.user.findFirst({
            where: { id: farmerId, role: client_1.UserRole.OWNER },
        });
        if (!farmer) {
            return res.status(404).json({ message: "Farmer not found" });
        }
        const connection = yield prisma_1.default.dealerFarmer.findFirst({
            where: {
                dealerId: dealer.id,
                farmerId,
                archivedByDealer: false,
                archivedByFarmer: false,
            },
        });
        if (!connection) {
            return res.status(403).json({
                message: "No active connection with this farmer. You can only set balance limits for linked farmers.",
            });
        }
        const normalizedLimit = balanceLimit === undefined || balanceLimit === null || balanceLimit === ""
            ? null
            : Number(balanceLimit);
        if (normalizedLimit !== null && (isNaN(normalizedLimit) || normalizedLimit < 0)) {
            return res.status(400).json({
                message: "Balance limit must be a non-negative number or null",
            });
        }
        const account = yield dealerFarmerAccountService_1.DealerFarmerAccountService.setBalanceLimit({
            dealerId: dealer.id,
            farmerId,
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
        console.error("Set farmer balance limit error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.setFarmerBalanceLimit = setFarmerBalanceLimit;
// ==================== CHECK FARMER BALANCE LIMIT (DEALER SIDE) ====================
const checkFarmerBalanceLimit = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { farmerId } = req.params;
        const { saleAmount } = req.body;
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        const connection = yield prisma_1.default.dealerFarmer.findFirst({
            where: {
                dealerId: dealer.id,
                farmerId,
                archivedByDealer: false,
                archivedByFarmer: false,
            },
        });
        if (!connection) {
            return res.status(403).json({
                message: "No active connection with this farmer. You can only check balance limits for linked farmers.",
            });
        }
        const parsed = Number(saleAmount);
        if (!Number.isFinite(parsed) || parsed < 0) {
            return res.status(400).json({
                message: "Valid sale amount is required",
            });
        }
        const result = yield dealerFarmerAccountService_1.DealerFarmerAccountService.checkBalanceLimit({
            dealerId: dealer.id,
            farmerId,
            saleAmount: parsed,
        });
        return res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        console.error("Check farmer balance limit error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.checkFarmerBalanceLimit = checkFarmerBalanceLimit;
