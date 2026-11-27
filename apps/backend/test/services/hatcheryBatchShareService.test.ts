jest.mock("../../src/utils/prisma", () => {
  const client: any = {
    hatcheryBatch: { findUnique: jest.fn() },
    hatcheryIncubationBatch: { findUnique: jest.fn() },
    hatcheryBatchShareLink: {
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

import prisma from "../../src/utils/prisma";
import {
  assembleBatchReport,
  assembleIncubationReport,
  createShareLink,
  getPublicBatchReport,
  getPublicIncubationReport,
  HatcheryShareError,
  incubationNumbers,
  revokeShareLink,
  type BatchReportInput,
  type IncubationReportInput,
} from "../../src/services/hatcheryBatchShareService";

const db = prisma as any;
// Hatchery dates are saved as UTC midnight of the chosen day.
const d = (day: string) => new Date(`${day}T00:00:00.000Z`);

const MONEY_KEYS = ["amount", "unitprice", "rate", "price", "profit", "cost", "party", "invoice", "account", "supplier", "revenue"];
const moneyKeysIn = (value: unknown) => {
  const text = JSON.stringify(value).toLowerCase();
  return MONEY_KEYS.filter((key) => text.includes(`"${key}`));
};

function batchInput(overrides: Partial<BatchReportInput> = {}): BatchReportInput {
  return {
    now: d("2026-01-21"), // day 21 of the flock
    expiresAt: d("2026-02-01"),
    hatcheryName: "Sunrise Hatchery",
    batch: {
      code: "PF-001",
      name: null,
      status: "ACTIVE",
      startDate: d("2026-01-01"),
      endDate: null,
      initialParents: 110,
      initialFemaleParents: 100,
      initialMaleParents: 10,
      currentParents: 102,
      currentFemaleParents: 94,
      currentMaleParents: 8,
      legacyNote: null,
    },
    mortalities: [
      { date: d("2026-01-03"), count: 4, femaleCount: 3, maleCount: 1, note: "Heat" },
      { date: d("2026-01-10"), count: 3, femaleCount: 2, maleCount: 1, note: null },
    ],
    parentSales: [{ date: d("2026-01-15"), count: 1, femaleCount: 1, maleCount: 0, totalWeightKg: 3.5 }],
    eggProductions: [
      // Week 3 (days 15-21): 2 days of eggs
      { date: d("2026-01-20"), lines: [{ count: 80, eggTypeName: "Hatchable", isHatchable: true }, { count: 10, eggTypeName: "Cracked", isHatchable: false }] },
      { date: d("2026-01-21"), lines: [{ count: 85, eggTypeName: "Hatchable", isHatchable: true }] },
    ],
    feed: [
      { date: d("2026-01-02"), itemName: "Layer feed", quantity: 70, unit: "kg", feedTarget: "BOTH", maleFeedQuantity: 7, femaleFeedQuantity: 63 },
      { date: d("2026-01-12"), itemName: "Layer feed", quantity: 50, unit: "kg", feedTarget: "FEMALE", maleFeedQuantity: null, femaleFeedQuantity: null },
      { date: d("2026-01-18"), itemName: "Grit", quantity: 2, unit: "bag", feedTarget: null, maleFeedQuantity: null, femaleFeedQuantity: null },
    ],
    medicines: [{ date: d("2026-01-05"), itemName: "ND vaccine", quantity: 1, unit: "vial", note: "Eye drop" }],
    incubations: [
      {
        id: "inc-1",
        code: "IN-001",
        name: null,
        stage: "COMPLETED",
        startDate: d("2026-01-01"),
        eggsSetCount: 1000,
        losses: [{ type: "INFERTILE", count: 60 }, { type: "EARLY_DEAD", count: 40 }],
        hatchResults: [{ hatchedA: 800, hatchedB: 30, cull: 10, lateDead: 40, unhatched: 20 }],
      },
      {
        id: "inc-2",
        code: "IN-002",
        name: null,
        stage: "SETTER",
        startDate: d("2026-01-18"),
        eggsSetCount: 500,
        losses: [],
        hatchResults: [],
      },
    ],
    notes: null,
    ...overrides,
  };
}

describe("assembleBatchReport", () => {
  it("works out birds, deaths and the male ratio", () => {
    const r = assembleBatchReport(batchInput());
    expect(r.batch).toMatchObject({ code: "PF-001", ageDay: 21, ageWeek: 3, hatcheryName: "Sunrise Hatchery" });
    expect(r.birds.started).toEqual({ female: 100, male: 10, total: 110 });
    expect(r.birds.now).toEqual({ female: 94, male: 8, total: 102 });
    expect(r.birds.deaths).toMatchObject({ female: 5, male: 2, total: 7, notSplit: 0, percent: 6.4, femalePercent: 5, malePercent: 20 });
    expect(r.birds.malesPer100Females).toBe(8.5);
    expect(r.birds.sold).toEqual({ female: 1, male: 0, total: 1, avgWeightKg: 3.5 });
  });

  it("puts deaths, eggs and feed into flock weeks", () => {
    const r = assembleBatchReport(batchInput());
    expect(r.weekly.map((w) => w.week)).toEqual([1, 2, 3]);
    expect(r.weekly.map((w) => w.deaths)).toEqual([4, 3, 0]);
    expect(r.weekly[2].eggs).toBe(175);
    expect(r.weekly[0].layPercent).toBeNull(); // no eggs that week
  });

  it("lay % counts females alive each day from the first egg day", () => {
    const r = assembleBatchReport(batchInput());
    // Females alive on Jan 20 and 21: 100 - 3 - 2 deaths - 1 sold = 94 each day → 188 female-days.
    expect(r.eggs.layPercent).toBe(Math.round((175 / 188) * 1000) / 10);
    expect(r.eggs.total).toBe(175);
    expect(r.eggs.hatchable).toBe(165);
    expect(r.eggs.hatchablePercent).toBe(94.3);
    expect(r.eggs.firstEggDate).toBe("2026-01-20");
  });

  it("splits feed by sex and only uses kg for grams per bird", () => {
    const r = assembleBatchReport(batchInput());
    const kg = r.feed.byUnit.find((u) => u.unit === "kg")!;
    expect(kg).toEqual({ unit: "kg", female: 113, male: 7, notSplit: 0, total: 120 });
    expect(r.feed.byUnit.find((u) => u.unit === "bag")).toMatchObject({ total: 2, notSplit: 2 });
    expect(r.feed.totalKg).toBe(120);
    // Week 1: 70 kg over 7 days of 110 → 106 birds alive (deaths on day 3)
    const birdDaysWeek1 = 110 * 2 + 106 * 5;
    expect(r.weekly[0].gramsPerBirdPerDay).toBe(Math.round((70 * 1000) / birdDaysWeek1));
    expect(r.feed.recent.map((f) => f.item)).toEqual(["Grit", "Layer feed"]); // last 14 days only, newest first
  });

  it("hatch totals only use hatched incubations; before candling fertile is unknown", () => {
    const r = assembleBatchReport(batchInput());
    expect(r.hatching.totals).toMatchObject({
      eggsSet: 1000,
      fertileEggs: 900,
      fertilePercent: 90,
      totalHatched: 840,
      hatchOfFertile: 93.3,
      hatchOfSet: 84,
      finishedCount: 1,
      runningCount: 1,
      runningEggs: 500,
    });
    const running = r.hatching.incubations.find((i) => i.code === "IN-002")!;
    expect(running.fertileEggs).toBeNull();
    expect(running.fertilePercent).toBeNull();
    expect(running.hatchOfFertile).toBeNull();
    expect(r.hatching.incubations[0].code).toBe("IN-002"); // newest first
  });

  it("handles a flock with no females and no data without dividing by zero", () => {
    const r = assembleBatchReport(
      batchInput({
        batch: { ...batchInput().batch, initialFemaleParents: 0, currentFemaleParents: 0, initialParents: 10, currentParents: 10 },
        mortalities: [],
        parentSales: [],
        eggProductions: [],
        feed: [],
        medicines: [],
        incubations: [],
      }),
    );
    expect(r.birds.malesPer100Females).toBeNull();
    expect(r.eggs.layPercent).toBeNull();
    expect(r.birds.deaths.percent).toBe(0);
    expect(r.hatching.totals.hatchOfFertile).toBeNull();
    expect(r.feed.byUnit).toEqual([]);
  });

  it("a closed batch stops at its end date", () => {
    const r = assembleBatchReport(
      batchInput({ batch: { ...batchInput().batch, status: "CLOSED", endDate: d("2026-01-14") }, now: d("2026-03-01") }),
    );
    expect(r.batch.ageDay).toBe(14);
    expect(r.weekly).toHaveLength(2);
    expect(r.batch.endDate).toBe("2026-01-14");
  });

  it("shows notes only when shared, without staff names", () => {
    expect(assembleBatchReport(batchInput()).notes).toBeNull();
    const r = assembleBatchReport(
      batchInput({
        notes: [{ text: "Vet visit", createdAt: d("2026-01-09"), createdByOwner: false }],
        batch: { ...batchInput().batch, legacyNote: "Old note" },
      }),
    );
    expect(r.notes).toEqual({ legacy: "Old note", items: [{ text: "Vet visit", date: "2026-01-09", author: "Staff" }] });
  });

  it("never contains money", () => {
    expect(moneyKeysIn(assembleBatchReport(batchInput()))).toEqual([]);
  });
});

describe("incubationNumbers", () => {
  it("matches the incubation page formulas", () => {
    expect(
      incubationNumbers({
        eggsSetCount: 1000,
        stage: "COMPLETED",
        losses: [{ type: "INFERTILE", count: 60 }, { type: "EARLY_DEAD", count: 40 }],
        hatchResults: [{ hatchedA: 800, hatchedB: 30, cull: 10, lateDead: 40, unhatched: 20 }],
      }),
    ).toMatchObject({ candlingLoss: 100, fertileEggs: 900, totalHatched: 840, hatchOfFertile: 93.3, hatchOfSet: 84, lateDead: 40, unhatched: 20 });
  });
});

function incubationInput(overrides: Partial<IncubationReportInput> = {}): IncubationReportInput {
  return {
    now: d("2026-01-12"), // day 12 after setting on Jan 1
    expiresAt: d("2026-02-01"),
    batchCode: "PF-001",
    incubation: {
      id: "inc-1",
      code: "IN-001",
      name: null,
      stage: "CANDLING",
      startDate: d("2026-01-01"),
      candledAt: d("2026-01-09"),
      transferredAt: null,
      hatchedAt: null,
      legacyNote: null,
    },
    eggsSetCount: 1000,
    losses: [{ type: "INFERTILE", count: 60 }],
    hatchResults: [],
    eggMoves: [{ date: d("2026-01-01"), count: 1000, eggTypeName: "Hatchable" }],
    lossRows: [{ date: d("2026-01-09"), type: "INFERTILE", count: 60, note: null }],
    hatchRows: [],
    chickStocks: [],
    chickSales: [],
    notes: null,
    ...overrides,
  };
}

describe("assembleIncubationReport", () => {
  it("shows the day, steps done / due and no hatch yet", () => {
    const r = assembleIncubationReport(incubationInput());
    expect(r.incubation.currentDay).toBe(12);
    expect(r.timeline.map((s) => [s.label, s.status])).toEqual([
      ["Candling", "done"],
      ["Move to hatcher", "due"],
      ["Hatch", "due"],
    ]);
    expect(r.timeline[1].dueDate).toBe("2026-01-18");
    expect(r.numbers.fertileEggs).toBe(940);
    expect(r.numbers.hatchOfFertile).toBeNull();
  });

  it("marks a missed step as late", () => {
    const r = assembleIncubationReport(incubationInput({ now: d("2026-01-20") }));
    expect(r.timeline[1].status).toBe("late");
  });

  it("adds up chicks by grade and never contains money", () => {
    const r = assembleIncubationReport(
      incubationInput({
        incubation: { ...incubationInput().incubation, stage: "COMPLETED", hatchedAt: d("2026-01-21") },
        hatchResults: [{ hatchedA: 800, hatchedB: 30, cull: 10, lateDead: 40, unhatched: 20 }],
        hatchRows: [{ date: d("2026-01-21"), hatchedA: 800, hatchedB: 30, cull: 10, lateDead: 40, unhatched: 20, note: null }],
        chickStocks: [{ grade: "A", currentStock: 100 }, { grade: "B", currentStock: 0 }],
        chickSales: [{ grade: "A", count: 600 }, { grade: "A", count: 100 }, { grade: "B", count: 30 }],
      }),
    );
    expect(r.incubation.currentDay).toBeNull();
    expect(r.chicksLeft).toEqual([{ grade: "A", count: 100 }]);
    expect(r.chicksSentOut).toEqual([{ grade: "A", count: 700 }, { grade: "B", count: 30 }]);
    expect(r.numbers.gradeAPercent).toBe(95.2);
    expect(moneyKeysIn(r)).toEqual([]);
  });
});

describe("share links", () => {
  const ownBatch = { id: "batch-1", hatcheryOwnerId: "owner-1", type: "PARENT_FLOCK" };

  beforeEach(() => {
    jest.clearAllMocks();
    db.hatcheryBatch.findUnique.mockResolvedValue(ownBatch);
    db.hatcheryBatchShareLink.count.mockResolvedValue(0);
    db.hatcheryBatchShareLink.create.mockImplementation(({ data }: any) => Promise.resolve({ id: "link-1", ...data }));
  });

  it("makes a 7-day link with a long random code and saves who made it", async () => {
    const now = d("2026-01-01");
    await createShareLink({ batchId: "batch-1", userId: "owner-1", staffUserId: "staff-9", expiresInDays: 7, showNotes: true, now });
    const data = db.hatcheryBatchShareLink.create.mock.calls[0][0].data;
    expect(data.token).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(data.expiresAt.toISOString()).toBe("2026-01-08T00:00:00.000Z");
    expect(data).toMatchObject({ hatcheryBatchId: "batch-1", createdById: "owner-1", createdByStaffId: "staff-9", showNotes: true });
  });

  it("refuses another hatchery's batch, an incubation-type batch and a bad link time", async () => {
    await expect(createShareLink({ batchId: "batch-1", userId: "owner-2", expiresInDays: 7 })).rejects.toMatchObject({ status: 403 });
    db.hatcheryBatch.findUnique.mockResolvedValueOnce({ ...ownBatch, type: "INCUBATION" });
    await expect(createShareLink({ batchId: "batch-1", userId: "owner-1", expiresInDays: 7 })).rejects.toMatchObject({ status: 400 });
    await expect(createShareLink({ batchId: "batch-1", userId: "owner-1", expiresInDays: 365 })).rejects.toBeInstanceOf(HatcheryShareError);
    db.hatcheryBatch.findUnique.mockResolvedValueOnce(null);
    await expect(createShareLink({ batchId: "nope", userId: "owner-1", expiresInDays: 7 })).rejects.toMatchObject({ status: 404 });
    expect(db.hatcheryBatchShareLink.create).not.toHaveBeenCalled();
  });

  it("stops at 10 open links", async () => {
    db.hatcheryBatchShareLink.count.mockResolvedValue(10);
    await expect(createShareLink({ batchId: "batch-1", userId: "owner-1", expiresInDays: 1 })).rejects.toMatchObject({ status: 409 });
  });

  it("only turns off a link of this batch", async () => {
    db.hatcheryBatchShareLink.findFirst.mockResolvedValue(null);
    await expect(revokeShareLink("batch-1", "other-link", "owner-1")).rejects.toMatchObject({ status: 404 });
    expect(db.hatcheryBatchShareLink.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "other-link", hatcheryBatchId: "batch-1" } }),
    );
  });

  it.each([
    ["expired", { expiresAt: d("2026-01-01"), revokedAt: null }],
    ["turned off", { expiresAt: d("2026-12-01"), revokedAt: d("2026-01-02") }],
  ])("returns nothing for a %s link", async (_label, state) => {
    db.hatcheryBatchShareLink.findUnique.mockResolvedValue({ id: "link-1", hatcheryBatchId: "batch-1", showNotes: false, ...state });
    expect(await getPublicBatchReport("abc", d("2026-01-15"))).toBeNull();
    expect(await getPublicIncubationReport("abc", "inc-1", d("2026-01-15"))).toBeNull();
    expect(db.hatcheryBatchShareLink.update).not.toHaveBeenCalled();
  });

  it("ignores tokens that are empty or too long", async () => {
    expect(await getPublicBatchReport("")).toBeNull();
    expect(await getPublicBatchReport("x".repeat(65))).toBeNull();
    expect(db.hatcheryBatchShareLink.findUnique).not.toHaveBeenCalled();
  });

  it("won't open an incubation from another batch", async () => {
    db.hatcheryBatchShareLink.findUnique.mockResolvedValue({
      id: "link-1",
      hatcheryBatchId: "batch-1",
      showNotes: false,
      expiresAt: d("2026-12-01"),
      revokedAt: null,
    });
    db.hatcheryIncubationBatch.findUnique.mockResolvedValue({ id: "inc-9", parentBatchId: "batch-2" });
    expect(await getPublicIncubationReport("abc", "inc-9", d("2026-01-15"))).toBeNull();
  });
});
