import { Prisma, SalesItemType, WeightSource } from "@prisma/client";

type SaleBatchSyncClient = Pick<
  Prisma.TransactionClient,
  "mortality" | "birdWeight" | "batch"
>;

export interface FarmerSaleBatchSyncInput {
  saleId: string;
  oldBatchId: string | null;
  newBatchId: string | null;
  itemType: SalesItemType;
  date: Date;
  quantity: number;
  weight: number | null;
}

export function saleGeneratedWeightNote(saleId: string): string {
  return `Auto-computed from sale #${saleId}`;
}

/**
 * Keep the batch rows generated from a Farmer sale exactly in sync.
 * This must run inside the same transaction as the Sale update.
 */
export async function syncFarmerSaleBatchRecords(
  tx: SaleBatchSyncClient,
  input: FarmerSaleBatchSyncInput,
): Promise<string[]> {
  const weightNote = saleGeneratedWeightNote(input.saleId);
  const [oldMortalities, oldWeights] = await Promise.all([
    tx.mortality.findMany({
      where: { saleId: input.saleId },
      select: { batchId: true },
    }),
    tx.birdWeight.findMany({
      where: { source: WeightSource.SALE, notes: weightNote },
      select: { batchId: true },
    }),
  ]);

  const affectedBatchIds = new Set<string>();
  if (input.oldBatchId) affectedBatchIds.add(input.oldBatchId);
  if (input.newBatchId) affectedBatchIds.add(input.newBatchId);
  oldMortalities.forEach((row) => affectedBatchIds.add(row.batchId));
  oldWeights.forEach((row) => affectedBatchIds.add(row.batchId));

  // Delete first so old duplicates and rows from a previous batch cannot remain.
  await tx.mortality.deleteMany({ where: { saleId: input.saleId } });
  await tx.birdWeight.deleteMany({
    where: { source: WeightSource.SALE, notes: weightNote },
  });

  if (input.itemType === SalesItemType.Chicken_Meat && input.newBatchId) {
    if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
      throw new Error("Chicken sale quantity must be a positive whole number");
    }
    if (input.weight == null || !Number.isFinite(input.weight) || input.weight <= 0) {
      throw new Error("Chicken sale weight must be greater than zero");
    }

    await tx.mortality.create({
      data: {
        date: input.date,
        count: input.quantity,
        reason: "SLAUGHTERED_FOR_SALE",
        batchId: input.newBatchId,
        saleId: input.saleId,
      },
    });
    await tx.birdWeight.create({
      data: {
        batchId: input.newBatchId,
        date: input.date,
        avgWeight: input.weight / input.quantity,
        sampleCount: input.quantity,
        source: WeightSource.SALE,
        notes: weightNote,
      },
    });
  }

  // currentWeight is a cached display value. Rebuild it for every batch that
  // had a linked row, including old batches left dirty by earlier edits.
  for (const batchId of affectedBatchIds) {
    const latestWeight = await tx.birdWeight.findFirst({
      where: { batchId },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      select: { avgWeight: true },
    });
    await tx.batch.update({
      where: { id: batchId },
      data: { currentWeight: latestWeight?.avgWeight ?? null },
    });
  }

  return [...affectedBatchIds];
}
