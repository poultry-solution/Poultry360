import {
  BatchStatus,
  BatchType,
  SalesItemType,
  WeightSource,
} from "@prisma/client";
import { fcrFreshDays } from "../config/fcr";
import prisma from "../utils/prisma";

const LEGACY_INITIAL_CHICK_WEIGHT_KG = 0.05;
const NEPAL_OFFSET_MINUTES = 5 * 60 + 45;
const DAY_MS = 24 * 60 * 60 * 1000;

export type FcrStatus =
  | "CALCULATED"
  | "NOT_APPLICABLE"
  | "MISSING_END_DATE"
  | "INVALID_INITIAL_WEIGHT"
  | "NO_FEED"
  | "NO_MANUAL_WEIGHT"
  | "INVALID_WEIGHT_DATA"
  | "UNKNOWN_FEED_UNIT"
  | "MISSING_SALE_WEIGHT"
  | "CLOSURE_CONFIRMATION_REQUIRED"
  | "CLOSURE_COUNT_MISMATCH"
  | "INVALID_BIRD_COUNTS"
  | "INVALID_FEED_DATA"
  | "NON_POSITIVE_WEIGHT_GAIN";

export type FcrFreshnessStatus = "FRESH" | "STALE" | "FINAL" | "NOT_AVAILABLE";
export type FcrDisplayStatus =
  | "FRESH"
  | "STALE"
  | "WEIGHT_REQUIRED"
  | "FINAL"
  | "NOT_CALCULABLE";
export type FcrBasis = "LIVE" | "FINAL" | "FINAL_PENDING_CLOSE";
export type FcrStaleReason =
  | "WEIGHT_TOO_OLD"
  | "NEWER_FEED_NOT_INCLUDED"
  | "NEWER_SALE_NOT_INCLUDED"
  | "NEWER_MORTALITY_NOT_INCLUDED";

export interface FarmerFcrResult {
  fcr: number | null;
  currentFcr: number | null;
  status: FcrStatus;
  displayStatus: FcrDisplayStatus;
  message: string;
  basis: FcrBasis;
  asOfDate: Date | null;
  weightSourceDate: Date | null;
  feedKg: number;
  initialBiomassKg: number;
  initialChickWeightKg: number;
  initialWeightEstimated: boolean;
  soldBirds: number;
  soldLiveWeightKg: number;
  deaths: number;
  closureDeaths: number;
  remainingBirds: number;
  remainingAverageWeightKg: number | null;
  remainingWeightSampleCount: number | null;
  remainingLiveWeightKg: number;
  producedLiveWeightKg: number;
  weightGainKg: number;
  freshnessStatus: FcrFreshnessStatus;
  freshnessWindowDays: number;
  weightAgeDays: number | null;
  feedAgeDays: number | null;
  staleReasons: FcrStaleReason[];
  newerFeedCount: number;
  newerSaleCount: number;
  newerMortalityCount: number;
  currentSoldBirds: number;
  currentDeaths: number;
  currentBirds: number;
}

export interface FarmerFcrHistoryRow {
  id: string;
  calculationDate: string;
  fcr: number;
  basis: FcrBasis;
  displayStatus: "FRESH" | "STALE" | "FINAL";
  feedKg: number;
  initialBiomassKg: number;
  initialChickWeightKg: number;
  soldBirds: number;
  soldLiveWeightKg: number;
  naturalDeaths: number;
  closureDeaths: number;
  remainingBirds: number;
  remainingAverageWeightKg: number | null;
  remainingWeightSampleCount: number | null;
  remainingLiveWeightKg: number;
  producedLiveWeightKg: number;
  weightGainKg: number;
  isFinal: boolean;
}

