import { HatcheryBatchType } from "@prisma/client";
import prisma from "../utils/prisma";

const DAY_MS = 86_400_000;

/** Normalise to UTC midnight. Dates arrive as "YYYY-MM-DD" → UTC midnight already. */
function toUtcDay(date: Date): number {
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  );
}

/**
 * Pure female-day accumulator, split out so it can be exercised directly.
 *
 * Counts, for every day in [startDay, endDay] inclusive, how many females were
 * alive that day. A removal dated day D takes effect ON day D.
 */
export function computeFemaleDays(input: {
  initialFemale: number;
  startDay: number;
  endDay: number;
  events: { day: number; removed: number }[];
}): number {
  const { initialFemale, startDay, endDay } = input;
  if (endDay < startDay) return 0;

  const events = [...input.events].sort((a, b) => a.day - b.day);

  // Anything dated on or before the first day is already reflected in the
  // count the window opens with.
  let current = initialFemale;
  const inWindow: { day: number; removed: number }[] = [];
  for (const event of events) {
    if (event.day <= startDay) current -= event.removed;
    else if (event.day <= endDay) inWindow.push(event);
    // events after the window cannot affect days inside it
  }

  let femaleDays = 0;
  let cursor = startDay;
  for (const event of inWindow) {
    femaleDays += Math.max(0, current) * ((event.day - cursor) / DAY_MS);
    current -= event.removed;
    cursor = event.day;
  }
  // Final segment is inclusive of the last day.
  femaleDays += Math.max(0, current) * ((endDay - cursor) / DAY_MS + 1);

  return femaleDays;
}

export type HatcheryLayRate = {
  layPercent: number;
  eggsPerFemaleDay: number;
  femaleDays: number;
  totalEggs: number;
  windowStart: string;
  windowEnd: string;
};

export class HatcheryLayRateService {
  /**
   * Lay rate over true female-days.
   *
   * Two things this fixes versus the old client-side formula:
   *   1. The denominator counts FEMALES only — males never lay.
   *   2. The window starts at the FIRST RECORDED EGG PRODUCTION, not at batch
   *      start. A parent flock spends its first ~24 weeks rearing, so counting
   *      from placement understated the rate several-fold.
   *
   * Female count on a given day is the initial female placement minus every
   * female mortality and female parent sale dated on or before that day, so
   * back-dated entries recompute correctly on the next read.
   *
   * Returns null when there is nothing meaningful to show (not a parent flock,
   * no production yet, or no female-days) — the caller renders a dash rather
   * than dividing by zero.
   */
  static async computeForBatch(
    batchId: string,
    totalEggs: number
  ): Promise<HatcheryLayRate | null> {
    const batch = await prisma.hatcheryBatch.findUnique({
      where: { id: batchId },
      select: {
        type: true,
        endDate: true,
        initialFemaleParents: true,
      },
    });

    if (!batch) return null;
    if (batch.type !== HatcheryBatchType.PARENT_FLOCK) return null;
    if (totalEggs <= 0) return null;

    const initialFemale = batch.initialFemaleParents ?? 0;
    if (initialFemale <= 0) return null;

    const [firstProduction, lastProduction, mortalities, parentSales] =
      await Promise.all([
        prisma.hatcheryEggProduction.findFirst({
          where: { batchId },
          orderBy: { date: "asc" },
          select: { date: true },
        }),
        prisma.hatcheryEggProduction.findFirst({
          where: { batchId },
          orderBy: { date: "desc" },
          select: { date: true },
        }),
        prisma.hatcheryBatchMortality.findMany({
          where: { batchId },
          select: { date: true, femaleCount: true },
        }),
        prisma.hatcheryParentSale.findMany({
          where: { batchId },
          select: { date: true, femaleCount: true },
        }),
      ]);

    if (!firstProduction || !lastProduction) return null;

    const startDay = toUtcDay(firstProduction.date);
    // Never end before the last production entry, so every recorded egg falls
    // inside the window even if the batch was closed earlier.
    const nominalEnd = toUtcDay(batch.endDate ?? new Date());
    const endDay = Math.max(nominalEnd, toUtcDay(lastProduction.date), startDay);

    // Every event removes females. A bird dated day D is already gone ON day D.
    const events: { day: number; removed: number }[] = [];
    for (const row of [...mortalities, ...parentSales]) {
      const removed = Number(row.femaleCount ?? 0);
      if (removed > 0) events.push({ day: toUtcDay(row.date), removed });
    }

    const femaleDays = computeFemaleDays({
      initialFemale,
      startDay,
      endDay,
      events,
    });

    if (femaleDays <= 0) return null;

    const eggsPerFemaleDay = totalEggs / femaleDays;

    return {
      layPercent: Math.round(eggsPerFemaleDay * 100 * 10) / 10,
      eggsPerFemaleDay: Math.round(eggsPerFemaleDay * 1000) / 1000,
      femaleDays: Math.round(femaleDays),
      totalEggs,
      windowStart: new Date(startDay).toISOString(),
      windowEnd: new Date(endDay).toISOString(),
    };
  }
}
