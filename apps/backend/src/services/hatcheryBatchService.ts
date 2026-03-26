import { Prisma, HatcheryBatchType, HatcheryInventoryTxnType, HatcheryBatchExpenseType } from "@prisma/client";
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

      // Validate all placements have sufficient stock
      for (const placement of placements) {
        if (placement.quantity <= 0) {
          throw new Error(`Placement quantity must be greater than 0`);
        }
        const item = await tx.hatcheryInventoryItem.findUnique({
          where: { id: placement.inventoryItemId },
        });
        if (!item) {
          throw new Error(`Inventory item ${placement.inventoryItemId} not found`);
        }
        if (item.hatcheryOwnerId !== hatcheryOwnerId) {
          throw new Error(`Inventory item does not belong to this hatchery`);
        }
        if (Number(item.currentStock) < placement.quantity) {
          throw new Error(
            `Insufficient stock for "${item.name}": have ${item.currentStock}, need ${placement.quantity}`
          );
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
          currentParents: totalChicks,
          placedAt: startDate,
        },
      });

      // Create placements + decrement inventory stock + record initial placement expense
      for (const placement of placements) {
        const item = await tx.hatcheryInventoryItem.findUniqueOrThrow({
          where: { id: placement.inventoryItemId },
        });

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

        await tx.hatcheryInventoryItem.update({
          where: { id: placement.inventoryItemId },
          data: { currentStock: { decrement: placement.quantity } },
        });

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
