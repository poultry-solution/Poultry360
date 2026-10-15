import { randomBytes } from "crypto";
import { BatchStatus, BatchType, SalesItemType, WeightSource } from "@prisma/client";
import prisma from "../utils/prisma";
import { toNepalDayKey } from "../utils/nepalBsDate";
import { calculateFarmerBatchFcr, type FarmerFcrResult } from "./farmerFcrService";

/**
 * Batch share links: a read-only health report of one batch that a farmer can send
 * to a vet (or anyone) on WhatsApp. It never contains money: no sales amounts, costs,
 * rates, customers or suppliers.
 */

export const SHARE_LINK_DAYS = [1, 7, 30] as const;
const MAX_ACTIVE_LINKS_PER_BATCH = 10;
const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_DEATH_ROWS = 10;
const FEED_CHART_DAYS = 14;
const EGG_CHART_DAYS = 30;
const NOTES_LIMIT = 20;
const SYSTEM_DEATH_REASONS = new Set(["SLAUGHTERED_FOR_SALE", "BATCH_CLOSURE"]);

export class BatchShareError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = "BatchShareError";
  }
}

// ==================== Links (owner side) ====================

/** The batch must belong to this account (owner) or to a farm they manage. */
export async function ensureBatchOwner(batchId: string, userId?: string) {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    select: {
      id: true,
      farm: { select: { ownerId: true, managers: { select: { id: true } } } },
    },
  });
  if (!batch) throw new BatchShareError("Batch not found", 404);
  const allowed =
    !!userId &&
    (batch.farm.ownerId === userId || batch.farm.managers.some((manager) => manager.id === userId));
  if (!allowed) throw new BatchShareError("You do not have access to this batch", 403);
  return batch;
}

const newToken = () => randomBytes(24).toString("base64url");

const linkSelect = {
  id: true,
  token: true,
  expiresAt: true,
  revokedAt: true,
  showLocation: true,
  showNotes: true,
  viewCount: true,
  lastViewedAt: true,
  createdAt: true,
} as const;

export async function createShareLink(input: {
  batchId: string;
  userId: string;
  staffUserId?: string | null;
  expiresInDays: unknown;
  showLocation?: unknown;
  showNotes?: unknown;
  now?: Date;
}) {
  const days = Number(input.expiresInDays);
  if (!SHARE_LINK_DAYS.includes(days as (typeof SHARE_LINK_DAYS)[number])) {
    throw new BatchShareError("Link time must be 1, 7 or 30 days");
  }
  await ensureBatchOwner(input.batchId, input.userId);

  const now = input.now ?? new Date();
  const activeCount = await prisma.batchShareLink.count({
    where: { batchId: input.batchId, revokedAt: null, expiresAt: { gt: now } },
  });
  if (activeCount >= MAX_ACTIVE_LINKS_PER_BATCH) {
    throw new BatchShareError("Too many open links for this batch. Turn some off first.", 409);
  }

  return prisma.batchShareLink.create({
    data: {
      token: newToken(),
      batchId: input.batchId,
      createdById: input.userId,
      createdByStaffId: input.staffUserId ?? null,
      expiresAt: new Date(now.getTime() + days * DAY_MS),
      showLocation: input.showLocation === true,
      showNotes: input.showNotes === true,
    },
    select: linkSelect,
  });
}

export async function listActiveShareLinks(batchId: string, userId: string, now = new Date()) {
  await ensureBatchOwner(batchId, userId);
  return prisma.batchShareLink.findMany({
    where: { batchId, revokedAt: null, expiresAt: { gt: now } },
    select: linkSelect,
    orderBy: { createdAt: "desc" },
  });
}

export async function revokeShareLink(batchId: string, linkId: string, userId: string) {
  await ensureBatchOwner(batchId, userId);
  const link = await prisma.batchShareLink.findFirst({
    where: { id: linkId, batchId },
    select: { id: true, revokedAt: true },
  });
  if (!link) throw new BatchShareError("Link not found", 404);
  if (link.revokedAt) return;
  await prisma.batchShareLink.update({ where: { id: link.id }, data: { revokedAt: new Date() } });
}

// ==================== Public report ====================

