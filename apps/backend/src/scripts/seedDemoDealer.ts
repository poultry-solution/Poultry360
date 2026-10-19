/**
 * Demo feed dealer seed: one realistic dealer shop, entered through the normal
 * API so stock, invoices, balances, ledger rows and audit history are created
 * exactly as when a dealer uses the app.
 *
 * - Creates (or reuses) the reserved demo dealer login only. Never touches other users.
 * - Refuses to run if that dealer already has suppliers (re-running would duplicate data).
 * - Local database by default. Against any other database it needs
 *   P360_DEMO_SEED_CONFIRMED=1 (set by scripts/seed-demo-prod.sh after its backup prompt).
 * - The backend API must be running (P360_API_URL, default http://localhost:8081/api/v1).
 *
 * Data, all dated relative to today in Nepal (about the last 100 days):
 *   3 suppliers (feed mill, hatchery, vet pharma) with opening balance, regular
 *   purchases (one with a trade discount) and payments.
 *   Products: 4 feeds, broiler chicks, medicines (one expired, one expiring soon),
 *   feeders; some below their low-stock level.
 *   8 farmer customers (2 with opening balances, 1 archived), ~100 sales
 *   (cash, credit, part paid, some discounted, multi-item) and regular payments.
 *   Staff: 2 monthly + 1 daily worker with salary payments and absences,
 *   one staff login, and today's cash in hand.
 */

import "dotenv/config";
import bcrypt from "bcrypt";
import prisma from "../utils/prisma";
import { DEFAULT_DEMO_PASSWORD, DEMO_ACCOUNTS, isLocalDatabase, upsertDemoUser } from "./demoSeedUtils";

const account = DEMO_ACCOUNTS.dealer;
const DEALER_ID = "p360-demo-dealer-v2";
const STAFF_LOGIN_PHONE = "+9779800360022";
const API_URL = (process.env.P360_API_URL || `http://localhost:${process.env.PORT || 8081}/api/v1`).replace(/\/$/, "");

// ── Dates (Nepal days) ────────────────────────────────────────────────────────

const NEPAL_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;
const NEPAL_TODAY = new Date(Date.now() + NEPAL_OFFSET_MS).toISOString().slice(0, 10);

/** AD YYYY-MM-DD of the Nepal day `ago` days before today (negative = future). */
function dayAgo(ago: number): string {
  const [y, m, d] = NEPAL_TODAY.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - ago)).toISOString().slice(0, 10);
}

/**
 * A moment inside that Nepal day. `utcMinutes` counts from 00:00 UTC (05:45 Nepal),
 * so anything below 18h stays on the same Nepal day. Never later than now.
 */
