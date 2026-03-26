import { Prisma } from "@prisma/client";
import {
  HatcheryInventoryItemType,
  HatcheryInventoryTxnType,
  HatcheryPurchaseCategory,
} from "@prisma/client";

// Maps purchase category → inventory item type
const CATEGORY_TO_ITEM_TYPE: Record<
  HatcheryPurchaseCategory,
  HatcheryInventoryItemType
> = {
  FEED: HatcheryInventoryItemType.FEED,
  MEDICINE: HatcheryInventoryItemType.MEDICINE,
  CHICKS: HatcheryInventoryItemType.CHICKS,
  OTHER: HatcheryInventoryItemType.OTHER,
};

export class HatcheryInventoryService {
  /**
   * Upsert an inventory item and record a purchase transaction for it.
   *
   * Identity key: (hatcheryOwnerId, itemType, name, unitPrice@2dp, supplierKey)
   *   - If all five match → increment stock on existing row.
   *   - If any differs  → create a new row.
   *
   * Free quantity (CHICKS):
   *   - Ledger amount uses only paid quantity.
   *   - Inventory increments paid + free.
   *   - Free quantity is recorded as a zero-cost PURCHASE txn.
   */
  static async upsertItemAndApplyPurchase(
    tx: Prisma.TransactionClient,
    data: {
      hatcheryOwnerId: string;
      supplierId: string;
      category: HatcheryPurchaseCategory;
      itemName: string;
      quantity: number;
      freeQuantity: number;
      unitPrice: number;
      totalAmount: number;
      unit: string;
      date: Date;
      supplierTxnId: string;
    }
  ) {
    const {
      hatcheryOwnerId,
      supplierId,
      category,
      itemName,
      quantity,
      freeQuantity,
      unitPrice,
      totalAmount,
      unit,
      date,
      supplierTxnId,
    } = data;

    const itemType = CATEGORY_TO_ITEM_TYPE[category];
    const supplierKey = `HATCHERY_SUPPLIER:${supplierId}`;
    const roundedUnitPrice = new Prisma.Decimal(
      Math.round(unitPrice * 100) / 100
    );

    const totalReceived = quantity + freeQuantity;

    // Find existing item (if any) to compute weighted-average cost
    const existing = await tx.hatcheryInventoryItem.findUnique({
      where: {
        hatcheryOwnerId_itemType_name_unitPrice_supplierKey: {
          hatcheryOwnerId,
          itemType,
          name: itemName,
          unitPrice: roundedUnitPrice,
          supplierKey,
        },
      },
    });

    // Weighted-average effective cost:
    //   new purchase: totalAmount / totalReceived
    //   merge into existing lot: (existingStock*existingCost + newAmount) / (existingStock + totalReceived)
    let newEffectiveCost: number;
    if (existing) {
      const existingStock = Number(existing.currentStock);
      const existingCost = Number(existing.effectiveUnitCost ?? existing.unitPrice);
      const totalCostBasis = existingStock * existingCost + totalAmount;
      const totalUnits = existingStock + totalReceived;
      newEffectiveCost = totalUnits > 0 ? totalCostBasis / totalUnits : unitPrice;
    } else {
      newEffectiveCost = totalReceived > 0 ? totalAmount / totalReceived : unitPrice;
    }
    const roundedEffectiveCost = Math.round(newEffectiveCost * 10000) / 10000;

    // Upsert inventory item by identity key
    const inventoryItem = await tx.hatcheryInventoryItem.upsert({
      where: {
        hatcheryOwnerId_itemType_name_unitPrice_supplierKey: {
          hatcheryOwnerId,
          itemType,
          name: itemName,
          unitPrice: roundedUnitPrice,
          supplierKey,
        },
      },
      update: { unit, effectiveUnitCost: roundedEffectiveCost },
      create: {
        hatcheryOwnerId,
        itemType,
        name: itemName,
        unit,
        unitPrice: roundedUnitPrice,
        effectiveUnitCost: roundedEffectiveCost,
        supplierKey,
        currentStock: 0,
      },
    });

    // Record paid quantity purchase txn
    await tx.hatcheryInventoryTxn.create({
      data: {
        itemId: inventoryItem.id,
        type: HatcheryInventoryTxnType.PURCHASE,
        quantity: quantity,
        unitPrice: unitPrice,
        amount: totalAmount,
        date,
        sourceSupplierTxnId: supplierTxnId,
      },
    });

    // Record zero-cost txn for free quantity if present
    if (freeQuantity > 0) {
      await tx.hatcheryInventoryTxn.create({
        data: {
          itemId: inventoryItem.id,
          type: HatcheryInventoryTxnType.PURCHASE,
          quantity: freeQuantity,
          unitPrice: 0,
          amount: 0,
          date,
          note: "Free units received with purchase",
          sourceSupplierTxnId: supplierTxnId,
        },
      });
    }

    // Increment stock by paid + free
    await tx.hatcheryInventoryItem.update({
      where: { id: inventoryItem.id },
      data: {
        currentStock: { increment: totalReceived },
      },
    });

    return inventoryItem;
  }