type SaleRow = { id: string; date: Date; quantity: unknown; weight: unknown };
type MortalityRow = {
  id: string;
  date: Date;
  count: number;
  reason: string | null;
  saleId: string | null;
};
type FeedRow = { id: string; date: Date; quantityKg: unknown };
type ManualWeightRow = {
  id: string;
  date: Date;
  avgWeight: unknown;
  sampleCount: number;
  createdAt: Date;
};
type FcrInputs = {
  batch: {
    id: string;
    batchType: BatchType;
    status: BatchStatus;
    startDate: Date;
    endDate: Date | null;
    initialChicks: number;
    initialChickWeightKg: unknown;
    closureBirdCount: number | null;
  };
  initialChickWeightKg: number;
  initialWeightEstimated: boolean;
  sales: SaleRow[];
  deathRows: MortalityRow[];
  feedRows: FeedRow[];
  manualWeights: ManualWeightRow[];
};

function nepalDateParts(date: Date): { year: number; month: number; day: number } {
  const shifted = new Date(date.getTime() + NEPAL_OFFSET_MINUTES * 60 * 1000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function nepalDateString(date: Date): string {
  const { year, month, day } = nepalDateParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function startOfNepalDay(date: Date): Date {
  const { year, month, day } = nepalDateParts(date);
  return new Date(Date.UTC(year, month - 1, day, 0, -NEPAL_OFFSET_MINUTES));
}

export function endOfNepalDay(date: Date): Date {
  return new Date(startOfNepalDay(date).getTime() + DAY_MS - 1);
}

function nepalDayNumber(date: Date): number {
  const { year, month, day } = nepalDateParts(date);
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
}

function ageInNepalDays(date: Date, now: Date): number {
  return Math.max(0, nepalDayNumber(now) - nepalDayNumber(date));
}

function sameNepalDay(left: Date | null, right: Date): boolean {
  return left != null && nepalDayNumber(left) === nepalDayNumber(right);
}

function maxDate(dates: Date[]): Date | null {
  if (dates.length === 0) return null;
  return dates.reduce((latest, date) =>
    date.getTime() > latest.getTime() ? date : latest,
  );
}

function statusMessage(status: FcrStatus): string {
  switch (status) {
    case "CALCULATED": return "FCR calculated successfully";
    case "NOT_APPLICABLE": return "FCR is only available for Broiler batches";
    case "MISSING_END_DATE": return "Set the batch end date to calculate final FCR";
    case "INVALID_INITIAL_WEIGHT": return "The initial chick weight is not valid";
    case "NO_FEED": return "Record feed use to calculate FCR";
    case "NO_MANUAL_WEIGHT": return "Record an average live weight to calculate current FCR";
    case "INVALID_WEIGHT_DATA": return "The latest live-weight record is not valid";
    case "UNKNOWN_FEED_UNIT": return "Set the feed weight in kilograms to calculate FCR";
    case "MISSING_SALE_WEIGHT": return "A Broiler sale is missing its total weight";
    case "CLOSURE_CONFIRMATION_REQUIRED": return "Confirm that birds remaining at closure are dead";
    case "CLOSURE_COUNT_MISMATCH": return "The saved closure bird count does not match the batch records";
    case "INVALID_BIRD_COUNTS": return "Sold birds and deaths are greater than the initial bird count";
    case "INVALID_FEED_DATA": return "A feed record has an invalid kilogram value";
    case "NON_POSITIVE_WEIGHT_GAIN": return "Produced weight must be greater than the initial bird weight";
  }
}

function displayStatusFor(status: FcrStatus, freshness: FcrFreshnessStatus): FcrDisplayStatus {
  if (freshness === "FINAL") return "FINAL";
  if (status === "CALCULATED" && freshness === "FRESH") return "FRESH";
  if (status === "CALCULATED" && freshness === "STALE") return "STALE";
  if (status === "NO_MANUAL_WEIGHT") return "WEIGHT_REQUIRED";
  return "NOT_CALCULABLE";
}

function emptyResult(
  status: FcrStatus,
  inputs: Pick<FcrInputs, "initialChickWeightKg" | "initialWeightEstimated">,
  initialChicks: number,
  basis: FcrBasis = "LIVE",
): FarmerFcrResult {
  return {
    fcr: null,
    currentFcr: null,
    status,
    displayStatus: displayStatusFor(status, "NOT_AVAILABLE"),
    message: statusMessage(status),
    basis,
    asOfDate: null,
    weightSourceDate: null,
    feedKg: 0,
    initialBiomassKg: initialChicks * inputs.initialChickWeightKg,
    initialChickWeightKg: inputs.initialChickWeightKg,
    initialWeightEstimated: inputs.initialWeightEstimated,
    soldBirds: 0,
    soldLiveWeightKg: 0,
    deaths: 0,
    closureDeaths: 0,
    remainingBirds: initialChicks,
    remainingAverageWeightKg: null,
    remainingWeightSampleCount: null,
    remainingLiveWeightKg: 0,
    producedLiveWeightKg: 0,
    weightGainKg: 0,
    freshnessStatus: "NOT_AVAILABLE",
    freshnessWindowDays: fcrFreshDays,
    weightAgeDays: null,
    feedAgeDays: null,
    staleReasons: [],
    newerFeedCount: 0,
    newerSaleCount: 0,
    newerMortalityCount: 0,
    currentSoldBirds: 0,
    currentDeaths: 0,
    currentBirds: initialChicks,
  };
}

function setCurrentPopulation(result: FarmerFcrResult, inputs: FcrInputs): FarmerFcrResult {
  const sold = inputs.sales.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
  const naturalDeaths = inputs.deathRows.reduce((sum, row) => sum + row.count, 0);
  const rawRemaining = inputs.batch.initialChicks - sold - naturalDeaths;
  const closureDeaths =
    inputs.batch.status === BatchStatus.COMPLETED
      ? Number(inputs.batch.closureBirdCount || 0)
      : 0;
  result.currentSoldBirds = Math.max(0, sold);
  result.currentDeaths = Math.max(0, naturalDeaths + closureDeaths);
  result.currentBirds =
    inputs.batch.status === BatchStatus.COMPLETED ? 0 : Math.max(0, rawRemaining);
  return result;
}

async function loadFcrInputs(batchId: string, now: Date): Promise<FcrInputs | null> {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    select: {
      id: true,
      batchType: true,
      status: true,
      startDate: true,
      endDate: true,
      initialChicks: true,
      initialChickWeightKg: true,
      closureBirdCount: true,
    },
  });
  if (!batch) return null;

  const rangeStart = startOfNepalDay(batch.startDate);
  const rangeEnd =
    batch.status === BatchStatus.COMPLETED && batch.endDate
      ? endOfNepalDay(batch.endDate)
      : endOfNepalDay(now);
  const [sales, mortalities, feedRows, manualWeights] = await Promise.all([
    prisma.sale.findMany({
      where: { batchId, itemType: SalesItemType.Chicken_Meat, date: { gte: rangeStart, lte: rangeEnd } },
      select: { id: true, date: true, quantity: true, weight: true },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    }),
    prisma.mortality.findMany({
      where: { batchId, date: { gte: rangeStart, lte: rangeEnd } },
      select: { id: true, date: true, count: true, reason: true, saleId: true },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    }),
    prisma.feedConsumption.findMany({
      where: { batchId, date: { gte: rangeStart, lte: rangeEnd } },
      select: { id: true, date: true, quantityKg: true },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    }),
    prisma.birdWeight.findMany({
      where: { batchId, source: WeightSource.MANUAL, date: { gte: rangeStart, lte: rangeEnd } },
      select: { id: true, date: true, avgWeight: true, sampleCount: true, createdAt: true },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    }),
  ]);

  return {
    batch,
    initialWeightEstimated: batch.initialChickWeightKg == null,
    initialChickWeightKg:
      batch.initialChickWeightKg == null
        ? LEGACY_INITIAL_CHICK_WEIGHT_KG
        : Number(batch.initialChickWeightKg),
    sales,
    deathRows: mortalities.filter(
      (row) => !row.saleId && row.reason !== "SLAUGHTERED_FOR_SALE" && row.reason !== "BATCH_CLOSURE",
    ),
    feedRows,
    manualWeights,
  };
}

function calculatePoint(
  inputs: FcrInputs,
  context: {
    basis: FcrBasis;
    asOfDate: Date;
    weightDate?: Date;
    averageWeightKg: number | null;
    sampleCount: number | null;
    closureDeaths?: number;
  },
  now: Date,
): FarmerFcrResult {
  const { batch } = inputs;
  const asOfEnd = endOfNepalDay(context.asOfDate);
  const includedSales = inputs.sales.filter((row) => row.date <= asOfEnd);
  const includedDeaths = inputs.deathRows.filter((row) => row.date <= asOfEnd);
  const includedFeed = inputs.feedRows.filter((row) => row.date <= asOfEnd);
  const soldBirds = includedSales.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
  const naturalDeaths = includedDeaths.reduce((sum, row) => sum + row.count, 0);
  const closureDeaths = Number(context.closureDeaths || 0);
  const rawRemaining = batch.initialChicks - soldBirds - naturalDeaths;
  const remainingBirds = context.basis === "FINAL" ? 0 : rawRemaining;
  const weightDateEnd = endOfNepalDay(context.weightDate || context.asOfDate);
  const birdsAtWeightDate = batch.initialChicks
    - inputs.sales
      .filter((row) => row.date <= weightDateEnd)
      .reduce((sum, row) => sum + Number(row.quantity || 0), 0)
    - inputs.deathRows
      .filter((row) => row.date <= weightDateEnd)
      .reduce((sum, row) => sum + row.count, 0);

  const fail = (status: FcrStatus): FarmerFcrResult => {
    const result = emptyResult(status, inputs, batch.initialChicks, context.basis);
    result.asOfDate = context.asOfDate;
    result.weightSourceDate = context.basis === "LIVE"
      ? context.weightDate || context.asOfDate
      : null;
    result.soldBirds = Math.max(0, soldBirds);
    result.soldLiveWeightKg = includedSales.reduce((sum, row) => sum + Number(row.weight || 0), 0);
    result.deaths = Math.max(0, naturalDeaths);
    result.closureDeaths = Math.max(0, closureDeaths);
    result.remainingBirds = Math.max(0, remainingBirds);
    result.remainingAverageWeightKg = context.averageWeightKg;
    result.remainingWeightSampleCount = context.sampleCount;
    return setCurrentPopulation(result, inputs);
  };

  if (!Number.isFinite(inputs.initialChickWeightKg) || inputs.initialChickWeightKg <= 0) {
    return fail("INVALID_INITIAL_WEIGHT");
  }
  if (
    includedSales.some((row) => {
      const quantity = Number(row.quantity);
      return !Number.isInteger(quantity) || quantity <= 0;
    }) || includedDeaths.some((row) => row.count <= 0)
  ) return fail("INVALID_BIRD_COUNTS");
  if (rawRemaining < 0 || closureDeaths < 0 || closureDeaths > rawRemaining) {
    return fail("INVALID_BIRD_COUNTS");
  }
  if (includedSales.some((row) => row.weight == null || Number(row.weight) <= 0)) {
    return fail("MISSING_SALE_WEIGHT");
  }
  if (
    context.basis === "LIVE" &&
    (context.averageWeightKg == null || !Number.isFinite(context.averageWeightKg) ||
      context.averageWeightKg <= 0 || context.sampleCount == null ||
      !Number.isInteger(context.sampleCount) || context.sampleCount <= 0 ||
      context.sampleCount > birdsAtWeightDate)
  ) return fail("INVALID_WEIGHT_DATA");
  if (includedFeed.length === 0) return fail("NO_FEED");
  if (includedFeed.some((row) => row.quantityKg == null)) return fail("UNKNOWN_FEED_UNIT");
  if (includedFeed.some((row) => !Number.isFinite(Number(row.quantityKg)) || Number(row.quantityKg) <= 0)) {
    return fail("INVALID_FEED_DATA");
  }

  const feedKg = includedFeed.reduce((sum, row) => sum + Number(row.quantityKg), 0);
  const soldLiveWeightKg = includedSales.reduce((sum, row) => sum + Number(row.weight), 0);
  const averageWeightKg = context.averageWeightKg || 0;
  const weightBiomassAtWeightDate = birdsAtWeightDate * averageWeightKg;
  const soldWeightSinceWeightDate = includedSales
    .filter((row) => row.date > weightDateEnd)
    .reduce((sum, row) => sum + Number(row.weight), 0);
  const deathsSinceWeightDate = includedDeaths
    .filter((row) => row.date > weightDateEnd)
    .reduce((sum, row) => sum + row.count, 0);
  // Keep measured sale weight in the output. For sales after the weigh-in,
  // remove that measured weight from the weigh-in biomass instead of applying
  // the old average to all remaining birds. Natural deaths have no output
  // weight, so remove their estimated share using the same recorded average.
  const remainingLiveWeightKg = context.basis === "LIVE"
    ? Math.max(
      0,
      weightBiomassAtWeightDate -
        soldWeightSinceWeightDate -
        deathsSinceWeightDate * averageWeightKg,
    )
    : 0;
  const producedLiveWeightKg = soldLiveWeightKg + remainingLiveWeightKg;
  const initialBiomassKg = batch.initialChicks * inputs.initialChickWeightKg;
  const weightGainKg = producedLiveWeightKg - initialBiomassKg;
  if (weightGainKg <= 0) {
    const result = fail("NON_POSITIVE_WEIGHT_GAIN");
    result.feedKg = feedKg;
    result.remainingLiveWeightKg = remainingLiveWeightKg;
    result.producedLiveWeightKg = producedLiveWeightKg;
    result.weightGainKg = weightGainKg;
    return result;
  }

  const latestFeedDate = maxDate(includedFeed.map((row) => row.date));
  const newerFeedCount = inputs.feedRows.filter((row) => row.date > asOfEnd).length;
  const newerSaleCount = inputs.sales.filter((row) => row.date > asOfEnd).length;
  const newerMortalityCount = inputs.deathRows.filter((row) => row.date > asOfEnd).length;
  const weightAgeDays = context.basis === "LIVE"
    ? ageInNepalDays(context.weightDate || context.asOfDate, now)
    : null;
  const feedAgeDays = latestFeedDate ? ageInNepalDays(latestFeedDate, now) : null;
  const staleReasons: FcrStaleReason[] = [];
  if (context.basis === "LIVE") {
    if ((weightAgeDays ?? 0) > fcrFreshDays) staleReasons.push("WEIGHT_TOO_OLD");
    if (newerFeedCount > 0) staleReasons.push("NEWER_FEED_NOT_INCLUDED");
    if (newerSaleCount > 0) staleReasons.push("NEWER_SALE_NOT_INCLUDED");
    if (newerMortalityCount > 0) staleReasons.push("NEWER_MORTALITY_NOT_INCLUDED");
  }
  const freshnessStatus: FcrFreshnessStatus =
    context.basis === "LIVE"
      ? staleReasons.length > 0 ? "STALE" : "FRESH"
      : "FINAL";
  const fcr = feedKg / weightGainKg;

  return setCurrentPopulation({
    fcr,
    currentFcr: freshnessStatus === "STALE" ? null : fcr,
    status: "CALCULATED",
    displayStatus: displayStatusFor("CALCULATED", freshnessStatus),
    message: statusMessage("CALCULATED"),
    basis: context.basis,
    asOfDate: context.asOfDate,
    weightSourceDate: context.basis === "LIVE"
      ? context.weightDate || context.asOfDate
      : null,
    feedKg,
    initialBiomassKg,
    initialChickWeightKg: inputs.initialChickWeightKg,
    initialWeightEstimated: inputs.initialWeightEstimated,
    soldBirds,
    soldLiveWeightKg,
    deaths: naturalDeaths,
    closureDeaths,
    remainingBirds,
    remainingAverageWeightKg: context.averageWeightKg,
    remainingWeightSampleCount: context.sampleCount,
    remainingLiveWeightKg,
    producedLiveWeightKg,
    weightGainKg,
    freshnessStatus,
    freshnessWindowDays: fcrFreshDays,
    weightAgeDays,
    feedAgeDays,
    staleReasons,
    newerFeedCount,
    newerSaleCount,
    newerMortalityCount,
    currentSoldBirds: 0,
    currentDeaths: 0,
    currentBirds: 0,
  }, inputs);
}

function invalidBatchResult(inputs: FcrInputs, status: FcrStatus, basis: FcrBasis = "LIVE") {
  return setCurrentPopulation(emptyResult(status, inputs, inputs.batch.initialChicks, basis), inputs);
}

function calculateCurrentFromInputs(inputs: FcrInputs, now: Date): FarmerFcrResult {
  const { batch } = inputs;
  if (batch.batchType !== BatchType.BROILER) return invalidBatchResult(inputs, "NOT_APPLICABLE");
  if (batch.status === BatchStatus.COMPLETED && !batch.endDate) {
    return invalidBatchResult(inputs, "MISSING_END_DATE", "FINAL");
  }

  const totalSold = inputs.sales.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
  const naturalDeaths = inputs.deathRows.reduce((sum, row) => sum + row.count, 0);
  const rawRemaining = batch.initialChicks - totalSold - naturalDeaths;
  if (
    rawRemaining < 0 ||
    inputs.sales.some((row) => !Number.isInteger(Number(row.quantity)) || Number(row.quantity) <= 0) ||
    inputs.deathRows.some((row) => row.count <= 0)
  ) return invalidBatchResult(inputs, "INVALID_BIRD_COUNTS");

  if (batch.status === BatchStatus.COMPLETED) {
    const closureDeaths = Number(batch.closureBirdCount || 0);
    if (rawRemaining > 0 && batch.closureBirdCount == null) {
      return invalidBatchResult(inputs, "CLOSURE_CONFIRMATION_REQUIRED", "FINAL");
    }
    if (closureDeaths !== rawRemaining) {
      return invalidBatchResult(inputs, "CLOSURE_COUNT_MISMATCH", "FINAL");
    }
    return calculatePoint(inputs, {
      basis: "FINAL",
      asOfDate: batch.endDate as Date,
      averageWeightKg: null,
      sampleCount: null,
      closureDeaths,
    }, now);
  }

  if (rawRemaining === 0) {
    const finalEventDate = maxDate([
      ...inputs.sales.map((row) => row.date),
      ...inputs.deathRows.map((row) => row.date),
    ]);
    return calculatePoint(inputs, {
      basis: "FINAL_PENDING_CLOSE",
      asOfDate: finalEventDate || batch.startDate,
      averageWeightKg: null,
      sampleCount: null,
    }, now);
  }

  const latestWeight = inputs.manualWeights[0];
  if (!latestWeight) return invalidBatchResult(inputs, "NO_MANUAL_WEIGHT");

  const latestEventDate = maxDate([
    latestWeight.date,
    ...inputs.sales.map((row) => row.date),
    ...inputs.deathRows.map((row) => row.date),
    ...inputs.feedRows.map((row) => row.date),
  ]) || latestWeight.date;
  const latestEventIsWithinWeightWindow =
    ageInNepalDays(latestWeight.date, latestEventDate) <= fcrFreshDays;

  return calculatePoint(inputs, {
    basis: "LIVE",
    asOfDate: latestEventIsWithinWeightWindow ? latestEventDate : latestWeight.date,
    weightDate: latestWeight.date,
    averageWeightKg: Number(latestWeight.avgWeight),
    sampleCount: latestWeight.sampleCount,
  }, now);
}

export async function calculateFarmerBatchFcr(
  batchId: string,
  now = new Date(),
): Promise<FarmerFcrResult | null> {
  const inputs = await loadFcrInputs(batchId, now);
  return inputs ? calculateCurrentFromInputs(inputs, now) : null;
}

async function saveHistoryPoint(batchId: string, result: FarmerFcrResult): Promise<void> {
  if (result.status !== "CALCULATED" || result.fcr == null || !result.asOfDate) return;
  const calculationDate = startOfNepalDay(result.asOfDate);
  const data = {
    fcr: result.fcr,
    basis: result.basis,
    feedKg: result.feedKg,
    initialBiomassKg: result.initialBiomassKg,
    initialChickWeightKg: result.initialChickWeightKg,
    soldBirds: result.soldBirds,
    soldLiveWeightKg: result.soldLiveWeightKg,
    naturalDeaths: result.deaths,
    closureDeaths: result.closureDeaths,
    remainingBirds: result.remainingBirds,
    remainingAverageWeightKg: result.remainingAverageWeightKg,
    remainingWeightSampleCount: result.remainingWeightSampleCount,
    remainingLiveWeightKg: result.remainingLiveWeightKg,
    producedLiveWeightKg: result.producedLiveWeightKg,
    weightGainKg: result.weightGainKg,
    isFinal: result.freshnessStatus === "FINAL",
  };
  await prisma.batchFcrHistory.upsert({
    where: { batchId_calculationDate: { batchId, calculationDate } },
    create: { batchId, calculationDate, ...data },
    update: data,
  });
}

export async function syncFarmerBatchFcrHistory(
  batchId: string,
  now = new Date(),
): Promise<void> {
  const inputs = await loadFcrInputs(batchId, now);
  if (!inputs || inputs.batch.batchType !== BatchType.BROILER) return;

  // Rebuild one point for every dated batch event. This keeps history correct
  // after a sale, feed, death, or manual-weight edit instead of only appending
  // rows and leaving old calculations behind.
  const eventDatesByDay = new Map<number, Date>();
  const addEventDate = (date: Date) => {
    const day = nepalDayNumber(date);
    const saved = eventDatesByDay.get(day);
    if (!saved || date > saved) eventDatesByDay.set(day, date);
  };
  inputs.manualWeights.forEach((row) => addEventDate(row.date));
  inputs.sales.forEach((row) => addEventDate(row.date));
  inputs.deathRows.forEach((row) => addEventDate(row.date));
  inputs.feedRows.forEach((row) => addEventDate(row.date));

  const pointsByDay = new Map<number, FarmerFcrResult>();
  const eventDates = [...eventDatesByDay.values()].sort(
    (left, right) => left.getTime() - right.getTime(),
  );
  for (const eventDate of eventDates) {
    const eventEnd = endOfNepalDay(eventDate);
    const soldBirds = inputs.sales
      .filter((row) => row.date <= eventEnd)
      .reduce((sum, row) => sum + Number(row.quantity || 0), 0);
    const deaths = inputs.deathRows
      .filter((row) => row.date <= eventEnd)
      .reduce((sum, row) => sum + row.count, 0);
    const remainingBirds = inputs.batch.initialChicks - soldBirds - deaths;

    let point: FarmerFcrResult | null = null;
    if (remainingBirds === 0) {
      point = calculatePoint(inputs, {
        basis: "FINAL_PENDING_CLOSE",
        asOfDate: eventDate,
        averageWeightKg: null,
        sampleCount: null,
      }, now);
    } else if (remainingBirds > 0) {
      const weight = inputs.manualWeights.find(
        (row) =>
          row.date <= eventEnd &&
          ageInNepalDays(row.date, eventDate) <= fcrFreshDays,
      );
      if (weight) {
        point = calculatePoint(inputs, {
          basis: "LIVE",
          asOfDate: eventDate,
          weightDate: weight.date,
          averageWeightKg: Number(weight.avgWeight),
          sampleCount: weight.sampleCount,
        }, now);
      }
    }

    if (point?.status === "CALCULATED" && point.fcr != null && point.asOfDate) {
      pointsByDay.set(nepalDayNumber(point.asOfDate), point);
    }
  }

  const current = calculateCurrentFromInputs(inputs, now);
  if (current.status === "CALCULATED" && current.fcr != null && current.asOfDate) {
    pointsByDay.set(nepalDayNumber(current.asOfDate), current);
  }

  const points = [...pointsByDay.values()].sort(
    (left, right) =>
      (left.asOfDate?.getTime() || 0) - (right.asOfDate?.getTime() || 0),
  );
  for (const point of points) await saveHistoryPoint(batchId, point);

  const validDates = points.map((point) => startOfNepalDay(point.asOfDate as Date));
  await prisma.batchFcrHistory.deleteMany({
    where: {
      batchId,
      ...(validDates.length > 0
        ? { calculationDate: { notIn: validDates } }
        : {}),
    },
  });
}

export async function refreshFarmerFcrHistorySafely(batchId: string): Promise<void> {
  try {
    await syncFarmerBatchFcrHistory(batchId);
  } catch (error) {
    console.error(`Failed to refresh FCR history for batch ${batchId}:`, error);
  }
}

export async function getFarmerBatchFcrHistory(
  batchId: string,
  now = new Date(),
  sync = true,
): Promise<FarmerFcrHistoryRow[]> {
  if (sync) await syncFarmerBatchFcrHistory(batchId, now);
  const [rows, current] = await Promise.all([
    prisma.batchFcrHistory.findMany({
      where: { batchId },
      orderBy: [{ calculationDate: "asc" }, { createdAt: "asc" }],
    }),
    calculateFarmerBatchFcr(batchId, now),
  ]);
  return rows.map((row) => ({
    id: row.id,
    // History is grouped by Nepal business day. Return a date-only value so
    // clients do not display the prior UTC day (Nepal midnight is 18:15 UTC).
    calculationDate: nepalDateString(row.calculationDate),
    fcr: Number(row.fcr),
    basis: row.basis as FcrBasis,
    displayStatus: row.isFinal
      ? "FINAL"
      : current?.displayStatus === "FRESH" && sameNepalDay(current.asOfDate, row.calculationDate)
        ? "FRESH"
        : "STALE",
    feedKg: Number(row.feedKg),
    initialBiomassKg: Number(row.initialBiomassKg),
    initialChickWeightKg: Number(row.initialChickWeightKg),
    soldBirds: row.soldBirds,
    soldLiveWeightKg: Number(row.soldLiveWeightKg),
    naturalDeaths: row.naturalDeaths,
    closureDeaths: row.closureDeaths,
    remainingBirds: row.remainingBirds,
    remainingAverageWeightKg:
      row.remainingAverageWeightKg == null ? null : Number(row.remainingAverageWeightKg),
    remainingWeightSampleCount: row.remainingWeightSampleCount,
    remainingLiveWeightKg: Number(row.remainingLiveWeightKg),
    producedLiveWeightKg: Number(row.producedLiveWeightKg),
    weightGainKg: Number(row.weightGainKg),
    isFinal: row.isFinal,
  }));
}

export function aggregateCurrentFcr(
  rows: Array<{
    displayStatus: FcrDisplayStatus;
    feedKg: number;
    weightGainKg: number;
  }>,
): number | null {
  const included = rows.filter(
    (row) => row.displayStatus === "FRESH" || row.displayStatus === "FINAL",
  );
  const totalFeedKg = included.reduce((sum, row) => sum + row.feedKg, 0);
  const totalWeightGainKg = included.reduce((sum, row) => sum + row.weightGainKg, 0);
  return totalWeightGainKg > 0 ? totalFeedKg / totalWeightGainKg : null;
}
