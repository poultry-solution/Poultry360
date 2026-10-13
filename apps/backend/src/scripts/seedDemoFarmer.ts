/**
 * Demo farmer seed: one realistic farmer, entered through the normal API so
 * stock, expenses, deaths from sales, balances and FCR are created exactly as
 * when a farmer uses the app.
 *
 * - Creates (or reuses) the reserved demo farmer login only. Never touches other users.
 * - Refuses to run if that farmer already has farms (re-running would duplicate data).
 * - Local database by default. Against any other database it needs
 *   P360_DEMO_SEED_CONFIRMED=1 (set by scripts/seed-demo-prod.sh after its backup prompt).
 * - The backend API must be running (P360_API_URL, default http://localhost:8081/api/v1).
 *
 * Data, all dated relative to today in Nepal:
 *   Farm 1 (broilers): 2 closed batches + 1 active batch.
 *   Farm 2 (layers):   1 active layer batch with daily eggs and egg sales.
 *   3 suppliers (feed, chicks, medicine), 5 customers, cash and credit sales,
 *   1% weight discount on some broiler sales, later payments both ways.
 */

import "dotenv/config";
import bcrypt from "bcrypt";
import NepaliDate from "nepali-date-converter";
import prisma from "../utils/prisma";
import { DEFAULT_DEMO_PASSWORD, DEMO_ACCOUNTS, isLocalDatabase, upsertDemoUser } from "./demoSeedUtils";

const account = DEMO_ACCOUNTS.farmer;
const API_URL = (process.env.P360_API_URL || `http://localhost:${process.env.PORT || 8081}/api/v1`).replace(/\/$/, "");

// ── Dates (Nepal days) ────────────────────────────────────────────────────────

const NEPAL_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;
const NEPAL_TODAY = new Date(Date.now() + NEPAL_OFFSET_MS).toISOString().slice(0, 10);

/** AD YYYY-MM-DD of the Nepal day `ago` days before today. */
function dayAgo(ago: number): string {
  const [y, m, d] = NEPAL_TODAY.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - ago)).toISOString().slice(0, 10);
}

/** Same format the farmer screens send: midnight UTC of that day (05:45 in Nepal). */
const isoAgo = (ago: number) => `${dayAgo(ago)}T00:00:00.000Z`;

const BS_MONTHS = ["Baisakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin", "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"];
function bsMonthDay(ago: number): string {
  const nd = new NepaliDate(new Date(`${dayAgo(ago)}T06:00:00.000Z`));
  return `${BS_MONTHS[nd.getMonth()]}-${nd.getDate()}`;
}

// ── Small helpers ─────────────────────────────────────────────────────────────