export interface ShareReportInput {
  now: Date;
  batch: {
    batchNumber: string;
    batchType: BatchType;
    status: BatchStatus;
    startDate: Date;
    endDate: Date | null;
    initialChicks: number;
  };
  farmName: string;
  location: string | null;
  expiresAt: Date;
  fcr: Pick<
    FarmerFcrResult,
    "fcr" | "displayStatus" | "weightSourceDate" | "currentBirds" | "currentSoldBirds" | "deaths" | "closureDeaths"
  > | null;
  mortalities: Array<{ date: Date; count: number; reason: string | null; saleId: string | null }>;
  weights: Array<{ date: Date; avgWeight: number; sampleCount: number }>;
  feed: Array<{ date: Date; quantityKg: number | null; feedType: string }>;
  medicines: Array<{
    date: Date;
    description: string | null;
    items: Array<{ name: string; quantity: number; unit: string }>;
  }>;
  /** Chicken sales: bird counts only, used for hens alive on a day. */
  birdSales: Array<{ date: Date; quantity: number }>;
  eggs: Array<{ date: Date; count: number }>;
  notes: Array<{ date: Date; description: string }> | null;
}

const dayNumber = (dayKey: string) => Math.floor(Date.parse(`${dayKey}T00:00:00Z`) / DAY_MS);
const dayKeyFromNumber = (n: number) => new Date(n * DAY_MS).toISOString().slice(0, 10);
const round = (value: number, places = 2) => {
  const f = 10 ** places;
  return Math.round(value * f) / f;
};

/** "Day 1" is the day the chicks arrived (Nepal calendar day). */
export function batchDayOf(startDate: Date, date: Date) {
  return dayNumber(toNepalDayKey(date)) - dayNumber(toNepalDayKey(startDate)) + 1;
}

const isNaturalDeath = (row: { reason: string | null; saleId: string | null }) =>
  !row.saleId && !SYSTEM_DEATH_REASONS.has(row.reason ?? "");

