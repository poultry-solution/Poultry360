jest.mock("../../src/utils/prisma", () => {
  const client: any = {
    batch: { findUnique: jest.fn() },
    batchShareLink: {
      count: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };
  return { __esModule: true, default: client };
});

jest.mock("../../src/services/farmerFcrService", () => ({
  calculateFarmerBatchFcr: jest.fn(),
}));

import prisma from "../../src/utils/prisma";
import {
  assembleShareReport,
  BatchShareError,
  batchDayOf,
  createShareLink,
  getPublicShareReport,
  revokeShareLink,
  type ShareReportInput,
} from "../../src/services/batchShareService";

const db = prisma as any;
// Nepal midnight of 2026-10-01 is 2026-09-30T18:15Z.
const start = new Date("2026-09-30T18:15:00.000Z");
const at = (day: number, hourUtc = 6) => new Date(Date.UTC(2026, 9, day, hourUtc)); // Oct `day`

function baseInput(overrides: Partial<ShareReportInput> = {}): ShareReportInput {
  return {
    now: at(10),
    batch: {
      batchNumber: "B-12",
      batchType: "BROILER" as any,
      status: "ACTIVE" as any,
      startDate: start,
      endDate: null,
      initialChicks: 1000,
    },
    farmName: "Green Valley Farm 1",
    location: null,
    expiresAt: at(17),
    fcr: {
      fcr: 1.4823,
      displayStatus: "FRESH",
      weightSourceDate: at(9),
      currentBirds: 930,
      currentSoldBirds: 50,
      deaths: 20,
      closureDeaths: 0,
    },
    mortalities: [
      { date: at(2), count: 5, reason: "Weak", saleId: null },
      { date: at(9), count: 15, reason: "Heat", saleId: null },
      { date: at(8), count: 50, reason: "SLAUGHTERED_FOR_SALE", saleId: "sale-1" },
    ],
    weights: [
      { date: at(9), avgWeight: 0.412, sampleCount: 20 },
      { date: at(5), avgWeight: 0.2, sampleCount: 10 },
    ],
    feed: [
      { date: at(3), quantityKg: 100, feedType: "B0 Starter" },
      { date: at(9), quantityKg: 150, feedType: "B1 Grower" },
      { date: at(9), quantityKg: null, feedType: "Old row" },
    ],
    medicines: [
      { date: at(7), description: null, items: [{ name: "Lasota", quantity: 1, unit: "vial" }] },
      { date: at(4), description: "Vitamin in water", items: [] },
    ],
    birdSales: [{ date: at(8), quantity: 50 }],
    eggs: [],
    notes: null,
    ...overrides,
  };
}

describe("assembleShareReport", () => {
  it("counts only natural deaths, not birds sold", () => {
    const report = assembleShareReport(baseInput());
    expect(report.birds).toEqual({ started: 1000, died: 20, sold: 50, leftAtClose: 0, alive: 930 });
    expect(report.deaths.total).toBe(20);
    expect(report.deaths.percent).toBe(2);
    expect(report.deaths.reasons).toEqual([
      { reason: "Heat", count: 15 },
      { reason: "Weak", count: 5 },
    ]);
  });

  it("uses Nepal days: arrival day is Day 1 and every day has a death count", () => {
    const report = assembleShareReport(baseInput());
    expect(report.batch.day).toBe(10);
    expect(report.deaths.daily).toHaveLength(10);
    expect(report.deaths.daily[1]).toEqual({ date: "2026-10-02", day: 2, count: 5 });
    expect(report.deaths.daily[8].count).toBe(15);
    expect(batchDayOf(start, new Date("2026-10-01T18:14:00.000Z"))).toBe(1); // 11:59 pm Nepal, still day 1
    expect(batchDayOf(start, new Date("2026-10-01T18:15:00.000Z"))).toBe(2);
  });

  it("totals feed in kg, skips rows without kg, and gives feed per bird fed", () => {
    const report = assembleShareReport(baseInput());
    expect(report.feed.totalKg).toBe(250);
    expect(report.feed.perBirdKg).toBe(0.255); // 250 kg ÷ (930 alive + 50 sold)
    expect(report.feed.types[0]).toEqual({ name: "B1 Grower", kg: 150 });
    expect(report.feed.recent).toHaveLength(10);
  });

  it("orders weights and medicines by date and keeps no money", () => {
    const report = assembleShareReport(baseInput());
    expect(report.weight.latest).toEqual({ date: "2026-10-09", day: 9, avgWeightKg: 0.412, sampleCount: 20 });
    expect(report.medicines.map((m) => m.day)).toEqual([4, 7]);
    expect(report.medicines[0].items[0].name).toBe("Vitamin in water");
    expect(report.fcr).toEqual({ value: 1.48, status: "FRESH", weightDate: "2026-10-09" });
    expect(JSON.stringify(report)).not.toMatch(/"(amount|price|unitPrice|rate|cost|profit|paid|due|customer|supplier)\w*":/i);
  });

  it("works out laying % from hens alive that day for layers", () => {
    const report = assembleShareReport(
      baseInput({
        batch: { ...baseInput().batch, batchType: "LAYERS" as any },
        fcr: null,
        mortalities: [{ date: at(2), count: 100, reason: null, saleId: null }],
        birdSales: [],
        eggs: [
          { date: at(2), count: 800 },
          { date: at(3), count: 450 },
          { date: at(3), count: 0 },
        ],
      })
    );
    expect(report.fcr).toBeNull();
    const day2 = report.eggs!.daily.find((d) => d.day === 2)!;
    const day3 = report.eggs!.daily.find((d) => d.day === 3)!;
    expect(day2.layingPercent).toBe(80); // 800 ÷ 1000 (deaths that day not yet counted)
    expect(day3.layingPercent).toBe(50); // 450 ÷ 900
    expect(report.eggs!.totalEggs).toBe(1250);
    expect(report.eggs!.daily.find((d) => d.day === 4)!.eggs).toBeNull();
  });

  it("shows notes only when shared", () => {
    expect(assembleShareReport(baseInput()).notes).toBeNull();
    const withNotes = assembleShareReport(baseInput({ notes: [{ date: at(5), description: "Birds panting" }] }));
    expect(withNotes.notes).toEqual([{ date: "2026-10-05", description: "Birds panting" }]);
  });
});

describe("share links", () => {
  const ownedBatch = { id: "batch-1", farm: { ownerId: "farmer-1", managers: [] } };

  beforeEach(() => {
    jest.clearAllMocks();
    db.batch.findUnique.mockResolvedValue(ownedBatch);
    db.batchShareLink.count.mockResolvedValue(0);
    db.batchShareLink.create.mockImplementation(({ data }: any) => Promise.resolve({ id: "link-1", ...data }));
  });

  it("lets the owner create a 7-day link with a long random code", async () => {
    const now = new Date("2026-10-15T00:00:00.000Z");
    const link = await createShareLink({ batchId: "batch-1", userId: "farmer-1", expiresInDays: 7, now });
    const data = db.batchShareLink.create.mock.calls[0][0].data;
    expect(data.token).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(data.expiresAt.toISOString()).toBe("2026-10-22T00:00:00.000Z");
    expect(data.showLocation).toBe(false);
    expect(data.showNotes).toBe(false);
    expect(link.id).toBe("link-1");
  });

  it("refuses someone else's batch", async () => {
    await expect(
      createShareLink({ batchId: "batch-1", userId: "farmer-2", expiresInDays: 7 })
    ).rejects.toMatchObject({ status: 403 });
    expect(db.batchShareLink.create).not.toHaveBeenCalled();
  });

  it("refuses an unknown link time", async () => {
    await expect(
      createShareLink({ batchId: "batch-1", userId: "farmer-1", expiresInDays: 365 })
    ).rejects.toBeInstanceOf(BatchShareError);
  });

  it("does not turn off a link from another batch", async () => {
    db.batchShareLink.findFirst.mockResolvedValue(null);
    await expect(revokeShareLink("batch-1", "other-link", "farmer-1")).rejects.toMatchObject({ status: 404 });
    expect(db.batchShareLink.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "other-link", batchId: "batch-1" } })
    );
  });

  it.each([
    ["expired", { expiresAt: new Date("2026-10-01T00:00:00.000Z"), revokedAt: null }],
    ["turned off", { expiresAt: new Date("2026-12-01T00:00:00.000Z"), revokedAt: new Date("2026-10-02") }],
  ])("returns nothing for a %s link", async (_label, state) => {
    db.batchShareLink.findUnique.mockResolvedValue({ id: "link-1", ...state });
    const report = await getPublicShareReport("abc", new Date("2026-10-15T00:00:00.000Z"));
    expect(report).toBeNull();
    expect(db.batchShareLink.update).not.toHaveBeenCalled();
  });
});
