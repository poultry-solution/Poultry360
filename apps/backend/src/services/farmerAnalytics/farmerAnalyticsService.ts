import { BatchStatus, Prisma, SalesItemType } from "@prisma/client";
import prisma from "../../utils/prisma";
import { getMoneyToGiveForUser } from "../../controller/dashboardController";
import { aggregateCurrentFcr } from "../farmerFcrService";
import { batchDayOf } from "../batchShareService";
import { toNepalDayKey } from "../../utils/nepalBsDate";
import { autoGroupBy, bucketize, periodStartOf, round, type AnalyticsRange } from "./period";
import { parseNepalBoundary } from "../../utils/dealerSaleDateRange";
import { naturalDeathWhere, type AnalyticsScope, type ScopeBatch } from "./scope";
import { getActiveFcrResults, getBatchStats, usableFcr } from "./batchStats";
import { hensByDay, layingPercent } from "./layerStats";

/**
 * Farmer analytics. Period numbers use Nepal days in the chosen range; per-batch
 * numbers are whole-life (same as the batch page). No staff payroll here.
 */

const dateIn = (range: AnalyticsRange): Prisma.DateTimeFilter => ({ gte: range.start, lte: range.end });
const num = (value: unknown) => Number(value ?? 0);
const REPORT_ROW_LIMIT = 1000;

function filterOptions(scope: AnalyticsScope) {
  return {
    farms: scope.farms,
    batches: scope.batchOptions.map((batch) => ({
      id: batch.id,
      batchNumber: batch.batchNumber,
      batchType: batch.batchType,
      status: batch.status,
      farmName: batch.farmName,
    })),
  };
}

const rangeInfo = (range: AnalyticsRange) => ({
  startDay: range.startDay,
  endDay: range.endDay,
  groupBy: range.groupBy,
  allTime: range.allTime,
});

/** Period sales and costs in scope (same rule as Home's month figures). */
async function periodMoney(scope: AnalyticsScope, range: AnalyticsRange) {
  const [sales, costs] = await Promise.all([
    prisma.sale.aggregate({ where: { ...scope.moneyWhere, date: dateIn(range) }, _sum: { amount: true }, _count: { _all: true } }),
    prisma.expense.aggregate({ where: { ...scope.moneyWhere, date: dateIn(range) }, _sum: { amount: true }, _count: { _all: true } }),
  ]);
  const salesTotal = num(sales._sum.amount);
  const costsTotal = num(costs._sum.amount);
  return {
    sales: round(salesTotal),
    costs: round(costsTotal),
    profit: round(salesTotal - costsTotal),
    salesCount: sales._count._all,
    costsCount: costs._count._all,
  };
}

/**
 * Birds each shown batch had when the period began (or when it was placed in the period).
 * Used as the base for the period death rate.
 */
async function birdsAtPeriodStart(batches: ScopeBatch[], range: AnalyticsRange) {
  const before = batches.filter((batch) => batch.startDate.getTime() < range.start.getTime());
  const ids = before.map((batch) => batch.id);
  const [deaths, sold] = ids.length
    ? await Promise.all([
        prisma.mortality.groupBy({
          by: ["batchId"],
          where: { batchId: { in: ids }, date: { lt: range.start }, ...naturalDeathWhere },
          _sum: { count: true },
        }),
        prisma.sale.groupBy({
          by: ["batchId"],
          where: { batchId: { in: ids }, itemType: SalesItemType.Chicken_Meat, date: { lt: range.start } },
          _sum: { quantity: true },
        }),
      ])
    : [[], []];
  const deathsBy = new Map(deaths.map((row) => [row.batchId, num(row._sum.count)]));
  const soldBy = new Map(sold.map((row) => [row.batchId, num(row._sum.quantity)]));
  return batches.reduce((sum, batch) => {
    if (batch.startDate.getTime() >= range.start.getTime()) return sum + batch.initialChicks;
    return sum + Math.max(0, batch.initialChicks - (deathsBy.get(batch.id) ?? 0) - (soldBy.get(batch.id) ?? 0));
  }, 0);
}

async function periodDeaths(scope: AnalyticsScope, range: AnalyticsRange) {
  if (scope.batchIds.length === 0) return { deaths: 0, base: 0, rate: null as number | null };
  const [deaths, base] = await Promise.all([
    prisma.mortality.aggregate({
      where: { batchId: { in: scope.batchIds }, date: dateIn(range), ...naturalDeathWhere },
      _sum: { count: true },
    }),
    birdsAtPeriodStart(scope.batches, range),
  ]);
  const total = num(deaths._sum.count);
  return { deaths: total, base, rate: base > 0 ? round((total / base) * 100, 2) : null };
}

