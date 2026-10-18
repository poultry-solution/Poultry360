import { BatchStatus, BatchType, Prisma } from "@prisma/client";
import prisma from "../../utils/prisma";
import type { AnalyticsRange } from "./period";

export class AnalyticsScopeError extends Error {
  constructor(message: string, public status = 403) {
    super(message);
  }
}

export interface ScopeBatch {
  id: string;
  batchNumber: string;
  batchType: BatchType;
  status: BatchStatus;
  startDate: Date;
  endDate: Date | null;
  initialChicks: number;
  farmId: string;
  farmName: string;
}

export interface AnalyticsScope {
  farms: Array<{ id: string; name: string }>;
  /** Batches for the batch picker (farm + type filters only, so a choice never disappears). */
  batchOptions: ScopeBatch[];
  /** Batches that ran at some time in the period, after every filter. */
  batches: ScopeBatch[];
  batchIds: string[];
  /** Where clause for Sale / Expense rows in scope (farm level, or batch level when a batch/type is chosen). */
  moneyWhere: { farmId?: { in: string[] }; batchId?: { in: string[] } };
  filters: { farmId?: string; batchId?: string; batchType?: BatchType };
  /** Earliest batch start / sale / cost in scope (for "all time"). */
  firstDate: Date | null;
}

function pick(value: unknown): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" && raw && raw !== "all" ? raw : undefined;
}

/** A batch ran in the period if it started by the end and had not ended before the start. */
export function ranInPeriod(batch: Pick<ScopeBatch, "startDate" | "endDate">, range: Pick<AnalyticsRange, "start" | "end">) {
  return (
    batch.startDate.getTime() <= range.end.getTime() &&
    (!batch.endDate || batch.endDate.getTime() >= range.start.getTime())
  );
}

export async function buildAnalyticsScope(
  userId: string,
  query: Record<string, unknown>,
  range: AnalyticsRange
): Promise<AnalyticsScope> {
  const farmId = pick(query.farmId);
  const batchId = pick(query.batchId);
  const rawType = pick(query.batchType);
  const batchType = rawType === "BROILER" || rawType === "LAYERS" ? (rawType as BatchType) : undefined;

  const farms = await prisma.farm.findMany({
    where: { ownerId: userId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const farmIds = farms.map((farm) => farm.id);
  if (farmId && !farmIds.includes(farmId)) throw new AnalyticsScopeError("You do not have access to this farm.");
  const selectedFarmIds = farmId ? [farmId] : farmIds;

  const rows = await prisma.batch.findMany({
    where: { farmId: { in: selectedFarmIds }, ...(batchType ? { batchType } : {}) },
    select: {
      id: true,
      batchNumber: true,
      batchType: true,
      status: true,
      startDate: true,
      endDate: true,
      initialChicks: true,
      farmId: true,
      farm: { select: { name: true } },
    },
    orderBy: { startDate: "desc" },
  });
  const batchOptions: ScopeBatch[] = rows.map(({ farm, ...batch }) => ({ ...batch, farmName: farm.name }));

  if (batchId && !batchOptions.some((batch) => batch.id === batchId)) {
    throw new AnalyticsScopeError("You do not have access to this batch.");
  }

  const batches = batchId
    ? batchOptions.filter((batch) => batch.id === batchId)
    : range.allTime
      ? batchOptions
      : batchOptions.filter((batch) => ranInPeriod(batch, range));

  // Farm-level money (same as Home) unless a batch or batch type narrows it to batches.
  const moneyWhere = batchId
    ? { batchId: { in: [batchId] } }
    : batchType
      ? { batchId: { in: batchOptions.map((batch) => batch.id) } }
      : { farmId: { in: selectedFarmIds } };

  return {
    farms,
    batchOptions,
    firstDate: null,
    batches,
    batchIds: batches.map((batch) => batch.id),
    moneyWhere,
    filters: { farmId, batchId, batchType },
  };
}

/** Earliest date in scope: first batch start, sale or cost. */
export async function findFirstDate(scope: Omit<AnalyticsScope, "firstDate">): Promise<Date | null> {
  const [sale, expense] = await Promise.all([
    prisma.sale.aggregate({ where: scope.moneyWhere, _min: { date: true } }),
    prisma.expense.aggregate({ where: scope.moneyWhere, _min: { date: true } }),
  ]);
  const dates = [
    ...scope.batches.map((batch) => batch.startDate),
    sale._min.date,
    expense._min.date,
  ].filter((date): date is Date => !!date);
  return dates.length ? new Date(Math.min(...dates.map((date) => date.getTime()))) : null;
}

/** Natural deaths only: sold birds and birds left at closing are not deaths. Null reasons are kept. */
export const naturalDeathWhere: Prisma.MortalityWhereInput = {
  saleId: null,
  OR: [{ reason: null }, { reason: { notIn: ["SLAUGHTERED_FOR_SALE", "BATCH_CLOSURE"] } }],
};
