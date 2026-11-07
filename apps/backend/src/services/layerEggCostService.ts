import { BatchStatus } from "@prisma/client";
import prisma from "../utils/prisma";
import { bsMonthOfDayKey, bsMonthStartDayKey, nepalBatchDay, toNepalDayKey } from "../utils/nepalBsDate";
import { dayKeyFromNumber, dayNumber, periodStartOf, round } from "./farmerAnalytics/period";
import { hensByDay, layingPercent } from "./farmerAnalytics/layerStats";
import { naturalDeathWhere } from "./farmerAnalytics/scope";

/**
 * Cost per egg for one layer batch (the "Egg cost" tab).
 *
 * Rules, in plain words:
 * - Flock cost = chick/pullet cost + every other cost before the first egg day.
 * - Running costs = costs from the first egg day on, without chick cost.
 * - Eggs = all egg types laid (cracked eggs are sold too).
 * - Every date is a Nepal day; months are Nepali (BS) months, weeks run Sunday to Saturday.
 */

export const EGGS_PER_TRAY = 30;
const CHICK_NAMES = new Set(["chicks", "hatchery"]);
const GROUPS = ["Feed", "Chicks", "Medicine", "Labour", "Electricity", "Equipment", "Other"] as const;
type Group = (typeof GROUPS)[number];

export type EggCostInput = {
  batch: { startDate: Date; endDate: Date | null; status: BatchStatus | string; initialChicks: number };
  expenses: Array<{ date: Date; amount: number; category: string | null }>;
  eggs: Array<{ date: Date; count: number; eggTypeId: string }>;
  eggSales: Array<{
    date: Date;
    amount: number;
    subtotalAmount: number | null;
    quantity: number;
    eggTypeId: string | null;
    lines: Array<{ eggTypeId: string; quantity: number; unitPrice: number }>;
  }>;
  henSales: Array<{ date: Date; quantity: number; amount: number }>;
  deaths: Array<{ date: Date; count: number }>;
  feed: Array<{ date: Date; quantityKg: number }>;
  stock: Array<{ eggTypeId: string; quantity: number }>;
  eggTypes: Array<{ id: string; name: string }>;
};

export function costGroupOf(category: string | null | undefined): Group {
  const name = (category ?? "").trim().toLowerCase();
  if (name === "feed") return "Feed";
  if (CHICK_NAMES.has(name)) return "Chicks";
  if (name === "medicine" || name === "medicines") return "Medicine";
  if (name === "labour" || name === "labor") return "Labour";
  if (name === "electricity") return "Electricity";
  if (name === "equipment") return "Equipment";
  return "Other";
}

const add = <K>(map: Map<K, number>, key: K, value: number) => map.set(key, (map.get(key) ?? 0) + value);
const div = (a: number, b: number) => (b > 0 ? a / b : null);
const r2 = (v: number | null) => (v == null ? null : round(v, 2));
const r1 = (v: number | null) => (v == null ? null : round(v, 1));
const r0 = (v: number | null) => (v == null ? null : Math.round(v));

/** Day after the last day of the BS month that `dayKey` falls in. */
function nextMonthStart(dayKey: string) {
  const bs = bsMonthOfDayKey(dayKey);
  return bs.month === 12 ? bsMonthStartDayKey(bs.year + 1, 1) : bsMonthStartDayKey(bs.year, bs.month + 1);
}
const addDays = (dayKey: string, n: number) => dayKeyFromNumber(dayNumber(dayKey) + n);

type DayRow = {
  eggs: number;
  running: number;
  flock: number;
  chicks: number;
  feedKg: number;
  eggsSold: number;
  eggMoney: number;
  henMoney: number;
  runningByGroup: Map<Group, number>;
  allByGroup: Map<Group, number>;
  otherNames: Map<string, number>;
};
const emptyDay = (): DayRow => ({
  eggs: 0,
  running: 0,
  flock: 0,
  chicks: 0,
  feedKg: 0,
  eggsSold: 0,
  eggMoney: 0,
  henMoney: 0,
  runningByGroup: new Map(),
  allByGroup: new Map(),
  otherNames: new Map(),
});

