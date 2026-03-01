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
exports.getCompanyProducts = exports.getDealerTransactions = exports.getDealerStatistics = exports.deleteDealerTransaction = exports.addDealerTransaction = exports.deleteDealer = exports.updateDealer = exports.createDealer = exports.getDealerById = exports.getAllDealers = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const client_1 = require("@prisma/client");
const shared_types_1 = require("@myapp/shared-types");
const inventoryService_1 = require("../services/inventoryService");
// ==================== GET ALL DEALERS ====================
const getAllDealers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = 1, limit = 10, search } = req.query;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        const skip = (Number(page) - 1) * Number(limit);
        // Get company for company users (needed for both query and balance calculation)
        let company = null;
        if (currentUserRole === client_1.UserRole.COMPANY) {
            company = yield prisma_1.default.company.findUnique({
                where: { ownerId: currentUserId },
                select: { id: true },
            });
            if (!company) {
                return res.json({
                    success: true,
                    data: [],
                    pagination: {
                        page: Number(page),
                        limit: Number(limit),
                        total: 0,
                        totalPages: 0,
                    },
                });
            }
        }
        // Build where clause
        let where;
        let dealerFarmerConnections = new Map();
        let dealerCompanyConnections = new Map();
        // For company users, get dealers linked via DealerCompany relationship OR manually created
        if (currentUserRole === client_1.UserRole.COMPANY && company) {
            // Get dealer IDs linked to this company via DealerCompany table (exclude archived)
            const dealerCompanies = yield prisma_1.default.dealerCompany.findMany({
                where: {
                    companyId: company.id,
                    archivedByCompany: false, // Filter out archived connections
                },
                select: {
                    id: true,
                    dealerId: true,
                },
            });
            const linkedDealerIds = dealerCompanies.map((dc) => dc.dealerId);
            // Store connection metadata for later use
            dealerCompanies.forEach((dc) => {
                dealerCompanyConnections.set(dc.dealerId, {
                    connectionId: dc.id,
                    connectionType: "CONNECTED",
                });
            });
            // Include dealers where:
            // 1. Has DealerCompany relationship with this company (not archived)
            // 2. OR userId matches current user (manually created dealers)
            where = {
                OR: [
                    { id: { in: linkedDealerIds.length > 0 ? linkedDealerIds : [null] } },
                    { userId: currentUserId },
                ],
            };
        }
        else {
            // For farmers (OWNER role), fetch both manual and connected dealers
            const dealerFarmers = yield prisma_1.default.dealerFarmer.findMany({
                where: {
                    farmerId: currentUserId,
                    archivedByFarmer: false,
                },
                include: {
                    dealer: true,
                },
            });
            const connectedDealerIds = dealerFarmers.map((df) => df.dealerId);
            // Store connection metadata for later use
            dealerFarmers.forEach((df) => {
                dealerFarmerConnections.set(df.dealerId, {
                    connectionId: df.id,
                    connectionType: "CONNECTED",
                });
            });
            // Include dealers where:
            // 1. Manually created by farmer (userId = farmerId)
            // 2. OR connected via DealerFarmer (archivedByFarmer = false)
            where = {
                OR: [
                    { userId: currentUserId },
                ],
            };
            // Only add connected dealers condition if there are any
            if (connectedDealerIds.length > 0) {
                where.OR.push({ id: { in: connectedDealerIds } });
            }
        }
        // Add search filter
        if (search) {
            const searchFilter = {
                OR: [
                    { name: { contains: search, mode: "insensitive" } },
                    { contact: { contains: search, mode: "insensitive" } },
                    { address: { contains: search, mode: "insensitive" } },
                ],
            };
            // Combine with existing where clause
            where = {
                AND: [
                    where,
                    searchFilter,
                ],
            };
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
        // Pre-fetch DealerFarmerAccount balances for connected dealers (farmer users only)
        let farmerAccountBalances = new Map();
        if (currentUserRole !== client_1.UserRole.COMPANY) {
            const connectedDealerIds = Array.from(dealerFarmerConnections.keys());
            if (connectedDealerIds.length > 0) {
                const accounts = yield prisma_1.default.dealerFarmerAccount.findMany({
                    where: {
                        farmerId: currentUserId,
                        dealerId: { in: connectedDealerIds },
                    },
                    select: {
                        dealerId: true,
                        balance: true,
                        totalSales: true,
                        totalPayments: true,
                    },
                });
                accounts.forEach((a) => {
                    farmerAccountBalances.set(a.dealerId, {
                        balance: Number(a.balance),
                        totalSales: Number(a.totalSales),
                        totalPayments: Number(a.totalPayments),
                    });
                });
            }
        }
        // Calculate balance for each dealer
        const dealersWithBalance = yield Promise.all(dealers.map((dealer) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            let balance = 0;
            let thisMonthAmount = 0;
            let totalTransactions = 0;
            let recentTransactions = [];
            // Determine connection type first
            let connectionInfo;
            if (currentUserRole === client_1.UserRole.COMPANY) {
                connectionInfo = dealerCompanyConnections.get(dealer.id);
            }
            else {
                connectionInfo = dealerFarmerConnections.get(dealer.id);
            }
            const connectionType = connectionInfo ? "CONNECTED" : "MANUAL";
            const isOwnedDealer = !!dealer.ownerId;
            // For company users, fetch balance from CompanyDealerAccount
            if (currentUserRole === client_1.UserRole.COMPANY && company) {
                const account = yield prisma_1.default.companyDealerAccount.findUnique({
                    where: {
                        companyId_dealerId: {
                            companyId: company.id,
                            dealerId: dealer.id,
                        },
                    },
                    select: {
                        balance: true,
                        totalSales: true,
                        totalPayments: true,
                    },
                });
                balance = account ? Number(account.balance) : 0;
                const currentMonth = new Date();
                currentMonth.setDate(1);
                currentMonth.setHours(0, 0, 0, 0);
                const sales = yield prisma_1.default.companySale.findMany({
                    where: {
                        companyId: company.id,
                        dealerId: dealer.id,
                        createdAt: { gte: currentMonth },
                    },
                    select: {
                        totalAmount: true,
                        createdAt: true,
                    },
                    orderBy: { createdAt: "desc" },
                    take: 5,
                });
                thisMonthAmount = sales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
                const totalSalesCount = yield prisma_1.default.companySale.count({
                    where: {
                        companyId: company.id,
                        dealerId: dealer.id,
                    },
                });
                totalTransactions = totalSalesCount;
                recentTransactions = sales;
            }
            else if (connectionType === "CONNECTED") {
                // For connected dealers: use DealerFarmerAccount balance
                const accountData = farmerAccountBalances.get(dealer.id);
                balance = (_a = accountData === null || accountData === void 0 ? void 0 : accountData.balance) !== null && _a !== void 0 ? _a : 0;
                // Get recent transactions from EntityTransaction for display
                const currentMonth = new Date();
                currentMonth.setDate(1);
                currentMonth.setHours(0, 0, 0, 0);
                const transactions = yield prisma_1.default.entityTransaction.findMany({
                    where: { dealerId: dealer.id },
                    orderBy: { date: "desc" },
                    take: 5,
                });
                const thisMonthTxns = yield prisma_1.default.entityTransaction.findMany({
                    where: {
                        dealerId: dealer.id,
                        type: "PURCHASE",
                        date: { gte: currentMonth },
                    },
                    select: { amount: true },
                });
                thisMonthAmount = thisMonthTxns.reduce((sum, t) => sum + Number(t.amount), 0);
                totalTransactions = yield prisma_1.default.entityTransaction.count({
                    where: { dealerId: dealer.id },
                });
                recentTransactions = transactions;
            }
            else {
                // For manual dealers: use dealer.balance stored field
                balance = Number(dealer.balance);
                const currentMonth = new Date();
                currentMonth.setDate(1);
                currentMonth.setHours(0, 0, 0, 0);
                const transactions = yield prisma_1.default.entityTransaction.findMany({
                    where: { dealerId: dealer.id },
                    orderBy: { date: "desc" },
                    take: 5,
                });
                const thisMonthTxns = yield prisma_1.default.entityTransaction.findMany({
                    where: {
                        dealerId: dealer.id,
                        type: "PURCHASE",
                        date: { gte: currentMonth },
                    },
                    select: { amount: true },
                });
                thisMonthAmount = thisMonthTxns.reduce((sum, t) => sum + Number(t.amount), 0);
                totalTransactions = yield prisma_1.default.entityTransaction.count({
                    where: { dealerId: dealer.id },
                });
                recentTransactions = transactions;
            }
            return Object.assign(Object.assign({}, dealer), { balance,
                thisMonthAmount,
                totalTransactions,
                recentTransactions,
                connectionType, connectionId: connectionInfo === null || connectionInfo === void 0 ? void 0 : connectionInfo.connectionId, isOwnedDealer });
        })));
        return res.json({
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
        console.error("Get all dealers error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getAllDealers = getAllDealers;
// ==================== GET DEALER BY ID ====================
const getDealerById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const currentUserId = req.userId;
        // Check if dealer is manually created OR connected via DealerFarmer
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { id },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        // Verify access: either manually created or connected
        const isManualDealer = dealer.userId === currentUserId;
        const dealerFarmerConnection = yield prisma_1.default.dealerFarmer.findFirst({
            where: {
                dealerId: id,
                farmerId: currentUserId,
                archivedByFarmer: false,
            },
        });
        if (!isManualDealer && !dealerFarmerConnection) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        // Determine connection type
        const connectionType = dealerFarmerConnection ? "CONNECTED" : "MANUAL";
        const isOwnedDealer = !!dealer.ownerId;
        // ── Connected dealers: use DealerFarmerAccount + DealerSale/DealerFarmerPayment ──
        if (connectionType === "CONNECTED") {
            const account = yield prisma_1.default.dealerFarmerAccount.findFirst({
                where: { dealerId: id, farmerId: currentUserId },
                select: {
                    id: true,
                    balance: true,
                    totalSales: true,
                    totalPayments: true,
                },
            });
            const balance = account ? Number(account.balance) : 0;
            const totalSales = account ? Number(account.totalSales) : 0;
            const totalPaymentsAmt = account ? Number(account.totalPayments) : 0;
            // Get sales (purchases from farmer's perspective) from DealerSale
            const sales = account
                ? yield prisma_1.default.dealerSale.findMany({
                    where: { accountId: account.id },
                    orderBy: { date: "desc" },
                    include: {
                        items: { include: { product: { select: { name: true } } } },
                        discount: true,
                    },
                })
                : [];
            // Get payments from DealerFarmerPayment
            const farmerPayments = account
                ? yield prisma_1.default.dealerFarmerPayment.findMany({
                    where: { accountId: account.id },
                    orderBy: { paymentDate: "desc" },
                })
                : [];
            // Map sales to purchases format for the frontend
            const purchases = sales.map((sale) => {
                var _a, _b;
                return ({
                    id: sale.id,
                    itemName: sale.items.map((i) => { var _a; return ((_a = i.product) === null || _a === void 0 ? void 0 : _a.name) || "Item"; }).join(", ") ||
                        "Sale",
                    purchaseCategory: null,
                    quantity: sale.items.reduce((sum, i) => sum + i.quantity, 0),
                    freeQuantity: 0,
                    amount: Number(sale.totalAmount),
                    subtotalAmount: sale.subtotalAmount ? Number(sale.subtotalAmount) : null,
                    discountType: ((_a = sale.discount) === null || _a === void 0 ? void 0 : _a.type) || null,
                    discountValue: ((_b = sale.discount) === null || _b === void 0 ? void 0 : _b.value) ? Number(sale.discount.value) : null,
                    date: sale.date,
                    description: sale.notes,
                    reference: sale.invoiceNumber,
                });
            });
            // Map DealerFarmerPayment to payments format
            const paymentsList = farmerPayments.map((p) => ({
                id: p.id,
                amount: Number(p.amount),
                date: p.paymentDate,
                description: p.notes,
                reference: p.reference,
                paymentMethod: p.paymentMethod,
                balanceAfter: Number(p.balanceAfter),
            }));
            const currentMonth = new Date();
            currentMonth.setDate(1);
            currentMonth.setHours(0, 0, 0, 0);
            const thisMonthPurchases = sales.filter((s) => new Date(s.date) >= currentMonth);
            const thisMonthAmount = thisMonthPurchases.reduce((sum, s) => sum + Number(s.totalAmount), 0);
            return res.json({
                success: true,
                data: Object.assign(Object.assign({}, dealer), { balance,
                    thisMonthAmount, totalTransactions: sales.length + farmerPayments.length, transactionTable: [], purchases, payments: paymentsList, connectionType, connectionId: dealerFarmerConnection === null || dealerFarmerConnection === void 0 ? void 0 : dealerFarmerConnection.id, isOwnedDealer, summary: {
                        totalPurchases: purchases.length,
                        totalPayments: paymentsList.length,
                        outstandingAmount: balance,
                        totalPurchasedAmount: totalSales,
                        totalPaidAmount: totalPaymentsAmt,
                        thisMonthPurchases: thisMonthPurchases.length,
                    } }),
            });
        }
        // ── Manual dealers: use dealer.balance + EntityTransaction ──
        const balance = Number(dealer.balance);
        const transactions = yield prisma_1.default.entityTransaction.findMany({
            where: { dealerId: id },
            orderBy: { date: "desc" },
        });
        const currentMonth = new Date();
        currentMonth.setDate(1);
        currentMonth.setHours(0, 0, 0, 0);
        const thisMonthTransactions = transactions.filter((t) => new Date(t.date) >= currentMonth);
        const thisMonthAmount = thisMonthTransactions
            .filter((t) => t.type === "PURCHASE")
            .reduce((sum, t) => sum + Number(t.amount), 0);
        // Group transactions by item for the table view
        const transactionGroups = transactions.reduce((groups, transaction) => {
            if (transaction.type === "PURCHASE") {
                const key = `${transaction.itemName || "Unknown Item"}_${transaction.id}`;
                if (!groups[key]) {
                    groups[key] = {
                        id: transaction.id,
                        itemName: transaction.itemName || "Unknown Item",
                        rate: Number(transaction.amount) / Number(transaction.quantity || 1),
                        quantity: 0,
                        totalAmount: 0,
                        amountPaid: 0,
                        amountDue: 0,
                        date: transaction.date,
                        dueDate: new Date(transaction.date.getTime() + 30 * 24 * 60 * 60 * 1000),
                        payments: [],
                    };
                }
                groups[key].quantity += transaction.quantity || 0;
                groups[key].totalAmount += Number(transaction.amount);
                groups[key].amountDue += Number(transaction.amount);
            }
            return groups;
        }, {});
        const purchaseGroups = Object.values(transactionGroups);
        const paymentsRaw = transactions.filter((t) => t.type === "PAYMENT");
        for (const payment of paymentsRaw) {
            const paymentAmount = Number(payment.amount);
            if (!payment.paymentToPurchaseId)
                continue;
            const targetGroup = purchaseGroups.find((group) => group.id === payment.paymentToPurchaseId);
            if (!targetGroup)
                continue;
            const currentDue = targetGroup.totalAmount - targetGroup.amountPaid;
            if (currentDue <= 0)
                continue;
            const paymentToApply = Math.min(paymentAmount, currentDue);
            targetGroup.amountPaid += paymentToApply;
            targetGroup.amountDue = Math.max(0, targetGroup.totalAmount - targetGroup.amountPaid);
            targetGroup.payments.push({
                amount: paymentToApply,
                date: payment.date,
                reference: payment.reference,
            });
        }
        const transactionTable = Object.values(transactionGroups);
        const purchases = transactions
            .filter((t) => t.type === "PURCHASE")
            .map((t) => ({
            id: t.id,
            itemName: t.itemName,
            purchaseCategory: t.purchaseCategory,
            quantity: t.quantity,
            freeQuantity: t.freeQuantity,
            amount: Number(t.amount),
            unitPrice: t.unitPrice ? Number(t.unitPrice) : null,
            unit: t.unit || null,
            date: t.date,
            description: t.description,
            reference: t.reference,
        }));
        const paymentsList = transactions
            .filter((t) => t.type === "PAYMENT")
            .map((t) => ({
            id: t.id,
            amount: Number(t.amount),
            date: t.date,
            description: t.description,
            reference: t.reference,
            paymentToPurchaseId: t.paymentToPurchaseId,
        }));
        return res.json({
            success: true,
            data: Object.assign(Object.assign({}, dealer), { balance,
                thisMonthAmount, totalTransactions: transactions.length, transactionTable,
                purchases, payments: paymentsList, connectionType, connectionId: dealerFarmerConnection === null || dealerFarmerConnection === void 0 ? void 0 : dealerFarmerConnection.id, isOwnedDealer, summary: {
                    totalPurchases: purchases.length,
                    totalPayments: paymentsList.length,
                    outstandingAmount: balance,
                    thisMonthPurchases: thisMonthTransactions.filter((t) => t.type === "PURCHASE").length,
                } }),
        });
    }
    catch (error) {
        console.error("Get dealer by ID error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getDealerById = getDealerById;
// ==================== CREATE DEALER ====================
const createDealer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currentUserId = req.userId;
        // Validate request body
        const { success, data, error } = shared_types_1.CreateDealerSchema.safeParse(req.body);
        if (!success) {
            return res.status(400).json({ message: error === null || error === void 0 ? void 0 : error.message });
        }
        // Check if dealer with same name already exists for this user (manually created)
        const existingManualDealer = yield prisma_1.default.dealer.findFirst({
            where: {
                userId: currentUserId,
                name: data.name,
            },
        });
        if (existingManualDealer) {
            return res
                .status(400)
                .json({ message: "Dealer with this name already exists" });
        }
        // Check if a connected dealer with the same name exists
        const connectedDealers = yield prisma_1.default.dealerFarmer.findMany({
            where: {
                farmerId: currentUserId,
                archivedByFarmer: false,
            },
            include: {
                dealer: true,
            },
        });
        const connectedDealerWithSameName = connectedDealers.find((df) => df.dealer.name.toLowerCase() === data.name.toLowerCase());
        if (connectedDealerWithSameName) {
            return res.status(400).json({
                message: "A connected dealer with this name already exists. You cannot create a duplicate dealer.",
            });
        }
        // Create dealer
        const dealer = yield prisma_1.default.dealer.create({
            data: {
                name: data.name,
                contact: data.contact,
                address: data.address,
                userId: currentUserId,
            },
        });
        return res.status(201).json({
            success: true,
            data: dealer,
            message: "Dealer created successfully",
        });
    }
    catch (error) {
        console.error("Create dealer error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.createDealer = createDealer;
// ==================== UPDATE DEALER ====================
const updateDealer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const currentUserId = req.userId;
        // Validate request body
        const { success, data, error } = shared_types_1.UpdateDealerSchema.safeParse(req.body);
        if (!success) {
            return res.status(400).json({ message: error === null || error === void 0 ? void 0 : error.message });
        }
        // Check if dealer exists and belongs to user
        const existingDealer = yield prisma_1.default.dealer.findFirst({
            where: {
                id,
                userId: currentUserId,
            },
        });
        if (!existingDealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        // Check for name uniqueness if name is being updated
        if (data.name && data.name !== existingDealer.name) {
            const nameExists = yield prisma_1.default.dealer.findFirst({
                where: {
                    userId: currentUserId,
                    name: data.name,
                    id: { not: id },
                },
            });
            if (nameExists) {
                return res
                    .status(400)
                    .json({ message: "Dealer with this name already exists" });
            }
        }
        // Update dealer
        const updatedDealer = yield prisma_1.default.dealer.update({
            where: { id },
            data,
        });
        return res.json({
            success: true,
            data: updatedDealer,
            message: "Dealer updated successfully",
        });
    }
    catch (error) {
        console.error("Update dealer error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.updateDealer = updateDealer;
// ==================== DELETE DEALER ====================
const deleteDealer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Check if dealer exists
        const existingDealer = yield prisma_1.default.dealer.findUnique({
            where: { id },
        });
        if (!existingDealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        // Handle company users
        if (currentUserRole === client_1.UserRole.COMPANY) {
            // Get company
            const company = yield prisma_1.default.company.findUnique({
                where: { ownerId: currentUserId },
                select: { id: true },
            });
            if (!company) {
                return res.status(404).json({ message: "Company not found" });
            }
            // Check if dealer is connected via DealerCompany
            const dealerCompanyConnection = yield prisma_1.default.dealerCompany.findUnique({
                where: {
                    dealerId_companyId: {
                        dealerId: id,
                        companyId: company.id,
                    },
                },
            });
            // Check if dealer is manually created by company
            const isManualDealer = existingDealer.userId === currentUserId;
            // Verify access
            if (!isManualDealer && !dealerCompanyConnection) {
                return res.status(404).json({ message: "Dealer not found" });
            }
            // For connected dealers, archive the connection instead of deleting
            if (dealerCompanyConnection && !isManualDealer) {
                // Archive the connection
                yield prisma_1.default.dealerCompany.update({
                    where: {
                        dealerId_companyId: {
                            dealerId: id,
                            companyId: company.id,
                        },
                    },
                    data: { archivedByCompany: true },
                });
                return res.json({
                    success: true,
                    message: "Dealer connection archived successfully",
                });
            }
            // Only allow deletion of manually created dealers
            if (!isManualDealer) {
                return res.status(403).json({
                    message: "You can only delete dealers you created manually.",
                });
            }
            // Check dependencies for self-created dealers
            const [salesCount, account] = yield Promise.all([
                prisma_1.default.companySale.count({
                    where: {
                        companyId: company.id,
                        dealerId: id,
                    },
                }),
                prisma_1.default.companyDealerAccount.findUnique({
                    where: {
                        companyId_dealerId: {
                            companyId: company.id,
                            dealerId: id,
                        },
                    },
                    select: {
                        balance: true,
                    },
                }),
            ]);
            // Check if dealer has sales or account balance
            if (salesCount > 0) {
                return res.status(400).json({
                    message: "Cannot delete dealer with existing sales. Please remove all sales first.",
                });
            }
            if (account && Number(account.balance) !== 0) {
                return res.status(400).json({
                    message: `Cannot delete dealer with account balance of रू ${Math.abs(Number(account.balance)).toFixed(2)}. Please settle the account first.`,
                });
            }
            // Safe to delete
            yield prisma_1.default.dealer.delete({
                where: { id },
            });
            return res.json({
                success: true,
                message: "Dealer deleted successfully",
            });
        }
        // Handle farmer users (existing logic)
        const isManualDealer = existingDealer.userId === currentUserId;
        const dealerFarmerConnection = yield prisma_1.default.dealerFarmer.findFirst({
            where: {
                dealerId: id,
                farmerId: currentUserId,
                archivedByFarmer: false,
            },
        });
        // Verify access
        if (!isManualDealer && !dealerFarmerConnection) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        // Prevent deletion of connected dealers
        if (dealerFarmerConnection && !isManualDealer) {
            return res.status(400).json({
                message: "Cannot delete connected dealers. Please archive the connection instead from your Connected Dealers page.",
            });
        }
        // Only allow deletion of manually created dealers
        if (!isManualDealer) {
            return res.status(403).json({
                message: "You can only delete dealers you created manually.",
            });
        }
        // Check if dealer has transactions by directly querying entityTransaction table
        const transactionCount = yield prisma_1.default.entityTransaction.count({
            where: {
                dealerId: id,
            },
        });
        // Check if dealer has transactions
        if (transactionCount > 0) {
            return res.status(400).json({
                message: "Cannot delete dealer with existing transactions. Please remove all transactions first.",
            });
        }
        // Delete dealer
        yield prisma_1.default.dealer.delete({
            where: { id },
        });
        return res.json({
            success: true,
            message: "Dealer deleted successfully",
        });
    }
    catch (error) {
        console.error("Delete dealer error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.deleteDealer = deleteDealer;
// ==================== ADD DEALER TRANSACTION ====================
const addDealerTransaction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const currentUserId = req.userId;
        if (!currentUserId) {
            return res.status(400).json({
                message: "No User found in COntrooler",
            });
        }
        const { type, amount, quantity, freeQuantity, itemName, purchaseCategory, date, description, reference, unitPrice, imageUrl, unit, 
        // single-request optional initial payment
        paymentAmount, paymentDescription, 
        // link standalone PAYMENT to a purchase (optional for khata-style)
        paymentToPurchaseId, } = req.body;
        // Validate required fields
        if (!type || amount === undefined || amount === null || !date) {
            return res
                .status(400)
                .json({ message: "Type, amount, and date are required" });
        }
        // Validate transaction type
        if (!Object.values(client_1.TransactionType).includes(type)) {
            return res.status(400).json({ message: "Invalid transaction type" });
        }
        // Normalize numbers and validate positive amount
        const numericAmount = Number(amount);
        const numericQuantity = quantity !== undefined && quantity !== null ? Number(quantity) : null;
        const numericPaymentAmount = paymentAmount !== undefined && paymentAmount !== null ? Number(paymentAmount) : null;
        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({ message: "Amount must be a positive number" });
        }
        // Check if dealer exists
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { id },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        // Verify access: either manually created or connected
        const isManualDealer = dealer.userId === currentUserId;
        const dealerFarmerConnection = yield prisma_1.default.dealerFarmer.findFirst({
            where: {
                dealerId: id,
                farmerId: currentUserId,
                archivedByFarmer: false,
            },
        });
        if (!isManualDealer && !dealerFarmerConnection) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        let transactions = [];
        if (type === client_1.TransactionType.PURCHASE && itemName && numericQuantity !== null) {
            // Enforce positive integer quantity
            if (!Number.isInteger(numericQuantity) || numericQuantity <= 0) {
                return res.status(400).json({ message: "Quantity must be a positive integer" });
            }
            // Validate initial payment if provided
            if (numericPaymentAmount !== null && (!Number.isFinite(numericPaymentAmount) || numericPaymentAmount <= 0)) {
                return res.status(400).json({ message: "Initial payment must be a positive number" });
            }
            // Use inventory service for purchases
            const numericFreeQuantity = freeQuantity !== undefined && freeQuantity !== null ? Number(freeQuantity) : 0;
            const result = yield inventoryService_1.InventoryService.processSupplierPurchase({
                dealerId: id,
                itemName,
                quantity: Number(numericQuantity),
                freeQuantity: numericFreeQuantity,
                unitPrice: Number(unitPrice || numericAmount / Number(numericQuantity)),
                totalAmount: Number(numericAmount),
                date: new Date(date),
                description,
                reference,
                purchaseCategory: purchaseCategory || undefined,
                userId: currentUserId,
                unit: unit || undefined,
            });
            const purchaseTransaction = result.entityTransaction;
            transactions.push(purchaseTransaction);
            if (numericPaymentAmount && numericPaymentAmount > 0) {
                if (numericPaymentAmount > numericAmount) {
                    return res.status(400).json({ message: "Initial payment cannot exceed purchase amount" });
                }
                const paymentTransaction = yield prisma_1.default.entityTransaction.create({
                    data: {
                        type: client_1.TransactionType.PAYMENT,
                        amount: Number(numericPaymentAmount),
                        quantity: null,
                        itemName: null,
                        date: new Date(date),
                        description: paymentDescription || `Initial payment for ${itemName}`,
                        reference: null,
                        dealerId: id,
                        entityType: "DEALER",
                        entityId: id,
                        paymentToPurchaseId: result.purchaseTransactionId,
                    },
                });
                transactions.push(paymentTransaction);
            }
        }
        else {
            // PAYMENT validation and overpayment prevention
            if (type === client_1.TransactionType.PAYMENT) {
                // paymentToPurchaseId is OPTIONAL — if provided, validate and check overpayment
                // If not provided, this is a khata-style general payment (just reduces overall balance)
                if (paymentToPurchaseId) {
                    const purchaseTxn = yield prisma_1.default.entityTransaction.findFirst({
                        where: { id: paymentToPurchaseId, dealerId: id, type: client_1.TransactionType.PURCHASE },
                        select: { id: true, amount: true, reference: true },
                    });
                    if (!purchaseTxn) {
                        return res.status(400).json({ message: "Invalid paymentToPurchaseId: target purchase not found" });
                    }
                    const alreadyPaidAgg = yield prisma_1.default.entityTransaction.aggregate({
                        _sum: { amount: true },
                        where: { type: client_1.TransactionType.PAYMENT, paymentToPurchaseId, dealerId: id },
                    });
                    const alreadyPaid = Number(alreadyPaidAgg._sum.amount || 0);
                    const purchaseTotal = Number(purchaseTxn.amount);
                    const remainingDue = Math.max(0, purchaseTotal - alreadyPaid);
                    if (numericAmount > remainingDue) {
                        return res.status(400).json({ message: `Payment exceeds remaining due. Remaining: ${remainingDue}` });
                    }
                    // Check if this is a connected dealer - create payment request instead
                    if (dealerFarmerConnection && purchaseTxn.reference) {
                        // Find the DealerSale that corresponds to this purchase (by invoice number)
                        const dealerSale = yield prisma_1.default.dealerSale.findFirst({
                            where: {
                                dealerId: id,
                                invoiceNumber: purchaseTxn.reference,
                            },
                            include: {
                                customer: true,
                            },
                        });
                        if (dealerSale && ((_a = dealerSale.customer) === null || _a === void 0 ? void 0 : _a.farmerId) === currentUserId) {
                            // This is a linked sale - create payment request instead of direct payment
                            const { DealerSalePaymentRequestService } = yield Promise.resolve().then(() => __importStar(require("../services/dealerSalePaymentRequestService")));
                            const paymentRequest = yield DealerSalePaymentRequestService.createPaymentRequest({
                                dealerSaleId: dealerSale.id,
                                farmerId: currentUserId,
                                amount: numericAmount,
                                paymentDate: new Date(date),
                                paymentReference: reference || undefined,
                                paymentMethod: undefined,
                                description: description || undefined,
                            });
                            return res.status(201).json({
                                success: true,
                                data: paymentRequest,
                                message: "Payment request created and sent to dealer for approval",
                                isPaymentRequest: true,
                            });
                        }
                    }
                } // end if (paymentToPurchaseId)
            }
            const transaction = yield prisma_1.default.entityTransaction.create({
                data: {
                    type,
                    amount: Number(numericAmount),
                    quantity: numericQuantity ? Number(numericQuantity) : null,
                    itemName: itemName || null,
                    date: new Date(date),
                    description: description || null,
                    reference: reference || null,
                    dealerId: id,
                    entityType: "DEALER",
                    entityId: id,
                    paymentToPurchaseId: type === client_1.TransactionType.PAYMENT ? paymentToPurchaseId || null : null,
                },
            });
            transactions.push(transaction);
        }
        // Update stored balance on dealer for manual dealers
        if (isManualDealer && !dealerFarmerConnection) {
            let balanceIncrement = 0;
            let purchaseIncrement = 0;
            let paymentIncrement = 0;
            for (const txn of transactions) {
                const amt = Number(txn.amount);
                if (txn.type === "PURCHASE" || txn.type === "ADJUSTMENT") {
                    balanceIncrement += amt;
                    purchaseIncrement += amt;
                }
                else if (txn.type === "PAYMENT" || txn.type === "RECEIPT") {
                    balanceIncrement -= amt;
                    paymentIncrement += amt;
                }
            }
            yield prisma_1.default.dealer.update({
                where: { id },
                data: {
                    balance: { increment: balanceIncrement },
                    totalPurchases: { increment: purchaseIncrement },
                    totalPayments: { increment: paymentIncrement },
                },
            });
        }
        return res.status(201).json({
            success: true,
            data: transactions.length === 1 ? transactions[0] : transactions,
            message: transactions.length === 1 ? "Transaction added successfully" : `${transactions.length} transactions added successfully`,
        });
    }
    catch (error) {
        console.error("Add dealer transaction error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.addDealerTransaction = addDealerTransaction;
// ==================== DELETE DEALER TRANSACTION ====================
const deleteDealerTransaction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id, transactionId } = req.params;
        const { password } = req.body;
        const currentUserId = req.userId;
        // Verify password is provided
        if (!password) {
            return res.status(400).json({
                success: false,
                message: "Password confirmation is required for deletion"
            });
        }
        // Verify user's password
        const user = yield prisma_1.default.user.findUnique({
            where: { id: currentUserId },
        });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const bcrypt = require('bcrypt');
        const isValidPassword = yield bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: "Invalid password. Deletion cancelled."
            });
        }
        // Check if dealer exists
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { id },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        // Verify access: either manually created or connected
        const isManualDealer = dealer.userId === currentUserId;
        const dealerFarmerConnection = yield prisma_1.default.dealerFarmer.findFirst({
            where: {
                dealerId: id,
                farmerId: currentUserId,
                archivedByFarmer: false,
            },
        });
        if (!isManualDealer && !dealerFarmerConnection) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        // Verify transaction exists and belongs to dealer
        const txn = yield prisma_1.default.entityTransaction.findFirst({
            where: { id: transactionId, dealerId: id },
            select: {
                id: true,
                type: true,
                amount: true,
                quantity: true,
                date: true,
                description: true,
                inventoryItemId: true,
                expenseId: true,
            },
        });
        if (!txn) {
            return res.status(404).json({ message: "Transaction not found" });
        }
        console.log("🔍 Deleting transaction:", txn);
        console.log("🔍 Transaction type:", txn.type);
        // If this is a PURCHASE, ensure stock was not consumed and reverse inventory safely
        if (txn.type === 'PURCHASE') {
            if (!txn.inventoryItemId || !txn.quantity) {
                return res.status(400).json({ message: 'Purchase transaction missing inventory linkage; cannot safely delete.' });
            }
            const item = yield prisma_1.default.inventoryItem.findUnique({ where: { id: txn.inventoryItemId } });
            if (!item) {
                return res.status(404).json({ message: 'Linked inventory item not found' });
            }
            const currentStock = Number(item.currentStock || 0);
            const qty = Number(txn.quantity || 0);
            if (currentStock < qty) {
                return res.status(400).json({
                    message: `Cannot delete: ${qty} units from purchase have been partially consumed. Available stock: ${currentStock}. Remove usages first.`,
                });
            }
            yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
                // 🔗 Find and delete related PAYMENT transactions using direct relationship
                const relatedPaymentTxns = yield tx.entityTransaction.findMany({
                    where: {
                        dealerId: id,
                        type: 'PAYMENT',
                        paymentToPurchaseId: transactionId,
                    }
                });
                console.log("🔍 Found related payment transactions:", relatedPaymentTxns);
                // Delete related payment transactions
                for (const paymentTxn of relatedPaymentTxns) {
                    console.log("🗑️ Deleting related payment transaction:", paymentTxn.id);
                    yield tx.entityTransaction.delete({ where: { id: paymentTxn.id } });
                }
                // 2) Reduce inventory stock by the purchased quantity (reverse stock-in)
                yield tx.inventoryItem.update({
                    where: { id: txn.inventoryItemId },
                    data: { currentStock: { decrement: qty } },
                });
                // 3) Remove a matching inventoryTransaction (PURCHASE) if present
                const invTxn = yield tx.inventoryTransaction.findFirst({
                    where: {
                        itemId: txn.inventoryItemId,
                        type: 'PURCHASE',
                        quantity: qty,
                    },
                    orderBy: { date: 'desc' },
                });
                if (invTxn) {
                    yield tx.inventoryTransaction.delete({ where: { id: invTxn.id } });
                }
                // 4) Remove the linked expense if it exists
                if (txn.expenseId) {
                    yield tx.expense.delete({ where: { id: txn.expenseId } });
                }
                // 5) Finally, delete the entity transaction
                console.log("🔍 About to delete entity transaction:", transactionId);
                const deletedEntityTxn = yield tx.entityTransaction.delete({ where: { id: transactionId } });
                console.log("✅ Deleted entity transaction:", deletedEntityTxn);
                // 6) Optional cleanup: remove empty inventory item if fully orphaned
                const refreshedItem = yield tx.inventoryItem.findUnique({
                    where: { id: txn.inventoryItemId },
                    select: { id: true, currentStock: true },
                });
                if (refreshedItem && Number(refreshedItem.currentStock || 0) === 0) {
                    const [remainingInvTxns, remainingUsages] = yield Promise.all([
                        tx.inventoryTransaction.count({ where: { itemId: refreshedItem.id } }),
                        tx.inventoryUsage.count({ where: { itemId: refreshedItem.id } }),
                    ]);
                    if (remainingInvTxns === 0 && remainingUsages === 0) {
                        yield tx.inventoryItem.delete({ where: { id: refreshedItem.id } });
                    }
                }
            }));
        }
        else {
            // Non-purchase: no inventory side effects, but still wrap in transaction for consistency
            console.log("🔍 Deleting non-purchase transaction:", transactionId);
            yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
                const deletedTxn = yield tx.entityTransaction.delete({ where: { id: transactionId } });
                console.log("✅ Successfully deleted transaction:", deletedTxn);
            }));
        }
        // Verify transaction was actually deleted
        const verifyDeleted = yield prisma_1.default.entityTransaction.findFirst({
            where: { id: transactionId },
        });
        if (verifyDeleted) {
            console.error("❌ Transaction still exists after deletion attempt:", verifyDeleted);
            return res.status(500).json({ message: "Transaction deletion failed" });
        }
        else {
            console.log("✅ Transaction successfully deleted and verified");
        }
        // Update stored balance on dealer for manual dealers
        if (isManualDealer && !dealerFarmerConnection) {
            const txnAmount = Number(txn.amount);
            let balanceDecrement = 0;
            let purchaseDecrement = 0;
            let paymentDecrement = 0;
            if (txn.type === "PURCHASE" || txn.type === "ADJUSTMENT") {
                // Reverse the purchase: balance goes down
                balanceDecrement = txnAmount;
                purchaseDecrement = txnAmount;
                // Also reverse any related payments that were deleted with the purchase
                const relatedPayments = yield prisma_1.default.entityTransaction.findMany({
                    where: { dealerId: id, type: "PAYMENT", paymentToPurchaseId: transactionId },
                });
                // These were already deleted in the $transaction above, but we captured txn.amount before
                // We need to count the payments that were deleted — they no longer exist in DB
                // So we track them separately: each deleted payment reversed the balance reduction
                // Actually those payments are gone, so let's compute from what we know
                // The related payments were found and deleted inside the $transaction
                // Their deletion means balance should go UP (less was paid)
                // Net effect: purchase deletion = -purchase + deleted_payments
                // But we can't query them now. Let's use a simpler approach:
                // We'll compute from remaining transactions vs stored balance
            }
            else if (txn.type === "PAYMENT" || txn.type === "RECEIPT") {
                // Reverse the payment: balance goes up (we owe more again)
                balanceDecrement = -txnAmount;
                paymentDecrement = txnAmount;
            }
            // For purchases, related payments were also deleted - recalculate balance from scratch
            if (txn.type === "PURCHASE") {
                // Recalculate from remaining transactions for accuracy
                const remainingTxns = yield prisma_1.default.entityTransaction.findMany({
                    where: { dealerId: id },
                });
                const newBalance = remainingTxns.reduce((sum, t) => {
                    if (t.type === "PURCHASE" || t.type === "ADJUSTMENT")
                        return sum + Number(t.amount);
                    if (t.type === "PAYMENT" || t.type === "RECEIPT")
                        return sum - Number(t.amount);
                    return sum;
                }, 0);
                const newTotalPurchases = remainingTxns
                    .filter((t) => t.type === "PURCHASE")
                    .reduce((sum, t) => sum + Number(t.amount), 0);
                const newTotalPayments = remainingTxns
                    .filter((t) => t.type === "PAYMENT")
                    .reduce((sum, t) => sum + Number(t.amount), 0);
                yield prisma_1.default.dealer.update({
                    where: { id },
                    data: {
                        balance: newBalance,
                        totalPurchases: newTotalPurchases,
                        totalPayments: newTotalPayments,
                    },
                });
            }
            else {
                yield prisma_1.default.dealer.update({
                    where: { id },
                    data: {
                        balance: { decrement: balanceDecrement },
                        totalPayments: { decrement: paymentDecrement },
                    },
                });
            }
        }
        return res.json({ success: true, message: "Transaction deleted successfully" });
    }
    catch (error) {
        console.error("Delete dealer transaction error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.deleteDealerTransaction = deleteDealerTransaction;
// ==================== GET DEALER STATISTICS ====================
const getDealerStatistics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const currentUserId = req.userId;
        // Get connected dealers via DealerFarmer
        const dealerFarmers = yield prisma_1.default.dealerFarmer.findMany({
            where: {
                farmerId: currentUserId,
                archivedByFarmer: false,
            },
        });
        const connectedDealerIds = dealerFarmers.map((df) => df.dealerId);
        // Get all dealers for the user (manual + connected)
        const dealerWhere = {
            OR: [
                { userId: currentUserId },
            ],
        };
        // Only add connected dealers condition if there are any
        if (connectedDealerIds.length > 0) {
            dealerWhere.OR.push({ id: { in: connectedDealerIds } });
        }
        const dealers = yield prisma_1.default.dealer.findMany({
            where: dealerWhere,
        });
        // Pre-fetch DealerFarmerAccount balances for connected dealers
        const connectedDealerIdSet = new Set(connectedDealerIds);
        let farmerAccountBalances = new Map();
        if (connectedDealerIds.length > 0) {
            const accounts = yield prisma_1.default.dealerFarmerAccount.findMany({
                where: {
                    farmerId: currentUserId,
                    dealerId: { in: connectedDealerIds },
                },
                select: { dealerId: true, balance: true },
            });
            accounts.forEach((a) => {
                farmerAccountBalances.set(a.dealerId, Number(a.balance));
            });
        }
        // Calculate statistics
        let totalDealers = dealers.length;
        let activeDealers = 0;
        let outstandingAmount = 0;
        let thisMonthAmount = 0;
        const currentMonth = new Date();
        currentMonth.setDate(1);
        currentMonth.setHours(0, 0, 0, 0);
        for (const dealer of dealers) {
            // Get balance from correct source
            let balance = 0;
            if (connectedDealerIdSet.has(dealer.id)) {
                balance = (_a = farmerAccountBalances.get(dealer.id)) !== null && _a !== void 0 ? _a : 0;
            }
            else {
                balance = Number(dealer.balance);
            }
            if (balance > 0) {
                activeDealers++;
                outstandingAmount += balance;
            }
            // This month's purchases (still from EntityTransaction for stats)
            const thisMonthPurchases = yield prisma_1.default.entityTransaction.aggregate({
                _sum: { amount: true },
                where: {
                    dealerId: dealer.id,
                    type: "PURCHASE",
                    date: { gte: currentMonth },
                },
            });
            thisMonthAmount += Number(thisMonthPurchases._sum.amount || 0);
        }
        return res.json({
            success: true,
            data: {
                totalDealers,
                activeDealers,
                outstandingAmount,
                thisMonthAmount,
            },
        });
    }
    catch (error) {
        console.error("Get dealer statistics error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getDealerStatistics = getDealerStatistics;
// ==================== GET DEALER TRANSACTIONS ====================
const getDealerTransactions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { page = 1, limit = 10, type, startDate, endDate } = req.query;
        const currentUserId = req.userId;
        const skip = (Number(page) - 1) * Number(limit);
        // Check if dealer exists and belongs to user
        const dealer = yield prisma_1.default.dealer.findFirst({
            where: {
                id,
                userId: currentUserId,
            },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        // Build where clause
        const where = {
            dealerId: id, // ✅ Use proper foreign key
        };
        if (type) {
            where.type = type;
        }
        if (startDate || endDate) {
            where.date = {};
            if (startDate) {
                where.date.gte = new Date(startDate);
            }
            if (endDate) {
                where.date.lte = new Date(endDate);
            }
        }
        const [transactions, total] = yield Promise.all([
            prisma_1.default.entityTransaction.findMany({
                where,
                skip,
                take: Number(limit),
                orderBy: { date: "desc" },
            }),
            prisma_1.default.entityTransaction.count({ where }),
        ]);
        return res.json({
            success: true,
            data: transactions,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error("Get dealer transactions error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getDealerTransactions = getDealerTransactions;
// ==================== GET COMPANY PRODUCTS FOR DEALER ====================
const getCompanyProducts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { companyId } = req.params;
        const { page = 1, limit = 20, search, type } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        // Get dealer
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        // Verify dealer has connection to company
        const connection = yield prisma_1.default.dealerCompany.findUnique({
            where: {
                dealerId_companyId: {
                    dealerId: dealer.id,
                    companyId: companyId,
                },
                archivedByDealer: false,
            },
        });
        if (!connection) {
            return res.status(403).json({
                message: "You are not connected to this company",
            });
        }
        // Get company owner ID
        const company = yield prisma_1.default.company.findUnique({
            where: { id: companyId },
            select: { ownerId: true, name: true, address: true },
        });
        if (!company) {
            return res.status(404).json({ message: "Company not found" });
        }
        // Build where clause for products
        const where = {
            supplierId: company.ownerId,
            currentStock: { gt: 0 }, // Only show products with available stock
        };
        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
            ];
        }
        if (type) {
            where.type = type;
        }
        // Get products
        const [products, total] = yield Promise.all([
            prisma_1.default.product.findMany({
                where,
                skip,
                take: Number(limit),
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    name: true,
                    description: true,
                    type: true,
                    unit: true,
                    unitSellingPrice: true,
                    currentStock: true,
                    imageUrl: true,
                    createdAt: true,
                    updatedAt: true,
                },
            }),
            prisma_1.default.product.count({ where }),
        ]);
        return res.status(200).json({
            success: true,
            data: products,
            company: {
                id: companyId,
                name: company.name,
                address: company.address,
            },
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error("Get company products for dealer error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getCompanyProducts = getCompanyProducts;
