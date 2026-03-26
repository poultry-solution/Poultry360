import { Prisma, HatcheryEggTxnType } from "@prisma/client";

export class HatcheryEggService {
  /**
   * Add an egg production entry.
   * - Validates integer counts.
   * - Upserts HatcheryEggStock (increment).
   * - Writes HatcheryEggTxn(PRODUCTION) per type.
   */
  static async addProduction(
    tx: Prisma.TransactionClient,
    data: {
      batchId: string;
      date: Date;
      note?: string;
      lines: { eggTypeId: string; count: number }[];
    }
  ) {
    const { batchId, date, note, lines } = data;

    if (!lines || lines.length === 0) {
      throw new Error("At least one egg type count is required");
    }

    const validLines = lines.filter((l) => l.count > 0);
    if (validLines.length === 0) {
      throw new Error("At least one count must be greater than 0");
    }

    for (const line of validLines) {
      if (!Number.isInteger(line.count) || line.count < 0) {
        throw new Error("Egg counts must be non-negative integers");
      }
    }

    // Create production record
    const production = await tx.hatcheryEggProduction.create({
      data: {
        batchId,
        date,
        note,
        lines: {
          create: validLines.map((l) => ({
            eggTypeId: l.eggTypeId,
            count: l.count,
          })),
        },
      },
    });

    // Upsert egg stock + write txns per type
    for (const line of validLines) {
      await tx.hatcheryEggStock.upsert({
        where: { batchId_eggTypeId: { batchId, eggTypeId: line.eggTypeId } },
        update: { currentStock: { increment: line.count } },
        create: { batchId, eggTypeId: line.eggTypeId, currentStock: line.count },
      });

      await tx.hatcheryEggTxn.create({
        data: {
          batchId,
          eggTypeId: line.eggTypeId,
          type: HatcheryEggTxnType.PRODUCTION,
          count: line.count,
          date,
          sourceId: production.id,
          note,
        },
      });
    }

    return production;
  }

  /**
   * Delete a production entry and reverse its egg stock.
   * Decrements stock but won't go below 0.
   */
  static async deleteProduction(
    tx: Prisma.TransactionClient,
    productionId: string
  ) {
    const production = await tx.hatcheryEggProduction.findUniqueOrThrow({
      where: { id: productionId },
      include: { lines: true },
    });

    for (const line of production.lines) {
      const stockRow = await tx.hatcheryEggStock.findUnique({
        where: {
          batchId_eggTypeId: {
            batchId: production.batchId,
            eggTypeId: line.eggTypeId,
          },
        },
      });

      if (stockRow && stockRow.currentStock < line.count) {
        throw new Error(
          `Cannot delete: egg stock would go negative for egg type. ` +
            `Current: ${stockRow.currentStock}, removing: ${line.count}. ` +
            `Please reconcile stock first.`
        );
      }

      await tx.hatcheryEggStock.update({
        where: {
          batchId_eggTypeId: {
            batchId: production.batchId,
            eggTypeId: line.eggTypeId,
          },
        },
        data: { currentStock: { decrement: line.count } },
      });

      // Remove egg txns linked to this production
      await tx.hatcheryEggTxn.deleteMany({
        where: { sourceId: productionId, eggTypeId: line.eggTypeId, type: HatcheryEggTxnType.PRODUCTION },
      });
    }

    await tx.hatcheryEggProduction.delete({ where: { id: productionId } });
  }

  /**
   * Sell eggs – decrement egg stock, write EggTxn(SALE), create EggSale.
   */
  static async sellEggs(
    tx: Prisma.TransactionClient,
    data: {
      batchId: string;
      eggTypeId: string;
      date: Date;
      count: number;
      unitPrice: number;
      customerName?: string;
      note?: string;
    }
  ) {
    const { batchId, eggTypeId, date, count, unitPrice, customerName, note } =
      data;

    if (!Number.isInteger(count) || count <= 0) {
      throw new Error("Sale count must be a positive integer");
    }

    const stockRow = await tx.hatcheryEggStock.findUnique({
      where: { batchId_eggTypeId: { batchId, eggTypeId } },
    });

    if (!stockRow || stockRow.currentStock < count) {
      throw new Error(
        `Insufficient egg stock: have ${stockRow?.currentStock ?? 0}, need ${count}`
      );
    }

    const amount = Math.round(unitPrice * count * 100) / 100;

    const sale = await tx.hatcheryEggSale.create({
      data: {
        batchId,
        eggTypeId,
        date,
        count,
        unitPrice,
        amount,
        customerName,
        note,
      },
    });

    await tx.hatcheryEggStock.update({
      where: { batchId_eggTypeId: { batchId, eggTypeId } },
      data: { currentStock: { decrement: count } },
    });

    await tx.hatcheryEggTxn.create({
      data: {
        batchId,
        eggTypeId,
        type: HatcheryEggTxnType.SALE,
        count: -count,
        date,
        sourceId: sale.id,
        note,
      },
    });

    return sale;
  }

  /**
   * Delete egg sale and restore egg stock.
   */
  static async deleteEggSale(
    tx: Prisma.TransactionClient,
    saleId: string
  ) {
    const sale = await tx.hatcheryEggSale.findUniqueOrThrow({
      where: { id: saleId },
    });

    await tx.hatcheryEggStock.update({
      where: {
        batchId_eggTypeId: { batchId: sale.batchId, eggTypeId: sale.eggTypeId },
      },
      data: { currentStock: { increment: sale.count } },
    });

    await tx.hatcheryEggTxn.deleteMany({
      where: { sourceId: saleId, type: HatcheryEggTxnType.SALE },
    });

    await tx.hatcheryEggSale.delete({ where: { id: saleId } });
  }
}
