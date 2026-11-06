/** Egg stock of one batch must never go below 0. */
export class EggStockError extends Error {
  status = 400;
}

/**
 * Takes `need` eggs of one type from a batch's stock, inside a transaction.
 * The `quantity >= need` condition is part of the update itself, so two saves
 * at the same moment cannot both take the last eggs. A missing row means 0.
 */
export async function takeEggStock(
  tx: any,
  batchId: string,
  eggTypeId: string,
  need: number,
  reason: "sale" | "remove"
) {
  if (need <= 0) return;
  const result = await tx.batchEggInventory.updateMany({
    where: { batchId, eggTypeId, quantity: { gte: need } },
    data: { quantity: { decrement: need } },
  });
  if (result.count === 1) return;

  const row = await tx.batchEggInventory.findUnique({
    where: { batchId_eggTypeId: { batchId, eggTypeId } },
    select: { quantity: true },
  });
  const type = await tx.eggType.findUnique({ where: { id: eggTypeId }, select: { name: true } });
  const available = Math.max(0, Number(row?.quantity ?? 0));
  const name = type?.name ?? "egg";
  throw new EggStockError(
    reason === "sale"
      ? `Insufficient egg inventory. ${name}: available ${available}, requested ${need}`
      : `Can't remove ${need} ${name} eggs: only ${available} are in stock. The rest were already sold.`
  );
}
