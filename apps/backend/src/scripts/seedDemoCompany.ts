/**
 * Demo feed-company seed: one small realistic feed mill, entered through the
 * normal API so supplier, dealer, raw material, product, purchase and sale
 * go through the same controllers (and audit) a real company user hits.
 *
 * Scope deliberately small per the brief:
 *   - 1 supplier
 *   - 1 customer (a manual dealer the company owns)
 *   - 1 raw material + 1 finished product
 *   - 1 purchase from the supplier (so raw-material stock goes up)
 *   - 1 sale to the customer (so product stock goes down and the dealer's
 *     account balance goes up)
 *
 * Guards mirror the hatchery/dealer seeds:
 *   - Refuses to run against a remote DB or API unless
 *     P360_DEMO_SEED_CONFIRMED=1 is set.
 *   - Only touches the reserved demo company account.
 *   - Refuses to re-run when that company already has data; pass --reset to
 *     delete only the demo company's rows and seed fresh.
 */

import "dotenv/config";
import bcrypt from "bcrypt";
import prisma from "../utils/prisma";
import { DEFAULT_DEMO_PASSWORD, DEMO_ACCOUNTS, isLocalDatabase, upsertDemoUser } from "./demoSeedUtils";

const account = DEMO_ACCOUNTS.company;
const COMPANY_ID = "p360-demo-company-v1";
const API_URL = (process.env.P360_API_URL || `http://localhost:${process.env.PORT || 8081}/api/v1`).replace(/\/$/, "");
const RESET = process.argv.includes("--reset");

// ── Dates ─────────────────────────────────────────────────────────────────────

const NEPAL_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;
const NEPAL_TODAY = new Date(Date.now() + NEPAL_OFFSET_MS).toISOString().slice(0, 10);

function dayAgo(ago: number): string {
  const [y, m, d] = NEPAL_TODAY.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - ago)).toISOString().slice(0, 10);
}

// ── API helper ────────────────────────────────────────────────────────────────

let token = "";
let callCount = 0;

async function api<T = any>(method: string, path: string, body?: unknown): Promise<T> {
  callCount += 1;
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
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
    throw new Error(
      `${method} ${path} failed (${res.status}): ${json?.message || json?.error || text}\nBody: ${JSON.stringify(body)}`,
    );
  }
  return json as T;
}

// ── Login + Company setup ────────────────────────────────────────────────────

