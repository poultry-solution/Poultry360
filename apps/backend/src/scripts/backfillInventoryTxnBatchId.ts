/**
 * One-shot backfill for `InventoryTransaction.batchId`.
 *
 * Looks at every USAGE transaction with `batchId IS NULL`, parses the
 * batchNumber out of its description, finds the matching Batch owned by the
 * same user (via InventoryItem.userId), and sets batchId when there is
 * exactly one candidate. Rows with 0 or 2+ candidates are left null and
 * reported so they can be reviewed manually.
 *
 * Idempotent — safe to re-run. Pass `--dry-run` to count without writing.
 *
 * Run:
 *   pnpm --filter backend run backfill:inventory-txn-batch-id
 *   pnpm --filter backend run backfill:inventory-txn-batch-id --dry-run
 */

import "dotenv/config";
import { InventoryTransactionType } from "@prisma/client";
import prisma from "../utils/prisma";

const BATCH_SIZE = 500;

/**
 * Pulled from the two in-code creation sites:
 *   batchController.ts:645    `Chicks allocated to batch ${batchNumber}`         (batchNumber may contain spaces)
 *   expenseController.ts:609  `Usage recorded for ${farmId} - Batch ${batchId}`  (batchId = cuid or seed slug)
 *
 * Legacy prod data additionally contains strings like
 *   "Finisher feed issued to batch BRO-2083-04"
 * from older code paths. The number pattern accepts any "<verb> to batch <value>"
 * tail so these are picked up too.
 *
 * Collisions are impossible: Prisma ids and user-visible batchNumbers come from
 * different id spaces (cuid / seed-slug vs free text like "BRO-2083-04"), so an
 * id-lookup for a batchNumber-shaped value simply returns no row.
 */
const BY_ID_PATTERN = /\s-\s*Batch\s+([A-Za-z0-9][A-Za-z0-9_-]*)\s*$/;
const BY_NUMBER_PATTERN = /\b(?:to|from)\s+batch\s+(.+?)\s*$/i;

export interface ParsedBatchRefs {
  id?: string;
  number?: string;
}

export function extractBatchRefs(
  description: string | null | undefined,
): ParsedBatchRefs | null {
  if (!description) return null;
  const refs: ParsedBatchRefs = {};
  const byId = description.match(BY_ID_PATTERN);
  if (byId?.[1]) refs.id = byId[1];
  const byNumber = description.match(BY_NUMBER_PATTERN);
  if (byNumber?.[1]) refs.number = byNumber[1];
  return refs.id || refs.number ? refs : null;
}

type ResolveResult = string | "none" | "ambiguous";

async function resolveBatch(
  refs: ParsedBatchRefs,
  userId: string,
): Promise<ResolveResult> {
  if (refs.id) {
    const byId = await prisma.batch.findMany({
      where: { id: refs.id, farm: { ownerId: userId } },
      select: { id: true },
    });
    if (byId.length === 1) return byId[0].id;
    if (byId.length > 1) return "ambiguous";
    // 0 hits: id string wasn't a real id — fall through to number lookup.
  }

  if (refs.number) {
    const byNumber = await prisma.batch.findMany({
      where: { batchNumber: refs.number, farm: { ownerId: userId } },
      select: { id: true },
    });
    if (byNumber.length === 1) return byNumber[0].id;
    if (byNumber.length > 1) return "ambiguous";
  }

  return "none";
}

interface BackfillCounts {
  scanned: number;
  linked: number;
  skippedNoDescription: number;
  skippedNoParse: number;
  skippedNoMatch: number;
  skippedAmbiguous: number;
}

export async function runBackfill(options: { dryRun?: boolean } = {}): Promise<BackfillCounts> {
  const dryRun = options.dryRun === true;
  const counts: BackfillCounts = {
    scanned: 0,
    linked: 0,
    skippedNoDescription: 0,
    skippedNoParse: 0,
    skippedNoMatch: 0,
    skippedAmbiguous: 0,
  };

  let cursor: string | undefined;

  while (true) {
    const rows = await prisma.inventoryTransaction.findMany({
      where: { batchId: null, type: InventoryTransactionType.USAGE },
      select: {
        id: true,
        description: true,
        item: { select: { userId: true } },
      },
      take: BATCH_SIZE,
      orderBy: { id: "asc" },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    if (rows.length === 0) break;

    for (const row of rows) {
      counts.scanned += 1;

      if (!row.description) {
        counts.skippedNoDescription += 1;
        continue;
      }

      const refs = extractBatchRefs(row.description);
      if (!refs) {
        counts.skippedNoParse += 1;
        continue;
      }

      // Try id first (globally unique, no ambiguity possible). If that doesn't
      // yield exactly one row, fall back to batchNumber scoped by owner so we
      // can't accidentally link to someone else's batch with the same number.
      const match = await resolveBatch(refs, row.item.userId);

      if (match === "none") {
        counts.skippedNoMatch += 1;
        continue;
      }
      if (match === "ambiguous") {
        counts.skippedAmbiguous += 1;
        console.warn(
          `[ambiguous] txn=${row.id} userId=${row.item.userId} refs=${JSON.stringify(refs)}`,
        );
        continue;
      }

      if (!dryRun) {
        await prisma.inventoryTransaction.update({
          where: { id: row.id },
          data: { batchId: match },
        });
      }
      counts.linked += 1;
    }

    cursor = rows[rows.length - 1].id;
  }

  return counts;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  console.log(
    `Backfilling InventoryTransaction.batchId${dryRun ? " (DRY RUN)" : ""}...`,
  );
  const counts = await runBackfill({ dryRun });
  console.log(JSON.stringify(counts, null, 2));
  await prisma.$disconnect();
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
