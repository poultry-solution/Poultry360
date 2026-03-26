import { Prisma, HatcheryBatchType, HatcheryInventoryTxnType } from "@prisma/client";
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

      // Create placements + decrement inventory stock
      for (const placement of placements) {
        await tx.hatcheryBatchPlacement.create({
          data: {
            batchId: batch.id,
            inventoryItemId: placement.inventoryItemId,
            quantity: placement.quantity,
          },
        });

        await tx.hatcheryInventoryTxn.create({
          data: {
            itemId: placement.inventoryItemId,
            type: HatcheryInventoryTxnType.USAGE,
            quantity: placement.quantity,
            date: startDate,
            note: `Placed into batch ${code}`,
          },
        });

        await tx.hatcheryInventoryItem.update({
          where: { id: placement.inventoryItemId },
          data: { currentStock: { decrement: placement.quantity } },
        });
      }

      return batch;
    });
  }
}
