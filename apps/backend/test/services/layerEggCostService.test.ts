import { assembleEggCost, costGroupOf, type EggCostInput } from "../../src/services/layerEggCostService";
import { bsMonthStartDayKey } from "../../src/utils/nepalBsDate";
import { dayKeyFromNumber, dayNumber } from "../../src/services/farmerAnalytics/period";

// Nepali months of 2083: Ashwin (6), Kartik (7), Mangsir (8).
const ASHWIN = bsMonthStartDayKey(2083, 6);
const KARTIK = bsMonthStartDayKey(2083, 7);
const MANGSIR = bsMonthStartDayKey(2083, 8);
const KARTIK_DAYS = dayNumber(MANGSIR) - dayNumber(KARTIK);
/** Day `n` (1 = first day) of a BS month, as a UTC-midnight Date (how the app saves dates). */
const on = (monthStart: string, n: number) => new Date(`${dayKeyFromNumber(dayNumber(monthStart) + n - 1)}T00:00:00.000Z`);
const L = "large";
const C = "cracked";

/**
 * 100 pullets from Ashwin 1. Laying starts Ashwin 20. Today is Mangsir 5.
 * Flock cost: chicks 65,000 + rearing feed 5,000 (Ashwin 10) + late "Hatchery" 1,000 = 71,000.
 * Running: Ashwin 2,000 · Kartik 13,000 (feed 9,000, labour 3,000, water 600, medicine 400) · Mangsir 3,000.
 * Eggs: Ashwin 160 · Kartik 900 (10 days × 90) · Mangsir 340 (4 days × 85) = 1,400.
 */
function baseInput(): EggCostInput {
  return {
    batch: { startDate: on(ASHWIN, 1), endDate: null, status: "ACTIVE", initialChicks: 100 },
    expenses: [
      { date: on(ASHWIN, 1), amount: 65000, category: "Chicks" },
      { date: on(ASHWIN, 10), amount: 5000, category: "Feed" },
      { date: on(ASHWIN, 25), amount: 2000, category: "Feed" },
      { date: on(KARTIK, 5), amount: 9000, category: "Feed" },
      { date: on(KARTIK, 10), amount: 3000, category: "Labour" },
      { date: on(KARTIK, 12), amount: 600, category: "Water" },
      { date: on(KARTIK, 15), amount: 400, category: "Medicine" },
      { date: on(MANGSIR, 2), amount: 3000, category: "Feed" },
      { date: on(MANGSIR, 3), amount: 1000, category: "Hatchery" },
    ],
    eggs: [
      { date: on(ASHWIN, 20), count: 80, eggTypeId: L },
      { date: on(ASHWIN, 25), count: 80, eggTypeId: L },
      ...Array.from({ length: 10 }, (_, i) => [
        { date: on(KARTIK, i + 1), count: 80, eggTypeId: L },
        { date: on(KARTIK, i + 1), count: 10, eggTypeId: C },
      ]).flat(),
      ...Array.from({ length: 4 }, (_, i) => ({ date: on(MANGSIR, i + 1), count: 85, eggTypeId: L })),
    ],
    eggSales: [
      // 5% bill discount: 9,800 → 9,310, so each line keeps 95% of its money.
      {
        date: on(KARTIK, 11),
        amount: 9310,
        subtotalAmount: 9800,
        quantity: 700,
        eggTypeId: null,
        lines: [
          { eggTypeId: L, quantity: 600, unitPrice: 15 },
          { eggTypeId: C, quantity: 100, unitPrice: 8 },
        ],
      },
      { date: on(MANGSIR, 4), amount: 3000, subtotalAmount: null, quantity: 200, eggTypeId: L, lines: [] },
    ],
    henSales: [{ date: on(KARTIK, 20), quantity: 10, amount: 4000 }],
    deaths: [{ date: on(KARTIK, 5), count: 5 }],
    feed: [
      { date: on(ASHWIN, 10), quantityKg: 250 },
      { date: on(ASHWIN, 25), quantityKg: 100 },
      { date: on(KARTIK, 5), quantityKg: 450 },
      { date: on(MANGSIR, 2), quantityKg: 150 },
    ],
    stock: [
      { eggTypeId: L, quantity: 500 },
      { eggTypeId: C, quantity: 0 },
    ],
    eggTypes: [
      { id: L, name: "Large" },
      { id: C, name: "Cracked" },
    ],
  };
}
const NOW = new Date(`${dayKeyFromNumber(dayNumber(MANGSIR) + 4)}T06:00:00.000Z`); // Mangsir 5, midday Nepal

