import { randomBytes } from "crypto";
import { HatcheryBatchStatus, HatcheryBatchType, HatcheryIncubationStage } from "@prisma/client";
import prisma from "../utils/prisma";
import { nepalBatchDay, toNepalDayKey } from "../utils/nepalBsDate";

/**
 * Hatchery batch share links: a read-only health report of one parent batch
 * (and each of its incubations) that a hatchery can send to a vet. Same rules
 * as the farmer share (batchShareService.ts). It never contains money: every
 * query below selects counts, dates and names only — no amount, unitPrice,
 * rate, party, supplier, invoice or account fields.
 */

export const SHARE_LINK_DAYS = [1, 7, 30] as const;
const MAX_ACTIVE_LINKS_PER_BATCH = 10;
const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_DEATH_ROWS = 10;
const RECENT_FEED_DAYS = 14;
const NOTES_LIMIT = 20;
const FEED_CATEGORIES = ["FEED", "SELF_MADE"];
const MEDICINE_CATEGORY = "MEDICINE";
/** Incubation timeline (days from setting): candling, move to hatcher, hatch. */
const CANDLING_DAY = 9;
const HATCHER_DAY = 18;
const HATCH_DAY = 21;

export class HatcheryShareError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = "HatcheryShareError";
  }
}

// ==================== Links (owner side) ====================

/** The batch must belong to this hatchery and be a parent batch. */
export async function ensureBatchOwner(batchId: string, userId?: string) {
  const batch = await prisma.hatcheryBatch.findUnique({
    where: { id: batchId },
    select: { id: true, hatcheryOwnerId: true, type: true },
  });
  if (!batch) throw new HatcheryShareError("Batch not found", 404);
  if (!userId || batch.hatcheryOwnerId !== userId) {
    throw new HatcheryShareError("You do not have access to this batch", 403);
  }
  if (batch.type !== HatcheryBatchType.PARENT_FLOCK) {
    throw new HatcheryShareError("Only parent batches can be shared", 400);
  }
  return batch;
}

const newToken = () => randomBytes(24).toString("base64url");

const linkSelect = {
  id: true,
  token: true,
  expiresAt: true,
  revokedAt: true,
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
  showNotes?: unknown;
  now?: Date;
}) {
  const days = Number(input.expiresInDays);
  if (!SHARE_LINK_DAYS.includes(days as (typeof SHARE_LINK_DAYS)[number])) {
    throw new HatcheryShareError("Link time must be 1, 7 or 30 days");
  }
  await ensureBatchOwner(input.batchId, input.userId);

  const now = input.now ?? new Date();
  const activeCount = await prisma.hatcheryBatchShareLink.count({
    where: { hatcheryBatchId: input.batchId, revokedAt: null, expiresAt: { gt: now } },
  });
  if (activeCount >= MAX_ACTIVE_LINKS_PER_BATCH) {
    throw new HatcheryShareError(
      "This batch already has 10 open links. Turn one off first.",
      409,
    );
  }

  return prisma.hatcheryBatchShareLink.create({
    data: {
      token: newToken(),
      hatcheryBatchId: input.batchId,
      createdById: input.userId,
      createdByStaffId: input.staffUserId ?? null,
      expiresAt: new Date(now.getTime() + days * DAY_MS),
      showNotes: input.showNotes === true,
    },
    select: linkSelect,
  });
}

export async function listActiveShareLinks(batchId: string, userId: string, now = new Date()) {
  await ensureBatchOwner(batchId, userId);
  return prisma.hatcheryBatchShareLink.findMany({
    where: { hatcheryBatchId: batchId, revokedAt: null, expiresAt: { gt: now } },
    select: linkSelect,
    orderBy: { createdAt: "desc" },
  });
}

export async function revokeShareLink(batchId: string, linkId: string, userId: string) {
  await ensureBatchOwner(batchId, userId);
  const link = await prisma.hatcheryBatchShareLink.findFirst({
    where: { id: linkId, hatcheryBatchId: batchId },
    select: { id: true, revokedAt: true },
  });
  if (!link) throw new HatcheryShareError("Link not found", 404);
  if (link.revokedAt) return;
  await prisma.hatcheryBatchShareLink.update({
    where: { id: link.id },
    data: { revokedAt: new Date() },
  });
}

