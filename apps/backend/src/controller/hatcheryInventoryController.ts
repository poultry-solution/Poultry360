import { Request, Response } from "express";
import prisma from "../utils/prisma";
import {
  HatcheryInventoryItemType,
} from "@prisma/client";
import { HatcherySupplierService } from "../services/hatcherySupplierService";
import { HatcheryPurchaseCategory } from "@prisma/client";
import {
  excludeProducedChickInventoryLots,
  PRODUCED_CHICK_LOT_KEY_PREFIX,
} from "../utils/hatcheryInventoryScope";
import {
  ACCOUNT_FEATURE_KEYS,
  isAccountFeatureEnabled,
} from "../services/accountFeatureService";

const VALID_TYPES = Object.values(HatcheryInventoryItemType);

// ==================== LIST INVENTORY ====================
export const listHatcheryInventory = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId!;
    const { itemType, includeEmpty = "false", search } = req.query;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));

    const where: any = {
      hatcheryOwnerId: userId,
      deletedAt: null,
      ...excludeProducedChickInventoryLots,
    };
    if (itemType && VALID_TYPES.includes(itemType as HatcheryInventoryItemType))
      where.itemType = itemType;
    if (includeEmpty !== "true") where.currentStock = { gt: 0 };
    if (search) {
      const query = String(search).trim();
      const matchingSuppliers = await prisma.hatcherySupplier.findMany({
        where: { hatcheryOwnerId: userId, name: { contains: query, mode: "insensitive" } },
        select: { id: true },
        take: 50,
      });
      const numericRate = Number(query);
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        ...(matchingSuppliers.length ? [{ supplierKey: { in: matchingSuppliers.map((supplier) => `HATCHERY_SUPPLIER:${supplier.id}`) } }] : []),
        ...(Number.isFinite(numericRate) ? [{ unitPrice: numericRate }] : []),
      ];
    }

    const [items, total] = await Promise.all([
      prisma.hatcheryInventoryItem.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ itemType: "asc" }, { name: "asc" }],
      }),
      prisma.hatcheryInventoryItem.count({ where }),
    ]);

    const supplierIds = [...new Set(items.map((item) => item.supplierKey)
      .filter((key) => key.startsWith("HATCHERY_SUPPLIER:"))
      .map((key) => key.replace("HATCHERY_SUPPLIER:", "")))];
    const suppliers = supplierIds.length
      ? await prisma.hatcherySupplier.findMany({ where: { id: { in: supplierIds }, hatcheryOwnerId: userId }, select: { id: true, name: true } })
      : [];
    const supplierMap = new Map(suppliers.map((supplier) => [supplier.id, supplier]));
    const data = items.map((item) => ({
      ...item,
      supplier: item.supplierKey.startsWith("HATCHERY_SUPPLIER:")
        ? supplierMap.get(item.supplierKey.replace("HATCHERY_SUPPLIER:", "")) ?? null
        : null,
    }));

    return res.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error("listHatcheryInventory:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== INVENTORY TABLE (all items including zero-stock) ====================
export const hatcheryInventoryTable = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId!;
    const { itemType } = req.query;

    const where: any = {
      hatcheryOwnerId: userId,
      deletedAt: null,
      ...excludeProducedChickInventoryLots,
    };
    if (itemType && VALID_TYPES.includes(itemType as HatcheryInventoryItemType))
      where.itemType = itemType;

    const items = await prisma.hatcheryInventoryItem.findMany({
      where,
      orderBy: [{ itemType: "asc" }, { name: "asc" }],
    });

    return res.json({ success: true, data: items });
  } catch (err) {
    console.error("hatcheryInventoryTable:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== STATISTICS ====================
export const hatcheryInventoryStatistics = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId!;

    const items = await prisma.hatcheryInventoryItem.findMany({
      where: {
        hatcheryOwnerId: userId,
        deletedAt: null,
        ...excludeProducedChickInventoryLots,
      },
    });

    const totalItems = items.length;
    const lowStockCount = items.filter(
      (i) =>
        i.minStock !== null &&
        Number(i.currentStock) < Number(i.minStock)
    ).length;
    const feedCount = items.filter(
      (i) => i.itemType === HatcheryInventoryItemType.FEED
    ).length;
    const medicineCount = items.filter(
      (i) => i.itemType === HatcheryInventoryItemType.MEDICINE
    ).length;
    const chicksCount = items.filter(
      (i) => i.itemType === HatcheryInventoryItemType.CHICKS
    ).length;
    const otherCount = items.filter(
      (i) => i.itemType === HatcheryInventoryItemType.OTHER
    ).length;
    const rawMaterialCount = items.filter(
      (i) => i.itemType === HatcheryInventoryItemType.RAW_MATERIAL
    ).length;
    const selfMadeCount = items.filter(
      (i) => i.itemType === HatcheryInventoryItemType.SELF_MADE
    ).length;

    return res.json({
      success: true,
      data: {
        totalItems,
        lowStockCount,
        feedCount,
        medicineCount,
        chicksCount,
        rawMaterialCount,
        selfMadeCount,
        otherCount,
      },
    });
  } catch (err) {
    console.error("hatcheryInventoryStatistics:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== LOW STOCK ====================
export const hatcheryLowStockItems = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId!;

    const items = await prisma.hatcheryInventoryItem.findMany({
      where: {
        hatcheryOwnerId: userId,
        deletedAt: null,
        minStock: { not: null },
        ...excludeProducedChickInventoryLots,
      },
    });

    const lowStock = items.filter(
      (i) => Number(i.currentStock) < Number(i.minStock!)
    );

    return res.json({ success: true, data: lowStock });
  } catch (err) {
    console.error("hatcheryLowStockItems:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== BY TYPE ====================
export const hatcheryInventoryByType = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId!;
    const { itemType } = req.params;

    if (!VALID_TYPES.includes(itemType as HatcheryInventoryItemType))
      return res.status(400).json({ message: "Invalid item type" });

    const items = await prisma.hatcheryInventoryItem.findMany({
      where: {
        hatcheryOwnerId: userId,
        itemType: itemType as HatcheryInventoryItemType,
        deletedAt: null,
        ...excludeProducedChickInventoryLots,
      },
      orderBy: { name: "asc" },
    });

    return res.json({ success: true, data: items });
  } catch (err) {
    console.error("hatcheryInventoryByType:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET ITEM BY ID ====================
export const getHatcheryInventoryItem = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const item = await prisma.hatcheryInventoryItem.findFirst({
      where: { id, hatcheryOwnerId: userId, deletedAt: null },
      include: {
        transactions: { orderBy: { date: "desc" }, take: 50 },
      },
    });
    if (!item) return res.status(404).json({ message: "Item not found" });
    if (item.supplierKey.startsWith(PRODUCED_CHICK_LOT_KEY_PREFIX)) {
      return res.status(404).json({
        message:
          "Produced chick stock is managed under Produced Chicks, not Inventory.",
      });
    }

    return res.json({ success: true, data: item });
  } catch (err) {
    console.error("getHatcheryInventoryItem:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== CREATE ITEM (manual) ====================
export const createHatcheryInventoryItem = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId!;
    const { itemType, name, unit = "kg", unitPrice = 0, minStock } = req.body;

    if (!itemType || !VALID_TYPES.includes(itemType))
      return res.status(400).json({ message: "Valid itemType is required" });
    if (!name?.trim())
      return res.status(400).json({ message: "name is required" });

    if (itemType === HatcheryInventoryItemType.SELF_MADE) {
      return res.status(400).json({ message: "Create Self Feed products from the Self Feed inventory tab" });
    }
    if (
      itemType === HatcheryInventoryItemType.RAW_MATERIAL &&
      !(await isAccountFeatureEnabled(
        userId,
        ACCOUNT_FEATURE_KEYS.SELF_FEED_PRODUCTION
      ))
    ) {
      return res.status(403).json({
        code: "ACCOUNT_FEATURE_DISABLED",
        featureKey: ACCOUNT_FEATURE_KEYS.SELF_FEED_PRODUCTION,
        message: "Self-Feed Production is not enabled for this account",
      });
    }

    const item = await prisma.hatcheryInventoryItem.create({
      data: {
        hatcheryOwnerId: userId,
        itemType,
        name: name.trim(),
        unit,
        unitPrice: Number(unitPrice),
        minStock: minStock !== undefined ? Number(minStock) : null,
        supplierKey: "NONE",
      },
    });

    return res.status(201).json({ success: true, data: item });
  } catch (err: any) {
    if (err.code === "P2002")
      return res
        .status(400)
        .json({ message: "An item with the same name, type and price already exists" });
    console.error("createHatcheryInventoryItem:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== UPDATE ITEM ====================
export const updateHatcheryInventoryItem = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { name, unit, minStock } = req.body;

    const item = await prisma.hatcheryInventoryItem.findFirst({
      where: { id, hatcheryOwnerId: userId, deletedAt: null },
    });
    if (!item) return res.status(404).json({ message: "Item not found" });

    const updated = await prisma.hatcheryInventoryItem.update({
      where: { id },
      data: {
        name: name?.trim() ?? item.name,
        unit: unit ?? item.unit,
        minStock:
          minStock !== undefined
            ? minStock === null
              ? null
              : Number(minStock)
            : item.minStock,
      },
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error("updateHatcheryInventoryItem:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== SOFT DELETE ITEM (only if stock == 0) ====================
export const deleteHatcheryInventoryItem = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const item = await prisma.hatcheryInventoryItem.findFirst({
      where: { id, hatcheryOwnerId: userId, deletedAt: null },
    });
    if (!item) return res.status(404).json({ message: "Item not found" });

    if (Number(item.currentStock) !== 0)
      return res
        .status(400)
        .json({ message: "Cannot delete item with stock > 0. Use or adjust stock first." });

    await prisma.hatcheryInventoryItem.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return res.json({ success: true, message: "Item removed" });
  } catch (err) {
    console.error("deleteHatcheryInventoryItem:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== REORDER (create purchase from inventory shortcut) ====================
export const reorderHatcheryInventoryItem = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { quantity, date, note } = req.body;

    if (!quantity || Number(quantity) <= 0)
      return res.status(400).json({ message: "quantity must be > 0" });

    const item = await prisma.hatcheryInventoryItem.findFirst({
      where: { id, hatcheryOwnerId: userId, deletedAt: null },
    });
    if (!item) return res.status(404).json({ message: "Item not found" });

    if (
      !item.supplierKey ||
      item.supplierKey === "NONE" ||
      !item.supplierKey.startsWith("HATCHERY_SUPPLIER:")
    )
      return res
        .status(400)
        .json({ message: "Reorder requires a supplier-linked item" });

    const supplierId = item.supplierKey.replace("HATCHERY_SUPPLIER:", "");
    const supplier = await prisma.hatcherySupplier.findFirst({
      where: { id: supplierId, hatcheryOwnerId: userId },
    });
    if (!supplier)
      return res.status(404).json({ message: "Linked supplier not found" });

    const unitPrice = Number(item.unitPrice);
    const qty = Number(quantity);
    const totalAmount = unitPrice * qty;

    // Map item type to purchase category
    if (item.itemType === HatcheryInventoryItemType.SELF_MADE) {
      return res.status(400).json({ message: "Self Feed stock can only be added through production" });
    }
    if (
      item.itemType === HatcheryInventoryItemType.RAW_MATERIAL &&
      !(await isAccountFeatureEnabled(
        userId,
        ACCOUNT_FEATURE_KEYS.SELF_FEED_PRODUCTION
      ))
    ) {
      return res.status(403).json({
        code: "ACCOUNT_FEATURE_DISABLED",
        featureKey: ACCOUNT_FEATURE_KEYS.SELF_FEED_PRODUCTION,
        message: "Self-Feed Production is not enabled for this account",
      });
    }

    const typeToCat: Partial<Record<HatcheryInventoryItemType, HatcheryPurchaseCategory>> = {
      FEED: HatcheryPurchaseCategory.FEED,
      MEDICINE: HatcheryPurchaseCategory.MEDICINE,
      CHICKS: HatcheryPurchaseCategory.CHICKS,
      RAW_MATERIAL: HatcheryPurchaseCategory.RAW_MATERIAL,
      OTHER: HatcheryPurchaseCategory.OTHER,
    };

    const txn = await HatcherySupplierService.addPurchaseTxn({
      supplierId,
      hatcheryOwnerId: userId,
      category: typeToCat[item.itemType]!,
      items: [
        {
          itemName: item.name,
          quantity: qty,
          freeQuantity: 0,
          unit: item.unit,
          unitPrice,
          totalAmount,
        },
      ],
      date: date ? new Date(date) : new Date(),
      note: note ?? `Reorder for ${item.name}`,
    });

    return res.status(201).json({
      success: true,
      data: txn,
      message: "Reorder purchase created successfully",
    });
  } catch (err: any) {
    console.error("reorderHatcheryInventoryItem:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
