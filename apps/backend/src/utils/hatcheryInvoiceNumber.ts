import { Prisma } from "@prisma/client";

/**
 * Generate the next sequential invoice number for a hatchery sale.
 *
 * Format: HB-0001, HB-0002, ... (4-digit pad).
 *
 * Counter is shared across HatcheryEggSale, HatcheryParentSale and
 * HatcheryChickSale — one running sequence per hatchery, as agreed in the
 * handoff. Advisory lock serialises concurrent writes for the same hatchery so
 * two simultaneous sales cannot read the same MAX and emit the same number.
 *
 * Mirrors `generateNextInvoiceNumber` in `invoiceNumber.ts` (dealer).
 */
export async function generateNextHatcheryInvoiceNumber(
  tx: Prisma.TransactionClient,
  hatcheryOwnerId: string
): Promise<string> {
  // Serialise concurrent sale creates for this hatchery.
  await (tx as any).$queryRawUnsafe(
    `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))::text AS lock_result`,
    `hatchery-sale-invoice:${hatcheryOwnerId}`
  );

  // Find the max HB-#### across all three sale tables for this hatchery.
  // SUBSTRING FROM 4 drops the "HB-" prefix (positions 1..3) and leaves the
  // numeric tail that we parsed as integer.
  const rows: Array<{ max_num: string | null }> = await (tx as any).$queryRawUnsafe(
    `SELECT MAX(seq)::text AS max_num FROM (
       SELECT CAST(SUBSTRING("invoiceNumber" FROM 4) AS INTEGER) AS seq
         FROM "HatcheryEggSale"
        WHERE "hatcheryOwnerId" = $1 AND "invoiceNumber" ~ '^HB-[0-9]+$'
       UNION ALL
       SELECT CAST(SUBSTRING("invoiceNumber" FROM 4) AS INTEGER)
         FROM "HatcheryParentSale"
        WHERE "hatcheryOwnerId" = $1 AND "invoiceNumber" ~ '^HB-[0-9]+$'
       UNION ALL
       SELECT CAST(SUBSTRING("invoiceNumber" FROM 4) AS INTEGER)
         FROM "HatcheryChickSale"
        WHERE "hatcheryOwnerId" = $1 AND "invoiceNumber" ~ '^HB-[0-9]+$'
     ) AS all_seqs`,
    hatcheryOwnerId
  );

  const maxNum = rows[0]?.max_num ? parseInt(rows[0].max_num, 10) : 0;
  const nextNum = maxNum + 1;
  return `HB-${String(nextNum).padStart(4, "0")}`;
}
