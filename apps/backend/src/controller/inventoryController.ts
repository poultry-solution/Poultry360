import { Request, Response } from "express";
import prisma from "../utils/prisma";
import {
  UserRole,
  InventoryItemType,
  TransactionType,
  CategoryType,
} from "@prisma/client";
import {
  CreateInventoryItemSchema,
  UpdateInventoryItemSchema,
  InventoryItemSchema,
  CreateInventoryTransactionSchema,
  CreateInventoryUsageSchema,
} from "@myapp/shared-types";
import { InventoryService } from "../services/inventoryService";

// ==================== GET ALL INVENTORY ITEMS ====================
export const getAllInventoryItems = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { page = 1, limit = 10, search, itemType, lowStock } = req.query;
    const currentUserId = req.userId;

    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause
    const where: any = {
      userId: currentUserId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: "insensitive" } },
        { description: { contains: search as string, mode: "insensitive" } },
      ];
    }

    if (itemType) {
      where.itemType = itemType as InventoryItemType;
    }

    if (lowStock === "true") {
      where.AND = [
        { minStock: { not: null } },
        { currentStock: { lte: prisma.inventoryItem.fields.minStock } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({
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
      prisma.inventoryItem.count({ where }),
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
  } catch (error) {
    console.error("Get all inventory items error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET INVENTORY ITEM BY ID ====================
export const getInventoryItemById = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;

    const item = await prisma.inventoryItem.findFirst({
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
  } catch (error) {
    console.error("Get inventory item by ID error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET INVENTORY BY TYPE ====================
export const getInventoryByType = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { itemType } = req.params;
    const currentUserId = req.userId;

    if (!currentUserId) {
      return res.status(400).json({ message: "No User found in COntrooler" });
    }

    if (
      !Object.values(InventoryItemType).includes(itemType as InventoryItemType)
    ) {
      return res.status(400).json({ message: "Invalid item type" });
    }

    const items = await InventoryService.getInventoryByType(
      currentUserId,
      itemType as InventoryItemType
    );

    return res.json({
      success: true,
      data: items,
    });
  } catch (error) {
    console.error("Get inventory by type error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET LOW STOCK ITEMS ====================
export const getLowStockItems = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const currentUserId = req.userId;

    if (!currentUserId) {
      return res.status(400).json({ message: "No User found in COntrooler" });
    }

    const items = await InventoryService.getLowStockItems(
      currentUserId as string
    );

    return res.json({
      success: true,
      data: items,
    });
  } catch (error) {
    console.error("Get low stock items error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== CREATE INVENTORY ITEM ====================
export const createInventoryItem = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const currentUserId = req.userId;

    // Validate request body
    const { success, data, error } = CreateInventoryItemSchema.safeParse(
      req.body
    );
    if (!success) {
      return res.status(400).json({ message: error?.message });
    }

    if (!currentUserId) {
      return res.status(400).json({ message: "No User found in COntrooler" });
    }

    // Check if item with same name already exists for this user
    const existingItem = await prisma.inventoryItem.findFirst({
      where: {
        userId: currentUserId,
        name: data.name,
        itemType: data.itemType || InventoryItemType.OTHER,
      },
    });

    if (existingItem) {
      return res
        .status(400)
        .json({ message: "Inventory item with this name already exists" });
    }

    // Find or create category
    const itemType = data.itemType || InventoryItemType.OTHER;
    const categoryName =
      itemType === InventoryItemType.FEED
        ? "Feed"
        : itemType === InventoryItemType.CHICKS
          ? "Chicks"
          : itemType === InventoryItemType.MEDICINE
            ? "Medicine"
            : itemType === InventoryItemType.EQUIPMENT
              ? "Equipment"
              : "Other";

    let category = await prisma.category.findFirst({
      where: {
        userId: currentUserId,
        type: CategoryType.INVENTORY,
        name: categoryName,
      },
    });

    // Create category if it doesn't exist
    if (!category) {
      category = await prisma.category.create({
        data: {
          name: categoryName,
          type: CategoryType.INVENTORY,
          description: `Category for ${categoryName} items`,
          userId: currentUserId as string,
        },
      });
    }

    // Create inventory item with initial transaction if stock > 0
    const item = await prisma.$transaction(async (tx) => {
      const inventoryItem = await tx.inventoryItem.create({
        data: {
          name: data.name,
          description: data.description,
          currentStock: data.currentStock || 0,
          unit: data.unit,
          minStock: data.minStock,
          itemType: itemType,
          userId: currentUserId as string,
          categoryId: category.id,
        },
      });

      // If initial stock > 0, create an initial transaction
      if (data.currentStock && data.currentStock > 0) {
        // Get unit price from validated data (for manual additions)
        const unitPrice = data.rate || 0;
        const totalAmount = unitPrice * data.currentStock;

        await tx.inventoryTransaction.create({
          data: {
            type: TransactionType.PURCHASE,
            quantity: data.currentStock,
            unitPrice: unitPrice,
            totalAmount: totalAmount,
            date: new Date(),
            description:
              unitPrice > 0
                ? "Initial stock added manually with price"
                : "Initial stock added manually",
            itemId: inventoryItem.id,
          },
        });
      }

      return inventoryItem;
    });

    // Fetch the created item with category info
    const itemWithCategory = await prisma.inventoryItem.findUnique({
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
  } catch (error) {
    console.error("Create inventory item error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== UPDATE INVENTORY ITEM ====================
export const updateInventoryItem = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;

    // Validate request body
    const { success, data, error } = UpdateInventoryItemSchema.safeParse(
      req.body
    );
    if (!success) {
      return res.status(400).json({ message: error?.message });
    }

    // Check if item exists and belongs to user
    const existingItem = await prisma.inventoryItem.findFirst({
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
      const nameExists = await prisma.inventoryItem.findFirst({
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
    const updatedItem = await prisma.inventoryItem.update({
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
  } catch (error) {
    console.error("Update inventory item error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== DELETE INVENTORY ITEM ====================
export const deleteInventoryItem = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;

    // Check if item exists and belongs to user
    const existingItem = await prisma.inventoryItem.findFirst({
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
    if (
      existingItem._count.transactions > 0 ||
      existingItem._count.usages > 0
    ) {
      return res.status(400).json({
        message:
          "Cannot delete inventory item with existing transactions or usages. Please remove all related data first.",
      });
    }

    // Delete inventory item
    await prisma.inventoryItem.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: "Inventory item deleted successfully",
    });
  } catch (error) {
    console.error("Delete inventory item error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== ADD INVENTORY TRANSACTION (FOR TESTING) ====================
export const addInventoryTransaction = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const currentUserId = req.userId;

    // Validate request body
    const { success, data, error } = CreateInventoryTransactionSchema.safeParse(
      req.body
    );
    if (!success) {
      return res.status(400).json({ message: error?.message });
    }

    // Check if item exists and belongs to user
    const item = await prisma.inventoryItem.findFirst({
      where: {
        id: data.itemId,
        userId: currentUserId,
      },
    });

    if (!item) {
      return res.status(404).json({ message: "Inventory item not found" });
    }

    // Create transaction and update stock
    const result = await prisma.$transaction(async (tx) => {
      // Create transaction
      const transaction = await tx.inventoryTransaction.create({
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
      const stockChange =
        data.type === TransactionType.PURCHASE ? data.quantity : -data.quantity;
      await tx.inventoryItem.update({
        where: { id: data.itemId },
        data: {
          currentStock: {
            increment: stockChange,
          },
        },
      });

      return transaction;
    });

    return res.status(201).json({
      success: true,
      data: result,
      message: "Inventory transaction added successfully",
    });
  } catch (error) {
    console.error("Add inventory transaction error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== RECORD INVENTORY USAGE (FOR TESTING) ====================
export const recordInventoryUsage = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const currentUserId = req.userId;

    // Validate request body
    const { success, data, error } = CreateInventoryUsageSchema.safeParse(
      req.body
    );
    if (!success) {
      return res.status(400).json({ message: error?.message });
    }

    // Use the inventory service to record usage
    const usage = await InventoryService.recordInventoryUsage({
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
  } catch (error) {
    console.error("Record inventory usage error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET INVENTORY TRANSACTIONS ====================
export const getInventoryTransactions = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { itemId } = req.params;
    const { page = 1, limit = 10, type, startDate, endDate } = req.query;
    const currentUserId = req.userId;

    const skip = (Number(page) - 1) * Number(limit);

    // Check if item exists and belongs to user
    const item = await prisma.inventoryItem.findFirst({
      where: {
        id: itemId,
        userId: currentUserId,
      },
    });

    if (!item) {
      return res.status(404).json({ message: "Inventory item not found" });
    }

    // Build where clause
    const where: any = {
      itemId,
    };

    if (type) {
      where.type = type as TransactionType;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.date.lte = new Date(endDate as string);
      }
    }

    const [transactions, total] = await Promise.all([
      prisma.inventoryTransaction.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { date: "desc" },
      }),
      prisma.inventoryTransaction.count({ where }),
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
  } catch (error) {
    console.error("Get inventory transactions error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET INVENTORY USAGES ====================
export const getInventoryUsages = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { itemId } = req.params;
    const { page = 1, limit = 10, startDate, endDate } = req.query;
    const currentUserId = req.userId;

    const skip = (Number(page) - 1) * Number(limit);

    // Check if item exists and belongs to user
    const item = await prisma.inventoryItem.findFirst({
      where: {
        id: itemId,
        userId: currentUserId,
      },
    });

    if (!item) {
      return res.status(404).json({ message: "Inventory item not found" });
    }

    // Build where clause
    const where: any = {
      itemId,
    };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.date.lte = new Date(endDate as string);
      }
    }

    const [usages, total] = await Promise.all([
      prisma.inventoryUsage.findMany({
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
      prisma.inventoryUsage.count({ where }),
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
  } catch (error) {
    console.error("Get inventory usages error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET INVENTORY FOR EXPENSE (items with currentStock, for dropdown) ====================
export const getInventoryForExpense = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const currentUserId = req.userId;
    const { itemType } = req.query;

    if (!currentUserId) {
      return res.status(400).json({ message: "No user found" });
    }

    const where: any = { userId: currentUserId };
    if (itemType === "FEED" || itemType === "MEDICINE" || itemType === "OTHER") {
      where.itemType = itemType as InventoryItemType;
    }

    const items = await prisma.inventoryItem.findMany({
      where,
      select: {
        id: true,
        name: true,
        currentStock: true,
        unit: true,
        itemType: true,
      },
      orderBy: { name: "asc" },
    });

    const itemIds = items.map((i) => i.id);
    const purchaseAggregates =
      itemIds.length > 0
        ? await prisma.inventoryTransaction.groupBy({
            by: ["itemId"],
            where: { itemId: { in: itemIds }, type: "PURCHASE" },
            _sum: { totalAmount: true, quantity: true },
          })
        : [];
    const rateByItemId = new Map<string, number>();
    for (const row of purchaseAggregates) {
      const sumQty = Number(row._sum.quantity ?? 0);
      const sumAmount = Number(row._sum.totalAmount ?? 0);
      rateByItemId.set(row.itemId, sumQty > 0 ? sumAmount / sumQty : 0);
    }

    const data = items.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: Number(item.currentStock),
      currentStock: Number(item.currentStock),
      unit: item.unit,
      itemType: item.itemType,
      rate: rateByItemId.get(item.id) ?? 0,
    }));

    return res.json({ success: true, data });
  } catch (error) {
    console.error("Get inventory for expense error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET INVENTORY TABLE DATA ====================
// Builds table from InventoryItem.currentStock (Feed, Chicks, Medicine, Other).
// Eggs tab uses a different API and is unchanged.
export const getInventoryTableData = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const currentUserId = req.userId;
    const { itemType } = req.query;

    if (!currentUserId) {
      return res.status(400).json({ message: "No User found in Controller" });
    }

    const where: any = { userId: currentUserId };
    if (itemType) {
      where.itemType = itemType as InventoryItemType;
    }

    // Load inventory items (one row per item; quantity = currentStock)
    const items = await prisma.inventoryItem.findMany({
      where,
      include: { category: { select: { name: true } } },
    });

    if (items.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const itemIds = items.map((i) => i.id);

    // Effective rate per item: total cost / total quantity (handles paid + free; same for all categories)
    const purchaseAggregates = await prisma.inventoryTransaction.groupBy({
      by: ["itemId"],
      where: { itemId: { in: itemIds }, type: "PURCHASE" },
      _sum: { totalAmount: true, quantity: true },
    });
    const effectiveRateByItemId = new Map<string, number>();
    for (const row of purchaseAggregates) {
      const sumQty = Number(row._sum.quantity ?? 0);
      const sumAmount = Number(row._sum.totalAmount ?? 0);
      effectiveRateByItemId.set(row.itemId, sumQty > 0 ? sumAmount / sumQty : 0);
    }

    // Latest purchase per item (for supplier, dealerId, unit, purchaseCategory - display only)
    const purchases = await prisma.entityTransaction.findMany({
      where: {
        type: "PURCHASE",
        inventoryItemId: { in: itemIds },
      },
      include: {
        dealer: { select: { id: true, name: true } },
        hatchery: { select: { id: true, name: true } },
        medicineSupplier: { select: { id: true, name: true } },
      },
      orderBy: { date: "desc" },
    });

    const latestByItem = new Map<string, (typeof purchases)[0]>();
    for (const p of purchases) {
      if (p.inventoryItemId && !latestByItem.has(p.inventoryItemId)) {
        latestByItem.set(p.inventoryItemId, p);
      }
    }

    const dealerIds = [...new Set(
      purchases.filter((p) => p.dealerId).map((p) => p.dealerId!)
    )];
    const connections =
      dealerIds.length > 0
        ? await prisma.dealerFarmer.findMany({
            where: {
              dealerId: { in: dealerIds },
              farmerId: currentUserId,
              archivedByFarmer: false,
            },
            select: { dealerId: true },
          })
        : [];
    const connectedDealerIds = new Set(connections.map((c) => c.dealerId));

    const tableData = items.map((item) => {
      const latest = latestByItem.get(item.id);
      const rate = effectiveRateByItemId.get(item.id) ?? 0;
      let supplier = "";
      if (latest) {
        if (latest.dealer) supplier = latest.dealer.name;
        else if (latest.hatchery) supplier = latest.hatchery.name;
        else if (latest.medicineSupplier) supplier = latest.medicineSupplier.name;
      }
      const quantity = Number(item.currentStock);
      const unit = latest?.unit || item.unit;
      const minStockNum = item.minStock != null ? Number(item.minStock) : null;
      const status =
        quantity === 0
          ? "Out of Stock"
          : minStockNum != null && quantity <= minStockNum
            ? "Low Stock"
            : "In Stock";

      return {
        id: item.id,
        name: item.name,
        itemType: item.itemType,
        quantity,
        unit,
        rate,
        value: quantity * rate,
        supplier: supplier || undefined,
        status,
        minStock: item.minStock,
        category: item.category.name,
        lastPurchaseDate: latest?.date ?? null,
        dealerId: latest?.dealerId ?? null,
        entityType:
          latest?.entityType ??
          (latest?.dealerId ? "DEALER" : latest?.hatcheryId ? "HATCHERY" : latest?.medicineSupplierId ? "MEDICINE_SUPPLIER" : null),
        purchaseCategory: latest?.purchaseCategory ?? null,
        isConnectedDealer: latest?.dealerId ? connectedDealerIds.has(latest.dealerId) : false,
      };
    });

    return res.json({
      success: true,
      data: tableData,
    });
  } catch (error) {
    console.error("Get inventory table data error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET INVENTORY STATISTICS ====================
export const getInventoryStatistics = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const currentUserId = req.userId;

    const [totalItems, lowStockItems, itemsByType, itemsForValue] =
      await Promise.all([
        prisma.inventoryItem.count({
          where: { userId: currentUserId },
        }),
        prisma.inventoryItem.count({
          where: {
            userId: currentUserId,
            AND: [
              { minStock: { not: null } },
              { currentStock: { lte: prisma.inventoryItem.fields.minStock } },
            ],
          },
        }),
        prisma.inventoryItem.groupBy({
          by: ["itemType"],
          where: { userId: currentUserId },
          _count: { id: true },
          _sum: { currentStock: true },
        }),
        prisma.inventoryItem.findMany({
          where: { userId: currentUserId },
          select: { id: true, currentStock: true },
        }),
      ]);

    const itemIds = itemsForValue.map((i) => i.id);
    const purchaseAggregates =
      itemIds.length > 0
        ? await prisma.inventoryTransaction.groupBy({
            by: ["itemId"],
            where: { itemId: { in: itemIds }, type: "PURCHASE" },
            _sum: { totalAmount: true, quantity: true },
          })
        : [];

    const effectiveRateByItemId = new Map<string, number>();
    for (const row of purchaseAggregates) {
      const sumQty = Number(row._sum.quantity ?? 0);
      const sumAmount = Number(row._sum.totalAmount ?? 0);
      effectiveRateByItemId.set(row.itemId, sumQty > 0 ? sumAmount / sumQty : 0);
    }

    const totalInventoryValue = itemsForValue.reduce((sum, item) => {
      const rate = effectiveRateByItemId.get(item.id) ?? 0;
      const currentStock = Number(item.currentStock);
      return sum + rate * currentStock;
    }, 0);

    return res.json({
      success: true,
      data: {
        totalItems,
        lowStockItems,
        totalValue: totalInventoryValue,
        totalStock: itemsForValue.reduce(
          (sum, item) => sum + Number(item.currentStock),
          0
        ),
        categories: itemsByType.length,
        itemsByType: itemsByType.map((item) => ({
          type: item.itemType,
          count: item._count.id,
          totalStock: Number(item._sum.currentStock || 0),
        })),
      },
    });
  } catch (error) {
    console.error("Get inventory statistics error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