// ==================== OVERVIEW ====================

export async function getOverview(userId: string, scope: AnalyticsScope, range: AnalyticsRange, now = new Date()) {
  const active = scope.batches.filter((batch) => batch.status === BatchStatus.ACTIVE);
  const [money, deaths, toReceive, toPay, runningStats, activeFcr] = await Promise.all([
    periodMoney(scope, range),
    periodDeaths(scope, range),
    prisma.customer.aggregate({ where: { userId, balance: { gt: 0 } }, _sum: { balance: true }, _count: { _all: true } }),
    getMoneyToGiveForUser(userId),
    getBatchStats(active, now),
    getActiveFcrResults(active, now),
  ]);
  const fcrRows = activeFcr.filter((row): row is NonNullable<typeof row> => !!row);
  const freshFcr = aggregateCurrentFcr(fcrRows);
  // No up-to-date weight: still show the last FCR, marked as from an old weight.
  const oldRows = fcrRows.filter((row) => row.displayStatus === "STALE" && row.fcr != null);
  const oldFcr = freshFcr == null ? aggregateCurrentFcr(oldRows.map((row) => ({ ...row, displayStatus: "FRESH" as const }))) : null;
  const fcr = freshFcr ?? oldFcr;

  return {
    filters: filterOptions(scope),
    range: rangeInfo(range),
    hasLayers: scope.batches.some((batch) => batch.batchType === "LAYERS"),
    tiles: {
      ...money,
      toReceive: round(num(toReceive._sum.balance)),
      customersOwing: toReceive._count._all,
      toPay: round(toPay),
      birdsAlive: runningStats.reduce((sum, row) => sum + row.alive, 0),
      activeBatches: active.length,
      deaths: deaths.deaths,
      deathRate: deaths.rate,
      fcr: fcr != null ? round(fcr, 2) : null,
      fcrIsOld: freshFcr == null && oldFcr != null,
      fcrBatches: freshFcr != null ? fcrRows.filter((row) => usableFcr(row) != null).length : oldRows.length,
    },
    running: runningStats.map((row) => ({
      id: row.id,
      batchNumber: row.batchNumber,
      batchType: row.batchType,
      farmName: row.farmName,
      day: row.day,
      started: row.started,
      alive: row.alive,
      deathPercent: row.deathPercent,
      avgWeightKg: row.avgWeightKg,
      fcr: row.fcr,
      fcrStatus: row.fcrStatus,
    })),
  };
}

// ==================== MONEY ====================

export async function getMoney(scope: AnalyticsScope, range: AnalyticsRange) {
  const where = { ...scope.moneyWhere, date: dateIn(range) };
  const [totals, sales, costs] = await Promise.all([
    periodMoney(scope, range),
    prisma.sale.findMany({ where, select: { date: true, amount: true, itemType: true } }),
    prisma.expense.findMany({ where, select: { date: true, amount: true, category: { select: { name: true } } } }),
  ]);

  const series = bucketize(range, ["sales", "costs"] as const, [
    ...sales.map((row) => ({ date: row.date, sales: num(row.amount) })),
    ...costs.map((row) => ({ date: row.date, costs: num(row.amount) })),
  ]).map((row) => ({ ...row, sales: round(row.sales), costs: round(row.costs), profit: round(row.sales - row.costs) }));

  const costsByType = new Map<string, number>();
  for (const row of costs) {
    const name = row.category?.name || "Other";
    costsByType.set(name, (costsByType.get(name) ?? 0) + num(row.amount));
  }
  const salesByItem = new Map<string, number>();
  for (const row of sales) salesByItem.set(row.itemType, (salesByItem.get(row.itemType) ?? 0) + num(row.amount));

  return {
    range: rangeInfo(range),
    totals,
    series,
    costsByType: [...costsByType.entries()]
      .map(([name, amount]) => ({ name, amount: round(amount) }))
      .sort((a, b) => b.amount - a.amount),
    salesByItem: [...salesByItem.entries()]
      .map(([itemType, amount]) => ({ itemType, amount: round(amount) }))
      .sort((a, b) => b.amount - a.amount),
  };
}

// ==================== BATCHES ====================

export async function getBatches(scope: AnalyticsScope, range: AnalyticsRange, now = new Date()) {
  return { range: rangeInfo(range), batches: await getBatchStats(scope.batches, now) };
}

// ==================== HEALTH & FEED ====================

