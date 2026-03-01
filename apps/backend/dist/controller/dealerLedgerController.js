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
exports.addDealerPayment = exports.getDealerLedgerParties = exports.exportLedger = exports.getLedgerSummary = exports.createAdjustment = exports.getPartyLedger = exports.getCurrentBalance = exports.getLedgerEntries = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const client_1 = require("@prisma/client");
const dealerService_1 = require("../services/dealerService");
const dealerFarmerAccountService_1 = require("../services/dealerFarmerAccountService");
// ==================== GET LEDGER ENTRIES ====================
const getLedgerEntries = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { page = 1, limit = 50, type, partyId, startDate, endDate, } = req.query;
        // Get the dealer record
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        // Use service to get ledger entries
        const result = yield dealerService_1.DealerService.getLedgerEntries({
            dealerId: dealer.id,
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
        console.error("Get ledger entries error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getLedgerEntries = getLedgerEntries;
// ==================== GET CURRENT BALANCE ====================
const getCurrentBalance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        // Get the dealer record
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        const balance = yield dealerService_1.DealerService.calculateBalance(dealer.id);
        return res.status(200).json({
            success: true,
            data: { balance },
        });
    }
    catch (error) {
        console.error("Get current balance error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getCurrentBalance = getCurrentBalance;
// ==================== GET PARTY-SPECIFIC LEDGER ====================
const getPartyLedger = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { partyId } = req.params;
        const { page = 1, limit = 50, startDate, endDate } = req.query;
        // Get the dealer record
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        // Use service to get party-specific ledger
        const result = yield dealerService_1.DealerService.getLedgerEntries({
            dealerId: dealer.id,
            partyId,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            page: Number(page),
            limit: Number(limit),
        });
        // Calculate party balance
        const partyBalance = result.entries.length > 0
            ? Number(result.entries[0].balance)
            : 0;
        // Get party details
        let partyDetails = null;
        if (result.entries.length > 0) {
            const firstEntry = result.entries[0];
            if (firstEntry.partyType === "CUSTOMER") {
                partyDetails = yield prisma_1.default.customer.findUnique({
                    where: { id: partyId },
                });
            }
            else if (firstEntry.partyType === "FARMER") {
                partyDetails = yield prisma_1.default.user.findUnique({
                    where: { id: partyId },
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        companyName: true,
                    },
                });
            }
        }
        return res.status(200).json({
            success: true,
            data: {
                entries: result.entries,
                partyBalance,
                partyDetails,
            },
            pagination: {
                page: result.page,
                limit: result.limit,
                total: result.total,
                totalPages: result.totalPages,
            },
        });
    }
    catch (error) {
        console.error("Get party ledger error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getPartyLedger = getPartyLedger;
// ==================== CREATE MANUAL ADJUSTMENT ====================
const createAdjustment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { amount, description, reference, date } = req.body;
        // Validation
        if (!amount || !description) {
            return res.status(400).json({
                message: "Amount and description are required",
            });
        }
        // Get the dealer record
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        // Get current balance
        const currentBalance = yield dealerService_1.DealerService.calculateBalance(dealer.id);
        // Calculate new balance
        const newBalance = currentBalance + Number(amount);
        // Create adjustment entry
        const adjustment = yield prisma_1.default.dealerLedgerEntry.create({
            data: {
                type: "ADJUSTMENT",
                amount: new client_1.Prisma.Decimal(Math.abs(amount)),
                balance: new client_1.Prisma.Decimal(newBalance),
                date: date ? new Date(date) : new Date(),
                description,
                reference,
                dealerId: dealer.id,
            },
        });
        return res.status(201).json({
            success: true,
            data: adjustment,
            message: "Adjustment created successfully",
        });
    }
    catch (error) {
        console.error("Create adjustment error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.createAdjustment = createAdjustment;
// ==================== GET LEDGER SUMMARY ====================
const getLedgerSummary = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { startDate, endDate } = req.query;
        // Get the dealer record
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        const where = {
            dealerId: dealer.id,
        };
        if (startDate || endDate) {
            where.date = {};
            if (startDate)
                where.date.gte = new Date(startDate);
            if (endDate)
                where.date.lte = new Date(endDate);
        }
        // Calculate from actual sales data
        const salesWhere = {
            dealerId: dealer.id,
        };
        if (startDate || endDate) {
            salesWhere.date = {};
            if (startDate)
                salesWhere.date.gte = new Date(startDate);
            if (endDate)
                salesWhere.date.lte = new Date(endDate);
        }
        const salesSummary = yield prisma_1.default.dealerSale.aggregate({
            where: salesWhere,
            _sum: {
                totalAmount: true,
                paidAmount: true,
            },
        });
        const totalSalesAmount = Number(salesSummary._sum.totalAmount || 0);
        const totalPaidAmount = Number(salesSummary._sum.paidAmount || 0);
        // Calculate total due from Customer.balance field (consistent with party balances)
        const customers = yield prisma_1.default.customer.findMany({
            where: { userId },
            select: { balance: true },
        });
        // Sum only positive balances (customers who owe dealer)
        // Negative balances are advances (dealer owes customer)
        const totalDueAmount = customers.reduce((sum, customer) => {
            const balance = Number(customer.balance || 0);
            return sum + (balance > 0 ? balance : 0); // Only count positive balances as "due"
        }, 0);
        // Calculate total advances (negative balances)
        const totalAdvances = customers.reduce((sum, customer) => {
            const balance = Number(customer.balance || 0);
            return sum + (balance < 0 ? Math.abs(balance) : 0); // Sum absolute value of negative balances
        }, 0);
        // Get entries grouped by type for other stats
        const entriesByType = yield prisma_1.default.dealerLedgerEntry.groupBy({
            by: ["type"],
            where,
            _sum: {
                amount: true,
            },
            _count: true,
        });
        // Get current balance
        const currentBalance = yield dealerService_1.DealerService.calculateBalance(dealer.id);
        // Calculate totals from ledger entries
        const totalPurchases = entriesByType
            .filter((e) => e.type === "PURCHASE")
            .reduce((sum, e) => sum + Number(e._sum.amount || 0), 0);
        const totalPaymentsReceived = entriesByType
            .filter((e) => e.type === "PAYMENT_RECEIVED")
            .reduce((sum, e) => sum + Number(e._sum.amount || 0), 0);
        const totalPaymentsMade = entriesByType
            .filter((e) => e.type === "PAYMENT_MADE")
            .reduce((sum, e) => sum + Number(e._sum.amount || 0), 0);
        // Get unique parties with transactions
        const uniqueParties = yield prisma_1.default.dealerSale.findMany({
            where: { dealerId: dealer.id },
            select: { customerId: true, farmerId: true },
            distinct: ["customerId", "farmerId"],
        });
        return res.status(200).json({
            success: true,
            data: {
                currentBalance,
                totalSales: totalSalesAmount,
                totalPaidAmount,
                totalDueAmount, // Only positive balances (customers owe dealer)
                totalAdvances, // Negative balances (dealer owes customers)
                totalPurchases,
                totalPaymentsReceived,
                totalPaymentsMade,
                entriesByType: entriesByType.map((e) => ({
                    type: e.type,
                    count: e._count,
                    total: e._sum.amount,
                })),
                outstandingBalances: uniqueParties.length,
            },
        });
    }
    catch (error) {
        console.error("Get ledger summary error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getLedgerSummary = getLedgerSummary;
// ==================== EXPORT LEDGER ====================
const exportLedger = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { format = "json", startDate, endDate, type } = req.query;
        // Get the dealer record
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        // Get all entries without pagination
        const result = yield dealerService_1.DealerService.getLedgerEntries({
            dealerId: dealer.id,
            type: type,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            page: 1,
            limit: 10000, // Large limit for export
        });
        if (format === "csv") {
            // Convert to CSV
            const csv = convertToCSV(result.entries);
            res.setHeader("Content-Type", "text/csv");
            res.setHeader("Content-Disposition", `attachment; filename=ledger-${Date.now()}.csv`);
            return res.status(200).send(csv);
        }
        // Return JSON by default
        return res.status(200).json({
            success: true,
            data: result.entries,
        });
    }
    catch (error) {
        console.error("Export ledger error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.exportLedger = exportLedger;
// ==================== GET DEALER LEDGER PARTIES ====================
const getDealerLedgerParties = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { search } = req.query;
        // Get dealer
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        // Get all customers (static customers)
        const staticCustomers = yield prisma_1.default.customer.findMany({
            where: Object.assign({ userId: userId }, (search
                ? {
                    OR: [
                        { name: { contains: search, mode: "insensitive" } },
                        { phone: { contains: search, mode: "insensitive" } },
                    ],
                }
                : {})),
            select: {
                id: true,
                name: true,
                phone: true,
                address: true,
                balance: true,
                farmerId: true,
                dealerSales: {
                    where: { dealerId: dealer.id },
                    select: {
                        id: true,
                        totalAmount: true,
                        paidAmount: true,
                        dueAmount: true,
                        date: true,
                    },
                },
            },
        });
        // Exclude farmers who already appear as a connected Customer to avoid duplicates
        const connectedFarmerIds = staticCustomers
            .map((c) => c.farmerId)
            .filter((id) => id != null);
        // Get all farmers (users) who have sales with this dealer
        const farmersWithSales = yield prisma_1.default.user.findMany({
            where: Object.assign(Object.assign({ dealerSalesReceived: {
                    some: { dealerId: dealer.id },
                } }, (connectedFarmerIds.length > 0
                ? { id: { notIn: connectedFarmerIds } }
                : {})), (search
                ? {
                    OR: [
                        { name: { contains: search, mode: "insensitive" } },
                        { phone: { contains: search, mode: "insensitive" } },
                    ],
                }
                : {})),
            include: {
                dealerSalesReceived: {
                    where: { dealerId: dealer.id },
                    select: {
                        id: true,
                        totalAmount: true,
                        paidAmount: true,
                        dueAmount: true,
                        date: true,
                    },
                },
            },
        });
        // Account-based: farmer balance comes from DealerFarmerAccount, not sum of sale dueAmounts
        const farmerAccounts = yield dealerFarmerAccountService_1.DealerFarmerAccountService.getDealerAccounts(dealer.id);
        const farmerBalanceByUserId = new Map(farmerAccounts.map((acc) => [acc.farmerId, acc.balance]));
        // Combine and calculate balances
        const partiesWithBalance = [
            ...staticCustomers.map((customer) => {
                // Use the Customer.balance field directly (includes advances)
                // Positive = customer owes dealer, Negative = dealer owes customer (advance)
                const balance = Number(customer.balance || 0);
                const lastSale = customer.dealerSales
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                return {
                    id: customer.id,
                    name: customer.name,
                    contact: customer.phone,
                    address: customer.address,
                    balance: balance, // Show actual balance (can be negative for advances)
                    lastTransactionDate: (lastSale === null || lastSale === void 0 ? void 0 : lastSale.date) || null,
                    totalSales: customer.dealerSales.length,
                    partyType: "CUSTOMER",
                };
            }),
            ...farmersWithSales.map((farmer) => {
                var _a;
                // Use dealer-farmer account balance (account-based); same source as customer account page
                const balance = (_a = farmerBalanceByUserId.get(farmer.id)) !== null && _a !== void 0 ? _a : 0;
                const lastSale = farmer.dealerSalesReceived
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                return {
                    id: farmer.id,
                    name: farmer.name,
                    contact: farmer.phone,
                    address: farmer.CompanyFarmLocation || null,
                    balance: Number(balance), // Can be negative (advance)
                    lastTransactionDate: (lastSale === null || lastSale === void 0 ? void 0 : lastSale.date) || null,
                    totalSales: farmer.dealerSalesReceived.length,
                    partyType: "FARMER",
                };
            }),
        ];
        // Filter out parties with no balance and no sales
        // Keep parties with balance != 0 (positive or negative) or those with sales history
        const activeParties = partiesWithBalance.filter((p) => p.balance !== 0 || p.totalSales > 0);
        return res.status(200).json({
            success: true,
            data: activeParties,
        });
    }
    catch (error) {
        console.error("Get dealer ledger parties error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getDealerLedgerParties = getDealerLedgerParties;
// ==================== ADD DEALER PAYMENT ====================
const addDealerPayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { saleId, customerId, amount, paymentMethod, date, notes, receiptImageUrl, reference } = req.body;
        // Validation
        if (!amount || amount <= 0) {
            return res.status(400).json({ message: "Valid amount is required" });
        }
        // Either saleId OR customerId must be provided
        if (!saleId && !customerId) {
            return res.status(400).json({ message: "Either sale ID or customer ID is required" });
        }
        // Get dealer
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        // Route to appropriate payment method
        if (saleId) {
            // Bill-wise payment - use account for farmer-linked sales
            const sale = yield prisma_1.default.dealerSale.findUnique({
                where: { id: saleId },
                select: { dealerId: true, accountId: true, farmerId: true },
            });
            if (!sale || sale.dealerId !== dealer.id) {
                return res.status(403).json({ message: "Sale not found or access denied" });
            }
            // Manual customer: use bill-level payment
            yield dealerService_1.DealerService.addSalePayment({
                saleId,
                amount: Number(amount),
                paymentMethod: paymentMethod || "CASH",
                date: date ? new Date(date) : new Date(),
                description: notes || `Payment received`,
                receiptUrl: receiptImageUrl,
                // reference not directly supported in addSalePayment args? let me check DealerService.addSalePayment signature
            });
            return res.status(200).json({
                success: true,
                message: "Payment added successfully",
            });
        }
        else {
            // General payment
            const customer = yield prisma_1.default.customer.findUnique({
                where: { id: customerId },
                select: { userId: true, farmerId: true },
            });
            if (!customer || customer.userId !== userId) {
                return res.status(403).json({ message: "Customer not found or access denied" });
            }
            // Manual customer: FIFO allocation
            const result = yield dealerService_1.DealerService.addGeneralPayment({
                customerId,
                dealerId: dealer.id,
                amount: Number(amount),
                paymentMethod: paymentMethod || "CASH",
                date: date ? new Date(date) : new Date(),
                description: notes || `General payment`,
                receiptUrl: receiptImageUrl,
            });
            return res.status(200).json({
                success: true,
                message: "Payment added successfully",
                data: result,
            });
        }
    }
    catch (error) {
        console.error("Add dealer payment error:", error);
        return res.status(500).json({ message: error.message || "Internal server error" });
    }
});
exports.addDealerPayment = addDealerPayment;
// Helper function to convert entries to CSV
function convertToCSV(entries) {
    const headers = [
        "Date",
        "Type",
        "Description",
        "Reference",
        "Amount",
        "Balance",
        "Party ID",
        "Party Type",
    ];
    const rows = entries.map((entry) => [
        new Date(entry.date).toLocaleDateString(),
        entry.type,
        entry.description || "",
        entry.reference || "",
        entry.amount,
        entry.balance,
        entry.partyId || "",
        entry.partyType || "",
    ]);
    const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.join(",")),
    ].join("\n");
    return csvContent;
}
