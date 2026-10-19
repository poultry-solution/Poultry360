/**
 * Demo hatchery seed: one realistic breeder farm + hatchery, entered through the
 * normal API so stock, balances, ledger rows and audit history are created
 * exactly as when a hatchery uses the app.
 *
 * - LOCAL ONLY unless `P360_DEMO_SEED_CONFIRMED=1` is set (the production
 *   helper `scripts/seed-demo-prod.sh` sets it after its backup prompt).
 *   Refuses to run against a remote DB without that confirmation.
 * - Creates (or reuses) the reserved demo hatchery login only. Never touches other users.
 * - Refuses to run if that hatchery already has suppliers (re-running would duplicate data).
 *   `--reset` first deletes ONLY the demo hatchery account's data, then seeds again.
 * - The backend API must be running (P360_API_URL, default http://localhost:8081/api/v1).
 *
 * Data, all dated relative to today in Nepal (about the last 240 days):
 *   4 suppliers (parent chicks, feed with opening balance + one adjustment, vet, grain)
 *   with purchases (free chicks on one) and payments.
 *   Self-made feed: raw materials → "Self-made Breeder Feed" production runs.
 *   3 parent flocks: PF-001 laying, PF-002 young (not laying yet), PF-003 sold out and closed.
 *   Weekly mortality, feed (male/female split), medicine and manual expenses.
 *   Daily egg collection (hatchable / table / cracked) and egg sales.
 *   Weekly incubations: setter → candling → hatcher → hatch result, the last ones still in progress.
 *   Chick sales (A / B / cull) to farmer parties and walk-in buyers, parent bird sales.
 *   7 parties (2 with opening balances) with regular payments.
 *   Staff: 2 monthly + 1 daily worker with salary payments and absences, one staff login.
 *   Bill details (Settings).
 */

import "dotenv/config";
import bcrypt from "bcrypt";
import prisma from "../utils/prisma";
import { DEFAULT_DEMO_PASSWORD, DEMO_ACCOUNTS, isLocalDatabase, upsertDemoUser } from "./demoSeedUtils";
import { setAccountFeature, ACCOUNT_FEATURE_KEYS } from "../services/accountFeatureService";

const account = DEMO_ACCOUNTS.hatchery;
const HATCHERY_ID = "p360-demo-hatchery-v1";
const STAFF_LOGIN_PHONE = "+9779800360032";
const API_URL = (process.env.P360_API_URL || `http://localhost:${process.env.PORT || 8081}/api/v1`).replace(/\/$/, "");
const RESET = process.argv.includes("--reset");

// ── Dates (Nepal days) ────────────────────────────────────────────────────────

const NEPAL_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;
const NEPAL_TODAY = new Date(Date.now() + NEPAL_OFFSET_MS).toISOString().slice(0, 10);

/** AD YYYY-MM-DD of the Nepal day `ago` days before today. Sent like the app's date pickers send it. */
function dayAgo(ago: number): string {
  const [y, m, d] = NEPAL_TODAY.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - ago)).toISOString().slice(0, 10);
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
const rnd = makeRandom(3191);
const between = (min: number, max: number) => min + Math.floor(rnd() * (max - min + 1));
const pick = <T,>(list: T[]) => list[Math.floor(rnd() * list.length)];
const round2 = (n: number) => Math.round(n * 100) / 100;
const roundDown = (n: number, step: number) => Math.floor(n / step) * step;
const roundUp = (n: number, step: number) => Math.ceil(n / step) * step;

let token = "";
let ownerId = "";
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
    throw new Error(`${method} ${path} failed (${res.status}): ${json?.message || json?.error || text}\nBody: ${JSON.stringify(body)}`);
  }
  return json as T;
}

// ── Event queue (everything is entered in date order, like real life) ─────────

type Event = { ago: number; order: number; label: string; run: () => Promise<void> };
const events: Event[] = [];
const on = (ago: number, order: number, label: string, run: () => Promise<void>) =>
  events.push({ ago, order, label, run });

// Order inside one day.
const O = {
  opening: 0, placement: 1, production: 2, eggs: 3, mortality: 4, expense: 5,
  incubation: 6, sale: 7, partyPayment: 8, supplierPayment: 9,
};

// ── Catalogue ─────────────────────────────────────────────────────────────────

type SupplierKey = "chicks" | "feed" | "vet" | "grain";
type ItemKey =
  | "starter" | "grower" | "layer"
  | "ndVaccine" | "vitamin" | "antibiotic"
  | "maize" | "soya" | "premix";