/** Builds the whole Egg cost view from raw rows. Pure, so every number is easy to test. */
export function assembleEggCost(input: EggCostInput, now: Date = new Date()) {
  const { batch } = input;
  const closed = batch.status === BatchStatus.COMPLETED;
  const startDay = toNepalDayKey(batch.startDate);
  const today = toNepalDayKey(now);
  const endDay = closed && batch.endDate ? toNepalDayKey(batch.endDate) : today;
  const typeName = new Map(input.eggTypes.map((t) => [t.id, t.name]));

  // ---- Eggs by day and by type
  const days = new Map<string, DayRow>();
  const day = (key: string) => {
    let row = days.get(key);
    if (!row) days.set(key, (row = emptyDay()));
    return row;
  };
  const laidByType = new Map<string, number>();
  for (const row of input.eggs) {
    if (row.count <= 0) continue;
    day(toNepalDayKey(row.date)).eggs += row.count;
    add(laidByType, row.eggTypeId, row.count);
  }
  const eggDays = [...days.entries()].filter(([, r]) => r.eggs > 0).map(([k]) => k).sort();
  const layingStartDay = eggDays[0] ?? null;
  const totalEggs = [...days.values()].reduce((s, r) => s + r.eggs, 0);

  // ---- Costs: flock (chicks + anything before laying) vs running
  let flockCost = 0;
  let chickCost = 0;
  for (const row of input.expenses) {
    const amount = Number(row.amount || 0);
    if (!amount) continue;
    const key = toNepalDayKey(row.date);
    const group = costGroupOf(row.category);
    const target = day(key);
    add(target.allByGroup, group, amount);
    if (group === "Other") add(target.otherNames, (row.category ?? "Other").trim() || "Other", amount);
    const isChick = group === "Chicks";
    if (isChick || !layingStartDay || key < layingStartDay) {
      target.flock += amount;
      flockCost += amount;
      if (isChick) {
        target.chicks += amount;
        chickCost += amount;
      }
    } else {
      target.running += amount;
      add(target.runningByGroup, group, amount);
    }
  }

  // ---- Feed kg (only from laying start counts toward per-egg feed)
  for (const row of input.feed) {
    const kg = Number(row.quantityKg || 0);
    if (kg > 0) day(toNepalDayKey(row.date)).feedKg += kg;
  }

  // ---- Egg sales: money per type after any bill discount
  const soldByType = new Map<string, { qty: number; money: number }>();
  for (const sale of input.eggSales) {
    const key = toNepalDayKey(sale.date);
    const target = day(key);
    if (sale.lines.length > 0) {
      const gross = sale.lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
      const base = sale.subtotalAmount && sale.subtotalAmount > 0 ? sale.subtotalAmount : gross;
      const factor = base > 0 ? Number(sale.amount) / base : 1;
      for (const line of sale.lines) {
        const money = line.quantity * line.unitPrice * factor;
        target.eggsSold += line.quantity;
        target.eggMoney += money;
        const t = soldByType.get(line.eggTypeId) ?? { qty: 0, money: 0 };
        soldByType.set(line.eggTypeId, { qty: t.qty + line.quantity, money: t.money + money });
      }
    } else {
      const qty = Number(sale.quantity || 0);
      target.eggsSold += qty;
      target.eggMoney += Number(sale.amount || 0);
      if (sale.eggTypeId) {
        const t = soldByType.get(sale.eggTypeId) ?? { qty: 0, money: 0 };
        soldByType.set(sale.eggTypeId, { qty: t.qty + qty, money: t.money + Number(sale.amount || 0) });
      }
    }
  }
  for (const sale of input.henSales) day(toNepalDayKey(sale.date)).henMoney += Number(sale.amount || 0);

  // ---- Hens alive each morning (deaths and hens sold count from the next day)
  const losses = [
    ...input.deaths.map((d) => ({ date: d.date, count: d.count })),
    ...input.henSales.map((s) => ({ date: s.date, count: Number(s.quantity || 0) })),
  ];
  const hens = hensByDay(batch, losses, startDay, endDay < startDay ? startDay : endDay);
  const lostTotal = losses.reduce((s, l) => s + l.count, 0);
  const hensNow = closed ? 0 : Math.max(0, batch.initialChicks - lostTotal);

  // ---- One period summary (inclusive day keys)
  const wholeSalePrice = (() => {
    let qty = 0;
    let money = 0;
    for (const r of days.values()) {
      qty += r.eggsSold;
      money += r.eggMoney;
    }
    return div(money, qty);
  })();

  function summarize(from: string, to: string, includeFlock: boolean) {
    let eggs = 0;
    let running = 0;
    let flock = 0;
    let feedKg = 0;
    let eggsSold = 0;
    let eggMoney = 0;
    let henMoney = 0;
    let henDaysAll = 0;
    let henDaysEgg = 0;
    let eggsOnEggDays = 0;
    const groups = new Map<Group, number>();
    const runningGroups = new Map<Group, number>();
    const otherNames = new Map<string, number>();
    for (const [key, r] of days) {
      if (key < from || key > to) continue;
      eggs += r.eggs;
      running += r.running;
      flock += r.flock;
      eggsSold += r.eggsSold;
      eggMoney += r.eggMoney;
      henMoney += r.henMoney;
      if (layingStartDay && key >= layingStartDay) feedKg += r.feedKg;
      const source = includeFlock ? r.allByGroup : r.runningByGroup;
      for (const [g, v] of source) add(groups, g, v);
      for (const [g, v] of r.runningByGroup) add(runningGroups, g, v);
      // "Other" names: before laying they are flock cost, so only listed when flock is included.
      if (includeFlock || (layingStartDay && key >= layingStartDay)) {
        for (const [n, v] of r.otherNames) add(otherNames, n, v);
      }
    }
    for (const [key, count] of hens) {
      // Hen-days count only from the laying start (rearing days have no eggs or running costs).
      if (key < from || key > to || (layingStartDay && key < layingStartDay)) continue;
      henDaysAll += count;
      const eggsToday = days.get(key)?.eggs ?? 0;
      if (eggsToday > 0) {
        henDaysEgg += count;
        eggsOnEggDays += eggsToday;
      }
    }
    const runningPerEgg = div(running, eggs);
    const salePrice = div(eggMoney, eggsSold);
    const priceForMargin = salePrice ?? wholeSalePrice;
    const costBase = includeFlock ? running + flock : running;
    // Feed per egg always uses running feed (rearing feed is part of the flock cost).
    const feedCost = runningGroups.get("Feed") ?? 0;
    const breakdown = GROUPS.map((g) => ({ group: g, cost: groups.get(g) ?? 0 }))
      .filter((g) => g.cost > 0)
      .sort((a, b) => b.cost - a.cost)
      .map((g) => ({
        group: g.group,
        cost: round(g.cost),
        perEgg: r2(div(g.cost, eggs)),
        percent: r1(div(g.cost * 100, costBase)),
        names:
          g.group === "Other"
            ? [...otherNames.entries()].sort((a, b) => b[1] - a[1]).map(([name, cost]) => ({ name, cost: round(cost) }))
            : undefined,
      }));
    return {
      from,
      to,
      days: Math.max(0, dayNumber(to) - dayNumber(from) + 1),
      eggs,
      eggsSold,
      eggMoney: round(eggMoney),
      henMoney: round(henMoney),
      runningCost: round(running),
      runningPerEgg: r2(runningPerEgg),
      feedCost: round(feedCost),
      feedPerEgg: r2(div(feedCost, eggs)),
      feedSharePercent: r1(div(feedCost * 100, running)),
      feedKg: round(feedKg, 1),
      feedGramsPerEgg: feedKg > 0 ? r0(div(feedKg * 1000, eggs)) : null,
      feedGramsPerHenDay: feedKg > 0 ? r0(div(feedKg * 1000, henDaysAll)) : null,
      salePrice: r2(salePrice),
      marginPerEgg: priceForMargin != null && runningPerEgg != null ? r2(priceForMargin - runningPerEgg) : null,
      marginUsesBatchPrice: salePrice == null && wholeSalePrice != null,
      breakEvenPerTray: runningPerEgg != null ? Math.round(runningPerEgg * EGGS_PER_TRAY) : null,
      layingPercent: layingPercent(eggsOnEggDays, henDaysEgg),
      costPerHenDay: r2(div(running, henDaysAll)),
      breakdown,
    };
  }

  const totalCost = [...days.values()].reduce((s, r) => s + r.running + r.flock, 0);
  const totalHenMoney = [...days.values()].reduce((s, r) => s + r.henMoney, 0);
  const totalEggMoney = [...days.values()].reduce((s, r) => s + r.eggMoney, 0);
  const totalRunning = [...days.values()].reduce((s, r) => s + r.running, 0);

  const rearingByGroup = new Map<Group, number>();
  for (const [key, r] of days) {
    for (const [g, v] of r.allByGroup) {
      if (g === "Chicks" || !layingStartDay || key < layingStartDay) add(rearingByGroup, g, v);
    }
  }
  const rearing = {
    days: nepalBatchDay(batch.startDate, closed && batch.endDate ? batch.endDate : now),
    totalCost: round(flockCost),
    byGroup: GROUPS.map((g) => ({ group: g, cost: round(rearingByGroup.get(g) ?? 0) })).filter((g) => g.cost > 0),
  };

  if (totalEggs === 0 || !layingStartDay) {
    return { status: "NO_EGGS" as const, closed, startDay, endDay, today, layingStartDay: null, hensNow, rearing };
  }

  // ---- Periods: whole batch, the month of the last day, and the month before
  const lastMonthStart = periodStartOf(endDay, "monthly");
  const prevMonthStart = periodStartOf(addDays(lastMonthStart, -1), "monthly");
  const monthPeriod = (start: string, isLast: boolean) => {
    const to = isLast ? endDay : addDays(nextMonthStart(start), -1);
    if (to < layingStartDay) return null;
    const from = start < layingStartDay ? layingStartDay : start;
    return { ...summarize(from, to, false), monthStart: start, partial: isLast && !closed };
  };
  const whole = summarize("0000-01-01", "9999-12-31", true);
  const periods = {
    whole: { ...whole, from: layingStartDay, to: endDay, days: dayNumber(endDay) - dayNumber(layingStartDay) + 1 },
    current: monthPeriod(lastMonthStart, true),
    previous: monthPeriod(prevMonthStart, false),
  };

  // ---- Payback of the flock cost
  const recovered = totalEggMoney + totalHenMoney - totalRunning;
  const paidBack = flockCost > 0 && recovered >= flockCost;

  // ---- Month and week rows (from the laying start)
  function rows(groupBy: "monthly" | "weekly") {
    const out = [];
    let start = periodStartOf(layingStartDay!, groupBy);
    let cumulativeCost = 0;
    let cumulativeEggs = 0;
    for (const [key, r] of days) if (key < start) cumulativeCost += r.running + r.flock;
    for (const [key, r] of days) if (key < start) cumulativeEggs += r.eggs;
    while (start <= endDay) {
      const next = groupBy === "weekly" ? addDays(start, 7) : nextMonthStart(start);
      const to = addDays(next, -1) > endDay ? endDay : addDays(next, -1);
      const s = summarize(start, to, false);
      for (const [key, r] of days) if (key >= start && key <= to) cumulativeCost += r.running + r.flock;
      cumulativeEggs += s.eggs;
      out.push({
        start,
        partial: to === endDay && !closed,
        eggs: s.eggs,
        layingPercent: s.layingPercent,
        runningCost: s.runningCost,
        runningPerEgg: s.runningPerEgg,
        feedGramsPerEgg: s.feedGramsPerEgg,
        salePrice: s.salePrice,
        marginPerEgg: s.salePrice != null && s.runningPerEgg != null ? r2(s.salePrice - s.runningPerEgg) : null,
        cumulativeFullPerEgg: r2(div(cumulativeCost, cumulativeEggs)),
        net: round(s.eggMoney + s.henMoney - s.runningCost),
      });
      start = next;
    }
    return out;
  }
  const monthly = rows("monthly");
  const weekly = rows("weekly");

  // ---- Expected payback month: last 3 full months with eggs, average net
  const expected = (() => {
    if (closed) return { reason: "closed" as const, monthStart: null, months: null };
    if (flockCost <= 0) return { reason: "noFlockCost" as const, monthStart: null, months: null };
    if (paidBack) return { reason: "paid" as const, monthStart: null, months: null };
    const full = monthly.filter((m) => !m.partial && m.eggs > 0).slice(-3);
    if (full.length < 2) return { reason: "notEnoughMonths" as const, monthStart: null, months: null };
    const avg = full.reduce((s, m) => s + m.net, 0) / full.length;
    if (avg <= 0) return { reason: "notPaying" as const, monthStart: null, months: null };
    const months = Math.ceil((flockCost - recovered) / avg);
    if (months > 36) return { reason: "tooLong" as const, monthStart: null, months };
    let start = lastMonthStart;
    for (let i = 0; i < months; i++) start = nextMonthStart(start);
    return { reason: "ok" as const, monthStart: start, months };
  })();

  // ---- Prices by egg type and the worth of eggs in stock
  const stockBy = new Map(input.stock.map((s) => [s.eggTypeId, Number(s.quantity || 0)]));
  const typeIds = new Set([...laidByType.keys(), ...soldByType.keys(), ...stockBy.keys()]);
  const byType = [...typeIds]
    .map((id) => {
      const sold = soldByType.get(id);
      return {
        eggTypeId: id,
        name: typeName.get(id) ?? "Egg",
        laid: laidByType.get(id) ?? 0,
        sold: sold?.qty ?? 0,
        avgPrice: sold ? r2(div(sold.money, sold.qty)) : null,
        inStock: Math.max(0, stockBy.get(id) ?? 0),
      };
    })
    .sort((a, b) => b.laid - a.laid);
  let stockWorth: number | null = 0;
  for (const t of byType) {
    if (t.inStock <= 0) continue;
    // Exact price (not the rounded one shown), so the total is not off by rounding.
    const sold = soldByType.get(t.eggTypeId);
    const price = (sold ? div(sold.money, sold.qty) : null) ?? wholeSalePrice;
    if (price == null) {
      stockWorth = null;
      break;
    }
    stockWorth += t.inStock * price;
  }

  return {
    status: "OK" as const,
    closed,
    startDay,
    endDay,
    today,
    layingStartDay,
    hensNow,
    initialHens: batch.initialChicks,
    rearing,
    periods,
    full: {
      totalCost: round(totalCost),
      totalEggs,
      fullPerEgg: r2(div(totalCost, totalEggs)),
      finalPerEgg: closed ? r2(div(totalCost - totalHenMoney, totalEggs)) : null,
      fullBreakEvenPerTray: Math.round((totalCost / totalEggs) * EGGS_PER_TRAY),
      eggsPerHen: r1(div(totalEggs, batch.initialChicks)),
    },
    payback: {
      flockCost: round(flockCost),
      chicks: round(chickCost),
      rearing: round(flockCost - chickCost),
      recovered: round(recovered),
      percent: flockCost > 0 ? r1((Math.max(0, recovered) / flockCost) * 100) : null,
      paidBack,
      extraProfit: paidBack ? round(recovered - flockCost) : 0,
      expected,
    },
    prices: {
      averagePrice: r2(wholeSalePrice),
      byType,
      stockWorth: stockWorth == null ? null : round(stockWorth),
    },
    monthly,
    weekly,
  };
}

