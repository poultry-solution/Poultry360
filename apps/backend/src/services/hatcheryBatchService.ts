import {
  Prisma,
  HatcheryBatchType,
  HatcheryInventoryTxnType,
  HatcheryBatchExpenseType,
  HatcheryInventoryItemType,
  HatcherySex,
} from "@prisma/client";
import prisma from "../utils/prisma";

export class HatcheryBatchService {
  /**
   * Generate the next batch code for a hatchery owner.
   * Format: PF-001, PF-002, ... for PARENT_FLOCK
   *         IN-001, IN-002, ... for INCUBATION
   */
  static async generateBatchCode(
    hatcheryOwnerId: string,
    type: HatcheryBatchType
  ): Promise<string> {
    const prefix = type === HatcheryBatchType.PARENT_FLOCK ? "PF" : "IN";
    const existing = await prisma.hatcheryBatch.count({
      where: { hatcheryOwnerId, type },
    });
    const seq = existing + 1;
    return `${prefix}-${String(seq).padStart(3, "0")}`;
  }

  /**
   * Create a ParentFlockBatch with multi-row inventory placement in a single transaction.
   * Each placement row: { inventoryItemId, quantity } → decrement stock + create USAGE inv txn.
   */
  static async createParentFlockBatch(data: {
    hatcheryOwnerId: string;
    startDate: Date;
    notes?: string;
    placements: { inventoryItemId: string; quantity: number }[];
  }) {
    const { hatcheryOwnerId, startDate, notes, placements } = data;

    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const code = await HatcheryBatchService.generateBatchCode(
        hatcheryOwnerId,
        HatcheryBatchType.PARENT_FLOCK
      );

      const totalChicks = placements.reduce((s, p) => s + p.quantity, 0);

      // Aggregate demand per lot BEFORE validating. Two placement rows may
      // point at the same inventory lot; checking them independently would let
      // each pass against full stock while their sum exceeds it.
      const neededByItem = new Map<string, number>();
      for (const placement of placements) {
        if (!Number.isInteger(placement.quantity) || placement.quantity <= 0) {
          throw new Error(`Placement quantity must be a whole number greater than 0`);
        }
        neededByItem.set(
          placement.inventoryItemId,
          (neededByItem.get(placement.inventoryItemId) ?? 0) + placement.quantity
        );
      }

      // Validate each referenced lot once, and keep the row for the write loop
      // below so it is not fetched twice.
      const itemsById = new Map<
        string,
        Prisma.HatcheryInventoryItemGetPayload<{}>
      >();
      for (const [inventoryItemId, needed] of neededByItem) {
        const item = await tx.hatcheryInventoryItem.findUnique({
          where: { id: inventoryItemId },
        });
        if (!item) {
          throw new Error(`Inventory item ${inventoryItemId} not found`);
        }
        if (item.hatcheryOwnerId !== hatcheryOwnerId) {
          throw new Error(`Inventory item does not belong to this hatchery`);
        }
        if (item.deletedAt) {
          throw new Error(`Inventory item "${item.name}" has been deleted`);
        }
        if (item.itemType !== HatcheryInventoryItemType.CHICKS) {
          throw new Error(
            `Only chick inventory can be placed into a parent flock; "${item.name}" is ${item.itemType}`
          );
        }
        if (item.sex !== HatcherySex.MALE && item.sex !== HatcherySex.FEMALE) {
          throw new Error(
            `"${item.name}" has no sex recorded; parent flock placement requires male or female chicks`
          );
        }
        if (Number(item.currentStock) < needed) {
          throw new Error(
            `Insufficient stock for "${item.name}": have ${item.currentStock}, need ${needed}`
          );
        }
        itemsById.set(inventoryItemId, item);
      }

      // Sex totals are derived from the lots the placements point at, so there
      // are no duplicated sex columns on HatcheryBatchPlacement to keep in sync.
      let initialMaleParents = 0;
      let initialFemaleParents = 0;
      for (const placement of placements) {
        const item = itemsById.get(placement.inventoryItemId)!;
        if (item.sex === HatcherySex.MALE) {
          initialMaleParents += placement.quantity;
        } else {
          initialFemaleParents += placement.quantity;
        }
      }

      // Create the batch
      const batch = await tx.hatcheryBatch.create({
        data: {
          hatcheryOwnerId,
          type: HatcheryBatchType.PARENT_FLOCK,
          code,
          startDate,
          notes,
          initialParents: totalChicks,
          initialMaleParents,
          initialFemaleParents,
          currentParents: totalChicks,
          currentMaleParents: initialMaleParents,
          currentFemaleParents: initialFemaleParents,
          placedAt: startDate,
        },
      });

      // Create placements + decrement inventory stock + record initial placement expense
      for (const placement of placements) {
        const item = itemsById.get(placement.inventoryItemId)!;

        // Use effective (free-qty-adjusted) cost per unit; fall back to unitPrice
        const costPerUnit = Number(item.effectiveUnitCost ?? item.unitPrice);
        const expenseAmount = Math.round(costPerUnit * placement.quantity * 100) / 100;

        await tx.hatcheryBatchPlacement.create({
          data: {
            batchId: batch.id,
            inventoryItemId: placement.inventoryItemId,
            quantity: placement.quantity,
          },
        });

        const invTxn = await tx.hatcheryInventoryTxn.create({
          data: {
            itemId: placement.inventoryItemId,
            type: HatcheryInventoryTxnType.USAGE,
            quantity: placement.quantity,
            unitPrice: costPerUnit,
            amount: expenseAmount,
            date: startDate,
            note: `Initial placement into batch ${code}`,
          },
        });

        // Guarded decrement: the WHERE clause re-checks stock at write time so
        // concurrent placements cannot drive a lot negative.
        const decremented = await tx.hatcheryInventoryItem.updateMany({
          where: {
            id: placement.inventoryItemId,
            currentStock: { gte: placement.quantity },
          },
          data: { currentStock: { decrement: placement.quantity } },
        });
        if (decremented.count !== 1) {
          throw new Error(`Insufficient stock for "${item.name}"`);
        }

        // Record as a batch expense so it shows in Total Expenses
        await tx.hatcheryBatchExpense.create({
          data: {
            batchId: batch.id,
            date: startDate,
            type: HatcheryBatchExpenseType.INVENTORY,
            category: "CHICKS",
            itemName: item.name,
            quantity: placement.quantity,
            unit: item.unit,
            unitPrice: costPerUnit,
            amount: expenseAmount,
            note: "Initial flock placement",
            inventoryItemId: placement.inventoryItemId,
            inventoryTxnId: invTxn.id,
          },
        });
      }

      return batch;
    });
  }
}
