import { Prisma, HatcheryChickGrade, HatcheryChickTxnType } from "@prisma/client";
import { HatcheryPartyService } from "./hatcheryPartyService";

export class HatcheryChickSalesService {
  /**
   * Sell chicks by grade (stock from hatcheryChickStock / Produced Chicks — not hatcheryInventoryItem).
   */
  static async sellChicks(
    tx: Prisma.TransactionClient,
    data: {
      incubationBatchId: string;
      hatcheryOwnerId: string;
      grade: HatcheryChickGrade;
      date: Date;
      count: number;
      unitPrice: number;
      partyId?: string;
      note?: string;
    }
  ) {
    const {
      incubationBatchId,
      hatcheryOwnerId,
      grade,
      date,
      count,
      unitPrice,
      partyId,
      note,
    } = data;

    if (!Number.isInteger(count) || count <= 0) {
      throw new Error("Sale count must be a positive integer");
    }

    // Validate batch-wise chick stock
    const chickStock = await tx.hatcheryChickStock.findUnique({
      where: { incubationBatchId_grade: { incubationBatchId, grade } },
    });
    if (!chickStock || chickStock.currentStock < count) {
      throw new Error(
        `Insufficient chick stock for grade ${grade}: have ${chickStock?.currentStock ?? 0}, need ${count}`
      );
    }

    const amount = Math.round(unitPrice * count * 100) / 100;

    // Create sale
    const sale = await tx.hatcheryChickSale.create({
      data: {
        incubationBatchId,
        grade,
        date,
        count,
        unitPrice,
        amount,
        partyId,
        note,
        inventoryItemId: null,
      },
    });

    // Decrement batch-wise chick stock
    await tx.hatcheryChickStock.update({
      where: { incubationBatchId_grade: { incubationBatchId, grade } },
      data: { currentStock: { decrement: count } },
    });

    // Write chick txn (negative count for SALE)
    await tx.hatcheryChickTxn.create({
      data: {
        incubationBatchId,
        grade,
        type: HatcheryChickTxnType.SALE,
        count: -count,
        date,
        sourceId: sale.id,
        note,
      },
    });

    if (partyId) {
      await HatcheryPartyService.recordSale(tx, partyId, sale.id, "chick_sale", amount, date);
    }

    return sale;
  }

  /**
   * Delete a chick sale and restore batch-wise chick stock (and legacy inventory lot if present).
   */
  static async deleteChickSale(
    tx: Prisma.TransactionClient,
    saleId: string,
    hatcheryOwnerId: string
  ) {
    const sale = await tx.hatcheryChickSale.findUniqueOrThrow({
      where: { id: saleId },
      include: { incubationBatch: true },
    });

    if (sale.incubationBatch.hatcheryOwnerId !== hatcheryOwnerId) {
      throw new Error("Not authorized");
    }

    const { incubationBatchId, grade, count, inventoryItemId } = sale;

    // Restore batch-wise chick stock
    await tx.hatcheryChickStock.update({
      where: {
        incubationBatchId_grade: {
          incubationBatchId,
          grade,
        },
      },
      data: { currentStock: { increment: count } },
    });

    // Restore inventory lot stock
    if (inventoryItemId) {
      await tx.hatcheryInventoryItem.update({
        where: { id: inventoryItemId },
        data: { currentStock: { increment: count } },
      });
    }

    // Remove chick txn
    await tx.hatcheryChickTxn.deleteMany({
      where: { sourceId: saleId, type: HatcheryChickTxnType.SALE },
    });

    if (sale.partyId) {
      await HatcheryPartyService.reverseSale(tx, saleId, "chick_sale");
    }

    await tx.hatcheryChickSale.delete({ where: { id: saleId } });
  }
}
