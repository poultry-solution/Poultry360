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
exports.getInventoryStatistics = exports.getInventoryTableData = exports.getInventoryUsages = exports.getInventoryTransactions = exports.recordInventoryUsage = exports.addInventoryTransaction = exports.deleteInventoryItem = exports.updateInventoryItem = exports.createInventoryItem = exports.getLowStockItems = exports.getInventoryByType = exports.getInventoryItemById = exports.getAllInventoryItems = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const client_1 = require("@prisma/client");
const shared_types_1 = require("@myapp/shared-types");
const inventoryService_1 = require("../services/inventoryService");
// ==================== GET ALL INVENTORY ITEMS ====================
const getAllInventoryItems = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = 1, limit = 10, search, itemType, lowStock } = req.query;
        const currentUserId = req.userId;
        const skip = (Number(page) - 1) * Number(limit);
        // Build where clause
        const where = {
            userId: currentUserId,
        };
        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
            ];
        }
        if (itemType) {
            where.itemType = itemType;
        }
        if (lowStock === "true") {
            where.AND = [
                { minStock: { not: null } },
                { currentStock: { lte: prisma_1.default.inventoryItem.fields.minStock } },
            ];
        }
        const [items, total] = yield Promise.all([
            prisma_1.default.inventoryItem.findMany({
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
                    transactions: {
                        orderBy: { date: "desc" },
                        take: 5, // Recent transactions
                    },
                    usages: {
                        orderBy: { date: "desc" },
                        take: 5, // Recent usages
                    },
                    _count: {
                        select: {
                            transactions: true,
                            usages: true,
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
            }),
            prisma_1.default.inventoryItem.count({ where }),
        ]);
        return res.json({
            success: true,
            data: items,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error("Get all inventory items error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getAllInventoryItems = getAllInventoryItems;
// ==================== GET INVENTORY ITEM BY ID ====================
const getInventoryItemById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const currentUserId = req.userId;
        const item = yield prisma_1.default.inventoryItem.findFirst({
            where: {
                id,
                userId: currentUserId,
            },
            include: {
                category: {
                    select: {
                        id: true,
                        name: true,
                        type: true,
                    },
                },
                transactions: {
                    orderBy: { date: "desc" },
                    take: 20, // More detailed transaction history
                },
                usages: {
                    orderBy: { date: "desc" },
                    take: 20, // More detailed usage history
                },
                _count: {
                    select: {
                        transactions: true,
                        usages: true,
                    },
                },
            },
        });
        if (!item) {
            return res.status(404).json({ message: "Inventory item not found" });
        }
        return res.json({
            success: true,
            data: item,
        });
    }
    catch (error) {
        console.error("Get inventory item by ID error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getInventoryItemById = getInventoryItemById;
// ==================== GET INVENTORY BY TYPE ====================
const getInventoryByType = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { itemType } = req.params;
        const currentUserId = req.userId;
        if (!currentUserId) {
            return res.status(400).json({ message: "No User found in COntrooler" });
        }
        if (!Object.values(client_1.InventoryItemType).includes(itemType)) {
            return res.status(400).json({ message: "Invalid item type" });
        }
        const items = yield inventoryService_1.InventoryService.getInventoryByType(currentUserId, itemType);
        return res.json({
            success: true,
            data: items,
        });
    }
    catch (error) {
        console.error("Get inventory by type error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getInventoryByType = getInventoryByType;
// ==================== GET LOW STOCK ITEMS ====================
const getLowStockItems = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currentUserId = req.userId;
        if (!currentUserId) {
            return res.status(400).json({ message: "No User found in COntrooler" });
        }
        const items = yield inventoryService_1.InventoryService.getLowStockItems(currentUserId);
        return res.json({
            success: true,
            data: items,
        });
    }
    catch (error) {
        console.error("Get low stock items error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getLowStockItems = getLowStockItems;
// ==================== CREATE INVENTORY ITEM ====================
const createInventoryItem = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currentUserId = req.userId;
        // Validate request body
        const { success, data, error } = shared_types_1.CreateInventoryItemSchema.safeParse(req.body);
        if (!success) {
            return res.status(400).json({ message: error === null || error === void 0 ? void 0 : error.message });
        }
        if (!currentUserId) {
            return res.status(400).json({ message: "No User found in COntrooler" });
        }
        // Check if item with same name already exists for this user
        const existingItem = yield prisma_1.default.inventoryItem.findFirst({
            where: {
                userId: currentUserId,
                name: data.name,
                itemType: data.itemType || client_1.InventoryItemType.OTHER,
            },
        });
        if (existingItem) {
            return res
                .status(400)
                .json({ message: "Inventory item with this name already exists" });
        }
        // Find or create category
        const itemType = data.itemType || client_1.InventoryItemType.OTHER;
        const categoryName = itemType === client_1.InventoryItemType.FEED
            ? "Feed"
            : itemType === client_1.InventoryItemType.CHICKS
                ? "Chicks"
                : itemType === client_1.InventoryItemType.MEDICINE
                    ? "Medicine"
                    : itemType === client_1.InventoryItemType.EQUIPMENT
                        ? "Equipment"
                        : "Other";
        let category = yield prisma_1.default.category.findFirst({
            where: {
                userId: currentUserId,
                type: client_1.CategoryType.INVENTORY,
                name: categoryName,
            },
        });
        // Create category if it doesn't exist
        if (!category) {
            category = yield prisma_1.default.category.create({
                data: {
                    name: categoryName,
                    type: client_1.CategoryType.INVENTORY,
                    description: `Category for ${categoryName} items`,
                    userId: currentUserId,
                },
            });
        }
        // Create inventory item with initial transaction if stock > 0
        const item = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            const inventoryItem = yield tx.inventoryItem.create({
                data: {
                    name: data.name,
                    description: data.description,
                    currentStock: data.currentStock || 0,
                    unit: data.unit,
                    minStock: data.minStock,
                    itemType: itemType,
                    userId: currentUserId,
                    categoryId: category.id,
                },
            });
            // If initial stock > 0, create an initial transaction
            if (data.currentStock && data.currentStock > 0) {
                // Get unit price from validated data (for manual additions)
                const unitPrice = data.rate || 0;
                const totalAmount = unitPrice * data.currentStock;
                yield tx.inventoryTransaction.create({
                    data: {
                        type: client_1.TransactionType.PURCHASE,
                        quantity: data.currentStock,
                        unitPrice: unitPrice,
                        totalAmount: totalAmount,
                        date: new Date(),
                        description: unitPrice > 0
                            ? "Initial stock added manually with price"
                            : "Initial stock added manually",
                        itemId: inventoryItem.id,
                    },
                });
            }
            return inventoryItem;
        }));
        // Fetch the created item with category info
        const itemWithCategory = yield prisma_1.default.inventoryItem.findUnique({
            where: { id: item.id },
            include: {
                category: {
                    select: {
                        id: true,
                        name: true,
                        type: true,
                    },
                },
            },
        });
        return res.status(201).json({
            success: true,
            data: itemWithCategory,
            message: "Inventory item created successfully",
        });
    }
    catch (error) {
        console.error("Create inventory item error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.createInventoryItem = createInventoryItem;
// ==================== UPDATE INVENTORY ITEM ====================
const updateInventoryItem = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const currentUserId = req.userId;
        // Validate request body
        const { success, data, error } = shared_types_1.UpdateInventoryItemSchema.safeParse(req.body);
        if (!success) {
            return res.status(400).json({ message: error === null || error === void 0 ? void 0 : error.message });
        }
        // Check if item exists and belongs to user
        const existingItem = yield prisma_1.default.inventoryItem.findFirst({
            where: {
                id,
                userId: currentUserId,
            },
        });
        if (!existingItem) {
            return res.status(404).json({ message: "Inventory item not found" });
        }
        // Check for name uniqueness if name is being updated
        if (data.name && data.name !== existingItem.name) {
            const nameExists = yield prisma_1.default.inventoryItem.findFirst({
                where: {
                    userId: currentUserId,
                    name: data.name,
                    itemType: data.itemType || existingItem.itemType,
                    id: { not: id },
                },
            });
            if (nameExists) {
                return res
                    .status(400)
                    .json({ message: "Inventory item with this name already exists" });
            }
        }
        // Update inventory item
        const updatedItem = yield prisma_1.default.inventoryItem.update({
            where: { id },
            data,
            include: {
                category: {
                    select: {
                        id: true,
                        name: true,
                        type: true,
                    },
                },
            },
        });
        return res.json({
            success: true,
            data: updatedItem,
            message: "Inventory item updated successfully",
        });
    }
    catch (error) {
        console.error("Update inventory item error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.updateInventoryItem = updateInventoryItem;
// ==================== DELETE INVENTORY ITEM ====================
const deleteInventoryItem = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const currentUserId = req.userId;
        // Check if item exists and belongs to user
        const existingItem = yield prisma_1.default.inventoryItem.findFirst({
            where: {
                id,
                userId: currentUserId,
            },
            include: {
                _count: {
                    select: {
                        transactions: true,
                        usages: true,
                    },
                },
            },
        });
        if (!existingItem) {
            return res.status(404).json({ message: "Inventory item not found" });
        }
        // Check if item has any transactions or usages
        if (existingItem._count.transactions > 0 ||
            existingItem._count.usages > 0) {
            return res.status(400).json({
                message: "Cannot delete inventory item with existing transactions or usages. Please remove all related data first.",
            });
        }
        // Delete inventory item
        yield prisma_1.default.inventoryItem.delete({
            where: { id },
        });
        return res.json({
            success: true,
            message: "Inventory item deleted successfully",
        });
    }
    catch (error) {
        console.error("Delete inventory item error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.deleteInventoryItem = deleteInventoryItem;
// ==================== ADD INVENTORY TRANSACTION (FOR TESTING) ====================
const addInventoryTransaction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currentUserId = req.userId;
        // Validate request body
        const { success, data, error } = shared_types_1.CreateInventoryTransactionSchema.safeParse(req.body);
        if (!success) {
            return res.status(400).json({ message: error === null || error === void 0 ? void 0 : error.message });
        }
        // Check if item exists and belongs to user
        const item = yield prisma_1.default.inventoryItem.findFirst({
            where: {
                id: data.itemId,
                userId: currentUserId,
            },
        });
        if (!item) {
            return res.status(404).json({ message: "Inventory item not found" });
        }
        // Create transaction and update stock
        const result = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Create transaction
            const transaction = yield tx.inventoryTransaction.create({
                data: {
                    type: data.type,
                    quantity: data.quantity,
                    unitPrice: data.unitPrice,
                    totalAmount: data.totalAmount,
                    date: new Date(data.date),
                    description: data.description,
                    itemId: data.itemId,
                },
            });
            // Update stock based on transaction type
            const stockChange = data.type === client_1.TransactionType.PURCHASE ? data.quantity : -data.quantity;
            yield tx.inventoryItem.update({
                where: { id: data.itemId },
                data: {
                    currentStock: {
                        increment: stockChange,
                    },
                },
            });
            return transaction;
        }));
        return res.status(201).json({
            success: true,
            data: result,
            message: "Inventory transaction added successfully",
        });
    }
    catch (error) {
        console.error("Add inventory transaction error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.addInventoryTransaction = addInventoryTransaction;
// ==================== RECORD INVENTORY USAGE (FOR TESTING) ====================
const recordInventoryUsage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currentUserId = req.userId;
        // Validate request body
        const { success, data, error } = shared_types_1.CreateInventoryUsageSchema.safeParse(req.body);
        if (!success) {
            return res.status(400).json({ message: error === null || error === void 0 ? void 0 : error.message });
        }
        // Use the inventory service to record usage
        const usage = yield inventoryService_1.InventoryService.recordInventoryUsage({
            itemId: data.itemId,
            quantity: data.quantity,
            date: new Date(data.date),
            farmId: data.farmId,
            batchId: data.batchId,
            expenseId: data.expenseId,
            notes: data.notes,
        });
        return res.status(201).json({
            success: true,
            data: usage,
            message: "Inventory usage recorded successfully",
        });
    }
    catch (error) {
        console.error("Record inventory usage error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.recordInventoryUsage = recordInventoryUsage;
// ==================== GET INVENTORY TRANSACTIONS ====================
const getInventoryTransactions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { itemId } = req.params;
        const { page = 1, limit = 10, type, startDate, endDate } = req.query;
        const currentUserId = req.userId;
        const skip = (Number(page) - 1) * Number(limit);
        // Check if item exists and belongs to user
        const item = yield prisma_1.default.inventoryItem.findFirst({
            where: {
                id: itemId,
                userId: currentUserId,
            },
        });
        if (!item) {
            return res.status(404).json({ message: "Inventory item not found" });
        }
        // Build where clause
        const where = {
            itemId,
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
            prisma_1.default.inventoryTransaction.findMany({
                where,
                skip,
                take: Number(limit),
                orderBy: { date: "desc" },
            }),
            prisma_1.default.inventoryTransaction.count({ where }),
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
        console.error("Get inventory transactions error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getInventoryTransactions = getInventoryTransactions;
// ==================== GET INVENTORY USAGES ====================
const getInventoryUsages = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { itemId } = req.params;
        const { page = 1, limit = 10, startDate, endDate } = req.query;
        const currentUserId = req.userId;
        const skip = (Number(page) - 1) * Number(limit);
        // Check if item exists and belongs to user
        const item = yield prisma_1.default.inventoryItem.findFirst({
            where: {
                id: itemId,
                userId: currentUserId,
            },
        });
        if (!item) {
            return res.status(404).json({ message: "Inventory item not found" });
        }
        // Build where clause
        const where = {
            itemId,
        };
        if (startDate || endDate) {
            where.date = {};
            if (startDate) {
                where.date.gte = new Date(startDate);
            }
            if (endDate) {
                where.date.lte = new Date(endDate);
            }
        }
        const [usages, total] = yield Promise.all([
            prisma_1.default.inventoryUsage.findMany({
                where,
                skip,
                take: Number(limit),
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
                    expense: {
                        select: {
                            id: true,
                            description: true,
                            amount: true,
                        },
                    },
                },
                orderBy: { date: "desc" },
            }),
            prisma_1.default.inventoryUsage.count({ where }),
        ]);
        return res.json({
            success: true,
            data: usages,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error("Get inventory usages error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getInventoryUsages = getInventoryUsages;
// ==================== GET INVENTORY TABLE DATA ====================
const getInventoryTableData = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currentUserId = req.userId;
        const { itemType } = req.query;
        if (!currentUserId) {
            return res.status(400).json({ message: "No User found in Controller" });
        }
        const where = {
            userId: currentUserId,
        };
        if (itemType) {
            where.itemType = itemType;
        }
        // Get all purchase transactions for this user's inventory items
        const entityTransactions = yield prisma_1.default.entityTransaction.findMany({
            where: {
                type: "PURCHASE",
                inventoryItem: where,
            },
            include: {
                inventoryItem: {
                    select: {
                        id: true,
                        name: true,
                        itemType: true,
                        unit: true,
                        minStock: true,
                        category: { select: { name: true } },
                    },
                },
                dealer: { select: { id: true, name: true } },
                hatchery: { select: { id: true, name: true } },
                medicineSupplier: { select: { id: true, name: true } },
            },
            orderBy: { date: "desc" },
        });
        // Collect unique dealer IDs to batch-check connections
        const dealerIds = [...new Set(entityTransactions
                .filter((et) => et.dealerId)
                .map((et) => et.dealerId))];
        const connections = dealerIds.length > 0
            ? yield prisma_1.default.dealerFarmer.findMany({
                where: {
                    dealerId: { in: dealerIds },
                    farmerId: currentUserId,
                    archivedByFarmer: false,
                },
                select: { dealerId: true },
            })
            : [];
        const connectedDealerIds = new Set(connections.map((c) => c.dealerId));
        // Group transactions by (item name + unit price + supplier) — merge same, separate different prices
        const groupMap = new Map();
        entityTransactions
            .filter((et) => et.inventoryItem)
            .forEach((et) => {
            const item = et.inventoryItem;
            const paidQty = Number(et.quantity) || 0;
            const freeQty = Number(et.freeQuantity) || 0;
            const quantity = paidQty + freeQty;
            const unitPrice = et.unitPrice ? Number(et.unitPrice) : (paidQty > 0 ? Number(et.amount) / paidQty : 0);
            let supplierName = "Unknown";
            if (et.dealer)
                supplierName = et.dealer.name;
            else if (et.hatchery)
                supplierName = et.hatchery.name;
            else if (et.medicineSupplier)
                supplierName = et.medicineSupplier.name;
            const unit = et.unit || item.unit;
            const groupKey = `${item.name}||${unitPrice}||${supplierName}||${unit}`;
            const existing = groupMap.get(groupKey);
            if (existing) {
                existing.quantity += quantity;
                // Keep the most recent date
                if (et.date > existing.lastPurchaseDate) {
                    existing.lastPurchaseDate = et.date;
                    existing.id = et.id;
                }
            }
            else {
                groupMap.set(groupKey, {
                    id: et.id,
                    name: item.name,
                    itemType: item.itemType,
                    quantity,
                    unit,
                    rate: unitPrice,
                    supplier: supplierName,
                    minStock: item.minStock,
                    category: item.category.name,
                    lastPurchaseDate: et.date,
                    dealerId: et.dealerId || null,
                    entityType: et.entityType || (et.dealerId ? "DEALER" : et.hatcheryId ? "HATCHERY" : et.medicineSupplierId ? "MEDICINE_SUPPLIER" : null),
                    purchaseCategory: et.purchaseCategory || null,
                    isConnectedDealer: et.dealerId ? connectedDealerIds.has(et.dealerId) : false,
                });
            }
        });
        const tableData = Array.from(groupMap.values()).map((row) => (Object.assign(Object.assign({}, row), { value: row.quantity * row.rate, status: row.quantity === 0 ? "Out of Stock" : "In Stock" })));
        return res.json({
            success: true,
            data: tableData,
        });
    }
    catch (error) {
        console.error("Get inventory table data error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getInventoryTableData = getInventoryTableData;
// ==================== GET INVENTORY STATISTICS ====================
const getInventoryStatistics = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const currentUserId = req.userId;
        const [totalItems, lowStockItems, itemsByType, totalValue] = yield Promise.all([
            prisma_1.default.inventoryItem.count({
                where: { userId: currentUserId },
            }),
            prisma_1.default.inventoryItem.count({
                where: {
                    userId: currentUserId,
                    AND: [
                        { minStock: { not: null } },
                        { currentStock: { lte: prisma_1.default.inventoryItem.fields.minStock } },
                    ],
                },
            }),
            prisma_1.default.inventoryItem.groupBy({
                by: ["itemType"],
                where: { userId: currentUserId },
                _count: { id: true },
                _sum: { currentStock: true },
            }),
            // Calculate total value based on average unit price from transactions
            prisma_1.default.inventoryItem.findMany({
                where: { userId: currentUserId },
                include: {
                    transactions: {
                        where: { type: "PURCHASE" },
                        orderBy: { date: "desc" },
                        take: 1, // Get latest purchase price
                    },
                },
            }),
        ]);
        // Calculate total inventory value
        const totalInventoryValue = totalValue.reduce((sum, item) => {
            const latestTransaction = item.transactions[0];
            if (latestTransaction) {
                const unitPrice = Number(latestTransaction.unitPrice);
                const currentStock = Number(item.currentStock);
                return sum + unitPrice * currentStock;
            }
            return sum;
        }, 0);
        return res.json({
            success: true,
            data: {
                totalItems,
                lowStockItems,
                totalValue: totalInventoryValue,
                totalStock: totalValue.reduce((sum, item) => sum + Number(item.currentStock), 0),
                categories: itemsByType.length,
                itemsByType: itemsByType.map((item) => ({
                    type: item.itemType,
                    count: item._count.id,
                    totalStock: Number(item._sum.currentStock || 0),
                })),
            },
        });
    }
    catch (error) {
        console.error("Get inventory statistics error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getInventoryStatistics = getInventoryStatistics;
