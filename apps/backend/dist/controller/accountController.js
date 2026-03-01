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
exports.getAllAccountTransactions = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const client_1 = require("@prisma/client");
// ==================== GET ALL ACCOUNT TRANSACTIONS ====================
const getAllAccountTransactions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = 1, limit = 100, entityType, transactionType, startDate, endDate, search, } = req.query;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        const skip = (Number(page) - 1) * Number(limit);
        // Build where clause for EntityTransaction
        const entityTransactionWhere = {
            OR: [
                // Farmer's purchases/payments (via inventory)
                { inventoryItem: { userId: currentUserId } },
                // Dealer's own transactions (entities they own)
                { dealer: { userId: currentUserId } },
                { hatchery: { userId: currentUserId } },
                { medicineSupplier: { userId: currentUserId } },
                { customer: { userId: currentUserId } },
            ],
        };
        // Filter by entity type
        if (entityType) {
            const entityTypeStr = entityType;
            if (entityTypeStr === "DEALER") {
                // Show DEALER transactions: farmer's purchases OR dealer's own operations
                entityTransactionWhere.dealerId = { not: null };
                entityTransactionWhere.OR = [
                    { inventoryItem: { userId: currentUserId } },
                    { dealer: { userId: currentUserId } },
                ];
            }
            else if (entityTypeStr === "HATCHERY") {
                // Show HATCHERY transactions: farmer's purchases OR hatchery's own operations
                entityTransactionWhere.hatcheryId = { not: null };
                entityTransactionWhere.OR = [
                    { inventoryItem: { userId: currentUserId } },
                    { hatchery: { userId: currentUserId } },
                ];
            }
            else if (entityTypeStr === "CUSTOMER") {
                // Show CUSTOMER transactions (dealer's sales to customers)
                entityTransactionWhere.customerId = { not: null };
                entityTransactionWhere.customer = { userId: currentUserId };
            }
            else if (entityTypeStr === "MEDICINE_SUPPLIER") {
                // Show MEDICINE_SUPPLIER transactions: farmer's purchases OR supplier's own operations
                entityTransactionWhere.medicineSupplierId = { not: null };
                entityTransactionWhere.OR = [
                    { inventoryItem: { userId: currentUserId } },
                    { medicineSupplier: { userId: currentUserId } },
                ];
            }
        }
        // Filter by transaction type
        if (transactionType) {
            entityTransactionWhere.type = transactionType;
        }
        // Date range filter
        if (startDate || endDate) {
            entityTransactionWhere.date = {};
            if (startDate) {
                entityTransactionWhere.date.gte = new Date(startDate);
            }
            if (endDate) {
                entityTransactionWhere.date.lte = new Date(endDate);
            }
        }
        // Search filter - use AND with existing conditions to avoid overwriting OR clauses
        if (search) {
            const searchConditions = {
                OR: [
                    { description: { contains: search, mode: "insensitive" } },
                    { itemName: { contains: search, mode: "insensitive" } },
                    { reference: { contains: search, mode: "insensitive" } },
                    { dealer: { name: { contains: search, mode: "insensitive" } } },
                    { hatchery: { name: { contains: search, mode: "insensitive" } } },
                    { customer: { name: { contains: search, mode: "insensitive" } } },
                    { medicineSupplier: { name: { contains: search, mode: "insensitive" } } },
                ],
            };
            // Combine existing conditions with search using AND
            const existingConditions = Object.assign({}, entityTransactionWhere);
            entityTransactionWhere.AND = [existingConditions, searchConditions];
            // Clear the top-level OR to avoid conflicts (now handled in AND)
            delete entityTransactionWhere.OR;
        }
        // Build where clause for Sales
        const salesWhere = {};
        // Role-based filtering for sales
        if (currentUserRole === client_1.UserRole.MANAGER) {
            const userFarms = yield prisma_1.default.farm.findMany({
                where: {
                    OR: [
                        { ownerId: currentUserId },
                        { managers: { some: { id: currentUserId } } },
                    ],
                },
                select: { id: true },
            });
            salesWhere.farmId = { in: userFarms.map((farm) => farm.id) };
        }
        else {
            // For OWNER, get all farms they own
            const userFarms = yield prisma_1.default.farm.findMany({
                where: { ownerId: currentUserId },
                select: { id: true },
            });
            salesWhere.farmId = { in: userFarms.map((farm) => farm.id) };
        }
        // Filter sales by entity type (only if CUSTOMER is selected)
        if (entityType === "CUSTOMER") {
            salesWhere.customerId = { not: null };
        }
        else if (entityType && entityType !== "CUSTOMER") {
            // If filtering by non-customer entity, exclude sales
            salesWhere.id = { in: [] }; // Empty result
        }
        // Date range filter for sales
        if (startDate || endDate) {
            salesWhere.date = {};
            if (startDate) {
                salesWhere.date.gte = new Date(startDate);
            }
            if (endDate) {
                salesWhere.date.lte = new Date(endDate);
            }
        }
        // Search filter for sales
        if (search) {
            salesWhere.OR = [
                { description: { contains: search, mode: "insensitive" } },
                { customer: { name: { contains: search, mode: "insensitive" } } },
            ];
        }
        // Fetch ALL EntityTransactions (for proper running balance calculation)
        const [entityTransactions, entityTransactionsTotal] = yield Promise.all([
            prisma_1.default.entityTransaction.findMany({
                where: entityTransactionWhere,
                include: {
                    dealer: {
                        select: {
                            id: true,
                            name: true,
                            contact: true,
                        },
                    },
                    hatchery: {
                        select: {
                            id: true,
                            name: true,
                            contact: true,
                        },
                    },
                    customer: {
                        select: {
                            id: true,
                            name: true,
                            phone: true,
                        },
                    },
                    medicineSupplier: {
                        select: {
                            id: true,
                            name: true,
                            contact: true,
                        },
                    },
                    inventoryItem: {
                        select: {
                            id: true,
                            userId: true,
                        },
                    },
                },
                orderBy: { date: "desc" },
            }),
            prisma_1.default.entityTransaction.count({ where: entityTransactionWhere }),
        ]);
        // Fetch ALL Sales (for proper running balance calculation)
        const shouldFetchSales = !entityType || entityType === "CUSTOMER" || entityType === "";
        const [sales, salesTotal] = shouldFetchSales
            ? yield Promise.all([
                prisma_1.default.sale.findMany({
                    where: salesWhere,
                    include: {
                        customer: {
                            select: {
                                id: true,
                                name: true,
                                phone: true,
                            },
                        },
                    },
                    orderBy: { date: "desc" },
                }),
                prisma_1.default.sale.count({ where: salesWhere }),
            ])
            : [[], 0];
        // Transform EntityTransactions to unified format
        const transformedEntityTransactions = entityTransactions.map((tx) => {
            let entityType = "";
            let entityName = "";
            let entityId = "";
            if (tx.dealer) {
                entityType = "DEALER";
                entityName = tx.dealer.name;
                entityId = tx.dealer.id;
            }
            else if (tx.hatchery) {
                entityType = "HATCHERY";
                entityName = tx.hatchery.name;
                entityId = tx.hatchery.id;
            }
            else if (tx.customer) {
                entityType = "CUSTOMER";
                entityName = tx.customer.name;
                entityId = tx.customer.id;
            }
            else if (tx.medicineSupplier) {
                entityType = "MEDICINE_SUPPLIER";
                entityName = tx.medicineSupplier.name;
                entityId = tx.medicineSupplier.id;
            }
            return {
                id: tx.id,
                type: tx.type,
                amount: Number(tx.amount),
                quantity: tx.quantity,
                freeQuantity: tx.freeQuantity,
                itemName: tx.itemName,
                date: tx.date,
                description: tx.description,
                reference: tx.reference,
                entityType,
                entityName,
                entityId,
                paymentToPurchaseId: tx.paymentToPurchaseId,
                source: "EntityTransaction",
            };
        });
        // Transform Sales to unified format
        const transformedSales = sales.map((sale) => {
            var _a, _b;
            return ({
                id: sale.id,
                type: "SALE",
                amount: Number(sale.amount),
                quantity: Number(sale.quantity),
                freeQuantity: null,
                itemName: sale.itemType,
                date: sale.date,
                description: sale.description,
                reference: null,
                entityType: "CUSTOMER",
                entityName: ((_a = sale.customer) === null || _a === void 0 ? void 0 : _a.name) || "Cash Sale",
                entityId: ((_b = sale.customer) === null || _b === void 0 ? void 0 : _b.id) || null,
                paymentToPurchaseId: null,
                source: "Sale",
                isCredit: sale.isCredit,
                paidAmount: Number(sale.paidAmount),
            });
        });
        // Combine and sort all transactions by date
        const allTransactions = [
            ...transformedEntityTransactions,
            ...transformedSales,
        ].sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return dateB - dateA; // Descending order
        });
        // Calculate running balance
        // Start from the oldest transaction and work forward
        const sortedByDateAsc = [...allTransactions].sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return dateA - dateB; // Ascending order for balance calculation
        });
        let runningBalance = 0;
        const transactionsWithBalance = sortedByDateAsc.map((tx) => {
            // Determine if this is a debit or credit
            const isDebit = tx.type === "PURCHASE" || tx.type === "PAYMENT";
            const isCredit = tx.type === "RECEIPT" || tx.type === "SALE";
            if (isDebit) {
                runningBalance -= tx.amount;
            }
            else if (isCredit) {
                runningBalance += tx.amount;
            }
            return Object.assign(Object.assign({}, tx), { debit: isDebit ? tx.amount : 0, credit: isCredit ? tx.amount : 0, runningBalance });
        });
        // Sort back to descending for display and apply pagination
        const sortedDescending = transactionsWithBalance.sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return dateB - dateA; // Descending order
        });
        const finalTransactions = sortedDescending.slice(skip, skip + Number(limit));
        const totalCount = entityTransactionsTotal + salesTotal;
        return res.json({
            success: true,
            data: finalTransactions,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total: totalCount,
                totalPages: Math.ceil(totalCount / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error("Get all account transactions error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getAllAccountTransactions = getAllAccountTransactions;
