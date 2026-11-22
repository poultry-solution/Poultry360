/**
 * Rollback a specific farmer cashflow backfill run.
 *
 * Deletes only rows stamped with the given `backfillRunId`, and double-checks
 * that `sourceType <> 'MANUAL'`. Manual rows never carry a `backfillRunId` so
 * the first clause already excludes them; the explicit second clause is
 * belt-and-braces for a destructive operation.
 *
 * Run:
 *   pnpm --filter backend run rollback:farmer-cashflow --run-id <id> --dry-run
 *   pnpm --filter backend run rollback:farmer-cashflow --run-id <id>
 */

import "dotenv/config";
import { CashSourceType } from "@prisma/client";
import prisma from "../utils/prisma";

export interface RollbackOptions {
  runId: string;
  dryRun?: boolean;
}

export interface RollbackSummary {
  runId: string;
  dryRun: boolean;
  matched: number;
  deleted: number;
}

export async function runRollback(
  options: RollbackOptions,
): Promise<RollbackSummary> {
  const dryRun = options.dryRun === true;
  if (!options.runId) {
    throw new Error("runId is required");
  }

  const matched = await prisma.cashMovement.count({
    where: {
      backfillRunId: options.runId,
      sourceType: { notIn: [CashSourceType.MANUAL] },
    },
  });

  if (dryRun) {
    return { runId: options.runId, dryRun, matched, deleted: 0 };
  }

  const result = await prisma.cashMovement.deleteMany({
    where: {
      backfillRunId: options.runId,
      sourceType: { notIn: [CashSourceType.MANUAL] },
    },
  });

  return { runId: options.runId, dryRun, matched, deleted: result.count };
}

function parseFlag(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return undefined;
  const value = process.argv[idx + 1];
  if (value === undefined || value.startsWith("--")) return undefined;
  return value;
}

async function main() {
  const runId = parseFlag("--run-id");
  const dryRun = process.argv.includes("--dry-run");
  if (!runId) {
    console.error("Usage: rollback:farmer-cashflow --run-id <id> [--dry-run]");
    process.exit(1);
  }
  console.log(
    `Rolling back farmer cashflow backfill ${runId}${dryRun ? " (DRY RUN)" : ""}...`,
  );
  const summary = await runRollback({ runId, dryRun });
  console.log(JSON.stringify(summary, null, 2));
  await prisma.$disconnect();
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