function isLocalUrl(url: string) {
  try {
    return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** Deletes ONLY the demo company account (and everything it owns). Local database only. */
async function resetDemoCompany() {
  const user = await prisma.user.findUnique({
    where: { id: account.id },
    select: { id: true, phone: true },
  });
  if (!user) return;
  if (user.phone !== account.phone) {
    throw new Error("Refusing to reset: demo id belongs to another phone.");
  }
  console.log("Deleting old demo company data...");
  // Rows with Restrict FKs or non-cascaded links go first so the User delete
  // below can cascade cleanly.
  await prisma.companyPurchase.deleteMany({ where: { company: { ownerId: user.id } } });
  await prisma.companySale.deleteMany({ where: { company: { ownerId: user.id } } });
  await prisma.dealer.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
}

async function ensureDemoCompanyLogin(): Promise<string> {
  const password =
    process.env[account.passwordEnv] || process.env.P360_DEMO_PASSWORD || DEFAULT_DEMO_PASSWORD;

  if (RESET) await resetDemoCompany();

  const suppliers = await prisma.supplier.count({
    where: { company: { ownerId: account.id } },
  });
  if (suppliers > 0) {
    throw new Error(
      `Demo company ${account.phone} already has data (${suppliers} supplier(s)). Run again with --reset to delete it and seed fresh.`,
    );
  }

  const hash = await bcrypt.hash(password, 12);
  await prisma.$transaction(async (tx) => {
    const user = await upsertDemoUser(tx, account, hash);
    const byId = await tx.company.findUnique({ where: { id: COMPANY_ID } });
    if (byId && byId.ownerId !== user.id) {
      throw new Error(
        `Refusing to seed: reserved company id ${COMPANY_ID} belongs to another owner.`,
      );
    }
    const owned = await tx.company.findUnique({ where: { ownerId: user.id } });
    if (!owned) {
      await tx.company.create({
        data: {
          id: COMPANY_ID,
          name: account.businessName,
          address: account.location,
          ownerId: user.id,
        },
      });
    }
  });
  return password;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const isLocalTarget = isLocalDatabase() && isLocalUrl(API_URL);
  if (!isLocalTarget && process.env.P360_DEMO_SEED_CONFIRMED !== "1") {
    throw new Error(
      "Company demo seed targets a remote DB or API. Set P360_DEMO_SEED_CONFIRMED=1 after confirming a backup, or run against a local DATABASE_URL and P360_API_URL.",
    );
  }
  console.log(`Seeding demo company through ${API_URL} (Nepal today ${NEPAL_TODAY})...`);

  const password = await ensureDemoCompanyLogin();
  const login = await api("POST", "/auth/login", {
    emailOrPhone: account.phone,
    password,
  });
  token = login.accessToken;

  // 1. Supplier (the company buys maize from).
  const supplier = (
    await api("POST", "/company/suppliers", {
      name: "Terai Grain Traders",
      contact: "9855400001",
      address: "Birgunj-6, Parsa",
    })
  ).data;

  // 2. Raw material (what the supplier sells).
  const rawMaterial = (
    await api("POST", "/company/raw-materials", {
      name: "Maize",
      unit: "kg",
    })
  ).data;

  // 3. Finished product (what the company sells to the dealer).
  const product = (
    await api("POST", "/company/products", {
      name: "Broiler Starter Feed",
      type: "FEED",
      unit: "kg",
      unitSellingPrice: 72,
      unitCostPrice: 56,
      quantity: 500, // Opening stock so the first sale has something to decrement.
    })
  ).data;

  // 4. Customer (manual dealer the company itself manages).
  const customer = (
    await api("POST", "/dealers", {
      name: "Shree Sagar Feed Shop",
      contact: "9855400002",
      address: "Narayangadh, Chitwan",
    })
  ).data;

  // 5. Purchase: 500 kg of maize from the supplier. Raw-material stock +500.
  const purchase = await api("POST", "/company/purchases", {
    supplierId: supplier.id,
    date: dayAgo(5),
    notes: "First demo purchase",
    items: [
      {
        rawMaterialId: rawMaterial.id,
        quantity: 500,
        unitPrice: 34,
      },
    ],
  });

  // 6. Sale: 100 kg of Broiler Starter Feed to the customer. Product stock -100,
  // dealer account balance +totalAmount.
  const sale = await api("POST", "/company/sales", {
    dealerId: customer.id,
    date: dayAgo(2),
    paymentMethod: "CASH",
    items: [
      {
        productId: product.id,
        quantity: 100,
        unitPrice: 72,
      },
    ],
    notes: "First demo sale",
  });

  console.log(
    `\nDemo company ready: 1 supplier, 1 customer, 1 raw material, 1 product, 1 purchase, 1 sale (${callCount} API calls).`,
  );
  console.log(`Supplier: ${supplier.name} (${supplier.id})`);
  console.log(`Customer: ${customer.name} (${customer.id})`);
  console.log(`Purchase id: ${purchase?.data?.id ?? "(see logs)"}`);
  console.log(`Sale id: ${sale?.data?.id ?? "(see logs)"}`);
  console.log(`Phone: ${account.phone.replace("+977", "")}`);
  console.log(
    `Password: ${process.env[account.passwordEnv] ? "(the one you set)" : password}`,
  );
}

main()
  .catch((error) => {
    console.error(
      "\nDemo company seed failed:",
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
