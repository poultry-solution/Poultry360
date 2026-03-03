import prisma from "../utils/prisma";
import { Prisma } from "@prisma/client";
import {
  TransactionType,
  InventoryItemType,
  CategoryType,
  PurchaseCategory,
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
    // Paid quantity (cost applies to this only)
    quantity: number;
    // Optional: free quantity provided at zero cost (e.g., free chicks)
    freeQuantity?: number;
    unitPrice: number;
    totalAmount: number;
    date: Date;
    description?: string;
    reference?: string;

    // Optional: Purchase category override (for unified supplier system)
    purchaseCategory?: PurchaseCategory;

    // User context (inventory is global, not farm-specific)
    userId: string;

    // Optional: Payment details for initial payment
    paymentAmount?: number;
    paymentDescription?: string;

    // Optional: Unit for the transaction
    unit?: string;
  }) {
    const {
      dealerId,
      hatcheryId,
      medicineSupplierId,
      itemName,
      quantity,
      freeQuantity = 0,
      unitPrice,
      totalAmount,
      date,
      description,
      reference,
      purchaseCategory,
      userId,
      paymentAmount,
      paymentDescription,
      unit,
    } = data;

    // Determine item type based on supplier or explicit purchaseCategory
    let itemType: InventoryItemType;
    if (dealerId && purchaseCategory) {
      // Unified supplier system: use explicit category
      const categoryToItemType: Record<PurchaseCategory, InventoryItemType> = {
        FEED: InventoryItemType.FEED,
        MEDICINE: InventoryItemType.MEDICINE,
        CHICKS: InventoryItemType.CHICKS,
        EQUIPMENT: InventoryItemType.EQUIPMENT,
        OTHER: InventoryItemType.OTHER,
      };
      itemType = categoryToItemType[purchaseCategory];
    } else if (dealerId) {
      itemType = InventoryItemType.FEED; // Backward compatible default
    } else if (hatcheryId) {
      itemType = InventoryItemType.CHICKS;
    } else if (medicineSupplierId) {
      itemType = InventoryItemType.MEDICINE;
    } else {
      itemType = InventoryItemType.OTHER;
    }

    return await prisma.$transaction(
      async (tx) => {
        // 1. Determine category name
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

      // 2. Upsert category (find or create in one operation)
      const category = await tx.category.upsert({
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
          type: CategoryType.INVENTORY,
          description: `Category for ${categoryName} items`,
          userId,
        },
      });

      // 3. Find or create inventory item by name + rate + supplier (different rate or supplier = separate line)
      const rateKey = new Prisma.Decimal(Math.round(unitPrice * 100) / 100);
      const supplierKey =
        dealerId != null
          ? `DEALER:${dealerId}`
          : hatcheryId != null
            ? `HATCHERY:${hatcheryId}`
            : medicineSupplierId != null
              ? `MEDICINE_SUPPLIER:${medicineSupplierId}`
              : "NONE";

      const inventoryItem = await tx.inventoryItem.upsert({
        where: {
          userId_categoryId_name_unitPrice_supplierKey: {
            userId,
            categoryId: category.id,
            name: itemName,
            unitPrice: rateKey,
            supplierKey,
          },
        },
        update: unit ? { unit } : {},
        create: {
          name: itemName,
          description: description,
          currentStock: 0,
          unit: unit || (itemType === InventoryItemType.CHICKS ? "birds" : "kg"),
          itemType,
          userId,
          categoryId: category.id,
          unitPrice: rateKey,
          supplierKey,
        },
      });

      // 4. Create expense record for PAID quantity (free quantity is zero-cost)
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

      // 5. Create inventory transaction for paid quantity (stock addition)
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

      // 6. If there is free quantity, add a zero-cost inventory transaction
      if (freeQuantity && freeQuantity > 0) {
        await tx.inventoryTransaction.create({
          data: {
            type: TransactionType.PURCHASE,
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
      await tx.inventoryItem.update({
        where: { id: inventoryItem.id },
        data: {
          currentStock: {
            increment: quantity + (freeQuantity || 0),
          },
        },
      });

      // 8. Create entity transaction (supplier ledger)
      // Determine purchaseCategory for the transaction
      const resolvedCategory: PurchaseCategory | undefined =
        purchaseCategory ??
        (hatcheryId ? PurchaseCategory.CHICKS :
         medicineSupplierId ? PurchaseCategory.MEDICINE :
         dealerId ? PurchaseCategory.FEED : undefined);

      const entityTransaction = await tx.entityTransaction.create({
        data: {
          type: TransactionType.PURCHASE,
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
        
        paymentTransaction = await tx.entityTransaction.create({
          data: {
            type: TransactionType.PAYMENT,
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
      },
      { timeout: 20000 }
    );
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
