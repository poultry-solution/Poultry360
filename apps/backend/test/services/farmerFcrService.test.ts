jest.mock("../../src/utils/prisma", () => ({
  __esModule: true,
  default: {
    batch: { findUnique: jest.fn() },
    sale: { findMany: jest.fn() },
    mortality: { findMany: jest.fn() },
    feedConsumption: { findMany: jest.fn() },
    birdWeight: { findMany: jest.fn() },
    batchFcrHistory: { upsert: jest.fn(), findMany: jest.fn(), deleteMany: jest.fn() },
  },
}));

import prisma from "../../src/utils/prisma";
import {
  aggregateCurrentFcr,
  calculateFarmerBatchFcr,
  startOfNepalDay,
  syncFarmerBatchFcrHistory,
} from "../../src/services/farmerFcrService";
import { CloseBatchFcrSchema } from "../../src/validation/fcrSchemas";
import { parseFcrFreshDays } from "../../src/config/fcr";

const mocked = prisma as unknown as {
  batch: { findUnique: jest.Mock };
  sale: { findMany: jest.Mock };
  mortality: { findMany: jest.Mock };
  feedConsumption: { findMany: jest.Mock };
  birdWeight: { findMany: jest.Mock };
  batchFcrHistory: { upsert: jest.Mock; findMany: jest.Mock; deleteMany: jest.Mock };
};

const now = new Date("2026-01-10T06:00:00.000Z");

function setRows(options?: {
  batchType?: "BROILER" | "LAYER";
  status?: "ACTIVE" | "COMPLETED";
  endDate?: Date | null;
  closureBirdCount?: number | null;
  sales?: Array<{ id: string; date: Date; quantity: number; weight: number | null }>;
  deaths?: Array<{ id: string; date: Date; count: number; reason: string; saleId: null }>;
  feed?: Array<{ id: string; date: Date; quantityKg: number | null }>;
  weights?: Array<{
    id: string;
    date: Date;
    avgWeight: number;
    sampleCount: number;
    createdAt: Date;
  }>;
}) {
  mocked.batch.findUnique.mockResolvedValue({
    id: "batch-1",
    batchType: options?.batchType || "BROILER",
    status: options?.status || "ACTIVE",
    startDate: new Date("2026-01-01T00:00:00.000Z"),
    endDate: options?.endDate ?? null,
    initialChicks: 100,
    initialChickWeightKg: 0.05,
    closureBirdCount: options?.closureBirdCount ?? null,
  });
  mocked.sale.findMany.mockResolvedValue(options?.sales ?? []);
  mocked.mortality.findMany.mockResolvedValue(options?.deaths ?? []);
  mocked.feedConsumption.findMany.mockResolvedValue(
    options?.feed ?? [{ id: "feed-1", date: now, quantityKg: 100 }],
  );
  mocked.birdWeight.findMany.mockResolvedValue(options?.weights ?? []);
}