/** Deterministic random numbers so every run builds the same data. */
function makeRandom(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = makeRandom(360);
const between = (min: number, max: number) => min + Math.floor(rnd() * (max - min + 1));
const round2 = (n: number) => Math.round(n * 100) / 100;

let token = "";
let callCount = 0;

async function api<T = any>(method: string, path: string, body?: unknown): Promise<T> {
  callCount += 1;
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json: any;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} failed (${res.status}): ${json?.message || text}\nBody: ${JSON.stringify(body)}`);
  }
  return json as T;
}

// ── Event queue (everything is entered in date order, like real life) ─────────

type Event = { ago: number; order: number; label: string; run: () => Promise<void> };
const events: Event[] = [];
const on = (ago: number, order: number, label: string, run: () => Promise<void>) =>
  events.push({ ago, order, label, run });

// Order inside one day: purchases → batch start → usage/expenses → deaths → weights → eggs → sales → payments → close.
const O = { purchase: 1, batch: 2, usage: 3, expense: 4, death: 5, weight: 6, eggs: 7, sale: 8, payment: 9, close: 10 };

// ── Shared ids filled while the seed runs ─────────────────────────────────────

const ids = {
  farm1: "",
  farm2: "",
  feedSupplier: "",
  chickSupplier: "",
  vetSupplier: "",
  catFeed: "",
  catMedicine: "",
  catLabour: "",
  catElectricity: "",
  catBedding: "",
  customers: {} as Record<string, string>,
  items: {} as Record<string, string>,
  eggTypes: {} as Record<"LARGE" | "MEDIUM" | "CRACKED", string>,
};

const supplierDue: Record<string, number> = {};
const customerDue: Record<string, number> = {};

async function purchase(supplierKey: "feedSupplier" | "chickSupplier" | "vetSupplier", item: {
  key: string;
  name: string;
  category: "CHICKS" | "FEED" | "MEDICINE";
  unit: string;
  quantity: number;
  freeQuantity?: number;
  rate: number;
}, ago: number) {
  const amount = round2(item.quantity * item.rate);
  const res = await api("POST", `/dealers/${ids[supplierKey]}/transactions`, {
    type: "PURCHASE",
    amount,
    quantity: item.quantity,
    ...(item.freeQuantity ? { freeQuantity: item.freeQuantity } : {}),
    itemName: item.name,
    purchaseCategory: item.category,
    date: isoAgo(ago),
    description: `Purchase of ${item.name}`,
    unitPrice: item.rate,
    unit: item.unit,
  });
  const txn = Array.isArray(res.data) ? res.data[0] : res.data;
  if (txn?.inventoryItemId) ids.items[item.key] = txn.inventoryItemId;
  supplierDue[supplierKey] = round2((supplierDue[supplierKey] || 0) + amount);
}

async function paySupplier(supplierKey: "feedSupplier" | "chickSupplier" | "vetSupplier", amount: number, ago: number) {
  if (amount <= 0) return;
  await api("POST", `/dealers/${ids[supplierKey]}/transactions`, {
    type: "PAYMENT",
    amount,
    date: isoAgo(ago),
    description: "Payment",
  });
  supplierDue[supplierKey] = round2(supplierDue[supplierKey] - amount);
}

async function useInventory(batch: { id: string; farmId: string }, item: { key: string; categoryId: string; rate: number; label: string }, quantity: number, ago: number) {
  await api("POST", "/expenses", {
    date: isoAgo(ago),
    amount: round2(quantity * item.rate),
    quantity,
    unitPrice: item.rate,
    farmId: batch.farmId,
    batchId: batch.id,
    categoryId: item.categoryId,
    inventoryItems: [{ itemId: ids.items[item.key], quantity, notes: item.label }],
  });
}

async function plainExpense(batch: { id: string; farmId: string }, categoryId: string, amount: number, description: string, ago: number) {
  await api("POST", "/expenses", {
    date: isoAgo(ago),
    amount,
    quantity: 1,
    unitPrice: amount,
    farmId: batch.farmId,
    batchId: batch.id,
    categoryId,
    description,
  });
}

// ── Broiler batch plan ────────────────────────────────────────────────────────

const WEIGHT_CURVE: Array<[number, number]> = [[0, 0.045], [7, 0.17], [14, 0.45], [21, 0.85], [28, 1.35], [35, 1.85], [42, 2.35]];
function targetWeight(day: number): number {
  for (let i = 1; i < WEIGHT_CURVE.length; i += 1) {
    const [d1, w1] = WEIGHT_CURVE[i - 1];
    const [d2, w2] = WEIGHT_CURVE[i];
    if (day <= d2) return w1 + ((w2 - w1) * (day - d1)) / (d2 - d1);
  }
  return WEIGHT_CURVE[WEIGHT_CURVE.length - 1][1];
}
/** Grams of feed per bird per day. Totals about 3.7 kg per bird over 42 days. */
const feedGrams = (day: number) => 3.6 * day + 10;

const FEEDS = {
  // Per 50 kg bag, about रू 77–80 per kg (Nepal 2083).
  starter: { key: "feed-starter", name: "B0 Starter Feed", rate: 4000 },
  grower: { key: "feed-grower", name: "B1 Grower Feed", rate: 3900 },
  finisher: { key: "feed-finisher", name: "B2 Finisher Feed", rate: 3850 },
} as const;
const CHICK_RATE = 90;
const LAYER_MASH_RATE = 3700;
const phaseOf = (day: number) => (day <= 14 ? "starter" : day <= 28 ? "grower" : "finisher");

type SaleLot = { day: number; customer: string; share: number; rate: number; discount: number | null; paid: "cash" | "half" | "none" };

function planBroiler(cfg: {
  key: string;
  startAgo: number;
  chicks: number;
  closeDay: number | null;
  sales: SaleLot[];
}) {
  const lastDay = cfg.closeDay ?? cfg.startAgo; // active batches run until today
  // Deaths: higher in week 1, then a few every other day (~4% total).
  const deaths: Record<number, number> = {};
  for (let d = 1; d <= lastDay; d += 1) {
    if (d <= 7) deaths[d] = between(2, Math.max(3, Math.round(cfg.chicks * 0.004)));
    else if (d % 2 === 0) deaths[d] = between(0, Math.max(2, Math.round(cfg.chicks * 0.0015)));
  }
  // Sales: share of the birds alive on that day.
  let live = cfg.chicks;
  const soldOn: Record<number, { qty: number; weight: number; lot: SaleLot }> = {};
  const sortedSales = [...cfg.sales].sort((a, b) => a.day - b.day);
  const liveOn: Record<number, number> = {};
  for (let d = 1; d <= lastDay; d += 1) {
    live -= deaths[d] || 0;
    const lot = sortedSales.find((s) => s.day === d);
    if (lot) {
      const isLast = lot === sortedSales[sortedSales.length - 1] && cfg.closeDay !== null;
      const qty = isLast ? live : Math.min(live, Math.round(live * lot.share));
      const avg = targetWeight(d) * (0.97 + rnd() * 0.06);
      soldOn[d] = { qty, weight: round2(qty * avg), lot };
      live -= qty;
    }
    liveOn[d] = live;
  }
  // Feed: one entry every 3 days, rounded to whole bags, carrying the remainder.
  const feed: Array<{ day: number; phase: keyof typeof FEEDS; bags: number }> = [];
  let carryKg = 0;
  let kgSinceLast = 0;
  let aliveForFeed = cfg.chicks;
  for (let d = 1; d <= lastDay; d += 1) {
    aliveForFeed -= deaths[d] || 0;
    kgSinceLast += (feedGrams(d) * aliveForFeed) / 1000;
    if (soldOn[d]) aliveForFeed -= soldOn[d].qty;
    if (d % 3 === 0 || d === lastDay) {
      const totalKg = kgSinceLast + carryKg;
      const bags = Math.floor(totalKg / 50);
      carryKg = totalKg - bags * 50;
      kgSinceLast = 0;
      if (bags > 0) feed.push({ day: d, phase: phaseOf(d), bags });
    }
  }
  return { ...cfg, lastDay, deaths, soldOn, liveOn, feed };
}

function scheduleBroiler(plan: ReturnType<typeof planBroiler>, farmName: string) {
  const batch = { id: "", farmId: "" };
  const at = (day: number) => plan.startAgo - day; // "ago" of batch day N

  // Chicks: bought the day before, 2% free from the hatchery.
  const free = Math.round(plan.chicks * 0.02);
  on(at(-1), O.purchase, `${plan.key}: chicks`, () =>
    purchase("chickSupplier", { key: `chicks-${plan.key}`, name: "Broiler chicks (Cobb 500)", category: "CHICKS", unit: "Birds", quantity: plan.chicks - free, freeQuantity: free, rate: CHICK_RATE }, at(-1)),
  );
  on(at(2), O.payment, `${plan.key}: pay hatchery`, () => paySupplier("chickSupplier", round2((plan.chicks - free) * CHICK_RATE), at(2)));

  // Feed bought per phase, a little before it is needed.
  for (const phase of Object.keys(FEEDS) as Array<keyof typeof FEEDS>) {
    const bags = plan.feed.filter((f) => f.phase === phase).reduce((s, f) => s + f.bags, 0);
    if (bags === 0) continue;
    const firstDay = Math.min(...plan.feed.filter((f) => f.phase === phase).map((f) => f.day));
    const buyAgo = at(Math.max(-1, firstDay - 3));
    on(buyAgo, O.purchase, `${plan.key}: buy ${phase}`, () =>
      purchase("feedSupplier", { key: FEEDS[phase].key, name: FEEDS[phase].name, category: "FEED", unit: "Bag", quantity: Math.ceil(bags * 1.05), rate: FEEDS[phase].rate }, buyAgo),
    );
  }
  // Medicine kit before the batch starts.
  on(at(-1), O.purchase, `${plan.key}: medicine`, async () => {
    await purchase("vetSupplier", { key: "med-vitamin", name: "Vitamin AD3E", category: "MEDICINE", unit: "Bottle", quantity: 3, rate: 480 }, at(-1));
    await purchase("vetSupplier", { key: "med-enro", name: "Enrofloxacin 10%", category: "MEDICINE", unit: "Bottle", quantity: 2, rate: 950 }, at(-1));
  });

  on(at(0), O.batch, `${plan.key}: start batch`, async () => {
    const res = await api("POST", "/batches", {
      batchNumber: `${bsMonthDay(at(0))}-${farmName}`,
      batchType: "BROILER",
      farmId: ids.farm1,
      startDate: isoAgo(at(0)),
      initialChickWeight: 0.045,
      status: "ACTIVE",
      chicksInventory: [{ itemId: ids.items[`chicks-${plan.key}`], quantity: plan.chicks, notes: "From Kalika Hatchery" }],
    });
    batch.id = res.data.id;
    batch.farmId = ids.farm1;
  });
  on(at(0), O.expense, `${plan.key}: bedding`, () => plainExpense(batch, ids.catBedding, 3000, "Rice husk bedding", at(0)));

  for (const f of plan.feed) {
    const feedItem = FEEDS[f.phase];
    on(at(f.day), O.usage, `${plan.key}: feed d${f.day}`, () =>
      useInventory(batch, { key: feedItem.key, categoryId: ids.catFeed, rate: feedItem.rate, label: `Feed: ${feedItem.name}` }, f.bags, at(f.day)),
    );
  }
  const medicineDays: Array<[number, string, number, string]> = [[3, "med-vitamin", 480, "Vitamin AD3E"], [10, "med-enro", 950, "Enrofloxacin 10%"], [18, "med-vitamin", 480, "Vitamin AD3E"]];
  for (const [day, key, rate, name] of medicineDays) {
    if (day > plan.lastDay) continue;
    on(at(day), O.usage, `${plan.key}: medicine d${day}`, () =>
      useInventory(batch, { key, categoryId: ids.catMedicine, rate, label: `Medicine: ${name}` }, 1, at(day)),
    );
  }
  for (const day of [15, 30]) {
    if (day <= plan.lastDay) on(at(day), O.expense, `${plan.key}: labour d${day}`, () => plainExpense(batch, ids.catLabour, 7500, "Farm worker wage", at(day)));
  }
  if (25 <= plan.lastDay) on(at(25), O.expense, `${plan.key}: electricity`, () => plainExpense(batch, ids.catElectricity, 2400, "Electricity bill", at(25)));

  for (const [dayText, count] of Object.entries(plan.deaths)) {
    const day = Number(dayText);
    if (count > 0) {
      on(at(day), O.death, `${plan.key}: deaths d${day}`, async () => {
        await api("POST", "/mortalities", { date: isoAgo(at(day)), count, reason: "Natural Death", batchId: batch.id });
      });
    }
  }
  for (const day of [7, 14, 21, 28, 35]) {
    if (day > plan.lastDay || at(day) < 0) continue;
    on(at(day), O.weight, `${plan.key}: weight d${day}`, async () => {
      await api("POST", `/batches/${batch.id}/weights`, {
        date: isoAgo(at(day)),
        avgWeight: round2(targetWeight(day) * (0.97 + rnd() * 0.06)),
        sampleCount: 20,
        notes: "Weekly weighing",
      });
    });
  }
  for (const [dayText, sale] of Object.entries(plan.soldOn)) {
    const day = Number(dayText);
    if (sale.qty <= 0) continue;
    on(at(day), O.sale, `${plan.key}: sale d${day}`, async () => {
      const discount = sale.lot.discount;
      const billed = round2(sale.weight * (1 - (discount || 0) / 100));
      const amount = round2(billed * sale.lot.rate);
      const paidAmount = sale.lot.paid === "cash" ? amount : sale.lot.paid === "half" ? round2(Math.floor(amount / 2 / 100) * 100) : 0;
      const isCredit = sale.lot.paid !== "cash";
      await api("POST", "/sales", {
        date: isoAgo(at(day)),
        amount,
        quantity: sale.qty,
        weight: sale.weight,
        weightDiscountPercent: discount,
        unitPrice: sale.lot.rate,
        isCredit,
        paidAmount,
        farmId: ids.farm1,
        batchId: batch.id,
        itemType: "Chicken_Meat",
        customerId: ids.customers[sale.lot.customer],
      });
      if (isCredit) customerDue[sale.lot.customer] = round2((customerDue[sale.lot.customer] || 0) + amount - paidAmount);
    });
  }
  if (plan.closeDay !== null) {
    const closeAgo = at(plan.closeDay);
    on(closeAgo, O.close, `${plan.key}: close`, async () => {
      await api("POST", `/batches/${batch.id}/close`, {
        endDate: isoAgo(closeAgo),
        finalNotes: "All birds sold",
        confirmRemainingAsDead: true,
      });
    });
  }
}

// ── Layer batch ───────────────────────────────────────────────────────────────

function scheduleLayers(cfg: { startAgo: number; birds: number }, farmName: string) {
  const batch = { id: "", farmId: "" };
  const at = (day: number) => cfg.startAgo - day;
  const lastDay = cfg.startAgo;
  const stock = { LARGE: 0, MEDIUM: 0, CRACKED: 0 };
  let live = cfg.birds;

  on(at(-1), O.purchase, "layers: pullets", () =>
    purchase("chickSupplier", { key: "pullets", name: "Layer pullets (18 weeks)", category: "CHICKS", unit: "Birds", quantity: cfg.birds, rate: 650 }, at(-1)),
  );
  on(at(5), O.payment, "layers: pay pullets", () => paySupplier("chickSupplier", cfg.birds * 650, at(5)));
  for (let day = -1; day <= lastDay; day += 15) {
    on(at(day), O.purchase, `layers: buy mash d${day}`, () =>
      purchase("feedSupplier", { key: "layer-mash", name: "Layer Mash", category: "FEED", unit: "Bag", quantity: 30, rate: LAYER_MASH_RATE }, at(day)),
    );
  }
  on(at(0), O.batch, "layers: start batch", async () => {
    const res = await api("POST", "/batches", {
      batchNumber: `${bsMonthDay(at(0))}-${farmName}`,
      batchType: "LAYERS",
      farmId: ids.farm2,
      startDate: isoAgo(at(0)),
      initialChickWeight: 1.4,
      status: "ACTIVE",
      chicksInventory: [{ itemId: ids.items.pullets, quantity: cfg.birds, notes: "Point-of-lay pullets" }],
    });
    batch.id = res.data.id;
    batch.farmId = ids.farm2;
  });

  for (let day = 1; day <= lastDay; day += 1) {
    const deaths = day % 5 === 0 ? between(0, 2) : 0;
    if (deaths > 0) {
      live -= deaths;
      on(at(day), O.death, `layers: deaths d${day}`, async () => {
        await api("POST", "/mortalities", { date: isoAgo(at(day)), count: deaths, reason: "Natural Death", batchId: batch.id });
      });
    }
    if (day % 3 === 0) {
      const bags = day % 6 === 0 ? 6 : 5;
      on(at(day), O.usage, `layers: mash d${day}`, () =>
        useInventory(batch, { key: "layer-mash", categoryId: ids.catFeed, rate: LAYER_MASH_RATE, label: "Feed: Layer Mash" }, bags, at(day)),
      );
    }
    if (day >= 8) {
      const henDay = Math.min(0.9, 0.35 + 0.012 * (day - 8));
      const eggs = Math.round(live * henDay);
      const counts = { LARGE: Math.round(eggs * 0.62), MEDIUM: Math.round(eggs * 0.33), CRACKED: 0 };
      counts.CRACKED = Math.max(0, eggs - counts.LARGE - counts.MEDIUM);
      stock.LARGE += counts.LARGE;
      stock.MEDIUM += counts.MEDIUM;
      stock.CRACKED += counts.CRACKED;
      on(at(day), O.eggs, `layers: eggs d${day}`, async () => {
        await api("POST", `/batches/${batch.id}/egg-production`, {
          date: isoAgo(at(day)),
          countByType: { [ids.eggTypes.LARGE]: counts.LARGE, [ids.eggTypes.MEDIUM]: counts.MEDIUM, [ids.eggTypes.CRACKED]: counts.CRACKED },
        });
      });
    }
    if (day >= 12 && day % 4 === 0) {
      const large = Math.floor(stock.LARGE * 0.95);
      const medium = Math.floor(stock.MEDIUM * 0.95);
      const cracked = day % 12 === 0 ? stock.CRACKED : 0;
      stock.LARGE -= large;
      stock.MEDIUM -= medium;
      stock.CRACKED -= cracked;
      const customer = (day / 4) % 2 === 0 ? "Hari Kirana Pasal" : "Bharatpur Egg Traders";
      const lines = [
        { type: "LARGE" as const, quantity: large, unitPrice: 16 },
        { type: "MEDIUM" as const, quantity: medium, unitPrice: 14 },
        { type: "CRACKED" as const, quantity: cracked, unitPrice: 8 },
      ].filter((l) => l.quantity > 0);
      if (lines.length === 0) continue;
      on(at(day), O.sale, `layers: egg sale d${day}`, async () => {
        const amount = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
        const isCredit = customer === "Bharatpur Egg Traders";
        const paidAmount = isCredit ? Math.floor(amount * 0.6 / 100) * 100 : amount;
        await api("POST", "/sales", {
          date: isoAgo(at(day)),
          amount,
          quantity: lines.reduce((s, l) => s + l.quantity, 0),
          unitPrice: lines[0].unitPrice,
          isCredit,
          paidAmount,
          farmId: ids.farm2,
          batchId: batch.id,
          itemType: "EGGS",
          customerId: ids.customers[customer],
          eggLineItems: lines.map((l) => ({ eggTypeId: ids.eggTypes[l.type], quantity: l.quantity, unitPrice: l.unitPrice })),
        });
        if (isCredit) customerDue[customer] = round2((customerDue[customer] || 0) + amount - paidAmount);
      });
    }
  }
  on(at(20), O.usage, "layers: vaccine", () =>
    useInventory(batch, { key: "med-vitamin", categoryId: ids.catMedicine, rate: 480, label: "Medicine: Vitamin AD3E" }, 1, at(20)),
  );
  for (const day of [30, 60]) {
    if (day <= lastDay) on(at(day), O.expense, `layers: labour d${day}`, () => plainExpense(batch, ids.catLabour, 8000, "Farm worker wage", at(day)));
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function ensureDemoFarmerLogin(): Promise<string> {
  const existing = await prisma.user.findUnique({ where: { id: account.id }, select: { id: true } });
  const explicitPassword = process.env[account.passwordEnv];
  const password = explicitPassword || process.env.P360_DEMO_PASSWORD || DEFAULT_DEMO_PASSWORD;
  if (existing) {
    const farms = await prisma.farm.count({ where: { ownerId: account.id } });
    if (farms > 0) {
      throw new Error(
        `Demo farmer ${account.phone} already has data (${farms} farm(s)). Delete that demo account's data first; re-running would duplicate it.`,
      );
    }
    // Login exists but has no data yet (e.g. an earlier run stopped early): reuse it.
    await prisma.user.update({ where: { id: account.id }, data: { password: await bcrypt.hash(password, 12) } });
    return password;
  }
  const hash = await bcrypt.hash(password, 12);
  await prisma.$transaction((tx) => upsertDemoUser(tx, account, hash));
  return password;
}