export async function getHealthFeed(scope: AnalyticsScope, range: AnalyticsRange) {
  const ids = scope.batchIds;
  const empty = !ids.length;
  const [deaths, deathRows, feedRows, medicineExpenses] = await Promise.all([
    periodDeaths(scope, range),
    empty
      ? []
      : prisma.mortality.findMany({
          where: { batchId: { in: ids }, date: dateIn(range), ...naturalDeathWhere },
          select: { date: true, count: true, reason: true },
        }),
    empty
      ? []
      : prisma.feedConsumption.findMany({
          where: { batchId: { in: ids }, date: dateIn(range) },
          select: { date: true, quantityKg: true, feedType: true },
        }),
    empty
      ? []
      : prisma.expense.findMany({
          where: { batchId: { in: ids }, date: dateIn(range), category: { name: "Medicine" } },
          select: {
            batchId: true,
            description: true,
            inventoryUsages: { select: { quantity: true, item: { select: { name: true, unit: true } } } },
          },
        }),
  ]);
  const feedCost = empty
    ? 0
    : num(
        (
          await prisma.expense.aggregate({
            where: { batchId: { in: ids }, date: dateIn(range), category: { name: "Feed" } },
            _sum: { amount: true },
          })
        )._sum.amount
      );

  const reasons = new Map<string, number>();
  for (const row of deathRows) {
    const reason = row.reason?.trim() || "";
    reasons.set(reason, (reasons.get(reason) ?? 0) + row.count);
  }

  const feedKgRows = feedRows.filter((row) => row.quantityKg != null);
  const feedKg = feedKgRows.reduce((sum, row) => sum + num(row.quantityKg), 0);
  const byName = new Map<string, number>();
  for (const row of feedKgRows) {
    const name = row.feedType?.trim() || "Feed";
    byName.set(name, (byName.get(name) ?? 0) + num(row.quantityKg));
  }

  // Medicine grouped by name and unit (never adds ml to bottles).
  const medicines = new Map<string, { name: string; unit: string | null; quantity: number; batches: Set<string> }>();
  for (const expense of medicineExpenses) {
    const items = expense.inventoryUsages.length
      ? expense.inventoryUsages.map((usage) => ({ name: usage.item.name, unit: usage.item.unit, quantity: num(usage.quantity) }))
      : [{ name: expense.description?.trim() || "Medicine", unit: null, quantity: 0 }];
    for (const item of items) {
      const key = `${item.name.toLowerCase()}|${item.unit ?? ""}`;
      const entry = medicines.get(key) ?? { name: item.name, unit: item.unit, quantity: 0, batches: new Set<string>() };
      entry.quantity += item.quantity;
      if (expense.batchId) entry.batches.add(expense.batchId);
      medicines.set(key, entry);
    }
  }

  return {
    range: rangeInfo(range),
    health: {
      deaths: deaths.deaths,
      deathRate: deaths.rate,
      birdsBase: deaths.base,
      series: bucketize(range, ["count"] as const, deathRows.map((row) => ({ date: row.date, count: row.count }))),
      reasons: [...reasons.entries()]
        .map(([reason, count]) => ({ reason: reason || null, count }))
        .sort((a, b) => b.count - a.count),
    },
    feed: {
      totalKg: round(feedKg, 1),
      perBirdKg: deaths.base > 0 && feedKg > 0 ? round(feedKg / deaths.base, 3) : null,
      cost: round(feedCost),
      series: bucketize(range, ["kg"] as const, feedKgRows.map((row) => ({ date: row.date, kg: num(row.quantityKg) }))).map(
        (row) => ({ ...row, kg: round(row.kg, 1) })
      ),
      byName: [...byName.entries()].map(([name, kg]) => ({ name, kg: round(kg, 1) })).sort((a, b) => b.kg - a.kg),
    },
    medicines: [...medicines.values()]
      .map((entry) => ({ name: entry.name, unit: entry.unit, quantity: round(entry.quantity, 2), batches: entry.batches.size }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

// ==================== EGGS ====================

export async function getEggs(scope: AnalyticsScope, range: AnalyticsRange, now = new Date()) {
  const layers = scope.batches.filter((batch) => batch.batchType === "LAYERS");
  if (!layers.length) return { range: rangeInfo(range), hasLayers: false };
  const ids = layers.map((batch) => batch.id);

  // "All time": the chart starts at the first egg record, not the farm's first record.
  // Totals (costs, sales) still use the full period.
  let chartRange = range;
  if (range.allTime) {
    const first = await prisma.eggProduction.aggregate({ where: { batchId: { in: ids } }, _min: { date: true } });
    if (first._min.date && first._min.date.getTime() > range.start.getTime()) {
      const start = parseNepalBoundary(toNepalDayKey(first._min.date), "start")!;
      const startDay = toNepalDayKey(start);
      chartRange = { ...range, start, startDay, groupBy: autoGroupBy(startDay, range.endDay) };
    }
  }

  const [productions, eggSales, stock, layerCosts, losses, henSales, stats] = await Promise.all([
    prisma.eggProduction.findMany({
      where: { batchId: { in: ids }, date: dateIn(range) },
      select: { date: true, batchId: true, entries: { select: { count: true, eggType: { select: { name: true } } } } },
    }),
    prisma.sale.findMany({
      where: { batchId: { in: ids }, itemType: SalesItemType.EGGS, date: dateIn(range) },
      select: { date: true, amount: true, quantity: true, eggLines: { select: { quantity: true } } },
    }),
    prisma.batchEggInventory.aggregate({ where: { batchId: { in: ids } }, _sum: { quantity: true } }),
    prisma.expense.aggregate({ where: { batchId: { in: ids }, date: dateIn(range) }, _sum: { amount: true } }),
    prisma.mortality.findMany({ where: { batchId: { in: ids }, ...naturalDeathWhere }, select: { batchId: true, date: true, count: true } }),
    prisma.sale.findMany({
      where: { batchId: { in: ids }, itemType: SalesItemType.Chicken_Meat },
      select: { batchId: true, date: true, quantity: true },
    }),
    getBatchStats(layers, now),
  ]);

  // Hen-days only on days with an egg record, so a missed entry does not lower laying %.
  const eggsByBatchDay = new Map<string, number>();
  const byType = new Map<string, number>();
  for (const row of productions) {
    const count = row.entries.reduce((sum, entry) => sum + entry.count, 0);
    const key = `${row.batchId}|${toNepalDayKey(row.date)}`;
    eggsByBatchDay.set(key, (eggsByBatchDay.get(key) ?? 0) + count);
    for (const entry of row.entries) byType.set(entry.eggType.name, (byType.get(entry.eggType.name) ?? 0) + entry.count);
  }

  const perBatch = new Map<string, { eggs: number; henDays: number }>();
  const perPeriod = new Map<string, { eggs: number; henDays: number }>();
  for (const batch of layers) {
    const hens = hensByDay(
      batch,
      [
        ...losses.filter((row) => row.batchId === batch.id),
        ...henSales.filter((row) => row.batchId === batch.id).map((row) => ({ date: row.date, count: num(row.quantity) })),
      ],
      chartRange.startDay,
      chartRange.endDay
    );
    const totals = { eggs: 0, henDays: 0 };
    for (const [day, henCount] of hens) {
      const eggs = eggsByBatchDay.get(`${batch.id}|${day}`);
      if (eggs == null) continue;
      totals.eggs += eggs;
      totals.henDays += henCount;
      const period = periodStartOf(day, chartRange.groupBy);
      const p = perPeriod.get(period) ?? { eggs: 0, henDays: 0 };
      p.eggs += eggs;
      p.henDays += henCount;
      perPeriod.set(period, p);
    }
    perBatch.set(batch.id, totals);
  }

  const soldCount = (sale: (typeof eggSales)[number]) =>
    sale.eggLines.length ? sale.eggLines.reduce((sum, line) => sum + line.quantity, 0) : num(sale.quantity);
  const series = bucketize(chartRange, ["eggs", "sold"] as const, [
    ...productions.map((row) => ({ date: row.date, eggs: row.entries.reduce((s, e) => s + e.count, 0) })),
    ...eggSales.map((row) => ({ date: row.date, sold: soldCount(row) })),
  ]).map((row) => {
    const p = perPeriod.get(row.start);
    return { ...row, layingPercent: p ? layingPercent(p.eggs, p.henDays) : null };
  });

  const eggsLaid = [...perBatch.values()].reduce((sum, row) => sum + row.eggs, 0);
  const henDays = [...perBatch.values()].reduce((sum, row) => sum + row.henDays, 0);
  const allEggs = productions.reduce((sum, row) => sum + row.entries.reduce((s, e) => s + e.count, 0), 0);
  const costs = num(layerCosts._sum.amount);

  return {
    range: rangeInfo(chartRange),
    hasLayers: true,
    totals: {
      eggsLaid: allEggs,
      eggsSold: eggSales.reduce((sum, row) => sum + soldCount(row), 0),
      eggSales: round(eggSales.reduce((sum, row) => sum + num(row.amount), 0)),
      layingPercent: layingPercent(eggsLaid, henDays),
      costPerEgg: allEggs > 0 ? round(costs / allEggs, 2) : null,
      stock: num(stock._sum.quantity),
    },
    series,
    byType: [...byType.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    batches: stats.map((row) => {
      const p = perBatch.get(row.id) ?? { eggs: 0, henDays: 0 };
      return {
        id: row.id,
        batchNumber: row.batchNumber,
        farmName: row.farmName,
        day: row.day,
        hens: row.alive,
        eggsLaid: p.eggs,
        layingPercent: layingPercent(p.eggs, p.henDays),
        sales: row.sales,
        costs: row.costs,
        profit: row.profit,
      };
    }),
  };
}

// ==================== REPORTS (download) ====================

export type ReportType = "money" | "batches" | "sales" | "costs" | "deaths" | "eggs";
export const REPORT_TYPES: ReportType[] = ["money", "batches", "sales", "costs", "deaths", "eggs"];

export async function getReport(type: ReportType, scope: AnalyticsScope, range: AnalyticsRange, now = new Date()) {
  const base = { type, range: rangeInfo(range), limit: REPORT_ROW_LIMIT };
  const where = { ...scope.moneyWhere, date: dateIn(range) };
  switch (type) {
    case "money": {
      const money = await getMoney(scope, range);
      return { ...base, rows: money.series, totals: money.totals, truncated: false };
    }
    case "batches": {
      const rows = await getBatchStats(scope.batches, now);
      return { ...base, rows, truncated: false };
    }
    case "sales": {
      const rows = await prisma.sale.findMany({
        where,
        select: {
          date: true,
          invoiceNumber: true,
          itemType: true,
          quantity: true,
          weight: true,
          unitPrice: true,
          subtotalAmount: true,
          amount: true,
          customer: { select: { name: true } },
          batch: { select: { batchNumber: true } },
        },
        orderBy: [{ date: "asc" }, { createdAt: "asc" }],
        take: REPORT_ROW_LIMIT + 1,
      });
      return {
        ...base,
        truncated: rows.length > REPORT_ROW_LIMIT,
        rows: rows.slice(0, REPORT_ROW_LIMIT).map((row) => ({
          date: toNepalDayKey(row.date),
          invoiceNumber: row.invoiceNumber,
          itemType: row.itemType,
          customer: row.customer?.name ?? null,
          batch: row.batch?.batchNumber ?? null,
          quantity: num(row.quantity),
          weight: row.weight == null ? null : num(row.weight),
          unitPrice: row.unitPrice == null ? null : num(row.unitPrice),
          discount: row.subtotalAmount == null ? 0 : round(num(row.subtotalAmount) - num(row.amount)),
          amount: num(row.amount),
        })),
      };
    }
    case "costs": {
      const rows = await prisma.expense.findMany({
        where,
        select: {
          date: true,
          amount: true,
          quantity: true,
          description: true,
          category: { select: { name: true } },
          batch: { select: { batchNumber: true } },
        },
        orderBy: [{ date: "asc" }, { createdAt: "asc" }],
        take: REPORT_ROW_LIMIT + 1,
      });
      return {
        ...base,
        truncated: rows.length > REPORT_ROW_LIMIT,
        rows: rows.slice(0, REPORT_ROW_LIMIT).map((row) => ({
          date: toNepalDayKey(row.date),
          category: row.category?.name ?? "Other",
          batch: row.batch?.batchNumber ?? null,
          description: row.description ?? null,
          quantity: row.quantity == null ? null : num(row.quantity),
          amount: num(row.amount),
        })),
      };
    }
    case "deaths": {
      const rows = scope.batchIds.length
        ? await prisma.mortality.findMany({
            where: { batchId: { in: scope.batchIds }, date: dateIn(range), ...naturalDeathWhere },
            select: { date: true, count: true, reason: true, batch: { select: { batchNumber: true, startDate: true } } },
            orderBy: [{ date: "asc" }, { createdAt: "asc" }],
            take: REPORT_ROW_LIMIT + 1,
          })
        : [];
      return {
        ...base,
        truncated: rows.length > REPORT_ROW_LIMIT,
        rows: rows.slice(0, REPORT_ROW_LIMIT).map((row) => ({
          date: toNepalDayKey(row.date),
          batch: row.batch.batchNumber,
          day: batchDayOf(row.batch.startDate, row.date),
          count: row.count,
          reason: row.reason?.trim() || null,
        })),
      };
    }
    case "eggs": {
      const eggs = await getEggs(scope, { ...range, groupBy: "daily" }, now);
      return { ...base, rows: "series" in eggs ? eggs.series : [], truncated: false };
    }
  }
}