function at(ago: number, utcMinutes: number): string {
  const time = new Date(`${dayAgo(ago)}T00:00:00.000Z`).getTime() + utcMinutes * 60 * 1000;
  return new Date(Math.min(time, Date.now() - 60 * 1000)).toISOString();
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
const rnd = makeRandom(2083);
const between = (min: number, max: number) => min + Math.floor(rnd() * (max - min + 1));
const pick = <T,>(list: T[]) => list[Math.floor(rnd() * list.length)];
const round2 = (n: number) => Math.round(n * 100) / 100;
const roundTo = (n: number, step: number) => Math.floor(n / step) * step;

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

// Order inside one day: opening balances → purchases → sales → customer payments → supplier payments → staff.
const O = { opening: 0, purchase: 1, sale: 2, customerPayment: 3, supplierPayment: 4, staff: 5 };

// ── Catalogue ─────────────────────────────────────────────────────────────────

type SupplierKey = "feedMill" | "hatchery" | "vetPharma";
type ProductKey =
  | "starter" | "grower" | "finisher" | "layerMash"
  | "chicks"
  | "vitamin" | "enro" | "gumboro" | "feeder";

const PRODUCTS: Record<ProductKey, {
  name: string;
  type: "FEED" | "CHICKS" | "OTHER";
  unit: string;
  cost: number;
  sell: number;
  supplier: SupplierKey;
  minStock?: number;
  expiryAgo?: number; // expiry date as days ago (negative = in the future)
}> = {
  starter: { name: "B0 Starter Feed (50 kg)", type: "FEED", unit: "bags", cost: 3850, sell: 4000, supplier: "feedMill", minStock: 20 },
  grower: { name: "B1 Grower Feed (50 kg)", type: "FEED", unit: "bags", cost: 3750, sell: 3900, supplier: "feedMill", minStock: 30 },
  finisher: { name: "B2 Finisher Feed (50 kg)", type: "FEED", unit: "bags", cost: 3700, sell: 3850, supplier: "feedMill", minStock: 30 },
  layerMash: { name: "Layer Mash (50 kg)", type: "FEED", unit: "bags", cost: 3550, sell: 3700, supplier: "feedMill", minStock: 15 },
  chicks: { name: "Broiler Chicks (Cobb 500)", type: "CHICKS", unit: "pcs", cost: 82, sell: 92, supplier: "hatchery" },
  vitamin: { name: "Vitamin AD3E (1 L)", type: "OTHER", unit: "bottles", cost: 420, sell: 480, supplier: "vetPharma", minStock: 10, expiryAgo: -240 },
  enro: { name: "Enrofloxacin 10% (1 L)", type: "OTHER", unit: "bottles", cost: 850, sell: 950, supplier: "vetPharma", minStock: 5, expiryAgo: -20 },
  gumboro: { name: "Gumboro Vaccine (1000 dose)", type: "OTHER", unit: "bottles", cost: 300, sell: 360, supplier: "vetPharma", expiryAgo: 10 },
  feeder: { name: "Round Feeder (plastic)", type: "OTHER", unit: "pcs", cost: 350, sell: 450, supplier: "vetPharma", minStock: 10 },
};

const FEEDS: ProductKey[] = ["starter", "grower", "finisher", "layerMash"];

// ── State filled while the seed runs ──────────────────────────────────────────

const supplierIds = {} as Record<SupplierKey, string>;
const supplierOwed: Record<SupplierKey, number> = { feedMill: 0, hatchery: 0, vetPharma: 0 };
const productIds = {} as Partial<Record<ProductKey, string>>;
const stock: Record<ProductKey, number> = {
  starter: 0, grower: 0, finisher: 0, layerMash: 0, chicks: 0, vitamin: 0, enro: 0, gumboro: 0, feeder: 0,
};
const customerIds: Record<string, string> = {};
const customerOwed: Record<string, number> = {};
let salesMade = 0;

// ── Actions ───────────────────────────────────────────────────────────────────

function purchase(ago: number, supplier: SupplierKey, lines: Array<[ProductKey, number]>, tradeDiscount = 0) {
  on(ago, O.purchase, `purchase ${supplier}`, async () => {
    const items = lines.map(([key, quantity]) => {
      const p = PRODUCTS[key];
      return {
        productName: p.name,
        type: p.type,
        unit: p.unit,
        quantity,
        costPrice: p.cost,
        sellingPrice: p.sell,
        ...(p.minStock != null ? { minStock: p.minStock } : {}),
        ...(p.expiryAgo != null ? { expiryDate: dayAgo(p.expiryAgo) } : {}),
      };
    });
    const res = await api("POST", `/dealer/manual-companies/${supplierIds[supplier]}/purchases`, {
      items,
      date: at(ago, 180),
      ...(tradeDiscount ? { tradeDiscountAmount: tradeDiscount, notes: "Trade discount on bulk order" } : {}),
    });
    const saved = res.data.items as Array<{ dealerProductId: string }>;
    lines.forEach(([key, quantity], i) => {
      productIds[key] = saved[i].dealerProductId;
      stock[key] += quantity;
    });
    const gross = lines.reduce((sum, [key, q]) => sum + q * PRODUCTS[key].cost, 0);
    supplierOwed[supplier] += gross - tradeDiscount;
  });
}

function paySupplier(ago: number, supplier: SupplierKey, share: number, method = "BANK_TRANSFER") {
  on(ago, O.supplierPayment, `pay ${supplier}`, async () => {
    const amount = roundTo(supplierOwed[supplier] * share, 1000);
    if (amount <= 0) return;
    await api("POST", `/dealer/manual-companies/${supplierIds[supplier]}/payments`, {
      amount,
      direction: "MADE",
      paymentMethod: method,
      paymentDate: at(ago, 540),
      notes: "Payment to supplier",
    });
    supplierOwed[supplier] -= amount;
  });
}

type SaleLine = [ProductKey, number];

function sale(ago: number, minute: number, customer: string, lines: SaleLine[], pay: "cash" | "part" | "credit", discount?: { type: "PERCENT" | "FLAT"; value: number }) {
  on(ago, O.sale, `sale ${customer}`, async () => {
    // Real dealer sales can repeat the same product on different lines
    // (e.g. two bulk rows at different quantities). The backend aggregates per
    // product before the stock check, so we send lines as-is. Clamp each line
    // to the stock remaining after the prior same-product lines in this sale,
    // so our local stock view and the API agree.
    const perProduct: Partial<Record<ProductKey, number>> = {};
    const items: SaleLine[] = [];
    for (const [key, qty] of lines) {
      const used = perProduct[key] || 0;
      const take = Math.min(qty, stock[key] - used);
      if (take > 0 && productIds[key]) {
        items.push([key, take]);
        perProduct[key] = used + take;
      }
    }
    if (items.length === 0) return;

    const subtotal = items.reduce((sum, [key, qty]) => sum + qty * PRODUCTS[key].sell, 0);
    const discountAmount = !discount ? 0 : discount.type === "FLAT" ? Math.min(discount.value, subtotal) : round2((subtotal * discount.value) / 100);
    const total = round2(subtotal - discountAmount);
    const paid = pay === "cash" ? total : pay === "part" ? roundTo(total * (0.4 + rnd() * 0.3), 100) : 0;

    await api("POST", "/dealer/sales", {
      customerId: customerIds[customer],
      items: items.map(([key, qty]) => ({ productId: productIds[key], quantity: qty, unitPrice: PRODUCTS[key].sell, unit: PRODUCTS[key].unit })),
      paidAmount: paid,
      paymentMethod: pay === "credit" ? undefined : pick(["CASH", "CASH", "BANK_TRANSFER"]),
      date: at(ago, 240 + minute),
      ...(discount ? { discount } : {}),
    });
    items.forEach(([key, qty]) => { stock[key] -= qty; });
    customerOwed[customer] += total - paid;
    salesMade += 1;
  });
}

function customerPayment(ago: number, customer: string, share: number) {
  on(ago, O.customerPayment, `payment ${customer}`, async () => {
    const amount = roundTo(customerOwed[customer] * share, 500);
    if (amount <= 0) return;
    await api("POST", "/dealer/ledger/payments", {
      customerId: customerIds[customer],
      amount,
      direction: "RECEIVED",
      paymentMethod: pick(["CASH", "BANK_TRANSFER", "CASH"]),
      date: dayAgo(ago),
      notes: "Payment received",
    });
    customerOwed[customer] -= amount;
  });
}

// ── Plan ──────────────────────────────────────────────────────────────────────

const CUSTOMERS: Array<{ name: string; phone: string; address: string; category: string; opening: number; kind: "broiler" | "layer" | "both" }> = [
  { name: "Ram Bahadur Thapa", phone: "9846100001", address: "Bharatpur-11, Chitwan", category: "Broiler farmer", opening: 85000, kind: "broiler" },
  { name: "Sita Gurung", phone: "9846100002", address: "Ratnanagar-3, Chitwan", category: "Broiler farmer", opening: 0, kind: "broiler" },
  { name: "Hari Prasad Adhikari", phone: "9846100003", address: "Khairahani-5, Chitwan", category: "Broiler farmer", opening: 0, kind: "broiler" },
  { name: "Gita Poudel", phone: "9846100004", address: "Kalika-8, Chitwan", category: "Layer farmer", opening: 42000, kind: "layer" },
  { name: "Bishnu Shrestha", phone: "9846100005", address: "Madi-2, Chitwan", category: "Broiler farmer", opening: 0, kind: "broiler" },
  { name: "Krishna Chaudhary", phone: "9846100006", address: "Rapti-4, Chitwan", category: "Broiler farmer", opening: 0, kind: "broiler" },
  { name: "Laxmi Kandel", phone: "9846100007", address: "Ichchhakamana-1, Chitwan", category: "Layer farmer", opening: 0, kind: "layer" },
  { name: "Durga Bhattarai", phone: "9846100008", address: "Bharatpur-15, Chitwan", category: "Mixed farmer", opening: 0, kind: "both" },
];

function planSchedule() {
  // Supplier opening balance (what the shop owed before using the app).
  on(100, O.opening, "supplier opening", async () => {
    await api("POST", `/dealer/manual-companies/${supplierIds.feedMill}/opening-balance`, {
      openingBalance: 150000,
      notes: "Balance before using Poultry360",
      date: at(100, 60),
    });
    supplierOwed.feedMill += 150000;
  });

  // Feed every ~12 days, chicks every ~14 days, medicine twice.
  for (let ago = 98, i = 0; ago >= 3; ago -= 12, i += 1) {
    purchase(ago, "feedMill", [["starter", 60], ["grower", 110], ["finisher", 110], ["layerMash", 40]], i === 3 ? 5000 : 0);
    paySupplier(ago - 5, "feedMill", 0.55);
  }
  for (let ago = 97; ago >= 3; ago -= 14) {
    purchase(ago, "hatchery", [["chicks", 4000]]);
    paySupplier(ago - 2, "hatchery", 0.8, "CASH");
  }
  purchase(95, "vetPharma", [["vitamin", 40], ["enro", 15], ["gumboro", 30], ["feeder", 40]]);
  purchase(45, "vetPharma", [["vitamin", 30], ["enro", 12]]);
  paySupplier(60, "vetPharma", 0.7, "CASH");
  paySupplier(20, "vetPharma", 0.5, "CASH");

  // Sales: most days 1-3 bills, mixed cash / part / credit.
  const discountFor = () => {
    const r = rnd();
    if (r < 0.12) return { type: "FLAT" as const, value: pick([200, 500, 1000]) };
    if (r < 0.2) return { type: "PERCENT" as const, value: pick([1, 2]) };
    return undefined;
  };
  for (let ago = 96; ago >= 0; ago -= 1) {
    if (rnd() < 0.3) continue; // closed or quiet day
    const bills = between(1, 3);
    for (let b = 0; b < bills; b += 1) {
      const c = pick(CUSTOMERS);
      const lines: SaleLine[] = [];
      if (c.kind === "layer" || (c.kind === "both" && rnd() < 0.4)) {
        lines.push(["layerMash", between(3, 12)]);
      } else {
        const feed = pick(["starter", "grower", "grower", "finisher", "finisher"] as ProductKey[]);
        lines.push([feed, between(5, 30)]);
        if (rnd() < 0.35) lines.push([feed === "starter" ? "grower" : "finisher", between(5, 20)]);
        if (rnd() < 0.18) lines.push(["chicks", pick([500, 800, 1000, 1500])]);
      }
      if (rnd() < 0.25) lines.push([pick(["vitamin", "enro", "vitamin", "gumboro"] as ProductKey[]), between(1, 4)]);
      if (rnd() < 0.06) lines.push(["feeder", between(2, 6)]);
      const r = rnd();
      sale(ago, b * 25, c.name, lines, r < 0.45 ? "cash" : r < 0.75 ? "part" : "credit", discountFor());
    }
  }

  // Customers pay part of what they owe about once a week.
  for (const c of CUSTOMERS) {
    for (let ago = 90 - between(0, 6); ago >= 1; ago -= between(6, 10)) {
      customerPayment(ago, c.name, 0.35 + rnd() * 0.4);
    }
  }
}

// ── Staff, cash and archive (after sales) ────────────────────────────────────

async function seedStaff(password: string) {
  const staff: Array<{ name: string; payType: "MONTHLY" | "DAILY"; rate: number; startAgo: number }> = [
    { name: "Ramesh Tamang (shop helper)", payType: "MONTHLY", rate: 18000, startAgo: 130 },
    { name: "Sunita Rai (accounts)", payType: "MONTHLY", rate: 22000, startAgo: 130 },
    { name: "Bikash Magar (loading)", payType: "DAILY", rate: 800, startAgo: 45 },
  ];
  for (const s of staff) {
    const res = await api("POST", "/dealer/staff", {
      name: s.name,
      payType: s.payType,
      startDate: `${dayAgo(s.startAgo)}T00:00:00.000Z`,
      rate: s.rate,
    });
    const id = res.data.id;
    if (s.payType === "MONTHLY") {
      for (const ago of [95, 65, 35, 5]) {
        await api("POST", `/dealer/staff/${id}/payments`, { amount: s.rate, paidAt: `${dayAgo(ago)}T12:00:00.000Z`, note: "Monthly salary" });
      }
    } else {
      for (const ago of [40, 33, 26, 19, 12]) {
        await api("PUT", `/dealer/staff/${id}/attendance`, { date: dayAgo(ago), status: "ABSENT" });
      }
      await api("PUT", `/dealer/staff/${id}/attendance`, { date: dayAgo(8), status: "HALF_DAY" });
      for (const ago of [30, 15, 2]) {
        await api("POST", `/dealer/staff/${id}/payments`, { amount: 8000, paidAt: `${dayAgo(ago)}T12:00:00.000Z`, note: "Wages" });
      }
    }
  }

  const existingStaffLogin = await prisma.staffUser.findFirst({ where: { phone: STAFF_LOGIN_PHONE } }).catch(() => null);
  if (!existingStaffLogin) {
    await api("POST", "/staff-auth/users", {
      name: "Sunita Rai",
      phone: STAFF_LOGIN_PHONE,
      password,
      permissions: ["DEALER_VIEW_FINANCIAL_SUMMARIES", "DEALER_VIEW_CASH_HISTORY"],
    });
    // Demo staff should land straight on the dashboard, not on the first-login
    // password prompt that createStaffUser sets for real new accounts.
    await prisma.staffUser.updateMany({
      where: { phone: STAFF_LOGIN_PHONE },
      data: { mustChangePassword: false },
    });
  }
}

async function seedCashToday() {
  await api("POST", "/dealer/cash-in-hand/setup", { initialOpening: 45000 });
  const moves: Array<["IN" | "OUT", number, string, string]> = [
    ["IN", 38500, "Ram Bahadur Thapa", "Feed sale cash"],
    ["IN", 12000, "Sita Gurung", "Old due"],
    ["OUT", 2500, "Tea and snacks", "Shop expense"],
    ["OUT", 6000, "Truck rent", "Feed delivery to Khairahani"],
    ["IN", 9600, "Walk-in customer", "Medicine and feeders"],
  ];
  for (const [direction, amount, partyName, notes] of moves) {
    await api("POST", "/dealer/cash-in-hand/movements", { direction, amount, partyName, notes });
  }
}

// ── Login ─────────────────────────────────────────────────────────────────────

async function ensureDemoDealerLogin(): Promise<string> {
  const explicitPassword = process.env[account.passwordEnv];
  const password = explicitPassword || process.env.P360_DEMO_PASSWORD || DEFAULT_DEMO_PASSWORD;

  const existing = await prisma.user.findUnique({ where: { id: account.id }, select: { id: true } });
  if (existing) {
    const dealer = await prisma.dealer.findUnique({ where: { ownerId: account.id }, select: { id: true } });
    if (dealer) {
      const suppliers = await prisma.dealerManualCompany.count({ where: { dealerId: dealer.id } });
      if (suppliers > 0) {
        throw new Error(
          `Demo dealer ${account.phone} already has data (${suppliers} supplier(s)). Delete that demo account's data first; re-running would duplicate it.`,
        );
      }
    }
  }

  const hash = await bcrypt.hash(password, 12);
  await prisma.$transaction(async (tx) => {
    const user = await upsertDemoUser(tx, account, hash);
    const byId = await tx.dealer.findUnique({ where: { id: DEALER_ID } });
    if (byId && byId.ownerId !== user.id) {
      throw new Error(`Refusing to seed: reserved dealer id ${DEALER_ID} belongs to another owner.`);
    }
    const owned = await tx.dealer.findUnique({ where: { ownerId: user.id } });
    if (!owned) {
      await tx.dealer.create({
        data: { id: DEALER_ID, name: account.businessName, contact: account.phone.replace("+977", ""), address: account.location, ownerId: user.id },
      });
    }
  });
  return password;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!isLocalDatabase() && process.env.P360_DEMO_SEED_CONFIRMED !== "1") {
    throw new Error(
      "Not a local database. To seed production, run scripts/seed-demo-prod.sh (it asks for a backup check first).",
    );
  }
  console.log(`Seeding demo dealer through ${API_URL} (Nepal today ${NEPAL_TODAY})...`);

  const password = await ensureDemoDealerLogin();
  const login = await api("POST", "/auth/login", { emailOrPhone: account.phone, password });
  token = login.accessToken;

  // Suppliers.
  const suppliers: Array<[SupplierKey, string, string, string]> = [
    ["feedMill", "Shree Krishna Feed Udhyog", "9855100001", "Narayangadh, Chitwan"],
    ["hatchery", "Kalika Hatchery", "9855100002", "Ratnanagar, Chitwan"],
    ["vetPharma", "Nepal Vet Pharma", "9855100003", "Bharatpur-10, Chitwan"],
  ];
  for (const [key, name, phone, address] of suppliers) {
    supplierIds[key] = (await api("POST", "/dealer/manual-companies", { name, phone, address })).data.id;
  }

  // Customers. Opening balances go in at creation time via the dealer-scoped
  // endpoint (/dealer/sales/customers accepts `openingBalance` + the optional
  // `openingBalanceDate`). We date the opening ~100 days ago so it precedes the
  // historical sales in the customer statement.
  for (const c of CUSTOMERS) {
    const res = await api("POST", "/dealer/sales/customers", {
      name: c.name,
      phone: c.phone,
      address: c.address,
      category: c.category,
      ...(c.opening ? { openingBalance: c.opening, openingBalanceDate: at(100, 90) } : {}),
    });
    customerIds[c.name] = res.data.id;
    customerOwed[c.name] = c.opening || 0;
  }

  // A customer who bought early, paid in full, then moved away (archived at the end).
  const OLD_CUSTOMER = "Mohan Lama (moved away)";
  customerIds[OLD_CUSTOMER] = (await api("POST", "/dealer/sales/customers", {
    name: OLD_CUSTOMER,
    phone: "9846100009",
    address: "Bharatpur-2, Chitwan",
    category: "Broiler farmer",
  })).data.id;
  customerOwed[OLD_CUSTOMER] = 0;
  sale(92, 50, OLD_CUSTOMER, [["starter", 10], ["vitamin", 2]], "cash");

  planSchedule();
  events.sort((a, b) => b.ago - a.ago || a.order - b.order);
  for (const event of events) {
    if (event.ago < 0) continue; // never enter future dates
    await event.run();
  }

  await api("POST", `/dealer/sales/customers/${customerIds[OLD_CUSTOMER]}/archive`);

  await seedStaff(password);
  await seedCashToday();

  console.log(`\nDemo dealer ready (${salesMade} sales, ${callCount} API calls).`);
  console.log(`Phone: ${account.phone} (log in with ${account.phone.replace("+977", "")})`);
  console.log(`Password: ${process.env[account.passwordEnv] ? "(the one you set)" : password}`);
  console.log(`Staff login: ${STAFF_LOGIN_PHONE.replace("+977", "")} (same password)`);
}

main()
  .catch((error) => {
    console.error("\nDemo dealer seed failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