async function main() {
  if (!isLocalDatabase() && process.env.P360_DEMO_SEED_CONFIRMED !== "1") {
    throw new Error(
      "Not a local database. To seed production, run scripts/seed-demo-prod.sh (it asks for a backup check first).",
    );
  }
  console.log(`Seeding demo farmer through ${API_URL} (Nepal today ${NEPAL_TODAY})...`);

  const password = await ensureDemoFarmerLogin();
  const login = await api("POST", "/auth/login", { emailOrPhone: account.phone, password });
  token = login.accessToken;

  // Setup: farms, suppliers, customers, categories, egg types.
  ids.farm1 = (await api("POST", "/farms", { name: "Green Valley Farm 1", capacity: 5000, description: "Broiler sheds" })).data.id;
  ids.farm2 = (await api("POST", "/farms", { name: "Hilltop Layer Farm", capacity: 3000, description: "Layer shed" })).data.id;

  ids.feedSupplier = (await api("POST", "/dealers", { name: "Shree Krishna Feed Udhyog", contact: "9855000001", address: "Narayangadh, Chitwan" })).data.id;
  ids.chickSupplier = (await api("POST", "/dealers", { name: "Kalika Hatchery", contact: "9855000002", address: "Ratnanagar, Chitwan" })).data.id;
  ids.vetSupplier = (await api("POST", "/dealers", { name: "Nepal Vet Pharma", contact: "9855000003", address: "Bharatpur-10, Chitwan" })).data.id;
  await api("POST", `/dealers/${ids.feedSupplier}/opening-balance`, { openingBalance: 25000, notes: "Opening balance" });
  supplierDue.feedSupplier = 25000;

  const customers: Array<[string, string, string, number]> = [
    ["Ram Bahadur Chicken Center", "9845000001", "Chicken", 12000],
    ["Sita Meat Shop", "9845000002", "Chicken", 0],
    ["Laxmi Hotel", "9845000003", "Chicken", 0],
    ["Hari Kirana Pasal", "9845000004", "Eggs", 0],
    ["Bharatpur Egg Traders", "9845000005", "Eggs", 0],
  ];
  for (const [name, phone, category, opening] of customers) {
    const res = await api("POST", "/sales/customers", {
      name,
      phone,
      category,
      address: "Chitwan",
      ...(opening ? { openingBalance: opening, openingBalanceNotes: "Opening balance" } : {}),
    });
    ids.customers[name] = res.data.id;
    customerDue[name] = opening;
  }

  const categories = (await api("GET", "/expenses/categories?type=EXPENSE")).data as Array<{ id: string; name: string }>;
  const byName = (name: string) => categories.find((c) => c.name.toLowerCase() === name)?.id || "";
  ids.catFeed = byName("feed");
  ids.catMedicine = byName("medicine");
  if (!ids.catFeed || !ids.catMedicine) throw new Error("Feed/Medicine expense categories were not created");
  ids.catLabour = (await api("POST", "/expenses/categories", { name: "Labour", description: "Saved Other expense name" })).data.id;
  ids.catElectricity = (await api("POST", "/expenses/categories", { name: "Electricity", description: "Saved Other expense name" })).data.id;
  ids.catBedding = (await api("POST", "/expenses/categories", { name: "Bedding", description: "Saved Other expense name" })).data.id;

  const eggTypes: Array<[keyof typeof ids.eggTypes, string, number]> = [["LARGE", "Large", 1], ["MEDIUM", "Medium", 2], ["CRACKED", "Cracked", 3]];
  for (const [code, name, displayOrder] of eggTypes) {
    ids.eggTypes[code] = (await api("POST", "/egg-types", { name, code, displayOrder })).data.id;
  }

  // Batches.
  scheduleBroiler(planBroiler({
    key: "B1", startAgo: 118, chicks: 1000, closeDay: 42,
    sales: [
      { day: 37, customer: "Ram Bahadur Chicken Center", share: 0.35, rate: 232, discount: 1, paid: "half" },
      { day: 39, customer: "Sita Meat Shop", share: 0.4, rate: 236, discount: null, paid: "cash" },
      { day: 41, customer: "Laxmi Hotel", share: 0.5, rate: 234, discount: 1, paid: "none" },
      { day: 42, customer: "Ram Bahadur Chicken Center", share: 1, rate: 228, discount: 1, paid: "cash" },
    ],
  }), "Farm 1");
  scheduleBroiler(planBroiler({
    key: "B2", startAgo: 70, chicks: 1200, closeDay: 41,
    sales: [
      { day: 36, customer: "Sita Meat Shop", share: 0.3, rate: 240, discount: null, paid: "cash" },
      { day: 38, customer: "Ram Bahadur Chicken Center", share: 0.45, rate: 238, discount: 1, paid: "half" },
      { day: 40, customer: "Laxmi Hotel", share: 0.6, rate: 239, discount: 1, paid: "none" },
      { day: 41, customer: "Sita Meat Shop", share: 1, rate: 235, discount: null, paid: "cash" },
    ],
  }), "Farm 1");
  scheduleBroiler(planBroiler({ key: "B3", startAgo: 24, chicks: 1500, closeDay: null, sales: [] }), "Farm 1");
  scheduleLayers({ startAgo: 72, birds: 800 }, "Hilltop");

  // Payments spread over time (feed supplier, medicine supplier, customers).
  for (const ago of [100, 80, 58, 38, 18, 4]) {
    on(ago, O.payment, `pay feed supplier ${ago}`, () => paySupplier("feedSupplier", Math.floor((supplierDue.feedSupplier * 0.7) / 1000) * 1000, ago));
  }
  for (const ago of [90, 45, 10]) {
    on(ago, O.payment, `pay vet ${ago}`, () => paySupplier("vetSupplier", Math.floor(supplierDue.vetSupplier / 100) * 100, ago));
  }
  const customerPayments: Array<[number, string, number]> = [
    [72, "Ram Bahadur Chicken Center", 0.8],
    [65, "Laxmi Hotel", 1],
    [22, "Ram Bahadur Chicken Center", 0.7],
    [20, "Laxmi Hotel", 0.5],
    [15, "Bharatpur Egg Traders", 1],
    [3, "Bharatpur Egg Traders", 0.8],
  ];
  for (const [ago, name, share] of customerPayments) {
    on(ago, O.payment, `receive ${name} ${ago}`, async () => {
      const amount = Math.floor(((customerDue[name] || 0) * share) / 100) * 100;
      if (amount <= 0) return;
      await api("POST", `/sales/customers/${ids.customers[name]}/payments`, {
        amount,
        date: dayAgo(ago),
        description: "Payment received",
      });
      customerDue[name] = round2(customerDue[name] - amount);
    });
  }

  // Run everything in date order.
  events.sort((a, b) => b.ago - a.ago || a.order - b.order);
  for (const event of events) {
    if (event.ago < 0) continue; // never enter future dates
    await event.run();
  }

  console.log(`\nDemo farmer ready (${callCount} API calls).`);
  console.log(`Phone: ${account.phone} (log in with ${account.phone.replace("+977", "")})`);
  console.log(`Password: ${process.env[account.passwordEnv] ? "(the one you set)" : password}`);
}

main()
  .catch((error) => {
    console.error("\nDemo farmer seed failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
