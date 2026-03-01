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
exports.getDealerProfitSummary = exports.getManualCompanyStatement = exports.recordManualCompanyPayment = exports.recordManualPurchase = exports.deleteManualCompany = exports.updateManualCompany = exports.getManualCompanies = exports.createManualCompany = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const client_1 = require("@prisma/client");
// ==================== CREATE MANUAL COMPANY ====================
const createManualCompany = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { name, phone, address } = req.body;
        if (!name) {
            return res.status(400).json({ message: "Company name is required" });
        }
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        const company = yield prisma_1.default.dealerManualCompany.create({
            data: {
                name: name.trim(),
                phone: phone || null,
                address: address || null,
                dealerId: dealer.id,
            },
        });
        return res.status(201).json({
            success: true,
            data: company,
            message: "Manual company created successfully",
        });
    }
    catch (error) {
        if (error.code === "P2002") {
            return res.status(409).json({
                message: "A manual company with this name already exists",
            });
        }
        console.error("Create manual company error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.createManualCompany = createManualCompany;
// ==================== GET ALL MANUAL COMPANIES ====================
const getManualCompanies = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        const companies = yield prisma_1.default.dealerManualCompany.findMany({
            where: { dealerId: dealer.id },
            orderBy: { name: "asc" },
            include: {
                _count: { select: { purchases: true, payments: true } },
            },
        });
        return res.status(200).json({
            success: true,
            data: companies,
        });
    }
    catch (error) {
        console.error("Get manual companies error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getManualCompanies = getManualCompanies;
// ==================== UPDATE MANUAL COMPANY ====================
const updateManualCompany = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const { name, phone, address } = req.body;
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        const company = yield prisma_1.default.dealerManualCompany.findUnique({
            where: { id },
        });
        if (!company || company.dealerId !== dealer.id) {
            return res.status(404).json({ message: "Manual company not found" });
        }
        const updated = yield prisma_1.default.dealerManualCompany.update({
            where: { id },
            data: Object.assign(Object.assign(Object.assign({}, (name && { name: name.trim() })), (phone !== undefined && { phone: phone || null })), (address !== undefined && { address: address || null })),
        });
        return res.status(200).json({
            success: true,
            data: updated,
            message: "Manual company updated successfully",
        });
    }
    catch (error) {
        if (error.code === "P2002") {
            return res.status(409).json({
                message: "A manual company with this name already exists",
            });
        }
        console.error("Update manual company error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.updateManualCompany = updateManualCompany;
// ==================== DELETE MANUAL COMPANY ====================
const deleteManualCompany = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        const company = yield prisma_1.default.dealerManualCompany.findUnique({
            where: { id },
        });
        if (!company || company.dealerId !== dealer.id) {
            return res.status(404).json({ message: "Manual company not found" });
        }
        yield prisma_1.default.dealerManualCompany.delete({ where: { id } });
        return res.status(200).json({
            success: true,
            message: "Manual company deleted successfully",
        });
    }
    catch (error) {
        console.error("Delete manual company error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.deleteManualCompany = deleteManualCompany;
// ==================== RECORD PURCHASE ====================
// Creates/updates DealerProducts and DealerProductTransactions
const recordManualPurchase = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const { items, notes, reference, date } = req.body;
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                message: "At least one item is required",
            });
        }
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        const company = yield prisma_1.default.dealerManualCompany.findUnique({
            where: { id },
        });
        if (!company || company.dealerId !== dealer.id) {
            return res.status(404).json({ message: "Manual company not found" });
        }
        const result = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            let totalAmount = 0;
            const purchaseItems = [];
            for (const item of items) {
                const { productName, type, unit, quantity, costPrice, sellingPrice } = item;
                if (!productName || !type || !unit || !quantity || costPrice === undefined || costPrice === null || sellingPrice === undefined || sellingPrice === null) {
                    throw new Error("Each item must have productName, type, unit, quantity, costPrice, and sellingPrice");
                }
                const qty = Number(quantity);
                const cost = Number(costPrice);
                const sell = Number(sellingPrice);
                const itemTotal = qty * cost;
                totalAmount += itemTotal;
                // Find or create DealerProduct
                let dealerProduct = yield tx.dealerProduct.findFirst({
                    where: {
                        dealerId: dealer.id,
                        name: productName,
                        costPrice: new client_1.Prisma.Decimal(cost),
                        sellingPrice: new client_1.Prisma.Decimal(sell),
                    },
                });
                if (dealerProduct) {
                    // Increment stock
                    dealerProduct = yield tx.dealerProduct.update({
                        where: { id: dealerProduct.id },
                        data: {
                            currentStock: { increment: new client_1.Prisma.Decimal(qty) },
                        },
                    });
                }
                else {
                    // Create new product
                    dealerProduct = yield tx.dealerProduct.create({
                        data: {
                            name: productName,
                            type,
                            unit,
                            costPrice: new client_1.Prisma.Decimal(cost),
                            sellingPrice: new client_1.Prisma.Decimal(sell),
                            currentStock: new client_1.Prisma.Decimal(qty),
                            dealerId: dealer.id,
                        },
                    });
                }
                // Create product transaction
                yield tx.dealerProductTransaction.create({
                    data: {
                        type: "PURCHASE",
                        quantity: new client_1.Prisma.Decimal(qty),
                        unitPrice: new client_1.Prisma.Decimal(cost),
                        totalAmount: new client_1.Prisma.Decimal(itemTotal),
                        date: date ? new Date(date) : new Date(),
                        description: `Purchase from ${company.name}`,
                        reference: reference || null,
                        productId: dealerProduct.id,
                        unit: unit || null,
                    },
                });
                purchaseItems.push({
                    productName,
                    type,
                    unit,
                    quantity: new client_1.Prisma.Decimal(qty),
                    costPrice: new client_1.Prisma.Decimal(cost),
                    sellingPrice: new client_1.Prisma.Decimal(sell),
                    totalAmount: new client_1.Prisma.Decimal(itemTotal),
                    dealerProductId: dealerProduct.id,
                });
            }
            // Create purchase record
            const purchase = yield tx.dealerManualPurchase.create({
                data: {
                    date: date ? new Date(date) : new Date(),
                    totalAmount: new client_1.Prisma.Decimal(totalAmount),
                    notes: notes || null,
                    reference: reference || null,
                    manualCompanyId: id,
                    items: {
                        create: purchaseItems,
                    },
                },
                include: {
                    items: true,
                },
            });
            // Update company balance
            yield tx.dealerManualCompany.update({
                where: { id },
                data: {
                    balance: { increment: new client_1.Prisma.Decimal(totalAmount) },
                    totalPurchases: { increment: new client_1.Prisma.Decimal(totalAmount) },
                },
            });
            return purchase;
        }));
        return res.status(201).json({
            success: true,
            data: result,
            message: "Purchase recorded successfully. Items added to inventory.",
        });
    }
    catch (error) {
        console.error("Record manual purchase error:", error);
        return res.status(500).json({
            message: error.message || "Internal server error",
        });
    }
});
exports.recordManualPurchase = recordManualPurchase;
// ==================== RECORD PAYMENT ====================
const recordManualCompanyPayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const { amount, paymentMethod, paymentDate, notes, reference, receiptUrl } = req.body;
        if (!amount || Number(amount) <= 0) {
            return res.status(400).json({ message: "Valid amount is required" });
        }
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        const company = yield prisma_1.default.dealerManualCompany.findUnique({
            where: { id },
        });
        if (!company || company.dealerId !== dealer.id) {
            return res.status(404).json({ message: "Manual company not found" });
        }
        const result = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            const paymentAmount = Number(amount);
            const newBalance = Number(company.balance) - paymentAmount;
            // Update company balance
            yield tx.dealerManualCompany.update({
                where: { id },
                data: {
                    balance: { decrement: new client_1.Prisma.Decimal(paymentAmount) },
                    totalPayments: { increment: new client_1.Prisma.Decimal(paymentAmount) },
                },
            });
            // Create payment record
            const payment = yield tx.dealerManualCompanyPayment.create({
                data: {
                    amount: new client_1.Prisma.Decimal(paymentAmount),
                    paymentMethod: paymentMethod || "CASH",
                    paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
                    notes: notes || null,
                    reference: reference || null,
                    receiptUrl: receiptUrl || null,
                    balanceAfter: new client_1.Prisma.Decimal(newBalance),
                    manualCompanyId: id,
                },
            });
            return payment;
        }));
        return res.status(201).json({
            success: true,
            data: result,
            message: "Payment recorded successfully",
        });
    }
    catch (error) {
        console.error("Record manual company payment error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.recordManualCompanyPayment = recordManualCompanyPayment;
// ==================== GET STATEMENT ====================
const getManualCompanyStatement = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const { page = "1", limit = "20" } = req.query;
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        const company = yield prisma_1.default.dealerManualCompany.findUnique({
            where: { id },
        });
        if (!company || company.dealerId !== dealer.id) {
            return res.status(404).json({ message: "Manual company not found" });
        }
        const pageNum = Number(page);
        const limitNum = Number(limit);
        const skip = (pageNum - 1) * limitNum;
        // Get purchases
        const purchases = yield prisma_1.default.dealerManualPurchase.findMany({
            where: { manualCompanyId: id },
            include: { items: true },
            orderBy: { date: "desc" },
        });
        // Get payments
        const payments = yield prisma_1.default.dealerManualCompanyPayment.findMany({
            where: { manualCompanyId: id },
            orderBy: { paymentDate: "desc" },
        });
        // Merge and sort  
        const transactions = [
            ...purchases.map((p) => ({
                type: "PURCHASE",
                id: p.id,
                date: p.date,
                amount: Number(p.totalAmount),
                notes: p.notes,
                reference: p.reference,
                items: p.items,
            })),
            ...payments.map((p) => ({
                type: "PAYMENT",
                id: p.id,
                date: p.paymentDate,
                amount: Number(p.amount),
                notes: p.notes,
                reference: p.reference,
                paymentMethod: p.paymentMethod,
                balanceAfter: Number(p.balanceAfter),
            })),
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const total = transactions.length;
        const paginated = transactions.slice(skip, skip + limitNum);
        return res.status(200).json({
            success: true,
            data: {
                company: {
                    id: company.id,
                    name: company.name,
                    phone: company.phone,
                    address: company.address,
                    balance: Number(company.balance),
                    totalPurchases: Number(company.totalPurchases),
                    totalPayments: Number(company.totalPayments),
                },
                transactions: paginated,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    totalPages: Math.ceil(total / limitNum),
                },
            },
        });
    }
    catch (error) {
        console.error("Get manual company statement error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getManualCompanyStatement = getManualCompanyStatement;
// ==================== GET PROFIT SUMMARY ====================
const getDealerProfitSummary = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        // Total purchases: sum of all DealerProductTransaction with type PURCHASE
        const purchaseAggregate = yield prisma_1.default.dealerProductTransaction.aggregate({
            where: {
                product: { dealerId: dealer.id },
                type: "PURCHASE",
            },
            _sum: { totalAmount: true },
        });
        // Total sales: sum of all DealerSale totalAmount
        const saleAggregate = yield prisma_1.default.dealerSale.aggregate({
            where: { dealerId: dealer.id },
            _sum: { totalAmount: true },
        });
        const totalPurchases = Number(purchaseAggregate._sum.totalAmount || 0);
        const totalSales = Number(saleAggregate._sum.totalAmount || 0);
        const profit = totalSales - totalPurchases;
        return res.status(200).json({
            success: true,
            data: {
                totalPurchases,
                totalSales,
                profit,
            },
        });
    }
    catch (error) {
        console.error("Get dealer profit summary error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getDealerProfitSummary = getDealerProfitSummary;