describe("costGroupOf", () => {
  it("groups by category name", () => {
    expect(costGroupOf("Hatchery")).toBe("Chicks");
    expect(costGroupOf(" feed ")).toBe("Feed");
    expect(costGroupOf("Labor")).toBe("Labour");
    expect(costGroupOf("Water")).toBe("Other");
    expect(costGroupOf(null)).toBe("Other");
  });
});

describe("assembleEggCost", () => {
  const view: any = assembleEggCost(baseInput(), NOW);

  it("splits flock cost (chicks + before laying) from running costs", () => {
    expect(view.status).toBe("OK");
    expect(view.layingStartDay).toBe(dayKeyFromNumber(dayNumber(ASHWIN) + 19));
    expect(view.payback).toMatchObject({ flockCost: 71000, chicks: 66000, rearing: 5000 });
    expect(view.periods.whole.runningCost).toBe(18000);
    expect(view.full).toMatchObject({ totalCost: 89000, totalEggs: 1400, fullPerEgg: 63.57, finalPerEgg: null, fullBreakEvenPerTray: 1907, eggsPerHen: 14 });
    expect(view.hensNow).toBe(85);
  });

  it("works out the current (part) month", () => {
    const m = view.periods.current;
    expect(m.monthStart).toBe(MANGSIR);
    expect(m.partial).toBe(true);
    expect(m.days).toBe(5);
    expect(m).toMatchObject({
      eggs: 340,
      runningCost: 3000, // the late Hatchery 1,000 is flock cost, not running
      runningPerEgg: 8.82,
      feedPerEgg: 8.82,
      feedSharePercent: 100,
      feedGramsPerEgg: 441, // 150 kg ÷ 340
      feedGramsPerHenDay: 353, // 150 kg ÷ (5 days × 85 hens)
      layingPercent: 100,
      salePrice: 15,
      marginPerEgg: 6.18,
      breakEvenPerTray: 265,
      costPerHenDay: 7.06,
    });
  });

  it("works out the full previous month, with a negative margin and a bill discount", () => {
    const m = view.periods.previous;
    expect(m.monthStart).toBe(KARTIK);
    expect(m.partial).toBe(false);
    expect(m).toMatchObject({
      eggs: 900,
      eggsSold: 700,
      eggMoney: 9310,
      runningCost: 13000,
      runningPerEgg: 14.44,
      feedPerEgg: 10,
      feedSharePercent: 69.2,
      feedGramsPerEgg: 500,
      layingPercent: 92.3, // 900 eggs ÷ (5 days × 100 + 5 days × 95)
      salePrice: 13.3,
      marginPerEgg: -1.14,
    });
    const henDays = 5 * 100 + 15 * 95 + (KARTIK_DAYS - 20) * 85;
    expect(m.costPerHenDay).toBeCloseTo(13000 / henDays, 2);
    expect(m.breakdown.map((b: any) => [b.group, b.cost, b.percent])).toEqual([
      ["Feed", 9000, 69.2],
      ["Labour", 3000, 23.1],
      ["Other", 600, 4.6],
      ["Medicine", 400, 3.1],
    ]);
    expect(m.breakdown[2].names).toEqual([{ name: "Water", cost: 600 }]);
  });

  it("includes chick cost in the whole-batch breakdown", () => {
    const w = view.periods.whole;
    expect(w.breakdown.map((b: any) => [b.group, b.cost])).toEqual([
      ["Chicks", 66000],
      ["Feed", 19000],
      ["Labour", 3000],
      ["Other", 600],
      ["Medicine", 400],
    ]);
    expect(w.runningPerEgg).toBe(12.86);
    expect(w.layingPercent).toBe(92.4); // 1,400 ÷ (200 + 975 + 340) hen-days on egg days
  });

  it("gives prices by egg type and the worth of eggs in stock", () => {
    expect(view.prices.averagePrice).toBe(13.68); // 12,310 ÷ 900
    expect(view.prices.byType).toEqual([
      { eggTypeId: L, name: "Large", laid: 1300, sold: 800, avgPrice: 14.44, inStock: 500 },
      { eggTypeId: C, name: "Cracked", laid: 100, sold: 100, avgPrice: 7.6, inStock: 0 },
    ]);
    expect(view.prices.stockWorth).toBe(7218.75); // 500 × 14.4375
  });

  it("gives month and week rows with the running full cost per egg", () => {
    expect(view.monthly.map((m: any) => [m.start, m.eggs, m.cumulativeFullPerEgg, m.partial])).toEqual([
      [ASHWIN, 160, 450, false], // 72,000 ÷ 160
      [KARTIK, 900, 80.19, false], // 85,000 ÷ 1,060
      [MANGSIR, 340, 63.57, true], // 89,000 ÷ 1,400
    ]);
    expect(view.monthly[1].net).toBe(310); // 9,310 eggs + 4,000 hens − 13,000
    expect(view.weekly.length).toBeGreaterThan(5);
    expect(view.weekly.reduce((s: number, w: any) => s + w.eggs, 0)).toBe(1400);
  });

  it("does not show a payback month while running costs are higher than sales", () => {
    expect(view.payback.recovered).toBe(-1690);
    expect(view.payback.percent).toBe(0);
    expect(view.payback.paidBack).toBe(false);
    expect(view.payback.expected.reason).toBe("notPaying");
  });

  it("guesses the payback month from the last full months", () => {
    const input = baseInput();
    input.eggSales.push(
      { date: on(ASHWIN, 26), amount: 20000, subtotalAmount: null, quantity: 1, eggTypeId: L, lines: [] },
      { date: on(KARTIK, 12), amount: 10000, subtotalAmount: null, quantity: 1, eggTypeId: L, lines: [] }
    );
    const v: any = assembleEggCost(input, NOW);
    // Average net of Ashwin (18,000) and Kartik (10,310) = 14,155; 42,690 left → 4 months after Mangsir.
    expect(v.payback.expected).toEqual({ reason: "ok", monthStart: bsMonthStartDayKey(2083, 12), months: 4 });

    const slow = baseInput();
    slow.eggSales.push({ date: on(ASHWIN, 26), amount: 2000, subtotalAmount: null, quantity: 1, eggTypeId: L, lines: [] });
    expect((assembleEggCost(slow, NOW) as any).payback.expected.reason).toBe("tooLong");
  });

  it("shows paid back with extra profit", () => {
    const input = baseInput();
    input.eggSales.push({ date: on(KARTIK, 13), amount: 100000, subtotalAmount: null, quantity: 1, eggTypeId: L, lines: [] });
    const v: any = assembleEggCost(input, NOW);
    expect(v.payback.paidBack).toBe(true);
    expect(v.payback.extraProfit).toBe(98310 - 71000);
    expect(v.payback.expected.reason).toBe("paid");
  });

  it("gives final numbers for a closed batch", () => {
    const input = baseInput();
    input.batch = { ...input.batch, status: "COMPLETED", endDate: on(MANGSIR, 4) };
    const v: any = assembleEggCost(input, NOW);
    expect(v.closed).toBe(true);
    expect(v.full.finalPerEgg).toBe(60.71); // (89,000 − 4,000 hens sold) ÷ 1,400
    expect(v.periods.current.partial).toBe(false);
    expect(v.hensNow).toBe(0);
    expect(v.payback.expected.reason).toBe("closed");
  });

  it("shows rearing costs and no cost per egg before laying starts", () => {
    const input = baseInput();
    input.eggs = [];
    input.eggSales = [];
    const v: any = assembleEggCost(input, NOW);
    expect(v.status).toBe("NO_EGGS");
    expect(v.rearing.totalCost).toBe(89000);
    expect(v.rearing.byGroup.find((g: any) => g.group === "Chicks").cost).toBe(66000);
    expect(v.periods).toBeUndefined();
  });

  it("leaves feed grams and sale price empty when they were not recorded", () => {
    const input = baseInput();
    input.feed = [];
    input.eggSales = [];
    const v: any = assembleEggCost(input, NOW);
    expect(v.periods.current.feedGramsPerEgg).toBeNull();
    expect(v.periods.current.salePrice).toBeNull();
    expect(v.periods.current.marginPerEgg).toBeNull();
    expect(v.prices.stockWorth).toBeNull();
  });
});