/** Builds the public report from raw rows. Pure, so it is easy to test. */
export function assembleShareReport(input: ShareReportInput) {
  const { batch, now } = input;
  const isLayers = batch.batchType === BatchType.LAYERS;
  const lastDate =
    batch.status === BatchStatus.COMPLETED && batch.endDate ? batch.endDate : now;
  const firstDayNum = dayNumber(toNepalDayKey(batch.startDate));
  const lastDayNum = Math.max(firstDayNum, dayNumber(toNepalDayKey(lastDate)));
  const dayOf = (date: Date) => batchDayOf(batch.startDate, date);

  // ---- Deaths (natural only; sold birds and birds left at close are not deaths)
  const deathRows = input.mortalities.filter(isNaturalDeath);
  const deathsByDay = new Map<number, number>();
  const reasons = new Map<string, number>();
  for (const row of deathRows) {
    const n = dayNumber(toNepalDayKey(row.date));
    deathsByDay.set(n, (deathsByDay.get(n) ?? 0) + row.count);
    const reason = row.reason?.trim() || "";
    reasons.set(reason, (reasons.get(reason) ?? 0) + row.count);
  }
  const dailyDeaths = [];
  for (let n = firstDayNum; n <= lastDayNum; n++) {
    dailyDeaths.push({ date: dayKeyFromNumber(n), day: n - firstDayNum + 1, count: deathsByDay.get(n) ?? 0 });
  }
  const totalDeaths = deathRows.reduce((sum, row) => sum + row.count, 0);
  const sold = input.fcr?.currentSoldBirds ?? 0;
  const leftAtClose = input.fcr?.closureDeaths ?? 0;
  const alive =
    input.fcr?.currentBirds ?? Math.max(0, batch.initialChicks - totalDeaths - sold);

  // ---- Weights (birds weighed by the farmer)
  const weights = [...input.weights]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((row) => ({
      date: toNepalDayKey(row.date),
      day: dayOf(row.date),
      avgWeightKg: round(row.avgWeight, 3),
      sampleCount: row.sampleCount,
    }));

  // ---- Feed
  const feedRows = input.feed.filter((row) => row.quantityKg != null && row.quantityKg > 0);
  const totalFeedKg = feedRows.reduce((sum, row) => sum + (row.quantityKg ?? 0), 0);
  const feedByDay = new Map<number, number>();
  const feedByType = new Map<string, number>();
  for (const row of feedRows) {
    const n = dayNumber(toNepalDayKey(row.date));
    feedByDay.set(n, (feedByDay.get(n) ?? 0) + (row.quantityKg ?? 0));
    const name = row.feedType?.trim() || "Feed";
    feedByType.set(name, (feedByType.get(name) ?? 0) + (row.quantityKg ?? 0));
  }
  const recentFeed = [];
  for (let n = Math.max(firstDayNum, lastDayNum - FEED_CHART_DAYS + 1); n <= lastDayNum; n++) {
    recentFeed.push({ date: dayKeyFromNumber(n), day: n - firstDayNum + 1, kg: round(feedByDay.get(n) ?? 0, 1) });
  }
  const birdsFed = alive + sold;

  // ---- Medicine and vaccines (no amounts)
  const medicines = [...input.medicines]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((row) => ({
      date: toNepalDayKey(row.date),
      day: dayOf(row.date),
      items:
        row.items.length > 0
          ? row.items.map((item) => ({ name: item.name, quantity: round(item.quantity, 2), unit: item.unit }))
          : [{ name: row.description?.trim() || "Medicine", quantity: null, unit: null }],
    }));

  // ---- Eggs (layers): laying % = eggs ÷ hens alive that day
  let eggs = null;
  if (isLayers) {
    const eggsByDay = new Map<number, number>();
    for (const row of input.eggs) {
      const n = dayNumber(toNepalDayKey(row.date));
      eggsByDay.set(n, (eggsByDay.get(n) ?? 0) + row.count);
    }
    const lossByDay = new Map<number, number>();
    for (const row of deathRows) {
      const n = dayNumber(toNepalDayKey(row.date));
      lossByDay.set(n, (lossByDay.get(n) ?? 0) + row.count);
    }
    for (const row of input.birdSales) {
      const n = dayNumber(toNepalDayKey(row.date));
      lossByDay.set(n, (lossByDay.get(n) ?? 0) + row.quantity);
    }
    // Hens alive at the start of each day (losses on that day are not yet counted).
    const daily = [];
    let lostBefore = 0;
    const chartStart = Math.max(firstDayNum, lastDayNum - EGG_CHART_DAYS + 1);
    for (let n = firstDayNum; n <= lastDayNum; n++) {
      const hens = Math.max(0, batch.initialChicks - lostBefore);
      if (n >= chartStart) {
        const count = eggsByDay.get(n);
        daily.push({
          date: dayKeyFromNumber(n),
          day: n - firstDayNum + 1,
          eggs: count ?? null,
          layingPercent: count != null && hens > 0 ? round((count / hens) * 100, 1) : null,
        });
      }
      lostBefore += lossByDay.get(n) ?? 0;
    }
    const recorded = daily.filter((row) => row.eggs != null);
    const latest = recorded[recorded.length - 1] ?? null;
    eggs = {
      totalEggs: [...eggsByDay.values()].reduce((sum, value) => sum + value, 0),
      latest,
      daily,
    };
  }

  // ---- FCR (broilers only; same numbers as the batch page)
  const fcr =
    !isLayers && input.fcr
      ? {
          value: input.fcr.fcr != null ? round(input.fcr.fcr, 2) : null,
          status: input.fcr.displayStatus,
          weightDate: input.fcr.weightSourceDate ? toNepalDayKey(input.fcr.weightSourceDate) : null,
        }
      : null;

  return {
    generatedAt: now.toISOString(),
    expiresAt: input.expiresAt.toISOString(),
    batch: {
      name: batch.batchNumber,
      type: batch.batchType,
      status: batch.status,
      startDate: toNepalDayKey(batch.startDate),
      endDate: batch.status === BatchStatus.COMPLETED && batch.endDate ? toNepalDayKey(batch.endDate) : null,
      day: lastDayNum - firstDayNum + 1,
      farmName: input.farmName,
      location: input.location,
    },
    birds: {
      started: batch.initialChicks,
      died: totalDeaths,
      sold,
      leftAtClose,
      alive,
    },
    deaths: {
      total: totalDeaths,
      percent: batch.initialChicks > 0 ? round((totalDeaths / batch.initialChicks) * 100, 2) : 0,
      daily: dailyDeaths,
      reasons: [...reasons.entries()]
        .map(([reason, count]) => ({ reason: reason || null, count }))
        .sort((a, b) => b.count - a.count),
      recent: [...deathRows]
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, RECENT_DEATH_ROWS)
        .map((row) => ({
          date: toNepalDayKey(row.date),
          day: dayOf(row.date),
          count: row.count,
          reason: row.reason?.trim() || null,
        })),
    },
    weight: {
      latest: weights[weights.length - 1] ?? null,
      points: weights,
    },
    feed: {
      totalKg: round(totalFeedKg, 1),
      perBirdKg: birdsFed > 0 && totalFeedKg > 0 ? round(totalFeedKg / birdsFed, 3) : null,
      recent: recentFeed,
      types: [...feedByType.entries()]
        .map(([name, kg]) => ({ name, kg: round(kg, 1) }))
        .sort((a, b) => b.kg - a.kg),
    },
    fcr,
    medicines,
    eggs,
    notes: input.notes
      ? input.notes.map((row) => ({ date: toNepalDayKey(row.date), description: row.description }))
      : null,
  };
}