  /**
   * Reverse the inventory effect of a purchase txn (used when deleting a supplier txn).
   * Decrements stock by the quantity recorded in each matching inventory txn.
   * If stock has already been consumed, throws an error and blocks deletion.
   */
  static async reverseInventoryForSupplierTxn(
    tx: Prisma.TransactionClient,
    supplierTxnId: string
  ) {
    const invTxns = await tx.hatcheryInventoryTxn.findMany({
      where: { sourceSupplierTxnId: supplierTxnId },
    });

    // Group by itemId — one supplier txn may touch one item (paid + free = two inv txns)
    const byItem = new Map<string, { totalQty: number; totalAmount: number }>();
    for (const invTxn of invTxns) {
      const existing = byItem.get(invTxn.itemId) ?? { totalQty: 0, totalAmount: 0 };
      byItem.set(invTxn.itemId, {
        totalQty: existing.totalQty + Number(invTxn.quantity),
        totalAmount: existing.totalAmount + Number(invTxn.amount ?? 0),
      });
    }

    for (const [itemId, removed] of byItem.entries()) {
      const item = await tx.hatcheryInventoryItem.findUniqueOrThrow({ where: { id: itemId } });
      const currentStock = Number(item.currentStock);
      if (currentStock < removed.totalQty) {
        throw new Error(
          `Cannot delete purchase: "${item.name}" has already been consumed in usage/placements. ` +
            `Available stock: ${currentStock}, trying to reverse: ${removed.totalQty}.`
        );
      }
    }

    // Safe to reverse now.
    for (const invTxn of invTxns) {
      await tx.hatcheryInventoryTxn.delete({ where: { id: invTxn.id } });
    }

    // Recompute effectiveUnitCost from remaining PURCHASE txns for each affected item
    for (const [itemId, removed] of byItem.entries()) {
      const item = await tx.hatcheryInventoryItem.findUniqueOrThrow({ where: { id: itemId } });
      const newStock = Number(item.currentStock) - removed.totalQty;

      // Remaining purchase txns (after deletion)
      const remainingPurchases = await tx.hatcheryInventoryTxn.aggregate({
        where: { itemId, type: HatcheryInventoryTxnType.PURCHASE },
        _sum: { quantity: true, amount: true },
      });

      const remainingQty = Number(remainingPurchases._sum.quantity ?? 0);
      const remainingAmount = Number(remainingPurchases._sum.amount ?? 0);
      const newEffective =
        remainingQty > 0 ? remainingAmount / remainingQty : Number(item.unitPrice);

      await tx.hatcheryInventoryItem.update({
        where: { id: itemId },
        data: {
          currentStock: newStock,
          effectiveUnitCost: Math.round(newEffective * 10000) / 10000,
        },
      });
    }
  }
}
