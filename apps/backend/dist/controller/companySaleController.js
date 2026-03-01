"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.getCompanySalesStatistics = exports.addCompanySalePayment = exports.getCompanySaleById = exports.getCompanySales = exports.createCompanySale = exports.searchDealersForCompany = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const companyService_1 = require("../services/companyService");
// ==================== SEARCH DEALERS FOR COMPANY ====================
const searchDealersForCompany = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { search, page = 1, limit = 50 } = req.query;
        // Get company
        const company = yield prisma_1.default.company.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!company) {
            return res.status(404).json({ message: "Company not found" });
        }
        const skip = (Number(page) - 1) * Number(limit);
        // First, get dealer IDs that are connected to this company via DealerCompany
        const dealerCompanies = yield prisma_1.default.dealerCompany.findMany({
            where: {
                companyId: company.id,
            },
            select: {
                dealerId: true,
            },
        });
        const connectedDealerIds = dealerCompanies.map((dc) => dc.dealerId);
        // Build where clause to include ONLY:
        // 1. Dealers manually created by this company (userId = currentUserId)
        // 2. Dealers connected to this company via DealerCompany relationship
        const where = {
            OR: [
                { userId: userId }, // Static dealers created by company
                { id: { in: connectedDealerIds.length > 0 ? connectedDealerIds : [] } }, // Connected dealers only
            ],
        };
        // Add search filter
        if (search) {
            const searchFilter = {
                OR: [
                    { name: { contains: search, mode: "insensitive" } },
                    { contact: { contains: search, mode: "insensitive" } },
                    { address: { contains: search, mode: "insensitive" } },
                ],
            };
            // Combine with existing OR using AND
            where.AND = [
                {
                    OR: where.OR,
                },
                searchFilter,
            ];
            delete where.OR;
        }
        const [dealers, total] = yield Promise.all([
            prisma_1.default.dealer.findMany({
                where,
                skip,
                take: Number(limit),
                orderBy: { createdAt: "desc" },
            }),
            prisma_1.default.dealer.count({ where }),
        ]);
        // Calculate balance and add connection metadata for each dealer
        const dealersWithBalance = yield Promise.all(dealers.map((dealer) => __awaiter(void 0, void 0, void 0, function* () {
            // Check if dealer is connected via DealerCompany relationship
            const dealerCompany = yield prisma_1.default.dealerCompany.findUnique({
                where: {
                    dealerId_companyId: {
                        dealerId: dealer.id,
                        companyId: company.id,
                    },
                },
            });
            const account = yield prisma_1.default.companyDealerAccount.findUnique({
                where: {
                    companyId_dealerId: {
                        companyId: company.id,
                        dealerId: dealer.id,
                    },
                },
                select: {
                    balance: true,
                },
            });
            return Object.assign(Object.assign({}, dealer), { balance: account ? Number(account.balance) : 0, connectionType: dealerCompany ? "CONNECTED" : "MANUAL", isOwnedDealer: dealer.userId === userId });
        })));
        console.log("dealersWithBalance", dealersWithBalance);
        return res.status(200).json({
            success: true,
            data: dealersWithBalance,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error("Search dealers for company error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.searchDealersForCompany = searchDealersForCompany;
// ==================== CREATE COMPANY SALE ====================
const createCompanySale = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { dealerId, items, paymentMethod, notes, date, overrideBalanceLimit, discount, } = req.body;
        // Validation
        if (!dealerId) {
            return res.status(400).json({ message: "Dealer is required" });
        }
        if (!items || items.length === 0) {
            return res.status(400).json({ message: "At least one item is required" });
        }
        // Get company
        const company = yield prisma_1.default.company.findUnique({
            where: { ownerId: userId },
        });
        if (!company) {
            return res.status(404).json({ message: "Company not found" });
        }
        // Create sale using service (account-based system)
        const sale = yield companyService_1.CompanyService.createCompanySale({
            companyId: company.id,
            dealerId,
            soldById: userId,
            items,
            paymentMethod,
            notes,
            date: date ? new Date(date) : new Date(),
            overrideBalanceLimit,
            discount: discount && discount.value > 0
                ? { type: discount.type, value: Number(discount.value) }
                : undefined,
        });
        return res.status(201).json({
            success: true,
            data: sale,
            message: "Sale created successfully",
        });
    }
    catch (error) {
        console.error("Create company sale error:", error);
        return res
            .status(400)
            .json({ message: error.message || "Internal server error" });
    }
});
exports.createCompanySale = createCompanySale;
// ==================== GET COMPANY SALES ====================
const getCompanySales = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { page = 1, limit = 10, search, startDate, endDate, isPaid, dealerId, } = req.query;
        // Get company
        const company = yield prisma_1.default.company.findUnique({
            where: { ownerId: userId },
        });
        if (!company) {
            return res.status(404).json({ message: "Company not found" });
        }
        const skip = (Number(page) - 1) * Number(limit);
        const where = {
            companyId: company.id,
        };
        if (search) {
            where.OR = [
                { invoiceNumber: { contains: search, mode: "insensitive" } },
                { notes: { contains: search, mode: "insensitive" } },
            ];
        }
        if (startDate || endDate) {
            where.date = {};
            if (startDate)
                where.date.gte = new Date(startDate);
            if (endDate)
                where.date.lte = new Date(endDate);
        }
        // Note: isPaid filter removed - use account-based balance checking instead
        // if (isPaid === "true") {
        //   where.dueAmount = null;
        // } else if (isPaid === "false") {
        //   where.dueAmount = { not: null };
        // }
        if (dealerId) {
            where.dealerId = dealerId;
        }
        const [sales, total] = yield Promise.all([
            prisma_1.default.companySale.findMany({
                where,
                skip,
                take: Number(limit),
                include: {
                    dealer: true,
                    discount: true,
                    items: {
                        include: {
                            product: true,
                        },
                    },
                    account: true,
                },
                orderBy: { date: "desc" },
            }),
            prisma_1.default.companySale.count({ where }),
        ]);
        return res.status(200).json({
            success: true,
            data: sales,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error("Get company sales error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getCompanySales = getCompanySales;
// ==================== GET COMPANY SALE BY ID ====================
const getCompanySaleById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { id } = req.params;
        // Get company
        const company = yield prisma_1.default.company.findUnique({
            where: { ownerId: userId },
        });
        if (!company) {
            return res.status(404).json({ message: "Company not found" });
        }
        const sale = yield prisma_1.default.companySale.findFirst({
            where: {
                id,
                companyId: company.id,
            },
            include: {
                dealer: true,
                discount: true,
                items: {
                    include: {
                        product: true,
                    },
                },
                account: true,
                ledgerEntries: {
                    orderBy: {
                        date: "desc",
                    },
                },
            },
        });
        if (!sale) {
            return res.status(404).json({ message: "Sale not found" });
        }
        return res.status(200).json({
            success: true,
            data: sale,
        });
    }
    catch (error) {
        console.error("Get company sale by ID error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getCompanySaleById = getCompanySaleById;
// ==================== ADD COMPANY SALE PAYMENT ====================
// Redirected to account-based payment system
const addCompanySalePayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const { amount, paymentMethod, description, date } = req.body;
        // Validation
        if (!amount || amount <= 0) {
            return res.status(400).json({
                message: "Valid amount is required",
            });
        }
        // Get company
        const company = yield prisma_1.default.company.findUnique({
            where: { ownerId: userId },
        });
        if (!company) {
            return res.status(404).json({ message: "Company not found" });
        }
        // Get sale to find dealerId
        const sale = yield prisma_1.default.companySale.findFirst({
            where: { id, companyId: company.id },
            select: { dealerId: true },
        });
        if (!sale) {
            return res.status(404).json({ message: "Sale not found" });
        }
        // Record payment to dealer's account (account-based system)
        const { CompanyDealerAccountService } = yield Promise.resolve().then(() => __importStar(require("../services/companyDealerAccountService")));
        yield CompanyDealerAccountService.recordPayment({
            companyId: company.id,
            dealerId: sale.dealerId,
            amount: Number(amount),
            paymentMethod: paymentMethod || "CASH",
            paymentDate: date ? new Date(date) : new Date(),
            notes: description,
            recordedById: userId,
        });
        return res.status(200).json({
            success: true,
            message: "Payment recorded to dealer account",
        });
    }
    catch (error) {
        console.error("Add company sale payment error:", error);
        return res
            .status(400)
            .json({ message: error.message || "Internal server error" });
    }
});
exports.addCompanySalePayment = addCompanySalePayment;
// ==================== GET COMPANY SALES STATISTICS ====================
const getCompanySalesStatistics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { startDate, endDate } = req.query;
        // Get company
        const company = yield prisma_1.default.company.findUnique({
            where: { ownerId: userId },
        });
        if (!company) {
            return res.status(404).json({ message: "Company not found" });
        }
        const where = {
            companyId: company.id,
        };
        if (startDate || endDate) {
            where.date = {};
            if (startDate)
                where.date.gte = new Date(startDate);
            if (endDate)
                where.date.lte = new Date(endDate);
        }
        // Get totals
        const sales = yield prisma_1.default.companySale.findMany({
            where,
        });
        const totalSales = sales.length;
        const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
        const creditSales = sales.filter((sale) => sale.isCredit).length;
        // Get top dealers
        const topDealers = yield prisma_1.default.companySale.groupBy({
            by: ["dealerId"],
            where: Object.assign(Object.assign({}, where), { dealerId: { not: null } }),
            _sum: {
                totalAmount: true,
            },
            _count: true,
            orderBy: {
                _sum: {
                    totalAmount: "desc",
                },
            },
            take: 5,
        });
        // Get dealer details
        const topDealersWithDetails = yield Promise.all(topDealers.map((td) => __awaiter(void 0, void 0, void 0, function* () {
            const dealer = yield prisma_1.default.dealer.findUnique({
                where: { id: td.dealerId },
            });
            return {
                dealer,
                totalAmount: td._sum.totalAmount,
                totalSales: td._count,
            };
        })));
        // Get total outstanding from dealer accounts
        const accountsBalance = yield prisma_1.default.companyDealerAccount.aggregate({
            where: { companyId: company.id },
            _sum: { balance: true },
        });
        return res.status(200).json({
            success: true,
            data: {
                totalSales,
                totalRevenue,
                totalOutstanding: Number(accountsBalance._sum.balance || 0),
                creditSales,
                topDealers: topDealersWithDetails,
            },
        });
    }
    catch (error) {
        console.error("Get company sales statistics error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getCompanySalesStatistics = getCompanySalesStatistics;