const ITEMS: Record<ItemKey, {
  name: string;
  category: "FEED" | "MEDICINE" | "RAW_MATERIAL";
  unit: string;
  price: number;
  supplier: SupplierKey;
  block: number; // usual order size
}> = {
  starter: { name: "Breeder Starter Feed", category: "FEED", unit: "kg", price: 78, supplier: "feed", block: 500 },
  grower: { name: "Breeder Grower Feed", category: "FEED", unit: "kg", price: 72, supplier: "feed", block: 2000 },
  layer: { name: "Breeder Layer Feed", category: "FEED", unit: "kg", price: 70, supplier: "feed", block: 3000 },
  ndVaccine: { name: "ND + IB Vaccine (1000 dose)", category: "MEDICINE", unit: "vial", price: 450, supplier: "vet", block: 10 },
  vitamin: { name: "Vitamin AD3E (1 L)", category: "MEDICINE", unit: "bottle", price: 650, supplier: "vet", block: 10 },
  antibiotic: { name: "Enrofloxacin 10% (1 L)", category: "MEDICINE", unit: "bottle", price: 950, supplier: "vet", block: 5 },
  maize: { name: "Maize", category: "RAW_MATERIAL", unit: "kg", price: 34, supplier: "grain", block: 3000 },
  soya: { name: "Soybean Meal", category: "RAW_MATERIAL", unit: "kg", price: 88, supplier: "grain", block: 1000 },
  premix: { name: "Breeder Premix", category: "RAW_MATERIAL", unit: "kg", price: 190, supplier: "grain", block: 100 },
};

const SELF_FEED_NAME = "Self-made Breeder Feed";

// ── State filled while the seed runs ──────────────────────────────────────────

const supplierIds = {} as Record<SupplierKey, string>;
const supplierOwed: Record<SupplierKey, number> = { chicks: 0, feed: 0, vet: 0, grain: 0 };
const itemIds = {} as Partial<Record<ItemKey, string>>;
const stock = Object.fromEntries(Object.keys(ITEMS).map((k) => [k, 0])) as Record<ItemKey, number>;
const selfFeedLots: Array<{ id: string; stock: number }> = [];
let selfFeedProductId = "";

const eggTypeIds = { hatchable: "", table: "", cracked: "" };
const partyIds: Record<string, string> = {};
const partyOwed: Record<string, number> = {};

type Flock = {
  key: "PF1" | "PF2" | "PF3";
  id: string;
  placedAgo: number;
  males: number;
  females: number;
  closed: boolean;
  eggs: { hatchable: number; table: number; cracked: number };
};
const flocks: Record<Flock["key"], Flock> = {
  PF1: { key: "PF1", id: "", placedAgo: 235, males: 0, females: 0, closed: false, eggs: { hatchable: 0, table: 0, cracked: 0 } },
  PF2: { key: "PF2", id: "", placedAgo: 62, males: 0, females: 0, closed: false, eggs: { hatchable: 0, table: 0, cracked: 0 } },
  PF3: { key: "PF3", id: "", placedAgo: 200, males: 0, females: 0, closed: false, eggs: { hatchable: 0, table: 0, cracked: 0 } },
};

type Incubation = { id: string; set: number; fertile: number; chicks: { A: number; B: number; CULL: number } };
const incubations: Record<number, Incubation> = {};

const counts = { eggSales: 0, chickSales: 0, parentSales: 0, purchases: 0, incubations: 0 };

// ── Purchases and stock ───────────────────────────────────────────────────────

