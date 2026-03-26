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
      update: { unit },
      create: {
        hatcheryOwnerId,
        itemType,
        name: itemName,
        unit,
        unitPrice: roundedUnitPrice,
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
        currentStock: {
          increment: quantity + freeQuantity,
        },
      },
    });

    return inventoryItem;
  }

  /**
   * Reverse the inventory effect of a purchase txn (used when deleting a supplier txn).
   * Decrements stock by the quantity recorded in each matching inventory txn.
   */
  static async reverseInventoryForSupplierTxn(
    tx: Prisma.TransactionClient,
    supplierTxnId: string
  ) {
    const invTxns = await tx.hatcheryInventoryTxn.findMany({
      where: { sourceSupplierTxnId: supplierTxnId },
    });

    for (const invTxn of invTxns) {
      await tx.hatcheryInventoryItem.update({
        where: { id: invTxn.itemId },
        data: {
          currentStock: { decrement: invTxn.quantity },
        },
      });
      await tx.hatcheryInventoryTxn.delete({ where: { id: invTxn.id } });
    }
  }
}