export type BatchShareReport = ReturnType<typeof assembleShareReport>;

/**
 * Loads the report for a public token. Returns null when the link is unknown,
 * expired or turned off. Only reads farm data (the view counter is the one write).
 */
export async function getPublicShareReport(token: string, now = new Date()): Promise<BatchShareReport | null> {
  if (!token || token.length > 64) return null;
  const link = await prisma.batchShareLink.findUnique({
    where: { token },
    select: {
      id: true,
      expiresAt: true,
      revokedAt: true,
      showLocation: true,
      showNotes: true,
      batch: {
        select: {
          id: true,
          batchNumber: true,
          batchType: true,
          status: true,
          startDate: true,
          endDate: true,
          initialChicks: true,
          farm: { select: { name: true, owner: { select: { CompanyFarmLocation: true } } } },
        },
      },
    },
  });
  if (!link || link.revokedAt || link.expiresAt.getTime() <= now.getTime()) return null;

  const batchId = link.batch.id;
  const [fcr, mortalities, weights, feed, medicineExpenses, birdSales, eggRows, notes] = await Promise.all([
    calculateFarmerBatchFcr(batchId, now),
    prisma.mortality.findMany({
      where: { batchId },
      select: { date: true, count: true, reason: true, saleId: true },
    }),
    prisma.birdWeight.findMany({
      where: { batchId, source: WeightSource.MANUAL },
      select: { date: true, avgWeight: true, sampleCount: true },
    }),
    prisma.feedConsumption.findMany({
      where: { batchId },
      select: { date: true, quantityKg: true, feedType: true },
    }),
    prisma.expense.findMany({
      where: { batchId, category: { name: "Medicine" } },
      select: {
        date: true,
        description: true,
        inventoryUsages: { select: { quantity: true, item: { select: { name: true, unit: true } } } },
      },
    }),
    prisma.sale.findMany({
      where: { batchId, itemType: SalesItemType.Chicken_Meat },
      select: { date: true, quantity: true },
    }),
    link.batch.batchType === BatchType.LAYERS
      ? prisma.eggProduction.findMany({
          where: { batchId },
          select: { date: true, entries: { select: { count: true } } },
        })
      : Promise.resolve([]),
    link.showNotes
      ? prisma.batchNote.findMany({
          where: { batchId },
          select: { date: true, description: true },
          orderBy: [{ date: "desc" }, { createdAt: "desc" }],
          take: NOTES_LIMIT,
        })
      : Promise.resolve(null),
  ]);

  // Count the view; a failure here must not block the report.
  prisma.batchShareLink
    .update({ where: { id: link.id }, data: { viewCount: { increment: 1 }, lastViewedAt: now } })
    .catch((error) => console.error("batch share view count:", error));

  return assembleShareReport({
    now,
    batch: link.batch,
    farmName: link.batch.farm.name,
    location: link.showLocation ? link.batch.farm.owner?.CompanyFarmLocation?.trim() || null : null,
    expiresAt: link.expiresAt,
    fcr,
    mortalities,
    weights: weights.map((row) => ({ ...row, avgWeight: Number(row.avgWeight) })),
    feed: feed.map((row) => ({ ...row, quantityKg: row.quantityKg == null ? null : Number(row.quantityKg) })),
    medicines: medicineExpenses.map((row) => ({
      date: row.date,
      description: row.description,
      items: row.inventoryUsages.map((usage) => ({
        name: usage.item.name,
        quantity: Number(usage.quantity),
        unit: usage.item.unit,
      })),
    })),
    birdSales: birdSales.map((row) => ({ date: row.date, quantity: Number(row.quantity) })),
    eggs: eggRows.map((row) => ({ date: row.date, count: row.entries.reduce((sum, e) => sum + e.count, 0) })),
    notes,
  });
}