/** Loads one layer batch's rows. The batch must already be checked for owner and type. */
export async function loadEggCostInput(batch: {
  id: string;
  startDate: Date;
  endDate: Date | null;
  status: BatchStatus;
  initialChicks: number;
  farm: { ownerId: string };
}): Promise<EggCostInput> {
  const batchId = batch.id;
  const [expenses, eggs, eggSales, henSales, deaths, feed, stock, eggTypes] = await Promise.all([
    prisma.expense.findMany({ where: { batchId }, select: { date: true, amount: true, category: { select: { name: true } } } }),
    prisma.eggProductionEntry.findMany({
      where: { eggProduction: { batchId } },
      select: { count: true, eggTypeId: true, eggProduction: { select: { date: true } } },
    }),
    prisma.sale.findMany({
      where: { batchId, itemType: "EGGS" },
      select: {
        date: true,
        amount: true,
        subtotalAmount: true,
        quantity: true,
        eggTypeId: true,
        eggLines: { select: { eggTypeId: true, quantity: true, unitPrice: true } },
      },
    }),
    prisma.sale.findMany({ where: { batchId, itemType: "Chicken_Meat" }, select: { date: true, quantity: true, amount: true } }),
    prisma.mortality.findMany({ where: { batchId, ...naturalDeathWhere }, select: { date: true, count: true } }),
    prisma.feedConsumption.findMany({ where: { batchId }, select: { date: true, quantityKg: true } }),
    prisma.batchEggInventory.findMany({ where: { batchId }, select: { eggTypeId: true, quantity: true } }),
    prisma.eggType.findMany({ where: { userId: batch.farm.ownerId }, select: { id: true, name: true } }),
  ]);
  return {
    batch,
    expenses: expenses.map((e) => ({ date: e.date, amount: Number(e.amount), category: e.category?.name ?? null })),
    eggs: eggs.map((e) => ({ date: e.eggProduction.date, count: e.count, eggTypeId: e.eggTypeId })),
    eggSales: eggSales.map((s) => ({
      date: s.date,
      amount: Number(s.amount),
      subtotalAmount: s.subtotalAmount == null ? null : Number(s.subtotalAmount),
      quantity: Number(s.quantity),
      eggTypeId: s.eggTypeId,
      lines: s.eggLines.map((l) => ({ eggTypeId: l.eggTypeId, quantity: l.quantity, unitPrice: Number(l.unitPrice) })),
    })),
    henSales: henSales.map((s) => ({ date: s.date, quantity: Number(s.quantity), amount: Number(s.amount) })),
    deaths,
    feed: feed.map((f) => ({ date: f.date, quantityKg: Number(f.quantityKg ?? 0) })),
    stock,
    eggTypes,
  };
}
