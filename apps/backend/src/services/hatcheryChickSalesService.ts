import { Prisma, HatcheryChickGrade, HatcheryChickTxnType } from "@prisma/client";

function chickLotKey(incubationBatchId: string, grade: HatcheryChickGrade) {
  return `INCUBATION_BATCH:${incubationBatchId}:${grade}`;
}

export class HatcheryChickSalesService {
  /**
   * Sell chicks by grade.
   * - Validate batch-wise chick stock by grade
   * - Validate inventory lot stock
   * - Decrement both + create sale record + write chick txn
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
      customerName?: string;
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
      customerName,
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

    // Find inventory lot
    const supplierKey = chickLotKey(incubationBatchId, grade);
    const lot = await tx.hatcheryInventoryItem.findFirst({
      where: { hatcheryOwnerId, supplierKey },
    });
    if (!lot || Number(lot.currentStock) < count) {
      throw new Error(
        `Insufficient inventory lot stock for grade ${grade}: have ${lot?.currentStock ?? 0}, need ${count}`
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
        customerName,
        note,
        inventoryItemId: lot.id,
      },
    });

    // Decrement batch-wise chick stock
    await tx.hatcheryChickStock.update({
      where: { incubationBatchId_grade: { incubationBatchId, grade } },
      data: { currentStock: { decrement: count } },
    });

    // Decrement inventory lot
    await tx.hatcheryInventoryItem.update({
      where: { id: lot.id },
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

    return sale;
  }

  /**
   * Delete a chick sale and restore stock in both batch-wise and inventory lot.
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

    await tx.hatcheryChickSale.delete({ where: { id: saleId } });
  }
}