// ==================== Helpers ====================

const dayNumber = (dayKey: string) => Math.floor(Date.parse(`${dayKey}T00:00:00Z`) / DAY_MS);
const dayNum = (date: Date) => dayNumber(toNepalDayKey(date));
const dayKeyFromNumber = (n: number) => new Date(n * DAY_MS).toISOString().slice(0, 10);
const round = (value: number, places = 1) => {
  const f = 10 ** places;
  return Math.round(value * f) / f;
};
const pct = (part: number, whole: number) => (whole > 0 ? round((part / whole) * 100, 1) : null);
const num = (value: unknown) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};
const isKg = (unit: string | null) => (unit ?? "").trim().toLowerCase() === "kg";
const authorOf = (note: { createdByOwner: boolean }) => (note.createdByOwner ? "Owner" : "Staff");

/** Week of flock life: days 1-7 = week 1. */
const weekOf = (day: number) => Math.ceil(day / 7);

// ==================== Incubation numbers (same formulas as getIncubationBatch) ====================

export interface IncubationNumbersInput {
  eggsSetCount: number;
  /** Fertile numbers are only known after candling. */
  stage?: HatcheryIncubationStage;
  losses: Array<{ type: string; count: number }>;
  hatchResults: Array<{ hatchedA: number; hatchedB: number; cull: number; lateDead: number; unhatched: number }>;
}

export function incubationNumbers(input: IncubationNumbersInput) {
  const sumLoss = (type: string) =>
    input.losses.filter((l) => l.type === type).reduce((s, l) => s + l.count, 0);
  const infertile = sumLoss("INFERTILE");
  const earlyDead = sumLoss("EARLY_DEAD");
  const candlingLoss = infertile + earlyDead;
  const fertileEggs = input.eggsSetCount - candlingLoss;
  const sum = (key: "hatchedA" | "hatchedB" | "cull" | "lateDead" | "unhatched") =>
    input.hatchResults.reduce((s, r) => s + r[key], 0);
  const hatchedA = sum("hatchedA");
  const hatchedB = sum("hatchedB");
  const cull = sum("cull");
  const totalHatched = hatchedA + hatchedB + cull;
  const hasHatchResult = input.hatchResults.length > 0;
  const candled =
    input.losses.length > 0 || hasHatchResult || (!!input.stage && input.stage !== HatcheryIncubationStage.SETTER);
  return {
    eggsSet: input.eggsSetCount,
    infertile,
    earlyDead,
    candlingLoss,
    fertileEggs: candled ? fertileEggs : null,
    fertilePercent: candled ? pct(fertileEggs, input.eggsSetCount) : null,
    // Late dead / unhatched live on the hatch result rows (candling only
    // records INFERTILE and EARLY_DEAD losses).
    lateDead: sum("lateDead"),
    unhatched: sum("unhatched"),
    hatchedA,
    hatchedB,
    cull,
    totalHatched,
    // Same as the incubation page: chicks (A + B + cull) over fertile eggs / over all eggs set.
    hatchOfFertile: hasHatchResult ? pct(totalHatched, fertileEggs) : null,
    hatchOfSet: hasHatchResult ? pct(totalHatched, input.eggsSetCount) : null,
  };
}

// ==================== Batch report (pure) ====================

export interface BatchReportInput {
  now: Date;
  expiresAt: Date;
  hatcheryName: string | null;
  batch: {
    code: string;
    name: string | null;
    status: HatcheryBatchStatus;
    startDate: Date;
    endDate: Date | null;
    initialMaleParents: number | null;
    initialFemaleParents: number | null;
    initialParents: number | null;
    currentMaleParents: number | null;
    currentFemaleParents: number | null;
    currentParents: number | null;
    legacyNote: string | null;
  };
  mortalities: Array<{ date: Date; count: number; maleCount: number; femaleCount: number; note: string | null }>;
  parentSales: Array<{ date: Date; count: number; maleCount: number; femaleCount: number; totalWeightKg: number }>;
  eggProductions: Array<{ date: Date; lines: Array<{ count: number; eggTypeName: string; isHatchable: boolean }> }>;
  feed: Array<{
    date: Date;
    itemName: string;
    quantity: number | null;
    unit: string | null;
    feedTarget: string | null;
    maleFeedQuantity: number | null;
    femaleFeedQuantity: number | null;
  }>;
  medicines: Array<{ date: Date; itemName: string; quantity: number | null; unit: string | null; note: string | null }>;
  incubations: Array<
    IncubationNumbersInput & {
      id: string;
      code: string;
      name: string | null;
      stage: HatcheryIncubationStage;
      startDate: Date;
    }
  >;
  notes: Array<{ text: string; createdAt: Date; createdByOwner: boolean }> | null;
}

