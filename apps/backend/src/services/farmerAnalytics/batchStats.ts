import { BatchStatus, WeightSource } from "@prisma/client";
import prisma from "../../utils/prisma";
import { calculateFarmerBatchFcr, type FarmerFcrResult } from "../farmerFcrService";
import { batchDayOf } from "../batchShareService";
import { round } from "./period";
import { naturalDeathWhere, type ScopeBatch } from "./scope";

/** Whole-life numbers of one batch, the same as the batch page. */
export interface BatchStatRow {
  id: string;
  batchNumber: string;
  batchType: ScopeBatch["batchType"];
  status: ScopeBatch["status"];
  farmName: string;
  startDate: string;
  endDate: string | null;
  day: number;
  started: number;
  sold: number;
  died: number;
  leftAtClose: number;
  alive: number;
  deathPercent: number;
  feedKg: number;
  avgWeightKg: number | null;
  fcr: number | null;
  fcrStatus: FarmerFcrResult["displayStatus"] | null;
  sales: number;
  costs: number;
  profit: number;
  costPerBird: number | null;
  profitPerBird: number | null;
}

const CONCURRENCY = 6;

async function mapLimited<T, R>(items: T[], fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

/** FCR is shown only when it is up to date (or final); otherwise the page asks for a weight. */
export const usableFcr = (fcr: FarmerFcrResult | null) =>
  fcr && fcr.fcr != null && (fcr.displayStatus === "FRESH" || fcr.displayStatus === "FINAL") ? fcr.fcr : null;

export async function getBatchStats(batches: ScopeBatch[], now = new Date()): Promise<BatchStatRow[]> {
  if (batches.length === 0) return [];
  const ids = batches.map((batch) => batch.id);

  const [fcrResults, deaths, feed, sales, costs, weights] = await Promise.all([
    mapLimited(batches, (batch) => calculateFarmerBatchFcr(batch.id, now)),
    prisma.mortality.groupBy({
      by: ["batchId"],
      where: { batchId: { in: ids }, ...naturalDeathWhere },
      _sum: { count: true },
    }),
    prisma.feedConsumption.groupBy({ by: ["batchId"], where: { batchId: { in: ids } }, _sum: { quantityKg: true } }),
    prisma.sale.groupBy({ by: ["batchId"], where: { batchId: { in: ids } }, _sum: { amount: true } }),
    prisma.expense.groupBy({ by: ["batchId"], where: { batchId: { in: ids } }, _sum: { amount: true } }),
    prisma.birdWeight.findMany({
      where: { batchId: { in: ids }, source: WeightSource.MANUAL },
      select: { batchId: true, avgWeight: true },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      distinct: ["batchId"],
    }),
  ]);

  const deathsBy = new Map(deaths.map((row) => [row.batchId, Number(row._sum.count ?? 0)]));
  const feedBy = new Map(feed.map((row) => [row.batchId, Number(row._sum.quantityKg ?? 0)]));
  const salesBy = new Map(sales.map((row) => [row.batchId, Number(row._sum.amount ?? 0)]));
  const costsBy = new Map(costs.map((row) => [row.batchId, Number(row._sum.amount ?? 0)]));
  const weightBy = new Map(weights.map((row) => [row.batchId, Number(row.avgWeight)]));

  return batches.map((batch, index) => {
    const fcr = fcrResults[index];
    // All natural deaths to date (the FCR "deaths" field stops at the last weighing).
    const died = deathsBy.get(batch.id) ?? 0;
    const sold = fcr?.currentSoldBirds ?? 0;
    const leftAtClose = batch.status === BatchStatus.COMPLETED ? Math.max(0, (fcr?.currentDeaths ?? died) - died) : 0;
    const alive = batch.status === BatchStatus.COMPLETED ? 0 : fcr?.currentBirds ?? 0;
    const lastDay = batch.status === BatchStatus.COMPLETED && batch.endDate ? batch.endDate : now;
    const batchSales = salesBy.get(batch.id) ?? 0;
    const batchCosts = costsBy.get(batch.id) ?? 0;
    const profit = batchSales - batchCosts;
    return {
      id: batch.id,
      batchNumber: batch.batchNumber,
      batchType: batch.batchType,
      status: batch.status,
      farmName: batch.farmName,
      startDate: batch.startDate.toISOString(),
      endDate: batch.endDate ? batch.endDate.toISOString() : null,
      day: Math.max(1, batchDayOf(batch.startDate, lastDay)),
      started: batch.initialChicks,
      sold,
      died,
      leftAtClose,
      alive,
      deathPercent: batch.initialChicks > 0 ? round((died / batch.initialChicks) * 100, 2) : 0,
      feedKg: round(feedBy.get(batch.id) ?? 0, 1),
      avgWeightKg: weightBy.has(batch.id) ? round(weightBy.get(batch.id)!, 3) : null,
      // Value shown with its status, like the share page ("old weight" when stale).
      fcr: batch.batchType === "BROILER" && fcr?.fcr != null ? round(fcr.fcr, 2) : null,
      fcrStatus: batch.batchType === "BROILER" ? fcr?.displayStatus ?? null : null,
      sales: round(batchSales),
      costs: round(batchCosts),
      profit: round(profit),
      costPerBird: batch.initialChicks > 0 ? round(batchCosts / batch.initialChicks) : null,
      profitPerBird: batch.initialChicks > 0 ? round(profit / batch.initialChicks) : null,
    };
  });
}

/** Results kept for the overview FCR tile (the same rule Home uses). */
export async function getActiveFcrResults(batches: ScopeBatch[], now = new Date()) {
  const broilers = batches.filter((batch) => batch.batchType === "BROILER" && batch.status === BatchStatus.ACTIVE);
  return mapLimited(broilers, (batch) => calculateFarmerBatchFcr(batch.id, now));
}
