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
exports.createExpenseCategory = exports.getExpenseCategories = exports.getExpenseStatistics = exports.deleteExpense = exports.updateExpense = exports.createExpense = exports.getBatchExpenses = exports.getExpenseById = exports.getAllExpenses = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const client_1 = require("@prisma/client");
const shared_types_1 = require("@myapp/shared-types");
// ==================== GET ALL EXPENSES ====================
const getAllExpenses = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = 1, limit = 10, search, farmId, batchId, categoryId, startDate, endDate, categoryType, } = req.query;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        const skip = (Number(page) - 1) * Number(limit);
        // Build where clause
        const where = {
            category: {
                userId: currentUserId,
            },
        };
        // Role-based filtering
        if (currentUserRole === client_1.UserRole.MANAGER) {
            // Managers can only see expenses from farms they manage or own
            const userFarms = yield prisma_1.default.farm.findMany({
                where: {
                    OR: [
                        { ownerId: currentUserId },
                        { managers: { some: { id: currentUserId } } },
                    ],
                },
                select: { id: true },
            });
            where.farmId = { in: userFarms.map((f) => f.id) };
        }
        if (farmId) {
            where.farmId = farmId;
        }
        if (batchId) {
            where.batchId = batchId;
        }
        if (categoryId) {
            where.categoryId = categoryId;
        }
        if (categoryType) {
            where.category = Object.assign(Object.assign({}, (where.category || {})), { type: categoryType });
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
        if (search) {
            where.OR = [
                { description: { contains: search, mode: "insensitive" } },
                {
                    category: {
                        name: { contains: search, mode: "insensitive" },
                    },
                },
            ];
        }
        const [expenses, total] = yield Promise.all([
            prisma_1.default.expense.findMany({
                where,
                skip,
                take: Number(limit),
                include: {
                    farm: {
                        select: {
                            id: true,
                            name: true,
                            owner: {
                                select: {
                                    id: true,
                                    name: true,
                                },
                            },
                        },
                    },
                    batch: {
                        select: {
                            id: true,
                            batchNumber: true,
                            status: true,
                        },
                    },
                    category: {
                        select: {
                            id: true,
                            name: true,
                            type: true,
                        },
                    },
                    inventoryUsages: {
                        include: {
                            item: {
                                select: {
                                    id: true,
                                    name: true,
                                    unit: true,
                                },
                            },
                        },
                    },
                    _count: {
                        select: {
                            inventoryUsages: true,
                        },
                    },
                },
                orderBy: { date: "desc" },
            }),
            prisma_1.default.expense.count({ where }),
        ]);
        return res.json({
            success: true,
            data: expenses,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error("Get all expenses error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getAllExpenses = getAllExpenses;
// ==================== GET EXPENSE BY ID ====================
const getExpenseById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { id } = req.params;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        const expense = yield prisma_1.default.expense.findUnique({
            where: { id },
            include: {
                farm: {
                    select: {
                        id: true,
                        name: true,
                        owner: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                        managers: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
                batch: {
                    select: {
                        id: true,
                        batchNumber: true,
                        status: true,
                        startDate: true,
                        endDate: true,
                    },
                },
                category: {
                    select: {
                        id: true,
                        name: true,
                        type: true,
                        description: true,
                    },
                },
                inventoryUsages: {
                    include: {
                        item: {
                            select: {
                                id: true,
                                name: true,
                                unit: true,
                                currentStock: true,
                            },
                        },
                    },
                },
                entityTransactions: {
                    include: {
                        dealer: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                        hatchery: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                        medicineSupplier: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
            },
        });
        if (!expense) {
            return res.status(404).json({ message: "Expense not found" });
        }
        // Check access permissions
        if (currentUserRole === client_1.UserRole.MANAGER) {
            const hasAccess = ((_a = expense.farm) === null || _a === void 0 ? void 0 : _a.owner.id) === currentUserId ||
                ((_b = expense.farm) === null || _b === void 0 ? void 0 : _b.managers.some((manager) => manager.id === currentUserId));
            if (!hasAccess) {
                return res.status(403).json({ message: "Access denied" });
            }
        }
        return res.json({
            success: true,
            data: expense,
        });
    }
    catch (error) {
        console.error("Get expense by ID error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getExpenseById = getExpenseById;
// ==================== GET BATCH EXPENSES ====================
const getBatchExpenses = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { batchId } = req.params;
        const { page = 1, limit = 10, categoryType } = req.query;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        const skip = (Number(page) - 1) * Number(limit);
        // Check if batch exists and user has access
        const batch = yield prisma_1.default.batch.findUnique({
            where: { id: batchId },
            include: {
                farm: {
                    include: {
                        owner: true,
                        managers: true,
                    },
                },
            },
        });
        if (!batch) {
            return res.status(404).json({ message: "Batch not found" });
        }
        // Check access permissions
        if (currentUserRole === client_1.UserRole.MANAGER) {
            const hasAccess = batch.farm.ownerId === currentUserId ||
                batch.farm.managers.some((manager) => manager.id === currentUserId);
            if (!hasAccess) {
                return res.status(403).json({ message: "Access denied" });
            }
        }
        // Build where clause
        const where = {
            batchId,
        };
        if (categoryType) {
            where.category = {
                type: categoryType,
            };
        }
        const [expenses, total] = yield Promise.all([
            prisma_1.default.expense.findMany({
                where,
                skip,
                take: Number(limit),
                include: {
                    category: {
                        select: {
                            id: true,
                            name: true,
                            type: true,
                        },
                    },
                    inventoryUsages: {
                        include: {
                            item: {
                                select: {
                                    id: true,
                                    name: true,
                                    unit: true,
                                },
                            },
                        },
                    },
                },
                orderBy: { date: "desc" },
            }),
            prisma_1.default.expense.count({ where }),
        ]);
        return res.json({
            success: true,
            data: expenses,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error("Get batch expenses error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getBatchExpenses = getBatchExpenses;
// ==================== CREATE EXPENSE ====================
const createExpense = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Validate request body
        const { success, data, error } = shared_types_1.CreateExpenseSchema.safeParse(req.body);
        if (!success) {
            return res.status(400).json({ message: error === null || error === void 0 ? void 0 : error.message });
        }
        const { date, amount, description, quantity, unitPrice, farmId, batchId, categoryId, inventoryItems, // NEW: Array of inventory items to deduct
         } = data; // Type assertion for now
        // Check if farm exists and user has access
        if (farmId) {
            const farm = yield prisma_1.default.farm.findUnique({
                where: { id: farmId },
                include: {
                    owner: true,
                    managers: true,
                },
            });
            if (!farm) {
                return res.status(404).json({ message: "Farm not found" });
            }
            // Check access permissions
            if (currentUserRole === client_1.UserRole.MANAGER) {
                const hasAccess = farm.ownerId === currentUserId ||
                    farm.managers.some((manager) => manager.id === currentUserId);
                if (!hasAccess) {
                    return res.status(403).json({ message: "Access denied" });
                }
            }
        }
        // Check if batch exists and belongs to the farm
        if (batchId) {
            const batch = yield prisma_1.default.batch.findUnique({
                where: { id: batchId },
                include: { farm: true },
            });
            if (!batch) {
                return res.status(404).json({ message: "Batch not found" });
            }
            if (farmId && batch.farmId !== farmId) {
                return res.status(400).json({
                    message: "Batch does not belong to the specified farm",
                });
            }
        }
        // Check if category exists
        const category = yield prisma_1.default.category.findUnique({
            where: { id: categoryId },
        });
        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }
        console.log("----------------------------");
        console.log(category);
        // Track total feed quantity captured via inventory items to avoid double-creating feed consumption
        let totalFeedQuantityFromInventory = 0;
        // Pre-fetch inventory items and their latest transactions to reduce queries in transaction
        let inventoryItemsData = [];
        if (inventoryItems && inventoryItems.length > 0) {
            const itemIds = inventoryItems.map((item) => item.itemId);
            // Fetch all inventory items in one query
            const items = yield prisma_1.default.inventoryItem.findMany({
                where: { id: { in: itemIds } },
                include: { category: true },
            });
            // Fetch all latest transactions in one query
            const latestTransactions = yield prisma_1.default.inventoryTransaction.findMany({
                where: {
                    itemId: { in: itemIds },
                    type: "PURCHASE",
                },
                orderBy: { date: "desc" },
                distinct: ["itemId"],
            });
            // Create a map for quick lookup
            const transactionMap = new Map();
            latestTransactions.forEach((tx) => {
                transactionMap.set(tx.itemId, tx);
            });
            // Prepare inventory items data
            inventoryItemsData = inventoryItems.map((item) => {
                const inventoryItem = items.find((i) => i.id === item.itemId);
                if (!inventoryItem) {
                    throw new Error(`Inventory item not found: ${item.itemId}`);
                }
                // Check if enough stock available
                if (Number(inventoryItem.currentStock) < item.quantity) {
                    throw new Error(`Insufficient stock. Available: ${inventoryItem.currentStock}, Required: ${item.quantity}`);
                }
                const latestTransaction = transactionMap.get(item.itemId);
                const unitPrice = latestTransaction
                    ? Number(latestTransaction.unitPrice)
                    : 0;
                const totalAmount = unitPrice * item.quantity;
                return Object.assign(Object.assign({}, item), { inventoryItem,
                    unitPrice,
                    totalAmount });
            });
        }
        // Execute the main transaction with increased timeout
        const result = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // 1. Create the expense
            const expense = yield tx.expense.create({
                data: {
                    date: new Date(date),
                    amount: Number(amount),
                    description: description || null,
                    quantity: quantity ? Number(quantity) : null,
                    unitPrice: unitPrice ? Number(unitPrice) : null,
                    farmId: farmId || null,
                    batchId: batchId || null,
                    categoryId,
                },
            });
            // 2. Process inventory usage if inventory items are provided
            const inventoryUsages = [];
            if (inventoryItemsData.length > 0) {
                // Create all inventory usages in parallel
                const usagePromises = inventoryItemsData.map((itemData) => __awaiter(void 0, void 0, void 0, function* () {
                    const { inventoryItem, unitPrice, totalAmount } = itemData;
                    // Record usage (link to existing expense)
                    const usage = yield tx.inventoryUsage.create({
                        data: {
                            date: new Date(date),
                            quantity: itemData.quantity,
                            unitPrice,
                            totalAmount,
                            notes: `${description || "Expense"} - ${itemData.notes || ""}`,
                            itemId: itemData.itemId,
                            farmId: farmId || "",
                            batchId: batchId || null,
                            expenseId: expense.id,
                        },
                    });
                    // If this expense is feed consumption and batch is provided, add a FeedConsumption record
                    if (category.type === client_1.CategoryType.EXPENSE &&
                        category.name.toLowerCase() === "feed" &&
                        batchId) {
                        console.log("Adding feed consumption from inventory item");
                        yield tx.feedConsumption.create({
                            data: {
                                date: new Date(date),
                                quantity: itemData.quantity,
                                feedType: inventoryItem.name,
                                batchId: batchId,
                            },
                        });
                        totalFeedQuantityFromInventory += Number(itemData.quantity || 0);
                    }
                    // Update stock
                    yield tx.inventoryItem.update({
                        where: { id: itemData.itemId },
                        data: {
                            currentStock: {
                                decrement: itemData.quantity,
                            },
                        },
                    });
                    // Create inventory transaction (stock reduction)
                    yield tx.inventoryTransaction.create({
                        data: {
                            type: client_1.TransactionType.USAGE, // Using USAGE for internal consumption
                            quantity: itemData.quantity,
                            unitPrice,
                            totalAmount,
                            date: new Date(date),
                            description: `Usage recorded for ${farmId || "general"}${batchId ? ` - Batch ${batchId}` : ""}`,
                            itemId: itemData.itemId,
                        },
                    });
                    return usage;
                }));
                const usages = yield Promise.all(usagePromises);
                inventoryUsages.push(...usages);
            }
            // If category is Feed and we did not register any feed consumption via inventory items,
            // but the expense itself has a quantity and batchId is present, create a single FeedConsumption.
            if (category.type === client_1.CategoryType.EXPENSE &&
                category.name.toLowerCase() === "feed" &&
                batchId &&
                totalFeedQuantityFromInventory === 0 &&
                (quantity || 0) > 0) {
                console.log("Adding feed consumption from expense quantity");
                yield tx.feedConsumption.create({
                    data: {
                        date: new Date(date),
                        quantity: Number(quantity),
                        feedType: "Feed",
                        batchId: batchId,
                    },
                });
            }
            return { expense, inventoryUsages };
        }), {
            timeout: 30000, // Increase timeout to 30 seconds
        });
        // 3. Fetch the complete expense with relationships (outside transaction)
        const completeExpense = yield prisma_1.default.expense.findUnique({
            where: { id: result.expense.id },
            include: {
                farm: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                batch: {
                    select: {
                        id: true,
                        batchNumber: true,
                    },
                },
                category: {
                    select: {
                        id: true,
                        name: true,
                        type: true,
                    },
                },
                inventoryUsages: {
                    include: {
                        item: {
                            select: {
                                id: true,
                                name: true,
                                unit: true,
                            },
                        },
                    },
                },
            },
        });
        return res.status(201).json({
            success: true,
            data: completeExpense,
            message: "Expense created successfully",
        });
    }
    catch (error) {
        console.error("Create expense error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.createExpense = createExpense;
// ==================== UPDATE EXPENSE ====================
const updateExpense = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { id } = req.params;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Validate request body
        const { success, data, error } = shared_types_1.UpdateExpenseSchema.safeParse(req.body);
        if (!success) {
            return res.status(400).json({ message: error === null || error === void 0 ? void 0 : error.message });
        }
        // Check if expense exists
        const existingExpense = yield prisma_1.default.expense.findUnique({
            where: { id },
            include: {
                farm: {
                    include: {
                        owner: true,
                        managers: true,
                    },
                },
                inventoryUsages: true,
            },
        });
        if (!existingExpense) {
            return res.status(404).json({ message: "Expense not found" });
        }
        // Check access permissions
        if (currentUserRole === client_1.UserRole.MANAGER) {
            const hasAccess = ((_a = existingExpense.farm) === null || _a === void 0 ? void 0 : _a.ownerId) === currentUserId ||
                ((_b = existingExpense.farm) === null || _b === void 0 ? void 0 : _b.managers.some((manager) => manager.id === currentUserId));
            if (!hasAccess) {
                return res.status(403).json({ message: "Access denied" });
            }
        }
        // Update expense
        const updatedExpense = yield prisma_1.default.expense.update({
            where: { id },
            data: Object.assign(Object.assign({}, data), { date: data.date ? new Date(data.date) : undefined, amount: data.amount ? Number(data.amount) : undefined, quantity: data.quantity ? Number(data.quantity) : undefined, unitPrice: data.unitPrice ? Number(data.unitPrice) : undefined }),
            include: {
                farm: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                batch: {
                    select: {
                        id: true,
                        batchNumber: true,
                    },
                },
                category: {
                    select: {
                        id: true,
                        name: true,
                        type: true,
                    },
                },
                inventoryUsages: {
                    include: {
                        item: {
                            select: {
                                id: true,
                                name: true,
                                unit: true,
                            },
                        },
                    },
                },
            },
        });
        return res.json({
            success: true,
            data: updatedExpense,
            message: "Expense updated successfully",
        });
    }
    catch (error) {
        console.error("Update expense error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.updateExpense = updateExpense;
// ==================== DELETE EXPENSE ====================
const deleteExpense = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { id } = req.params;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Check if expense exists
        const existingExpense = yield prisma_1.default.expense.findUnique({
            where: { id },
            include: {
                farm: {
                    include: {
                        owner: true,
                        managers: true,
                    },
                },
                inventoryUsages: true,
                _count: {
                    select: {
                        inventoryUsages: true,
                    },
                },
            },
        });
        if (!existingExpense) {
            return res.status(404).json({ message: "Expense not found" });
        }
        // Check access permissions
        if (currentUserRole === client_1.UserRole.MANAGER) {
            const hasAccess = ((_a = existingExpense.farm) === null || _a === void 0 ? void 0 : _a.ownerId) === currentUserId ||
                ((_b = existingExpense.farm) === null || _b === void 0 ? void 0 : _b.managers.some((manager) => manager.id === currentUserId));
            if (!hasAccess) {
                return res.status(403).json({ message: "Access denied" });
            }
        }
        return yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // 1. Restore inventory stock from usage records
            for (const usage of existingExpense.inventoryUsages) {
                yield tx.inventoryItem.update({
                    where: { id: usage.itemId },
                    data: {
                        currentStock: {
                            increment: Number(usage.quantity),
                        },
                    },
                });
                // Delete the usage record
                yield tx.inventoryUsage.delete({
                    where: { id: usage.id },
                });
            }
            // 2. Delete the expense
            yield tx.expense.delete({
                where: { id },
            });
            return res.json({
                success: true,
                message: "Expense deleted successfully",
            });
        }));
    }
    catch (error) {
        console.error("Delete expense error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.deleteExpense = deleteExpense;
// ==================== GET EXPENSE STATISTICS ====================
const getExpenseStatistics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { farmId, batchId, startDate, endDate } = req.query;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Build where clause
        const where = {};
        // Role-based filtering
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
            where.farmId = { in: userFarms.map((f) => f.id) };
        }
        if (farmId) {
            where.farmId = farmId;
        }
        if (batchId) {
            where.batchId = batchId;
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
        const [totalExpenses, totalAmount, expensesByCategory, currentMonthExpenses, expensesByFarm,] = yield Promise.all([
            prisma_1.default.expense.count({ where }),
            prisma_1.default.expense.aggregate({
                where,
                _sum: { amount: true },
            }),
            prisma_1.default.expense.groupBy({
                by: ["categoryId"],
                where,
                _sum: { amount: true },
                _count: { id: true },
            }),
            prisma_1.default.expense.aggregate({
                where: Object.assign(Object.assign({}, where), { date: {
                        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    } }),
                _sum: { amount: true },
                _count: { id: true },
            }),
            prisma_1.default.expense.groupBy({
                by: ["farmId"],
                where,
                _sum: { amount: true },
                _count: { id: true },
            }),
        ]);
        // Get category names
        const categoryIds = expensesByCategory.map((e) => e.categoryId);
        const categories = yield prisma_1.default.category.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true, name: true, type: true },
        });
        const expensesByCategoryWithNames = expensesByCategory.map((expense) => {
            const category = categories.find((c) => c.id === expense.categoryId);
            return {
                categoryId: expense.categoryId,
                categoryName: (category === null || category === void 0 ? void 0 : category.name) || "Unknown",
                categoryType: (category === null || category === void 0 ? void 0 : category.type) || "UNKNOWN",
                totalAmount: Number(expense._sum.amount || 0),
                count: expense._count.id,
            };
        });
        // Get farm names
        const farmIds = expensesByFarm
            .map((e) => e.farmId)
            .filter((id) => Boolean(id));
        const farms = yield prisma_1.default.farm.findMany({
            where: { id: { in: farmIds } },
            select: { id: true, name: true },
        });
        const expensesByFarmWithNames = expensesByFarm.map((expense) => {
            const farm = farms.find((f) => f.id === expense.farmId);
            return {
                farmId: expense.farmId,
                farmName: (farm === null || farm === void 0 ? void 0 : farm.name) || "General",
                totalAmount: Number(expense._sum.amount || 0),
                count: expense._count.id,
            };
        });
        return res.json({
            success: true,
            data: {
                totalExpenses,
                totalAmount: Number(totalAmount._sum.amount || 0),
                currentMonthExpenses: Number(currentMonthExpenses._sum.amount || 0),
                currentMonthCount: currentMonthExpenses._count.id,
                expensesByCategory: expensesByCategoryWithNames,
                expensesByFarm: expensesByFarmWithNames,
            },
        });
    }
    catch (error) {
        console.error("Get expense statistics error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getExpenseStatistics = getExpenseStatistics;
// ==================== GET EXPENSE CATEGORIES ====================
const getExpenseCategories = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { type } = req.query;
        const currentUserId = req.userId;
        const where = {
            userId: currentUserId,
        };
        if (type) {
            where.type = type;
        }
        let categories = yield prisma_1.default.category.findMany({
            where,
            include: {
                _count: {
                    select: {
                        expenses: true,
                    },
                },
            },
            orderBy: { name: "asc" },
        });
        // If no categories exist, create default expense categories
        if (categories.length === 0 && (!type || type === "EXPENSE")) {
            const defaultCategories = [
                {
                    name: "Feed",
                    type: client_1.CategoryType.EXPENSE,
                    description: "Feed and nutrition expenses",
                    userId: currentUserId,
                },
                {
                    name: "Medicine",
                    type: client_1.CategoryType.EXPENSE,
                    description: "Medicine and vaccination expenses",
                    userId: currentUserId,
                },
                {
                    name: "Hatchery",
                    type: client_1.CategoryType.EXPENSE,
                    description: "Hatchery and chick expenses",
                    userId: currentUserId,
                },
                {
                    name: "Equipment",
                    type: client_1.CategoryType.EXPENSE,
                    description: "Equipment and maintenance expenses",
                    userId: currentUserId,
                },
                {
                    name: "Other",
                    type: client_1.CategoryType.EXPENSE,
                    description: "Other miscellaneous expenses",
                    userId: currentUserId,
                },
            ];
            // Create default categories
            yield prisma_1.default.category.createMany({
                data: defaultCategories,
                skipDuplicates: true,
            });
            // Fetch the created categories
            categories = yield prisma_1.default.category.findMany({
                where,
                include: {
                    _count: {
                        select: {
                            expenses: true,
                        },
                    },
                },
                orderBy: { name: "asc" },
            });
        }
        return res.json({
            success: true,
            data: categories,
        });
    }
    catch (error) {
        console.error("Get expense categories error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getExpenseCategories = getExpenseCategories;
// ==================== CREATE EXPENSE CATEGORY ====================
const createExpenseCategory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currentUserId = req.userId;
        const { name, description } = req.body;
        if (!name) {
            return res.status(400).json({ message: "Category name is required" });
        }
        // Check if category already exists
        const existingCategory = yield prisma_1.default.category.findFirst({
            where: {
                userId: currentUserId,
                name: name,
                type: client_1.CategoryType.EXPENSE,
            },
        });
        if (existingCategory) {
            return res.status(400).json({
                message: "Category with this name already exists",
            });
        }
        // Create category
        const category = yield prisma_1.default.category.create({
            data: {
                name,
                type: client_1.CategoryType.EXPENSE,
                description: description || null,
                userId: currentUserId,
            },
        });
        return res.status(201).json({
            success: true,
            data: category,
            message: "Category created successfully",
        });
    }
    catch (error) {
        console.error("Create expense category error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.createExpenseCategory = createExpenseCategory;