export function assembleBatchReport(input: BatchReportInput) {
  const { batch, now } = input;
  const closed = batch.status === HatcheryBatchStatus.CLOSED && !!batch.endDate;
  const lastDate = closed && batch.endDate ? batch.endDate : now;
  const firstDay = dayNum(batch.startDate);
  const lastDay = Math.max(firstDay, dayNum(lastDate));
  const ageDay = nepalBatchDay(batch.startDate, lastDate);
  const dayOf = (date: Date) => nepalBatchDay(batch.startDate, date);

  // ---- Birds
  const startedF = num(batch.initialFemaleParents);
  const startedM = num(batch.initialMaleParents);
  const started = num(batch.initialParents) || startedF + startedM;
  const deathsF = input.mortalities.reduce((s, r) => s + r.femaleCount, 0);
  const deathsM = input.mortalities.reduce((s, r) => s + r.maleCount, 0);
  const deathsTotal = input.mortalities.reduce((s, r) => s + r.count, 0);
  const soldF = input.parentSales.reduce((s, r) => s + r.femaleCount, 0);
  const soldM = input.parentSales.reduce((s, r) => s + r.maleCount, 0);
  const soldTotal = input.parentSales.reduce((s, r) => s + r.count, 0);
  const soldWeight = input.parentSales.reduce((s, r) => s + r.totalWeightKg, 0);
  const nowF = batch.currentFemaleParents ?? Math.max(0, startedF - deathsF - soldF);
  const nowM = batch.currentMaleParents ?? Math.max(0, startedM - deathsM - soldM);
  const nowTotal = batch.currentParents ?? nowF + nowM;

  // ---- Birds alive on each day (a bird that died or was sold on day D is gone ON day D)
  const removedF = new Map<number, number>();
  const removedM = new Map<number, number>();
  for (const r of [...input.mortalities, ...input.parentSales]) {
    const d = dayNum(r.date);
    removedF.set(d, (removedF.get(d) ?? 0) + r.femaleCount);
    removedM.set(d, (removedM.get(d) ?? 0) + r.maleCount);
  }
  const aliveF: number[] = [];
  const aliveM: number[] = [];
  {
    let f = startedF;
    let m = startedM;
    for (const [d, n] of removedF) if (d < firstDay) f -= n;
    for (const [d, n] of removedM) if (d < firstDay) m -= n;
    for (let d = firstDay; d <= lastDay; d++) {
      f -= removedF.get(d) ?? 0;
      m -= removedM.get(d) ?? 0;
      aliveF.push(Math.max(0, f));
      aliveM.push(Math.max(0, m));
    }
  }

  // ---- Deaths by week of flock life
  const weekCount = weekOf(lastDay - firstDay + 1);
  const weeks = Array.from({ length: weekCount }, (_, i) => ({
    week: i + 1,
    deathsF: 0,
    deathsM: 0,
    deaths: 0,
    eggs: 0,
    femaleDays: 0,
    birdDays: 0,
    feedKg: 0,
    hasEggs: false,
    hasFeed: false,
  }));
  const weekIndex = (d: number) => Math.min(weekCount, Math.max(1, weekOf(d - firstDay + 1))) - 1;
  for (const r of input.mortalities) {
    const w = weeks[weekIndex(dayNum(r.date))];
    w.deathsF += r.femaleCount;
    w.deathsM += r.maleCount;
    w.deaths += r.count;
  }
  for (let d = firstDay; d <= lastDay; d++) {
    const w = weeks[weekIndex(d)];
    w.femaleDays += aliveF[d - firstDay];
    w.birdDays += aliveF[d - firstDay] + aliveM[d - firstDay];
  }
  const recentDeaths = [...input.mortalities]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, RECENT_DEATH_ROWS)
    .map((r) => ({
      date: toNepalDayKey(r.date),
      day: dayOf(r.date),
      female: r.femaleCount,
      male: r.maleCount,
      total: r.count,
      note: r.note?.trim() || null,
    }));

  // ---- Eggs and lay % (eggs ÷ females alive each day, from the first egg day)
  const eggTypes = new Map<string, { name: string; isHatchable: boolean; count: number }>();
  let totalEggs = 0;
  let hatchableEggs = 0;
  let firstEggDay: number | null = null;
  let lastEggDay: number | null = null;
  for (const p of input.eggProductions) {
    const d = dayNum(p.date);
    const count = p.lines.reduce((s, l) => s + l.count, 0);
    if (count <= 0) continue;
    firstEggDay = firstEggDay === null ? d : Math.min(firstEggDay, d);
    lastEggDay = lastEggDay === null ? d : Math.max(lastEggDay, d);
    const w = weeks[weekIndex(d)];
    w.eggs += count;
    w.hasEggs = true;
    totalEggs += count;
    for (const l of p.lines) {
      const t = eggTypes.get(l.eggTypeName) ?? { name: l.eggTypeName, isHatchable: l.isHatchable, count: 0 };
      t.count += l.count;
      eggTypes.set(l.eggTypeName, t);
      if (l.isHatchable) hatchableEggs += l.count;
    }
  }
  let femaleDaysLaying = 0;
  const weekFemaleDaysLaying = new Map<number, number>();
  if (firstEggDay !== null) {
    const end = Math.max(lastDay, lastEggDay ?? lastDay);
    for (let d = firstEggDay; d <= Math.min(end, lastDay); d++) {
      const f = aliveF[d - firstDay] ?? 0;
      femaleDaysLaying += f;
      const wi = weekIndex(d);
      weekFemaleDaysLaying.set(wi, (weekFemaleDaysLaying.get(wi) ?? 0) + f);
    }
  }

  // ---- Feed (kg) — by sex, by week, and recent days
  const feedByUnit = new Map<string, { unit: string; female: number; male: number; notSplit: number; total: number }>();
  const recentFeedByDay = new Map<number, number>();
  let totalFeedKg = 0;
  for (const r of input.feed) {
    const qty = num(r.quantity);
    if (qty <= 0) continue;
    const unit = (r.unit ?? "").trim() || "units";
    const bucket = feedByUnit.get(unit) ?? { unit, female: 0, male: 0, notSplit: 0, total: 0 };
    bucket.total += qty;
    if (r.feedTarget === "FEMALE") bucket.female += qty;
    else if (r.feedTarget === "MALE") bucket.male += qty;
    else if (r.maleFeedQuantity !== null && r.femaleFeedQuantity !== null) {
      bucket.female += num(r.femaleFeedQuantity);
      bucket.male += num(r.maleFeedQuantity);
    } else bucket.notSplit += qty;
    feedByUnit.set(unit, bucket);
    if (isKg(r.unit)) {
      const d = dayNum(r.date);
      const w = weeks[weekIndex(d)];
      w.feedKg += qty;
      w.hasFeed = true;
      totalFeedKg += qty;
      if (d > lastDay - RECENT_FEED_DAYS) recentFeedByDay.set(d, (recentFeedByDay.get(d) ?? 0) + qty);
    }
  }
  const recentFeed = [...input.feed]
    .filter((r) => num(r.quantity) > 0 && dayNum(r.date) > lastDay - RECENT_FEED_DAYS)
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .map((r) => ({
      date: toNepalDayKey(r.date),
      day: dayOf(r.date),
      item: r.itemName,
      quantity: round(num(r.quantity), 2),
      unit: r.unit,
      forWhom:
        r.feedTarget === "FEMALE"
          ? "Female"
          : r.feedTarget === "MALE"
            ? "Male"
            : r.maleFeedQuantity !== null && r.femaleFeedQuantity !== null
              ? `Female ${round(num(r.femaleFeedQuantity), 1)} · Male ${round(num(r.maleFeedQuantity), 1)}`
              : "Both",
    }));

  // ---- Weekly series (empty weeks before any record are kept so the chart lines up with flock age)
  const weekly = weeks.map((w, i) => {
    const fdLaying = weekFemaleDaysLaying.get(i) ?? 0;
    return {
      week: w.week,
      deaths: w.deaths,
      deathsFemale: w.deathsF,
      deathsMale: w.deathsM,
      eggs: w.eggs,
      layPercent: w.hasEggs && fdLaying > 0 ? round((w.eggs / fdLaying) * 100, 1) : null,
      feedKg: round(w.feedKg, 1),
      gramsPerBirdPerDay: w.hasFeed && w.birdDays > 0 ? round((w.feedKg * 1000) / w.birdDays, 0) : null,
    };
  });

  // ---- Medicine (names and quantities only)
  const medicines = [...input.medicines]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .map((r) => ({
      date: toNepalDayKey(r.date),
      day: dayOf(r.date),
      item: r.itemName,
      quantity: r.quantity === null ? null : round(num(r.quantity), 2),
      unit: r.unit,
      note: r.note?.trim() || null,
    }));

  // ---- Hatching (each incubation of this batch)
  const hatching = [...input.incubations]
    .sort((a, b) => b.startDate.getTime() - a.startDate.getTime())
    .map((inc) => ({
      id: inc.id,
      code: inc.code,
      name: inc.name,
      stage: inc.stage,
      setDate: toNepalDayKey(inc.startDate),
      ...incubationNumbers(inc),
    }));
  // Flock totals only count incubations that have hatched, so eggs still in
  // the machine don't pull the hatch % down.
  const finished = input.incubations.filter((i) => i.hatchResults.length > 0);
  const running = input.incubations.filter((i) => i.hatchResults.length === 0);
  const finishedTotals = incubationNumbers({
    eggsSetCount: finished.reduce((s, i) => s + i.eggsSetCount, 0),
    losses: finished.flatMap((i) => i.losses),
    hatchResults: finished.flatMap((i) => i.hatchResults),
  });

  return {
    generatedAt: now.toISOString(),
    expiresAt: input.expiresAt.toISOString(),
    batch: {
      code: batch.code,
      name: batch.name,
      status: batch.status,
      startDate: toNepalDayKey(batch.startDate),
      endDate: batch.endDate ? toNepalDayKey(batch.endDate) : null,
      hatcheryName: input.hatcheryName,
      ageDay,
      ageWeek: weekOf(ageDay),
    },
    birds: {
      started: { female: startedF, male: startedM, total: started },
      now: { female: nowF, male: nowM, total: nowTotal },
      malesPer100Females: nowF > 0 ? round((nowM / nowF) * 100, 1) : null,
      deaths: {
        female: deathsF,
        male: deathsM,
        notSplit: Math.max(0, deathsTotal - deathsF - deathsM),
        total: deathsTotal,
        percent: pct(deathsTotal, started),
        femalePercent: pct(deathsF, startedF),
        malePercent: pct(deathsM, startedM),
      },
      sold: {
        female: soldF,
        male: soldM,
        total: soldTotal,
        avgWeightKg: soldTotal > 0 && soldWeight > 0 ? round(soldWeight / soldTotal, 2) : null,
      },
    },
    deaths: { recent: recentDeaths },
    eggs: {
      total: totalEggs,
      hatchable: hatchableEggs,
      hatchablePercent: pct(hatchableEggs, totalEggs),
      layPercent: femaleDaysLaying > 0 && totalEggs > 0 ? round((totalEggs / femaleDaysLaying) * 100, 1) : null,
      firstEggDate: firstEggDay === null ? null : dayKeyFromNumber(firstEggDay),
      byType: [...eggTypes.values()].sort((a, b) => b.count - a.count),
    },
    feed: {
      byUnit: [...feedByUnit.values()].map((b) => ({
        unit: b.unit,
        female: round(b.female, 1),
        male: round(b.male, 1),
        notSplit: round(b.notSplit, 1),
        total: round(b.total, 1),
      })),
      totalKg: round(totalFeedKg, 1),
      recent: recentFeed,
    },
    weekly,
    medicines,
    hatching: {
      incubations: hatching,
      totals: {
        ...finishedTotals,
        finishedCount: finished.length,
        runningCount: running.length,
        runningEggs: running.reduce((s, i) => s + i.eggsSetCount, 0),
      },
    },
    notes: input.notes
      ? {
          legacy: batch.legacyNote?.trim() || null,
          items: input.notes.map((n) => ({
            text: n.text,
            date: toNepalDayKey(n.createdAt),
            author: authorOf(n),
          })),
        }
      : null,
  };
}

