import prisma from "../utils/prisma";
import {
  TransactionType,
  InventoryItemType,
  CategoryType,
} from "@prisma/client";

// ==================== INVENTORY SERVICE ====================
// Handles the connection between suppliers, inventory, and expenses

export class InventoryService {
  // ==================== PURCHASE FROM SUPPLIER ====================
  static async processSupplierPurchase(data: {
    // Supplier info
    dealerId?: string;
    hatcheryId?: string;
    medicineSupplierId?: string;

    // Purchase details
    itemName: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    date: Date;
    description?: string;
    reference?: string;

    // User context (inventory is global, not farm-specific)
    userId: string;
  }) {
    const {
      dealerId,
      hatcheryId,
      medicineSupplierId,
      itemName,
      quantity,
      unitPrice,
      totalAmount,
      date,
      description,
      reference,
      userId,
    } = data;

    // Determine item type based on supplier
    let itemType: InventoryItemType;
    if (dealerId) itemType = InventoryItemType.FEED;
    else if (hatcheryId) itemType = InventoryItemType.CHICKS;
    else if (medicineSupplierId) itemType = InventoryItemType.MEDICINE;
    else itemType = InventoryItemType.OTHER;

    return await prisma.$transaction(async (tx) => {
      // 1. Find or create inventory item
      let inventoryItem = await tx.inventoryItem.findFirst({
        where: {
          userId,
          name: itemName,
          itemType,
        },
      });

      if (!inventoryItem) {
        // Find or create category
        const categoryName =
          itemType === InventoryItemType.FEED
            ? "Feed"
            : itemType === InventoryItemType.CHICKS
              ? "Chicks"
              : itemType === InventoryItemType.MEDICINE
                ? "Medicine"
                : itemType === InventoryItemType.OTHER
                  ? "Equipment"
                  : "Other";

        let category = await tx.category.findFirst({
          where: {
            userId,
            type: "INVENTORY",
            name: categoryName,
          },
        });

        // Create category if it doesn't exist
        if (!category) {
          category = await tx.category.create({
            data: {
              name: categoryName,
              type: CategoryType.INVENTORY,
              description: `Category for ${categoryName} items`,
              userId,
            },
          });
        }

        inventoryItem = await tx.inventoryItem.create({
          data: {
            name: itemName,
            description: description,
            currentStock: 0,
            unit: itemType === InventoryItemType.CHICKS ? "birds" : "kg",
            itemType,
            userId,
            categoryId: category.id,
          },
        });
      }

      // 2. Create expense record (without farm/batch context - this is a general purchase)
      const expense = await tx.expense.create({
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

      // 3. Create inventory transaction (stock addition)
      await tx.inventoryTransaction.create({
        data: {
          type: TransactionType.PURCHASE,
          quantity,
          unitPrice,
          totalAmount,
          date,
          description: `Purchase from supplier`,
          itemId: inventoryItem.id,
        },
      });

      // 4. Update inventory stock
      await tx.inventoryItem.update({
        where: { id: inventoryItem.id },
        data: {
          currentStock: {
            increment: quantity,
          },
        },
      });

      // 5. Create entity transaction (supplier ledger)
      const entityTransaction = await tx.entityTransaction.create({
        data: {
          type: TransactionType.PURCHASE,
          amount: totalAmount,
          quantity,
          itemName,
          date,
          description,
          reference,
          dealerId,
          hatcheryId,
          medicineSupplierId,
          inventoryItemId: inventoryItem.id,
          expenseId: expense.id,
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

      return {
        inventoryItem,
        expense,
        entityTransaction,
        purchaseTransactionId: entityTransaction.id, // 🔗 NEW: Return purchase transaction ID for payment linking
      };
    });
  }

  // ==================== RECORD INVENTORY USAGE (FARM/BATCH SPECIFIC) ====================
  static async recordInventoryUsage(data: {
    itemId: string;
    quantity: number;
    date: Date;
    farmId: string;
    batchId?: string;
    expenseId?: string;
    notes?: string;
  }) {
    const { itemId, quantity, date, farmId, batchId, expenseId, notes } = data;

    return await prisma.$transaction(async (tx) => {
      // 1. Check if enough stock available
      const item = await tx.inventoryItem.findUnique({
        where: { id: itemId },
      });

      if (!item) {
        throw new Error("Inventory item not found");
      }

      if (Number(item.currentStock) < quantity) {
        throw new Error(
          `Insufficient stock. Available: ${item.currentStock}, Required: ${quantity}`
        );
      }

      // 2. Create usage record
      const usage = await tx.inventoryUsage.create({
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
      await tx.inventoryItem.update({
        where: { id: itemId },
        data: {
          currentStock: {
            decrement: quantity,
          },
        },
      });

      // 4. Create inventory transaction (stock reduction)
      await tx.inventoryTransaction.create({
        data: {
          type: TransactionType.USAGE, // Using USAGE for internal consumption
          quantity,
          unitPrice: 0, // No price for usage
          totalAmount: 0,
          date,
          description: `Usage recorded`,
          itemId,
        },
      });

      return usage;
    });
  }

  // ==================== GET INVENTORY BY TYPE ====================
  static async getInventoryByType(userId: string, itemType: InventoryItemType) {
    return await prisma.inventoryItem.findMany({
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
  }

  // ==================== GET LOW STOCK ITEMS ====================
  static async getLowStockItems(userId: string) {
    return await prisma.inventoryItem.findMany({
      where: {
        userId,
        AND: [
          { minStock: { not: null } },
          { currentStock: { lte: prisma.inventoryItem.fields.minStock } },
        ],
      },
      include: {
        category: true,
      },
    });
  }

  // ==================== CREATE EXPENSE FROM INVENTORY USAGE ====================
  static async createExpenseFromInventoryUsage(data: {
    itemId: string;
    quantity: number;
    date: Date;
    farmId: string;
    batchId?: string;
    description?: string;
    userId: string;
  }) {
    const { itemId, quantity, date, farmId, batchId, description, userId } =
      data;

    return await prisma.$transaction(async (tx) => {
      // 1. Get inventory item
      const item = await tx.inventoryItem.findUnique({
        where: { id: itemId },
        include: { category: true },
      });

      if (!item) {
        throw new Error("Inventory item not found");
      }

      // 2. Check if enough stock available
      if (Number(item.currentStock) < quantity) {
        throw new Error(
          `Insufficient stock. Available: ${item.currentStock}, Required: ${quantity}`
        );
      }

      // 3. Get latest unit price from transactions
      const latestTransaction = await tx.inventoryTransaction.findFirst({
        where: { itemId, type: "PURCHASE" },
        orderBy: { date: "desc" },
      });

      const unitPrice = latestTransaction
        ? Number(latestTransaction.unitPrice)
        : 0;
      const totalAmount = unitPrice * quantity;

      // 4. Create expense record (with farm/batch context)
      const expense = await tx.expense.create({
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
      const usage = await tx.inventoryUsage.create({
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
      await tx.inventoryItem.update({
        where: { id: itemId },
        data: {
          currentStock: {
            decrement: quantity,
          },
        },
      });

      // 7. Create inventory transaction (stock reduction)
      await tx.inventoryTransaction.create({
        data: {
          type: TransactionType.USAGE, // Using USAGE for internal consumption
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
        updatedItem: await tx.inventoryItem.findUnique({
          where: { id: itemId },
        }),
      };
    });
  }

}