describe("Farmer Phase 1 FCR", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocked.batchFcrHistory.upsert.mockResolvedValue({});
    mocked.batchFcrHistory.deleteMany.mockResolvedValue({ count: 0 });
  });

  it("calculates a fresh active-batch FCR", async () => {
    setRows({
      weights: [{
        id: "weight-1",
        date: now,
        avgWeight: 1.5,
        sampleCount: 10,
        createdAt: now,
      }],
    });

    const result = await calculateFarmerBatchFcr("batch-1", now);
    expect(result?.displayStatus).toBe("FRESH");
    expect(result?.status).toBe("CALCULATED");
    expect(result?.asOfDate).toEqual(now);
    expect(result?.weightSourceDate).toEqual(now);
    expect(result?.initialBiomassKg).toBe(5);
    expect(result?.remainingLiveWeightKg).toBe(150);
    expect(result?.weightGainKg).toBe(145);
    expect(result?.fcr).toBeCloseTo(100 / 145, 8);
    expect(result?.currentFcr).toBeCloseTo(100 / 145, 8);

    await syncFarmerBatchFcrHistory("batch-1", now);
    expect(mocked.batchFcrHistory.upsert).toHaveBeenCalledTimes(1);
  });

  it("uses a safe three-day default for an invalid freshness setting", () => {
    expect(parseFcrFreshDays(undefined)).toBe(3);
    expect(parseFcrFreshDays("0")).toBe(3);
    expect(parseFcrFreshDays("2.5")).toBe(3);
    expect(parseFcrFreshDays("5")).toBe(5);
  });

  it("keeps an old value but does not expose it as current", async () => {
    const oldDate = new Date("2026-01-05T06:00:00.000Z");
    setRows({
      feed: [{ id: "feed-1", date: oldDate, quantityKg: 100 }],
      weights: [{
        id: "weight-1",
        date: oldDate,
        avgWeight: 1.5,
        sampleCount: 10,
        createdAt: oldDate,
      }],
    });

    const result = await calculateFarmerBatchFcr("batch-1", now);
    expect(result?.displayStatus).toBe("STALE");
    expect(result?.fcr).toBeCloseTo(100 / 145, 8);
    expect(result?.currentFcr).toBeNull();
    expect(result?.staleReasons).toContain("WEIGHT_TOO_OLD");
  });

  it("uses sold weight plus the remaining flock for a partial sale", async () => {
    setRows({
      sales: [{ id: "sale-1", date: now, quantity: 20, weight: 40 }],
      weights: [{
        id: "weight-1",
        date: now,
        avgWeight: 1.5,
        sampleCount: 10,
        createdAt: now,
      }],
    });

    const result = await calculateFarmerBatchFcr("batch-1", now);
    expect(result?.soldLiveWeightKg).toBe(40);
    expect(result?.remainingLiveWeightKg).toBe(120);
    expect(result?.producedLiveWeightKg).toBe(160);
    expect(result?.fcr).toBeCloseTo(100 / 155, 8);
  });

  it("uses a recent earlier weight when a partial sale is newer", async () => {
    const weightDate = new Date("2026-01-08T06:00:00.000Z");
    setRows({
      sales: [{ id: "sale-1", date: now, quantity: 20, weight: 40 }],
      feed: [{ id: "feed-1", date: weightDate, quantityKg: 100 }],
      weights: [{
        id: "weight-1",
        date: weightDate,
        avgWeight: 1.5,
        sampleCount: 90,
        createdAt: weightDate,
      }],
    });

    const result = await calculateFarmerBatchFcr("batch-1", now);
    expect(result?.displayStatus).toBe("FRESH");
    expect(result?.asOfDate).toEqual(now);
    expect(result?.weightSourceDate).toEqual(weightDate);
    expect(result?.weightAgeDays).toBe(2);
    expect(result?.soldLiveWeightKg).toBe(40);
    expect(result?.remainingLiveWeightKg).toBe(110);
    expect(result?.producedLiveWeightKg).toBe(150);
    expect(result?.currentFcr).toBeCloseTo(100 / 145, 8);
    expect(result?.staleReasons).not.toContain("NEWER_SALE_NOT_INCLUDED");
  });

  it("keeps the last weight-date result when a newer sale is outside the window", async () => {
    const weightDate = new Date("2026-01-05T06:00:00.000Z");
    setRows({
      sales: [{ id: "sale-1", date: now, quantity: 20, weight: 40 }],
      feed: [{ id: "feed-1", date: weightDate, quantityKg: 100 }],
      weights: [{
        id: "weight-1",
        date: weightDate,
        avgWeight: 1.5,
        sampleCount: 10,
        createdAt: weightDate,
      }],
    });

    const result = await calculateFarmerBatchFcr("batch-1", now);
    expect(result?.displayStatus).toBe("STALE");
    expect(result?.asOfDate).toEqual(weightDate);
    expect(result?.soldLiveWeightKg).toBe(0);
    expect(result?.currentFcr).toBeNull();
    expect(result?.staleReasons).toContain("WEIGHT_TOO_OLD");
    expect(result?.staleReasons).toContain("NEWER_SALE_NOT_INCLUDED");
  });

  it("stores a fresh sale-date history point when the earlier weight is valid", async () => {
    const weightDate = new Date("2026-01-08T06:00:00.000Z");
    setRows({
      sales: [{ id: "sale-1", date: now, quantity: 20, weight: 40 }],
      feed: [{ id: "feed-1", date: weightDate, quantityKg: 100 }],
      weights: [{
        id: "weight-1",
        date: weightDate,
        avgWeight: 1.5,
        sampleCount: 10,
        createdAt: weightDate,
      }],
    });

    await syncFarmerBatchFcrHistory("batch-1", now);

    expect(mocked.batchFcrHistory.upsert).toHaveBeenCalledTimes(2);
    expect(mocked.batchFcrHistory.upsert).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: {
          batchId_calculationDate: {
            batchId: "batch-1",
            calculationDate: startOfNepalDay(now),
          },
        },
        create: expect.objectContaining({ soldBirds: 20, soldLiveWeightKg: 40 }),
      }),
    );
  });

  it("keeps a valid sale-date point even when a later sale is outside the weight window", async () => {
    const weightDate = new Date("2026-01-02T06:00:00.000Z");
    const validSaleDate = new Date("2026-01-03T06:00:00.000Z");
    const lateSaleDate = new Date("2026-01-08T06:00:00.000Z");
    setRows({
      sales: [
        { id: "sale-1", date: validSaleDate, quantity: 20, weight: 40 },
        { id: "sale-2", date: lateSaleDate, quantity: 10, weight: 20 },
      ],
      feed: [{ id: "feed-1", date: weightDate, quantityKg: 100 }],
      weights: [{
        id: "weight-1",
        date: weightDate,
        avgWeight: 1.5,
        sampleCount: 10,
        createdAt: weightDate,
      }],
    });

    await syncFarmerBatchFcrHistory("batch-1", now);

    const savedDates = mocked.batchFcrHistory.upsert.mock.calls.map(
      ([input]) => input.where.batchId_calculationDate.calculationDate.toISOString(),
    );
    expect(savedDates).toContain(startOfNepalDay(weightDate).toISOString());
    expect(savedDates).toContain(startOfNepalDay(validSaleDate).toISOString());
    expect(savedDates).not.toContain(startOfNepalDay(lateSaleDate).toISOString());
  });

  it("removes history dates that are no longer supported after a weight edit", async () => {
    const oldDate = new Date("2026-01-06T06:00:00.000Z");
    const newDate = new Date("2026-01-08T06:00:00.000Z");
    setRows({
      feed: [{ id: "feed-1", date: oldDate, quantityKg: 100 }],
      weights: [{
        id: "weight-1",
        date: newDate,
        avgWeight: 1.5,
        sampleCount: 10,
        createdAt: newDate,
      }],
    });

    await syncFarmerBatchFcrHistory("batch-1", now);

    expect(mocked.batchFcrHistory.deleteMany).toHaveBeenCalledWith({
      where: {
        batchId: "batch-1",
        calculationDate: { notIn: [startOfNepalDay(newDate)] },
      },
    });
  });

  it("removes all live FCR history when no manual weight remains", async () => {
    setRows({
      feed: [{ id: "feed-1", date: now, quantityKg: 100 }],
      weights: [],
    });

    await syncFarmerBatchFcrHistory("batch-1", now);

    expect(mocked.batchFcrHistory.upsert).not.toHaveBeenCalled();
    expect(mocked.batchFcrHistory.deleteMany).toHaveBeenCalledWith({
      where: { batchId: "batch-1" },
    });
  });

  it("accepts a weight at the exact three-day freshness boundary", async () => {
    const weightDate = new Date("2026-01-07T06:00:00.000Z");
    setRows({
      sales: [{ id: "sale-1", date: now, quantity: 20, weight: 40 }],
      feed: [{ id: "feed-1", date: now, quantityKg: 100 }],
      weights: [{
        id: "weight-1",
        date: weightDate,
        avgWeight: 1.5,
        sampleCount: 10,
        createdAt: weightDate,
      }],
    });

    const result = await calculateFarmerBatchFcr("batch-1", now);
    expect(result?.weightAgeDays).toBe(3);
    expect(result?.displayStatus).toBe("FRESH");
    expect(result?.asOfDate).toEqual(now);
    expect(result?.remainingLiveWeightKg).toBe(110);
    expect(result?.producedLiveWeightKg).toBe(150);
    expect(result?.currentFcr).toBeCloseTo(100 / 145, 8);
  });

  it("expires a weight when the newer event is four days later", async () => {
    const weightDate = new Date("2026-01-06T06:00:00.000Z");
    setRows({
      sales: [{ id: "sale-1", date: now, quantity: 20, weight: 40 }],
      feed: [{ id: "feed-1", date: weightDate, quantityKg: 100 }],
      weights: [{
        id: "weight-1",
        date: weightDate,
        avgWeight: 1.5,
        sampleCount: 10,
        createdAt: weightDate,
      }],
    });

    const result = await calculateFarmerBatchFcr("batch-1", now);
    expect(result?.weightAgeDays).toBe(4);
    expect(result?.displayStatus).toBe("STALE");
    expect(result?.asOfDate).toEqual(weightDate);
    expect(result?.currentFcr).toBeNull();
  });

  it("advances the FCR date for fresh feed and mortality records", async () => {
    const weightDate = new Date("2026-01-08T06:00:00.000Z");
    const feedDate = new Date("2026-01-09T06:00:00.000Z");
    setRows({
      deaths: [{ id: "death-1", date: now, count: 5, reason: "DISEASE", saleId: null }],
      feed: [
        { id: "feed-1", date: weightDate, quantityKg: 80 },
        { id: "feed-2", date: feedDate, quantityKg: 20 },
      ],
      weights: [{
        id: "weight-1",
        date: weightDate,
        avgWeight: 1.5,
        sampleCount: 10,
        createdAt: weightDate,
      }],
    });

    const result = await calculateFarmerBatchFcr("batch-1", now);
    expect(result?.displayStatus).toBe("FRESH");
    expect(result?.asOfDate).toEqual(now);
    expect(result?.weightSourceDate).toEqual(weightDate);
    expect(result?.weightAgeDays).toBe(2);
    expect(result?.feedKg).toBe(100);
    expect(result?.deaths).toBe(5);
    expect(result?.remainingBirds).toBe(95);
    expect(result?.remainingLiveWeightKg).toBe(142.5);
    expect(result?.fcr).toBeCloseTo(100 / 137.5, 8);
  });

  it("keeps sale weight and excludes natural deaths from output", async () => {
    setRows({
      sales: [{ id: "sale-1", date: now, quantity: 20, weight: 40 }],
      deaths: [{ id: "death-1", date: now, count: 5, reason: "DISEASE", saleId: null }],
      weights: [{
        id: "weight-1",
        date: now,
        avgWeight: 1.5,
        sampleCount: 10,
        createdAt: now,
      }],
    });

    const result = await calculateFarmerBatchFcr("batch-1", now);
    expect(result?.soldBirds).toBe(20);
    expect(result?.deaths).toBe(5);
    expect(result?.remainingBirds).toBe(75);
    expect(result?.soldLiveWeightKg).toBe(40);
    expect(result?.remainingLiveWeightKg).toBe(112.5);
    expect(result?.producedLiveWeightKg).toBe(152.5);
    expect(result?.weightGainKg).toBe(147.5);
    expect(result?.fcr).toBeCloseTo(100 / 147.5, 8);
  });

  it("calculates a final FCR from sale weight when all birds are sold", async () => {
    setRows({
      sales: [{ id: "sale-1", date: now, quantity: 100, weight: 200 }],
      feed: [{ id: "feed-1", date: now, quantityKg: 300 }],
    });

    const result = await calculateFarmerBatchFcr("batch-1", now);
    expect(result?.displayStatus).toBe("FINAL");
    expect(result?.remainingBirds).toBe(0);
    expect(result?.producedLiveWeightKg).toBe(200);
    expect(result?.fcr).toBeCloseTo(300 / 195, 8);
  });

  it("closes normally when all remaining birds were sold", async () => {
    setRows({
      status: "COMPLETED",
      endDate: now,
      closureBirdCount: 0,
      sales: [
        { id: "sale-1", date: new Date("2026-01-09T06:00:00.000Z"), quantity: 80, weight: 160 },
        { id: "sale-2", date: now, quantity: 20, weight: 40 },
      ],
      feed: [{ id: "feed-1", date: now, quantityKg: 300 }],
      weights: [],
    });

    const result = await calculateFarmerBatchFcr("batch-1", now);
    expect(result?.displayStatus).toBe("FINAL");
    expect(result?.status).toBe("CALCULATED");
    expect(result?.soldBirds).toBe(100);
    expect(result?.closureDeaths).toBe(0);
    expect(result?.remainingBirds).toBe(0);
    expect(result?.soldLiveWeightKg).toBe(200);
    expect(result?.producedLiveWeightKg).toBe(200);
    expect(result?.fcr).toBeCloseTo(300 / 195, 8);
  });

  it("excludes confirmed closure deaths from final produced weight", async () => {
    setRows({
      status: "COMPLETED",
      endDate: now,
      closureBirdCount: 15,
      sales: [{ id: "sale-1", date: now, quantity: 80, weight: 160 }],
      deaths: [{ id: "death-1", date: now, count: 5, reason: "DISEASE", saleId: null }],
      feed: [{ id: "feed-1", date: now, quantityKg: 240 }],
    });

    const result = await calculateFarmerBatchFcr("batch-1", now);
    expect(result?.displayStatus).toBe("FINAL");
    expect(result?.closureDeaths).toBe(15);
    expect(result?.currentDeaths).toBe(20);
    expect(result?.remainingLiveWeightKg).toBe(0);
    expect(result?.producedLiveWeightKg).toBe(160);
    expect(result?.fcr).toBeCloseTo(240 / 155, 8);
  });

  it("requires close confirmation only when the UI sends it", () => {
    expect(CloseBatchFcrSchema.parse({}).confirmRemainingAsDead).toBe(false);
    expect(
      CloseBatchFcrSchema.parse({ confirmRemainingAsDead: true }).confirmRemainingAsDead,
    ).toBe(true);
  });

  it("returns NO_FEED instead of showing a zero FCR", async () => {
    setRows({
      feed: [],
      weights: [{
        id: "weight-1",
        date: now,
        avgWeight: 1.5,
        sampleCount: 10,
        createdAt: now,
      }],
    });

    const result = await calculateFarmerBatchFcr("batch-1", now);
    expect(result?.status).toBe("NO_FEED");
    expect(result?.displayStatus).toBe("NOT_CALCULABLE");
    expect(result?.fcr).toBeNull();
    expect(result?.currentFcr).toBeNull();
  });

  it("requires a manual weight while live birds remain", async () => {
    setRows({ weights: [] });

    const result = await calculateFarmerBatchFcr("batch-1", now);
    expect(result?.status).toBe("NO_MANUAL_WEIGHT");
    expect(result?.displayStatus).toBe("WEIGHT_REQUIRED");
    expect(result?.currentFcr).toBeNull();
  });

  it("does not guess kilograms when feed conversion is missing", async () => {
    setRows({
      feed: [{ id: "feed-1", date: now, quantityKg: null }],
      weights: [{
        id: "weight-1",
        date: now,
        avgWeight: 1.5,
        sampleCount: 10,
        createdAt: now,
      }],
    });

    const result = await calculateFarmerBatchFcr("batch-1", now);
    expect(result?.status).toBe("UNKNOWN_FEED_UNIT");
    expect(result?.currentFcr).toBeNull();
  });

  it("does not calculate a sale without its total weight", async () => {
    setRows({
      sales: [{ id: "sale-1", date: now, quantity: 20, weight: null }],
      weights: [{
        id: "weight-1",
        date: now,
        avgWeight: 1.5,
        sampleCount: 10,
        createdAt: now,
      }],
    });

    const result = await calculateFarmerBatchFcr("batch-1", now);
    expect(result?.status).toBe("MISSING_SALE_WEIGHT");
    expect(result?.currentFcr).toBeNull();
  });

  it("does not calculate FCR for a Layer batch", async () => {
    setRows({
      batchType: "LAYER",
      weights: [{
        id: "weight-1",
        date: now,
        avgWeight: 1.5,
        sampleCount: 10,
        createdAt: now,
      }],
    });

    const result = await calculateFarmerBatchFcr("batch-1", now);
    expect(result?.status).toBe("NOT_APPLICABLE");
    expect(result?.currentFcr).toBeNull();
  });

  it("loads only manual weights for the remaining flock", async () => {
    setRows({
      sales: [{ id: "sale-1", date: now, quantity: 20, weight: 40 }],
      weights: [{
        id: "manual-weight",
        date: now,
        avgWeight: 1.5,
        sampleCount: 10,
        createdAt: now,
      }],
    });

    const result = await calculateFarmerBatchFcr("batch-1", now);
    expect(mocked.birdWeight.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ source: "MANUAL" }),
      }),
    );
    expect(result?.remainingLiveWeightKg).toBe(120);
    expect(result?.producedLiveWeightKg).toBe(160);
  });

  it("upserts one stable history key for each manual weight date", async () => {
    const firstDate = new Date("2026-01-08T06:00:00.000Z");
    setRows({
      feed: [{ id: "feed-1", date: firstDate, quantityKg: 100 }],
      weights: [
        { id: "weight-2", date: now, avgWeight: 1.5, sampleCount: 10, createdAt: now },
        { id: "weight-1", date: firstDate, avgWeight: 1.3, sampleCount: 10, createdAt: firstDate },
      ],
    });

    await syncFarmerBatchFcrHistory("batch-1", now);
    await syncFarmerBatchFcrHistory("batch-1", now);

    expect(mocked.batchFcrHistory.upsert).toHaveBeenCalledTimes(4);
    const historyKeys = mocked.batchFcrHistory.upsert.mock.calls.map(
      ([input]) => input.where.batchId_calculationDate.calculationDate.toISOString(),
    );
    expect(new Set(historyKeys).size).toBe(2);
  });

  it("excludes stale values from the dashboard weighted FCR", () => {
    const aggregate = aggregateCurrentFcr([
      { displayStatus: "FRESH", feedKg: 100, weightGainKg: 50 },
      { displayStatus: "FINAL", feedKg: 180, weightGainKg: 100 },
      { displayStatus: "STALE", feedKg: 999, weightGainKg: 1 },
      { displayStatus: "NOT_CALCULABLE", feedKg: 999, weightGainKg: 1 },
    ]);
    expect(aggregate).toBeCloseTo(280 / 150, 8);
  });
});