// ==================== Incubation report (pure) ====================

export interface IncubationReportInput extends IncubationNumbersInput {
  now: Date;
  expiresAt: Date;
  batchCode: string;
  incubation: {
    id: string;
    code: string;
    name: string | null;
    stage: HatcheryIncubationStage;
    startDate: Date;
    candledAt: Date | null;
    transferredAt: Date | null;
    hatchedAt: Date | null;
    legacyNote: string | null;
  };
  eggMoves: Array<{ date: Date; count: number; eggTypeName: string }>;
  lossRows: Array<{ date: Date; type: string; count: number; note: string | null }>;
  hatchRows: Array<{
    date: Date;
    hatchedA: number;
    hatchedB: number;
    cull: number;
    lateDead: number;
    unhatched: number;
    note: string | null;
  }>;
  chickStocks: Array<{ grade: string; currentStock: number }>;
  chickSales: Array<{ grade: string; count: number }>;
  notes: Array<{ text: string; createdAt: Date; createdByOwner: boolean }> | null;
}

export function assembleIncubationReport(input: IncubationReportInput) {
  const { incubation, now } = input;
  const today = dayNum(now);
  const setDay = dayNum(incubation.startDate);
  const done = incubation.stage === HatcheryIncubationStage.COMPLETED;
  const currentDay = done ? null : Math.max(1, today - setDay + 1);

  const step = (label: string, dueDay: number, doneAt: Date | null, isDone: boolean) => {
    const dueDate = dayKeyFromNumber(setDay + dueDay - 1);
    let status: "done" | "late" | "due";
    if (isDone) status = "done";
    else status = today > setDay + dueDay - 1 ? "late" : "due";
    return {
      label,
      dueDay,
      dueDate,
      doneDate: doneAt ? toNepalDayKey(doneAt) : null,
      status,
    };
  };
  const stageRank: Record<HatcheryIncubationStage, number> = {
    SETTER: 0,
    CANDLING: 1,
    HATCHER: 2,
    COMPLETED: 3,
  };
  const rank = stageRank[incubation.stage];

  const sumBy = <T extends { count: number }>(rows: T[], key: (r: T) => string) => {
    const map = new Map<string, number>();
    for (const r of rows) map.set(key(r), (map.get(key(r)) ?? 0) + r.count);
    return [...map.entries()].map(([name, count]) => ({ name, count }));
  };

  const numbers = incubationNumbers({ ...input, stage: incubation.stage });
  return {
    generatedAt: now.toISOString(),
    expiresAt: input.expiresAt.toISOString(),
    batchCode: input.batchCode,
    incubation: {
      id: incubation.id,
      code: incubation.code,
      name: incubation.name,
      stage: incubation.stage,
      setDate: toNepalDayKey(incubation.startDate),
      currentDay,
      totalDays: HATCH_DAY,
    },
    timeline: [
      step("Candling", CANDLING_DAY, incubation.candledAt, rank >= 1 || !!incubation.candledAt),
      step("Move to hatcher", HATCHER_DAY, incubation.transferredAt, rank >= 2 || !!incubation.transferredAt),
      step("Hatch", HATCH_DAY, incubation.hatchedAt, rank >= 3 || !!incubation.hatchedAt),
    ],
    eggsByType: sumBy(input.eggMoves, (m) => m.eggTypeName),
    numbers: {
      ...numbers,
      gradeAPercent: pct(numbers.hatchedA, numbers.totalHatched),
      gradeBPercent: pct(numbers.hatchedB, numbers.totalHatched),
      cullPercent: pct(numbers.cull, numbers.totalHatched),
    },
    losses: [...input.lossRows]
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((l) => ({ date: toNepalDayKey(l.date), type: l.type, count: l.count, note: l.note?.trim() || null })),
    hatchResults: [...input.hatchRows]
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((r) => ({
        date: toNepalDayKey(r.date),
        hatchedA: r.hatchedA,
        hatchedB: r.hatchedB,
        cull: r.cull,
        lateDead: r.lateDead,
        unhatched: r.unhatched,
        note: r.note?.trim() || null,
      })),
    chicksLeft: input.chickStocks
      .filter((s) => s.currentStock > 0)
      .map((s) => ({ grade: s.grade, count: s.currentStock })),
    chicksSentOut: sumBy(input.chickSales, (s) => s.grade).map((g) => ({ grade: g.name, count: g.count })),
    notes: input.notes
      ? {
          legacy: incubation.legacyNote?.trim() || null,
          items: input.notes.map((n) => ({
            text: n.text,
            date: toNepalDayKey(n.createdAt),
            author: authorOf(n),
          })),
        }
      : null,
  };
}

