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
exports.InventoryService = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const client_1 = require("@prisma/client");
// ==================== INVENTORY SERVICE ====================
// Handles the connection between suppliers, inventory, and expenses
class InventoryService {
    // ==================== PURCHASE FROM SUPPLIER ====================
    static processSupplierPurchase(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { dealerId, hatcheryId, medicineSupplierId, itemName, quantity, freeQuantity = 0, unitPrice, totalAmount, date, description, reference, purchaseCategory, userId, paymentAmount, paymentDescription, unit, } = data;
            // Determine item type based on supplier or explicit purchaseCategory
            let itemType;
            if (dealerId && purchaseCategory) {
                // Unified supplier system: use explicit category
                const categoryToItemType = {
                    FEED: client_1.InventoryItemType.FEED,
                    MEDICINE: client_1.InventoryItemType.MEDICINE,
                    CHICKS: client_1.InventoryItemType.CHICKS,
                    EQUIPMENT: client_1.InventoryItemType.EQUIPMENT,
                    OTHER: client_1.InventoryItemType.OTHER,
                };
                itemType = categoryToItemType[purchaseCategory];
            }
            else if (dealerId) {
                itemType = client_1.InventoryItemType.FEED; // Backward compatible default
            }
            else if (hatcheryId) {
                itemType = client_1.InventoryItemType.CHICKS;
            }
            else if (medicineSupplierId) {
                itemType = client_1.InventoryItemType.MEDICINE;
            }
            else {
                itemType = client_1.InventoryItemType.OTHER;
            }
            return yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                // 1. Determine category name
                const categoryName = itemType === client_1.InventoryItemType.FEED
                    ? "Feed"
                    : itemType === client_1.InventoryItemType.CHICKS
                        ? "Chicks"
                        : itemType === client_1.InventoryItemType.MEDICINE
                            ? "Medicine"
                            : itemType === client_1.InventoryItemType.OTHER
                                ? "Equipment"
                                : "Other";
                // 2. Upsert category (find or create in one operation)
                const category = yield tx.category.upsert({
                    where: {
                        userId_type_name: {
                            userId,
                            type: "INVENTORY",
                            name: categoryName,
                        },
                    },
                    update: {},
                    create: {
                        name: categoryName,
                        type: client_1.CategoryType.INVENTORY,
                        description: `Category for ${categoryName} items`,
                        userId,
                    },
                });
                // 3. Upsert inventory item (find or create in one operation)
                const inventoryItem = yield tx.inventoryItem.upsert({
                    where: {
                        userId_categoryId_name: {
                            userId,
                            categoryId: category.id,
                            name: itemName,
                        },
                    },
                    update: unit ? { unit } : {},
                    create: {
                        name: itemName,
                        description: description,
                        currentStock: 0,
                        unit: unit || (itemType === client_1.InventoryItemType.CHICKS ? "birds" : "kg"),
                        itemType,
                        userId,
                        categoryId: category.id,
                    },
                });
                // 4. Create expense record for PAID quantity (free quantity is zero-cost)
                const expense = yield tx.expense.create({
                    data: {
                        date,
                        amount: totalAmount,
                        description: description || `Purchase of ${itemName}`,
                        quantity,
                        unitPrice,
                        farmId: null, // No specific farm - this is general inventory
                        batchId: null, // No specific batch - this is general inventory
                        categoryId: inventoryItem.categoryId,
                    },
                });
                // 5. Create inventory transaction for paid quantity (stock addition)
                yield tx.inventoryTransaction.create({
                    data: {
                        type: client_1.TransactionType.PURCHASE,
                        quantity,
                        unitPrice,
                        totalAmount,
                        date,
                        description: `Purchase from supplier`,
                        itemId: inventoryItem.id,
                    },
                });
                // 6. If there is free quantity, add a zero-cost inventory transaction
                if (freeQuantity && freeQuantity > 0) {
                    yield tx.inventoryTransaction.create({
                        data: {
                            type: client_1.TransactionType.PURCHASE,
                            quantity: freeQuantity,
                            unitPrice: 0,
                            totalAmount: 0,
                            date,
                            description: `Free units received with purchase`,
                            itemId: inventoryItem.id,
                        },
                    });
                }
                // 7. Update inventory stock by paid + free
                yield tx.inventoryItem.update({
                    where: { id: inventoryItem.id },
                    data: {
                        currentStock: {
                            increment: quantity + (freeQuantity || 0),
                        },
                    },
                });
                // 8. Create entity transaction (supplier ledger)
                // Determine purchaseCategory for the transaction
                const resolvedCategory = purchaseCategory !== null && purchaseCategory !== void 0 ? purchaseCategory : (hatcheryId ? client_1.PurchaseCategory.CHICKS :
                    medicineSupplierId ? client_1.PurchaseCategory.MEDICINE :
                        dealerId ? client_1.PurchaseCategory.FEED : undefined);
                const entityTransaction = yield tx.entityTransaction.create({
                    data: {
                        type: client_1.TransactionType.PURCHASE,
                        amount: totalAmount,
                        quantity,
                        freeQuantity: freeQuantity || 0,
                        itemName,
                        date,
                        description,
                        reference,
                        dealerId,
                        hatcheryId,
                        medicineSupplierId,
                        inventoryItemId: inventoryItem.id,
                        expenseId: expense.id,
                        purchaseCategory: resolvedCategory,
                        unit: unit || null,
                        unitPrice: unitPrice,
                        entityType: dealerId
                            ? "DEALER"
                            : hatcheryId
                                ? "HATCHERY"
                                : medicineSupplierId
                                    ? "MEDICINE_SUPPLIER"
                                    : "OTHER",
                        entityId: dealerId || hatcheryId || medicineSupplierId || "",
                    },
                });
                // 9. Create payment transaction if paymentAmount is provided
                let paymentTransaction = null;
                if (paymentAmount && paymentAmount > 0) {
                    // Prevent overpayment at creation
                    if (paymentAmount > totalAmount) {
                        throw new Error("Initial payment cannot exceed purchase amount");
                    }
                    paymentTransaction = yield tx.entityTransaction.create({
                        data: {
                            type: client_1.TransactionType.PAYMENT,
                            amount: paymentAmount,
                            quantity: null,
                            itemName: null,
                            date,
                            description: paymentDescription || `Initial payment for ${itemName}`,
                            reference: null,
                            dealerId,
                            hatcheryId,
                            medicineSupplierId,
                            entityType: dealerId
                                ? "DEALER"
                                : hatcheryId
                                    ? "HATCHERY"
                                    : medicineSupplierId
                                        ? "MEDICINE_SUPPLIER"
                                        : "OTHER",
                            entityId: dealerId || hatcheryId || medicineSupplierId || "",
                            // 🔗 NEW: Link payment to purchase
                            paymentToPurchaseId: entityTransaction.id,
                        },
                    });
                }
                return {
                    inventoryItem,
                    expense,
                    entityTransaction,
                    paymentTransaction,
                    purchaseTransactionId: entityTransaction.id, // 🔗 NEW: Return purchase transaction ID for payment linking
                };
            }), { timeout: 20000 });
        });
    }
    // ==================== RECORD INVENTORY USAGE (FARM/BATCH SPECIFIC) ====================
    static recordInventoryUsage(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { itemId, quantity, date, farmId, batchId, expenseId, notes } = data;
            return yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                // 1. Check if enough stock available
                const item = yield tx.inventoryItem.findUnique({
                    where: { id: itemId },
                });
                if (!item) {
                    throw new Error("Inventory item not found");
                }
                if (Number(item.currentStock) < quantity) {
                    throw new Error(`Insufficient stock. Available: ${item.currentStock}, Required: ${quantity}`);
                }
                // 2. Create usage record
                const usage = yield tx.inventoryUsage.create({
                    data: {
                        date,
                        quantity,
                        notes,
                        itemId,
                        farmId,
                        batchId,
                        expenseId,
                    },
                });
                // 3. Update stock
                yield tx.inventoryItem.update({
                    where: { id: itemId },
                    data: {
                        currentStock: {
                            decrement: quantity,
                        },
                    },
                });
                // 4. Create inventory transaction (stock reduction)
                yield tx.inventoryTransaction.create({
                    data: {
                        type: client_1.TransactionType.USAGE, // Using USAGE for internal consumption
                        quantity,
                        unitPrice: 0, // No price for usage
                        totalAmount: 0,
                        date,
                        description: `Usage recorded`,
                        itemId,
                    },
                });
                return usage;
            }));
        });
    }
    // ==================== GET INVENTORY BY TYPE ====================
    static getInventoryByType(userId, itemType) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma_1.default.inventoryItem.findMany({
                where: {
                    userId,
                    itemType,
                },
                include: {
                    category: true,
                    transactions: {
                        orderBy: { date: "desc" },
                        take: 5,
                    },
                    usages: {
                        orderBy: { date: "desc" },
                        take: 5,
                    },
                },
            });
        });
    }
    // ==================== GET LOW STOCK ITEMS ====================
    static getLowStockItems(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield prisma_1.default.inventoryItem.findMany({
                where: {
                    userId,
                    AND: [
                        { minStock: { not: null } },
                        { currentStock: { lte: prisma_1.default.inventoryItem.fields.minStock } },
                    ],
                },
                include: {
                    category: true,
                },
            });
        });
    }
    // ==================== CREATE EXPENSE FROM INVENTORY USAGE ====================
    static createExpenseFromInventoryUsage(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const { itemId, quantity, date, farmId, batchId, description, userId } = data;
            return yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                // 1. Get inventory item
                const item = yield tx.inventoryItem.findUnique({
                    where: { id: itemId },
                    include: { category: true },
                });
                if (!item) {
                    throw new Error("Inventory item not found");
                }
                // 2. Check if enough stock available
                if (Number(item.currentStock) < quantity) {
                    throw new Error(`Insufficient stock. Available: ${item.currentStock}, Required: ${quantity}`);
                }
                // 3. Get latest unit price from transactions
                const latestTransaction = yield tx.inventoryTransaction.findFirst({
                    where: { itemId, type: "PURCHASE" },
                    orderBy: { date: "desc" },
                });
                const unitPrice = latestTransaction
                    ? Number(latestTransaction.unitPrice)
                    : 0;
                const totalAmount = unitPrice * quantity;
                // 4. Create expense record (with farm/batch context)
                const expense = yield tx.expense.create({
                    data: {
                        date,
                        amount: totalAmount,
                        description: description || `Usage of ${item.name}`,
                        quantity,
                        unitPrice,
                        farmId,
                        batchId,
                        categoryId: item.categoryId,
                    },
                });
                // 5. Record usage
                const usage = yield tx.inventoryUsage.create({
                    data: {
                        date,
                        quantity,
                        unitPrice,
                        totalAmount,
                        notes: description,
                        itemId,
                        farmId,
                        batchId,
                        expenseId: expense.id,
                    },
                });
                // 6. Update stock
                yield tx.inventoryItem.update({
                    where: { id: itemId },
                    data: {
                        currentStock: {
                            decrement: quantity,
                        },
                    },
                });
                // 7. Create inventory transaction (stock reduction)
                yield tx.inventoryTransaction.create({
                    data: {
                        type: client_1.TransactionType.USAGE, // Using USAGE for internal consumption
                        quantity,
                        unitPrice,
                        totalAmount,
                        date,
                        description: `Usage recorded for ${farmId}${batchId ? ` - Batch ${batchId}` : ""}`,
                        itemId,
                    },
                });
                return {
                    expense,
                    usage,
                    updatedItem: yield tx.inventoryItem.findUnique({
                        where: { id: itemId },
                    }),
                };
            }));
        });
    }
}
exports.InventoryService = InventoryService;