async function findLotId(where: Record<string, unknown>): Promise<string> {
  const lot = await prisma.hatcheryInventoryItem.findFirst({
    where: { hatcheryOwnerId: ownerId, deletedAt: null, ...where },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!lot) throw new Error(`Inventory lot not found: ${JSON.stringify(where)}`);
  return lot.id;
}

async function buy(ago: number, lines: Array<[ItemKey, number]>, note?: string) {
  const supplier = ITEMS[lines[0][0]].supplier;
  const category = ITEMS[lines[0][0]].category;
  await api("POST", `/hatchery/suppliers/${supplierIds[supplier]}/transactions`, {
    type: "PURCHASE",
    category,
    date: dayAgo(ago),
    note,
    items: lines.map(([key, quantity]) => ({
      itemName: ITEMS[key].name,
      quantity,
      unit: ITEMS[key].unit,
      unitPrice: ITEMS[key].price,
      totalAmount: round2(quantity * ITEMS[key].price),
    })),
  });
  counts.purchases += 1;
  for (const [key, quantity] of lines) {
    stock[key] += quantity;
    supplierOwed[supplier] += quantity * ITEMS[key].price;
    if (!itemIds[key]) itemIds[key] = await findLotId({ name: ITEMS[key].name, itemType: ITEMS[key].category });
  }
}

/** Buy more when the store runs short, the way a hatchery reorders. */
async function ensureStock(ago: number, key: ItemKey, needed: number) {
  if (stock[key] >= needed) return;
  const quantity = roundUp(Math.max(ITEMS[key].block, needed - stock[key]), ITEMS[key].block);
  await buy(ago, [[key, quantity]]);
}

async function buyParentChicks(ago: number, females: number, males: number, price: number, freeFemales: number) {
  await api("POST", `/hatchery/suppliers/${supplierIds.chicks}/transactions`, {
    type: "PURCHASE",
    category: "CHICKS",
    date: dayAgo(ago),
    note: "Cobb 500 parent stock, day-old",
    items: [
      { itemName: "Cobb 500 Parent (female)", quantity: females, freeQuantity: freeFemales, unit: "birds", unitPrice: price, totalAmount: round2(females * price), sex: "FEMALE" },
      { itemName: "Cobb 500 Parent (male)", quantity: males, unit: "birds", unitPrice: price, totalAmount: round2(males * price), sex: "MALE" },
    ],
  });
  counts.purchases += 1;
  supplierOwed.chicks += (females + males) * price;
}

// ── Parent flocks ─────────────────────────────────────────────────────────────

function placeFlock(flock: Flock, females: number, males: number, price: number, freeFemales: number) {
  on(flock.placedAgo, O.placement, `place ${flock.key}`, async () => {
    await buyParentChicks(flock.placedAgo, females, males, price, freeFemales);
    const femaleLot = await findLotId({ itemType: "CHICKS", sex: "FEMALE", unitPrice: price });
    const maleLot = await findLotId({ itemType: "CHICKS", sex: "MALE", unitPrice: price });
    const batch = await api("POST", "/hatchery/batches", {
      type: "PARENT_FLOCK",
      startDate: dayAgo(flock.placedAgo),
      notes: "Day-old parent chicks from Kalika Parent Stock",
      placements: [
        { inventoryItemId: femaleLot, quantity: females + freeFemales },
        { inventoryItemId: maleLot, quantity: males },
      ],
    });
    flock.id = batch.id;
    flock.females = females + freeFemales;
    flock.males = males;
    await manualExpense(flock, flock.placedAgo, "Rice husk (litter)", 6500);
  });
}

async function manualExpense(flock: Flock, ago: number, itemName: string, amount: number, note?: string) {
  await api("POST", `/hatchery/batches/${flock.id}/expenses`, {
    date: dayAgo(ago), type: "MANUAL", category: "manual", itemName, amount, note,
  });
}

/** Feed per bird per day (kg) by age in days. */
function feedPerBird(age: number, sex: "male" | "female") {
  if (age < 42) return 0.045;
  if (age < 150) return 0.095;
  return sex === "female" ? 0.165 : 0.135;
}

function feedKeyForAge(age: number): ItemKey {
  if (age < 42) return "starter";
  if (age < 150) return "grower";
  return "layer";
}

async function feedWeek(flock: Flock, ago: number) {
  const age = flock.placedAgo - ago;
  const female = Math.round(flock.females * feedPerBird(age, "female") * 7);
  const male = Math.round(flock.males * feedPerBird(age, "male") * 7);
  const total = female + male;
  if (total <= 0) return;

  // Grown flocks get part of their feed from the farm's own mill once it runs.
  const lot = selfFeedLots.find((l) => l.stock >= total);
  if (feedKeyForAge(age) !== "starter" && lot && rnd() < 0.6) {
    await api("POST", `/hatchery/batches/${flock.id}/expenses`, {
      date: dayAgo(ago), type: "INVENTORY", category: "SELF_MADE", inventoryItemId: lot.id,
      quantity: total, feedTarget: "BOTH", maleFeedQuantity: male, femaleFeedQuantity: female,
    });
    lot.stock -= total;
    return;
  }

  const key = feedKeyForAge(age);
  await ensureStock(ago, key, total);
  // Most weeks the split is written down; some weeks the worker only notes the total.
  const split = rnd() < 0.75 ? { maleFeedQuantity: male, femaleFeedQuantity: female } : {};
  await api("POST", `/hatchery/batches/${flock.id}/expenses`, {
    date: dayAgo(ago), type: "INVENTORY", category: "FEED", inventoryItemId: itemIds[key],
    quantity: total, feedTarget: "BOTH", ...split,
  });
  stock[key] -= total;
}

async function medicine(flock: Flock, ago: number, key: ItemKey, quantity: number, note: string) {
  await ensureStock(ago, key, quantity);
  await api("POST", `/hatchery/batches/${flock.id}/expenses`, {
    date: dayAgo(ago), type: "INVENTORY", category: "MEDICINE", inventoryItemId: itemIds[key], quantity, note,
  });
  stock[key] -= quantity;
}

async function mortality(flock: Flock, ago: number, female: number, male: number, note?: string) {
  female = Math.min(female, flock.females);
  male = Math.min(male, flock.males);
  if (female + male <= 0) return;
  await api("POST", `/hatchery/batches/${flock.id}/mortalities`, {
    date: dayAgo(ago), femaleCount: female, maleCount: male, note,
  });
  flock.females -= female;
  flock.males -= male;
}

function planFlockCare(flock: Flock, endAgo: number) {
  const start = flock.placedAgo;
  for (let ago = start - 1; ago >= endAgo; ago -= 7) {
    const age = start - ago;
    on(ago, O.mortality, `${flock.key} mortality`, async () => {
      if (flock.closed) return;
      const young = age < 21;
      await mortality(flock, ago, young ? between(4, 12) : between(0, 5), young ? between(0, 3) : between(0, 2),
        young ? "Weak chicks" : pick([undefined, "Found dead in morning", "Heat stress", undefined]));
    });
    on(ago, O.expense, `${flock.key} feed`, async () => {
      if (!flock.closed) await feedWeek(flock, ago);
    });
  }
  // Vaccines on the usual days, vitamins every month.
  for (const age of [7, 21, 35, 70, 120, 160]) {
    const ago = start - age;
    if (ago >= endAgo) on(ago, O.expense, `${flock.key} vaccine`, () => medicine(flock, ago, "ndVaccine", Math.max(1, Math.ceil((flock.females + flock.males) / 1000)), `Vaccine day ${age}`));
  }
  for (let ago = start - 14; ago >= endAgo; ago -= 30) {
    on(ago, O.expense, `${flock.key} vitamin`, () => medicine(flock, ago, "vitamin", 2, "Vitamin in water"));
  }
  // Electricity bill every month.
  for (let ago = start - 30; ago >= endAgo; ago -= 30) {
    on(ago, O.expense, `${flock.key} electricity`, async () => {
      if (!flock.closed) await manualExpense(flock, ago, "Electricity bill", flock.key === "PF1" ? 9500 : 4200);
    });
  }
}

// ── Eggs ─────────────────────────────────────────────────────────────────────

function planEggs(flock: Flock, fromAgo: number, toAgo: number, peak: number) {
  for (let ago = fromAgo; ago >= toAgo; ago -= 1) {
    const k = fromAgo - ago; // days since laying started
    on(ago, O.eggs, `${flock.key} eggs`, async () => {
      const rate = Math.min(peak, 0.12 + 0.03 * k) * (1 - Math.max(0, k - 45) * 0.002) * (0.95 + rnd() * 0.07);
      const total = Math.round(flock.females * rate);
      if (total <= 0) return;
      const hatchableShare = k < 10 ? 0.5 + k * 0.03 : 0.83;
      const cracked = Math.round(total * (0.03 + rnd() * 0.02));
      const hatchable = Math.round(total * hatchableShare);
      const table = total - hatchable - cracked;
      await api("POST", `/hatchery/batches/${flock.id}/egg-productions`, {
        date: dayAgo(ago),
        lines: [
          { eggTypeId: eggTypeIds.hatchable, count: hatchable },
          { eggTypeId: eggTypeIds.table, count: table },
          { eggTypeId: eggTypeIds.cracked, count: cracked },
        ],
      });
      flock.eggs.hatchable += hatchable;
      flock.eggs.table += table;
      flock.eggs.cracked += cracked;
    });
  }
}

async function sellEggs(flock: Flock, ago: number, type: keyof Flock["eggs"], count: number, unitPrice: number, party?: string, note?: string) {
  count = Math.min(count, flock.eggs[type]);
  if (count <= 0) return;
  await api("POST", `/hatchery/batches/${flock.id}/egg-sales`, {
    eggTypeId: eggTypeIds[type], date: dayAgo(ago), count, unitPrice,
    ...(party ? { partyId: partyIds[party] } : {}), note,
  });
  flock.eggs[type] -= count;
  if (party) partyOwed[party] += round2(count * unitPrice);
  counts.eggSales += 1;
}

// ── Incubation and chicks ────────────────────────────────────────────────────

function planIncubation(setAgo: number) {
  const flock = flocks.PF1;
  on(setAgo, O.incubation, `set eggs ${setAgo}`, async () => {
    const eggs = roundDown(flock.eggs.hatchable, 100);
    if (eggs < 300) return;
    const batch = await api("POST", "/hatchery/incubations", {
      parentBatchId: flock.id, startDate: dayAgo(setAgo), eggsSetCount: eggs, notes: "Setter machine 1",
    });
    flock.eggs.hatchable -= eggs;
    incubations[setAgo] = { id: batch.id, set: eggs, fertile: eggs, chicks: { A: 0, B: 0, CULL: 0 } };
    counts.incubations += 1;
  });

  on(setAgo - 9, O.incubation, `candling ${setAgo}`, async () => {
    const inc = incubations[setAgo];
    if (!inc) return;
    const infertile = Math.round(inc.set * (0.05 + rnd() * 0.04));
    const earlyDead = Math.round(inc.set * (0.015 + rnd() * 0.015));
    await api("POST", `/hatchery/incubations/${inc.id}/candling`, { date: dayAgo(setAgo - 9), infertile, earlyDead });
    inc.fertile = inc.set - infertile - earlyDead;
  });

  on(setAgo - 18, O.incubation, `transfer ${setAgo}`, async () => {
    const inc = incubations[setAgo];
    if (inc) await api("POST", `/hatchery/incubations/${inc.id}/transfer`, { date: dayAgo(setAgo - 18) });
  });

  on(setAgo - 21, O.incubation, `hatch ${setAgo}`, async () => {
    const inc = incubations[setAgo];
    if (!inc) return;
    const f = inc.fertile;
    let hatchedA = Math.round(f * (0.86 + rnd() * 0.04));
    const hatchedB = Math.round(f * (0.03 + rnd() * 0.02));
    const cull = Math.round(f * (0.01 + rnd() * 0.01));
    const lateDead = Math.round(f * (0.02 + rnd() * 0.015));
    const unhatched = Math.max(0, f - hatchedA - hatchedB - cull - lateDead);
    hatchedA = f - hatchedB - cull - lateDead - unhatched; // totals must equal fertile eggs
    await api("POST", `/hatchery/incubations/${inc.id}/hatch-results`, {
      date: dayAgo(setAgo - 21), hatchedA, hatchedB, cull, lateDead, unhatched,
    });
    inc.chicks = { A: hatchedA, B: hatchedB, CULL: cull };
  });

  // Chicks go out on hatch day and the next morning.
  const hatchAgo = setAgo - 21;
  on(hatchAgo, O.sale, `chick sales ${setAgo}`, async () => {
    const inc = incubations[setAgo];
    if (!inc) return;
    const buyers = ["Ram Bahadur Thapa", "Sita Gurung", "Hari Prasad Adhikari", "Krishna Chaudhary"];
    const orders = [pick([1000, 1200, 1500]), pick([800, 1000]), pick([500, 600, 700])];
    for (const [i, size] of orders.entries()) {
      await sellChicks(inc, hatchAgo, "A", size, pick([85, 88, 90]), buyers[(setAgo + i) % buyers.length]);
    }
    await sellChicks(inc, hatchAgo, "B", inc.chicks.B, 55, "Krishna Chaudhary", "B grade, small chicks");
  });
  on(hatchAgo - 1, O.sale, `chick sales next day ${setAgo}`, async () => {
    const inc = incubations[setAgo];
    if (!inc) return;
    // Walk-in cash buyers take most of what is left. The newest hatch keeps a few chicks in stock.
    const left = hatchAgo - 1 <= 3 ? Math.round(inc.chicks.A * 0.6) : inc.chicks.A;
    await sellChicks(inc, hatchAgo - 1, "A", left, 92, undefined, "Cash sale at gate");
    await sellChicks(inc, hatchAgo - 1, "CULL", inc.chicks.CULL, 10, undefined, "Cull chicks");
  });
}

async function sellChicks(inc: Incubation, ago: number, grade: "A" | "B" | "CULL", count: number, unitPrice: number, party?: string, note?: string) {
  count = Math.min(count, inc.chicks[grade]);
  if (count <= 0 || ago < 0) return;
  await api("POST", `/hatchery/incubations/${inc.id}/chick-sales`, {
    grade, date: dayAgo(ago), count, unitPrice, ...(party ? { partyId: partyIds[party] } : {}), note,
  });
  inc.chicks[grade] -= count;
  if (party) partyOwed[party] += round2(count * unitPrice);
  counts.chickSales += 1;
}

// ── Parent bird sales ────────────────────────────────────────────────────────

async function sellParents(flock: Flock, ago: number, female: number, male: number, avgKg: number, ratePerKg: number, party?: string, note?: string) {
  female = Math.min(female, flock.females);
  male = Math.min(male, flock.males);
  if (female + male <= 0) return;
  const totalWeightKg = round2((female + male) * avgKg);
  await api("POST", `/hatchery/batches/${flock.id}/parent-sales`, {
    date: dayAgo(ago), femaleCount: female, maleCount: male, totalWeightKg, ratePerKg,
    ...(party ? { partyId: partyIds[party] } : {}), note,
  });
  flock.females -= female;
  flock.males -= male;
  if (party) partyOwed[party] += round2(totalWeightKg * ratePerKg);
  counts.parentSales += 1;
}

// ── Self-made feed ───────────────────────────────────────────────────────────

function planSelfFeed() {
  for (let ago = 56; ago >= 2; ago -= 14) {
    on(ago, O.production, `self feed ${ago}`, async () => {
      const recipe: Array<[ItemKey, number]> = [["maize", 1050], ["soya", 400], ["premix", 45]];
      for (const [key, qty] of recipe) await ensureStock(ago, key, qty);
      await api("POST", "/hatchery/production", {
        date: dayAgo(ago),
        referenceNumber: `MILL-${String((56 - ago) / 14 + 1).padStart(2, "0")}`,
        notes: "Own feed mill",
        inputs: recipe.map(([key, quantity]) => ({ inventoryItemId: itemIds[key], quantity })),
        outputs: [{ productId: selfFeedProductId, quantity: 1480, costAllocationPercent: 100 }],
      });
      for (const [key, qty] of recipe) stock[key] -= qty;
      const lot = await prisma.hatcheryInventoryItem.findFirst({
        where: { hatcheryOwnerId: ownerId, itemType: "SELF_MADE", id: { notIn: selfFeedLots.map((l) => l.id) } },
        orderBy: { createdAt: "desc" },
        select: { id: true, currentStock: true },
      });
      if (lot) selfFeedLots.push({ id: lot.id, stock: Number(lot.currentStock) });
    });
  }
}

// ── Parties and suppliers money ──────────────────────────────────────────────

const PARTIES: Array<{ name: string; phone: string; address: string; opening: number }> = [
  { name: "Ram Bahadur Thapa", phone: "9846200001", address: "Bharatpur-11, Chitwan", opening: 45000 },
  { name: "Sita Gurung", phone: "9846200002", address: "Ratnanagar-3, Chitwan", opening: 0 },
  { name: "Hari Prasad Adhikari", phone: "9846200003", address: "Khairahani-5, Chitwan", opening: 0 },
  { name: "Krishna Chaudhary", phone: "9846200004", address: "Rapti-4, Chitwan", opening: 0 },
  { name: "Gaurav Egg Suppliers", phone: "9846200005", address: "Narayangadh, Chitwan", opening: 18000 },
  { name: "Bharatpur Meat Shop", phone: "9846200006", address: "Bharatpur-10, Chitwan", opening: 0 },
  { name: "Everest Hatchery", phone: "9846200007", address: "Hetauda, Makwanpur", opening: 0 },
];

function planPartyPayments() {
  for (const p of PARTIES) {
    for (let ago = 60 - between(0, 5); ago >= 1; ago -= between(6, 9)) {
      on(ago, O.partyPayment, `payment ${p.name}`, async () => {
        const amount = roundDown(partyOwed[p.name] * (0.45 + rnd() * 0.4), 500);
        if (amount <= 0) return;
        await api("POST", `/hatchery/parties/${partyIds[p.name]}/payments`, {
          date: dayAgo(ago), amount, method: pick(["Cash", "Cash", "Bank transfer", "eSewa"]),
          note: pick([undefined, "Part payment", "Paid at gate"]),
        });
        partyOwed[p.name] -= amount;
      });
    }
  }
}

function paySupplier(ago: number, supplier: SupplierKey, share: number, method: string) {
  on(ago, O.supplierPayment, `pay ${supplier}`, async () => {
    const amount = roundDown(supplierOwed[supplier] * share, 1000);
    if (amount <= 0) return;
    await api("POST", `/hatchery/suppliers/${supplierIds[supplier]}/transactions`, {
      type: "PAYMENT", amount, date: dayAgo(ago), note: `Payment by ${method}`, reference: method === "Cheque" ? `CHQ-${between(100000, 999999)}` : undefined,
    });
    supplierOwed[supplier] -= amount;
  });
}

// ── Plan ──────────────────────────────────────────────────────────────────────

function planSchedule() {
  const { PF1, PF2, PF3 } = flocks;

  on(240, O.opening, "feed supplier opening", async () => {
    await api("POST", `/hatchery/suppliers/${supplierIds.feed}/opening-balance`, {
      amount: 120000, date: dayAgo(240), note: "Balance before using Poultry360",
    });
    supplierOwed.feed += 120000;
  });

  // Flocks: PF-001 laying now, PF-003 small flock sold out 15 days ago, PF-002 young.
  placeFlock(PF1, 1000, 130, 650, 20);
  placeFlock(PF3, 220, 30, 640, 0);
  placeFlock(PF2, 600, 80, 700, 0);
  planFlockCare(PF1, 0);
  planFlockCare(PF3, 16);
  planFlockCare(PF2, 0);

  // Laying starts at about 24 weeks.
  planEggs(PF1, 67, 0, 0.82);
  planEggs(PF3, 40, 16, 0.72);

  // Table eggs to the egg trader every 3 days, cracked eggs for cash every week.
  for (let ago = 64; ago >= 0; ago -= 3) {
    on(ago, O.sale, "table eggs", () => sellEggs(PF1, ago, "table", roundDown(PF1.eggs.table, 30), 15, rnd() < 0.8 ? "Gaurav Egg Suppliers" : undefined));
  }
  for (let ago = 63; ago >= 0; ago -= 7) {
    on(ago, O.sale, "cracked eggs", () => sellEggs(PF1, ago, "cracked", PF1.eggs.cracked, 8, undefined, "Cracked eggs, cash"));
  }
  // PF-003 is too small to fill the setter, so its hatchable eggs go to another hatchery.
  for (let ago = 36; ago >= 16; ago -= 4) {
    on(ago, O.sale, "PF3 hatchable eggs", () => sellEggs(PF3, ago, "hatchable", roundDown(PF3.eggs.hatchable, 30), 32, "Everest Hatchery"));
    on(ago, O.sale, "PF3 table eggs", () => sellEggs(PF3, ago, "table", PF3.eggs.table, 15, "Gaurav Egg Suppliers"));
  }

  // Extra males from PF-001, then PF-003 sold out and closed.
  on(40, O.sale, "PF1 extra males", () => sellParents(PF1, 40, 0, 12, 4.3, 360, "Bharatpur Meat Shop", "Extra males"));
  on(15, O.sale, "PF3 sold out", async () => {
    await sellParents(PF3, 15, PF3.females, 0, 3.6, 330, "Bharatpur Meat Shop", "Whole flock sold (females)");
    await sellParents(PF3, 15, 0, PF3.males, 4.4, 330, "Bharatpur Meat Shop", "Whole flock sold (males)");
    await sellEggs(PF3, 15, "hatchable", PF3.eggs.hatchable, 32, "Everest Hatchery", "Last eggs");
    await sellEggs(PF3, 15, "table", PF3.eggs.table, 15, "Gaurav Egg Suppliers", "Last eggs");
    await sellEggs(PF3, 15, "cracked", PF3.eggs.cracked, 8, undefined, "Last cracked eggs");
  });
  on(14, O.sale, "PF3 close", async () => {
    await api("POST", `/hatchery/batches/${PF3.id}/close`);
    PF3.closed = true;
  });

  // Weekly setting. The last three are still in setter / candling / hatcher today.
  for (let ago = 60; ago >= 4; ago -= 7) planIncubation(ago);

  planSelfFeed();
  planPartyPayments();

  // Suppliers: chicks paid soon after, feed every 10 days, vet and grain monthly.
  for (const placed of [235, 200, 62]) paySupplier(placed - 3, "chicks", 1, "Bank transfer");
  for (let ago = 230; ago >= 2; ago -= 10) paySupplier(ago, "feed", 0.7, pick(["Bank transfer", "Cheque"]));
  for (let ago = 220; ago >= 5; ago -= 30) paySupplier(ago, "vet", 0.8, "Cash");
  for (let ago = 50; ago >= 5; ago -= 15) paySupplier(ago, "grain", 0.75, "Cash");
  on(100, O.supplierPayment, "feed rate adjustment", async () => {
    await api("POST", `/hatchery/suppliers/${supplierIds.feed}/transactions`, {
      type: "ADJUSTMENT", amount: -1500, date: dayAgo(100), note: "Rate difference on old bill",
    });
    supplierOwed.feed -= 1500;
  });
}

// ── Staff, bill details (after the schedule) ─────────────────────────────────

async function seedStaff(password: string) {
  const staff: Array<{ name: string; payType: "MONTHLY" | "DAILY"; rate: number; startAgo: number }> = [
    { name: "Bikram Tamang (hatcher operator)", payType: "MONTHLY", rate: 22000, startAgo: 240 },
    { name: "Sarita Chaudhary (farm worker)", payType: "MONTHLY", rate: 17000, startAgo: 240 },
    { name: "Dipak Mahato (daily helper)", payType: "DAILY", rate: 900, startAgo: 50 },
  ];
  for (const s of staff) {
    const res = await api("POST", "/hatchery/staff", {
      name: s.name, payType: s.payType, startDate: `${dayAgo(s.startAgo)}T00:00:00.000Z`, rate: s.rate,
    });
    const id = res.data.id;
    if (s.payType === "MONTHLY") {
      for (let ago = 215; ago >= 5; ago -= 30) {
        await api("POST", `/hatchery/staff/${id}/payments`, { amount: s.rate, paidAt: `${dayAgo(ago)}T12:00:00.000Z`, note: "Monthly salary" });
      }
    } else {
      for (const ago of [44, 37, 30, 23, 16, 9]) {
        await api("PUT", `/hatchery/staff/${id}/attendance`, { date: dayAgo(ago), status: "ABSENT" });
      }
      await api("PUT", `/hatchery/staff/${id}/attendance`, { date: dayAgo(6), status: "HALF_DAY" });
      for (const ago of [35, 20, 3]) {
        await api("POST", `/hatchery/staff/${id}/payments`, { amount: 9000, paidAt: `${dayAgo(ago)}T12:00:00.000Z`, note: "Wages" });
      }
    }
  }

  const existingStaffLogin = await prisma.staffUser.findFirst({ where: { phone: STAFF_LOGIN_PHONE } });
  if (!existingStaffLogin) {
    await api("POST", "/staff-auth/users", {
      name: "Bikram Tamang",
      phone: STAFF_LOGIN_PHONE,
      password,
      permissions: ["HATCHERY_MANAGE_OPERATIONS", "HATCHERY_VIEW_ANALYTICS"],
    });
    // Demo staff should land straight on the dashboard, not on the first-login
    // password prompt that createStaffUser sets for real new accounts.
    await prisma.staffUser.updateMany({
      where: { phone: STAFF_LOGIN_PHONE },
      data: { mustChangePassword: false },
    });
  }
}

// ── Login, reset ──────────────────────────────────────────────────────────────

/** Deletes ONLY the demo hatchery account (and everything it owns). Local database only. */
async function resetDemoHatchery() {
  const user = await prisma.user.findUnique({ where: { id: account.id }, select: { id: true, phone: true } });
  if (!user) return;
  if (user.phone !== account.phone) throw new Error("Refusing to reset: demo id belongs to another phone.");
  console.log("Deleting old demo hatchery data...");
  // Child rows that block a plain cascade go first.
  await prisma.hatcheryIncubationBatch.deleteMany({ where: { hatcheryOwnerId: user.id } });
  await prisma.hatcheryBatch.deleteMany({ where: { hatcheryOwnerId: user.id } });
  await prisma.hatcheryProductionRun.deleteMany({ where: { hatcheryOwnerId: user.id } });
  await prisma.staffUser.deleteMany({ where: { phone: STAFF_LOGIN_PHONE } });
  await prisma.user.delete({ where: { id: user.id } });
}

async function ensureDemoHatcheryLogin(): Promise<string> {
  const password = process.env[account.passwordEnv] || process.env.P360_DEMO_PASSWORD || DEFAULT_DEMO_PASSWORD;

  if (RESET) await resetDemoHatchery();

  const suppliers = await prisma.hatcherySupplier.count({ where: { hatcheryOwnerId: account.id } });
  if (suppliers > 0) {
    throw new Error(
      `Demo hatchery ${account.phone} already has data (${suppliers} supplier(s)). Run again with --reset to delete it and seed fresh.`,
    );
  }

  const hash = await bcrypt.hash(password, 12);
  await prisma.$transaction(async (tx) => {
    const user = await upsertDemoUser(tx, account, hash);
    const byId = await tx.hatcheryBusiness.findUnique({ where: { id: HATCHERY_ID } });
    if (byId && byId.ownerId !== user.id) {
      throw new Error(`Refusing to seed: reserved hatchery id ${HATCHERY_ID} belongs to another owner.`);
    }
    const owned = await tx.hatcheryBusiness.findUnique({ where: { ownerId: user.id } });
    if (!owned) {
      await tx.hatcheryBusiness.create({
        data: { id: HATCHERY_ID, name: account.businessName, contact: account.phone.replace("+977", ""), address: account.location, ownerId: user.id },
      });
    }
  });
  return password;
}

function isLocalUrl(url: string) {
  try {
    return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // Paying users are on production: block the seed unless either the DB
  // and API are explicitly local, or P360_DEMO_SEED_CONFIRMED=1 is set
  // (the scripts/seed-demo-prod.sh helper sets it after prompting for a
  // backup). Matches the farmer and dealer seeds' guard shape.
  const isLocalTarget = isLocalDatabase() && isLocalUrl(API_URL);
  if (!isLocalTarget && process.env.P360_DEMO_SEED_CONFIRMED !== "1") {
    throw new Error(
      "Hatchery demo seed targets a remote DB or API. Set P360_DEMO_SEED_CONFIRMED=1 after confirming a backup, or run against a local DATABASE_URL and P360_API_URL.",
    );
  }
  console.log(`Seeding demo hatchery through ${API_URL} (Nepal today ${NEPAL_TODAY})...`);

  const password = await ensureDemoHatcheryLogin();
  ownerId = account.id;
  await setAccountFeature({
    accountId: ownerId, featureKey: ACCOUNT_FEATURE_KEYS.SELF_FEED_PRODUCTION, enabled: true, updatedById: ownerId,
  });

  const login = await api("POST", "/auth/login", { emailOrPhone: account.phone, password });
  token = login.accessToken;

  await api("PUT", "/bill-settings", {
    businessName: account.businessName,
    address: account.location,
    panNumber: "609876543",
    phone: account.phone,
    footerNote: "Thank you! Healthy chicks, every week.",
  });

  const suppliers: Array<[SupplierKey, string, string, string]> = [
    ["chicks", "Kalika Parent Stock Pvt. Ltd.", "9855200001", "Ratnanagar, Chitwan"],
    ["feed", "Shree Ram Feed Industries", "9855200002", "Narayangadh, Chitwan"],
    ["vet", "Nepal Vet Pharma", "9855200003", "Bharatpur-10, Chitwan"],
    ["grain", "Chitwan Grain Traders", "9855200004", "Tandi, Chitwan"],
  ];
  for (const [key, name, contact, address] of suppliers) {
    supplierIds[key] = (await api("POST", "/hatchery/suppliers", { name, contact, address })).data.id;
  }

  eggTypeIds.hatchable = (await api("POST", "/hatchery/egg-types", { name: "Hatchable egg", isHatchable: true })).id;
  eggTypeIds.table = (await api("POST", "/hatchery/egg-types", { name: "Table egg" })).id;
  eggTypeIds.cracked = (await api("POST", "/hatchery/egg-types", { name: "Cracked egg" })).id;

  selfFeedProductId = (await api("POST", "/hatchery/products", { name: SELF_FEED_NAME, unit: "kg", minStock: 300 })).data.id;

  for (const p of PARTIES) {
    const party = await api("POST", "/hatchery/parties", {
      name: p.name, phone: p.phone, address: p.address, ...(p.opening ? { openingBalance: p.opening } : {}),
    });
    partyIds[p.name] = party.id;
    partyOwed[p.name] = p.opening;
  }

  planSchedule();
  events.sort((a, b) => b.ago - a.ago || a.order - b.order);
  for (const event of events) {
    if (event.ago < 0) continue; // never enter future dates
    try {
      await event.run();
    } catch (error) {
      throw new Error(`[${dayAgo(event.ago)} ${event.label}] ${error instanceof Error ? error.message : error}`);
    }
  }

  await seedStaff(password);

  console.log(
    `\nDemo hatchery ready: ${counts.purchases} purchases, ${counts.incubations} incubations, ` +
      `${counts.eggSales} egg sales, ${counts.chickSales} chick sales, ${counts.parentSales} parent sales (${callCount} API calls).`,
  );
  console.log(`Phone: ${account.phone.replace("+977", "")}`);
  console.log(`Password: ${process.env[account.passwordEnv] ? "(the one you set)" : password}`);
  console.log(`Staff login: ${STAFF_LOGIN_PHONE.replace("+977", "")} (same password)`);
}

main()
  .catch((error) => {
    console.error("\nDemo hatchery seed failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