// ==================== Public (no login) ====================

/** A link that is on and not expired, or null. */
async function findLiveLink(token: string, now: Date) {
  if (!token || token.length > 64) return null;
  const link = await prisma.hatcheryBatchShareLink.findUnique({
    where: { token },
    select: { id: true, hatcheryBatchId: true, expiresAt: true, revokedAt: true, showNotes: true },
  });
  if (!link || link.revokedAt || link.expiresAt <= now) return null;
  return link;
}

const noteSelect = { text: true, createdAt: true, createdByOwner: true } as const;

export async function getPublicBatchReport(token: string, now = new Date()) {
  const link = await findLiveLink(token, now);
  if (!link) return null;
  const batchId = link.hatcheryBatchId;

  const batch = await prisma.hatcheryBatch.findUnique({
    where: { id: batchId },
    select: {
      type: true,
      code: true,
      name: true,
      status: true,
      startDate: true,
      endDate: true,
      notes: true,
      initialParents: true,
      initialMaleParents: true,
      initialFemaleParents: true,
      currentParents: true,
      currentMaleParents: true,
      currentFemaleParents: true,
      hatcheryOwner: { select: { companyName: true } },
    },
  });
  if (!batch || batch.type !== HatcheryBatchType.PARENT_FLOCK) return null;

  const [mortalities, parentSales, eggProductions, feed, medicines, incubations, notes] = await Promise.all([
    prisma.hatcheryBatchMortality.findMany({
      where: { batchId },
      select: { date: true, count: true, maleCount: true, femaleCount: true, note: true },
    }),
    prisma.hatcheryParentSale.findMany({
      where: { batchId },
      select: { date: true, count: true, maleCount: true, femaleCount: true, totalWeightKg: true },
    }),
    prisma.hatcheryEggProduction.findMany({
      where: { batchId },
      select: {
        date: true,
        lines: { select: { count: true, eggType: { select: { name: true, isHatchable: true } } } },
      },
    }),
    prisma.hatcheryBatchExpense.findMany({
      where: { batchId, category: { in: FEED_CATEGORIES } },
      select: {
        date: true,
        itemName: true,
        quantity: true,
        unit: true,
        feedTarget: true,
        maleFeedQuantity: true,
        femaleFeedQuantity: true,
      },
    }),
    prisma.hatcheryBatchExpense.findMany({
      where: { batchId, category: MEDICINE_CATEGORY },
      select: { date: true, itemName: true, quantity: true, unit: true, note: true },
    }),
    prisma.hatcheryIncubationBatch.findMany({
      where: { parentBatchId: batchId },
      select: {
        id: true,
        code: true,
        name: true,
        stage: true,
        startDate: true,
        eggsSetCount: true,
        losses: { select: { type: true, count: true } },
        hatchResults: {
          select: { hatchedA: true, hatchedB: true, cull: true, lateDead: true, unhatched: true },
        },
      },
    }),
    link.showNotes
      ? prisma.hatcheryNote.findMany({
          where: { hatcheryBatchId: batchId },
          select: noteSelect,
          orderBy: { createdAt: "desc" },
          take: NOTES_LIMIT,
        })
      : Promise.resolve(null),
  ]);

  // Count the view without slowing the page down.
  prisma.hatcheryBatchShareLink
    .update({ where: { id: link.id }, data: { viewCount: { increment: 1 }, lastViewedAt: now } })
    .catch(() => {});

  return assembleBatchReport({
    now,
    expiresAt: link.expiresAt,
    hatcheryName: batch.hatcheryOwner?.companyName ?? null,
    batch: { ...batch, legacyNote: link.showNotes ? batch.notes : null },
    mortalities,
    parentSales: parentSales.map((s) => ({ ...s, totalWeightKg: num(s.totalWeightKg) })),
    eggProductions: eggProductions.map((p) => ({
      date: p.date,
      lines: p.lines.map((l) => ({ count: l.count, eggTypeName: l.eggType.name, isHatchable: l.eggType.isHatchable })),
    })),
    feed: feed.map((f) => ({
      ...f,
      quantity: f.quantity === null ? null : num(f.quantity),
      maleFeedQuantity: f.maleFeedQuantity === null ? null : num(f.maleFeedQuantity),
      femaleFeedQuantity: f.femaleFeedQuantity === null ? null : num(f.femaleFeedQuantity),
    })),
    medicines: medicines.map((m) => ({ ...m, quantity: m.quantity === null ? null : num(m.quantity) })),
    incubations,
    notes,
  });
}

export async function getPublicIncubationReport(token: string, incubationId: string, now = new Date()) {
  const link = await findLiveLink(token, now);
  if (!link || !incubationId || incubationId.length > 64) return null;

  const incubation = await prisma.hatcheryIncubationBatch.findUnique({
    where: { id: incubationId },
    select: {
      id: true,
      code: true,
      name: true,
      stage: true,
      startDate: true,
      candledAt: true,
      transferredAt: true,
      hatchedAt: true,
      eggsSetCount: true,
      notes: true,
      parentBatchId: true,
      parentBatch: { select: { code: true } },
    },
  });
  // Only incubations of the shared batch. Anything else looks like "not found".
  if (!incubation || incubation.parentBatchId !== link.hatcheryBatchId) return null;

  const [eggMoves, losses, hatchResults, chickStocks, chickSales, notes] = await Promise.all([
    prisma.hatcheryEggMove.findMany({
      where: { incubationBatchId: incubationId },
      select: { date: true, count: true, eggType: { select: { name: true } } },
    }),
    prisma.hatcheryIncubationLoss.findMany({
      where: { incubationBatchId: incubationId },
      select: { date: true, type: true, count: true, note: true },
    }),
    prisma.hatcheryHatchResult.findMany({
      where: { incubationBatchId: incubationId },
      select: { date: true, hatchedA: true, hatchedB: true, cull: true, lateDead: true, unhatched: true, note: true },
    }),
    prisma.hatcheryChickStock.findMany({
      where: { incubationBatchId: incubationId },
      select: { grade: true, currentStock: true },
    }),
    prisma.hatcheryChickSale.findMany({
      where: { incubationBatchId: incubationId },
      select: { grade: true, count: true },
    }),
    link.showNotes
      ? prisma.hatcheryNote.findMany({
          where: { incubationId },
          select: noteSelect,
          orderBy: { createdAt: "desc" },
          take: NOTES_LIMIT,
        })
      : Promise.resolve(null),
  ]);

  return assembleIncubationReport({
    now,
    expiresAt: link.expiresAt,
    batchCode: incubation.parentBatch.code,
    incubation: { ...incubation, legacyNote: link.showNotes ? incubation.notes : null },
    eggsSetCount: incubation.eggsSetCount,
    losses,
    hatchResults,
    eggMoves: eggMoves.map((m) => ({ date: m.date, count: m.count, eggTypeName: m.eggType.name })),
    lossRows: losses,
    hatchRows: hatchResults,
    chickStocks,
    chickSales,
    notes,
  });
}
