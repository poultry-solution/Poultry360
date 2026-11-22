/**
 * One-off: create a fresh farmer OWNER via the real API + add a handful of
 * sales, a customer payment, an expense and a supplier payment so every
 * auto-post path writes its CashMovement mirror. Then print the login
 * credentials so a human can open /farmer/dashboard/cashflow and verify
 * the reconciliation wizard against a known computed balance.
 *
 * Expects the dev backend to be running at P360_API_URL (default
 * http://localhost:8081/api/v1).
 */

import "dotenv/config";
import prisma from "../utils/prisma";

const API_URL = (process.env.P360_API_URL || `http://localhost:${process.env.PORT || 8081}/api/v1`).replace(/\/$/, "");

let token = "";

async function api<T = any>(method: string, path: string, body?: unknown): Promise<T> {
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
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  }
  return json as T;
}

const NEPAL_TODAY_ISO = (() => {
  const nepalMs = Date.now() + (5 * 60 + 45) * 60 * 1000;
  return new Date(nepalMs).toISOString().slice(0, 10);
})();
const today = () => `${NEPAL_TODAY_ISO}T05:30:00.000Z`;

async function main() {
  const stamp = Date.now().toString().slice(-5);
  const phone = `+977980${stamp}42`.slice(0, 14); // unique, valid-ish phone
  const password = "Test@360";
  const name = "Reconcile Test Farmer";

  console.log(`Registering ${phone} ...`);
  const reg = await api<{ accessToken: string; user: { id: string } }>(
    "POST",
    "/auth/register",
    {
      name,
      phone,
      password,
      role: "OWNER",
      companyName: "Reconcile Test Farm",
      companyFarmLocation: "Kathmandu",
      language: "ENGLISH",
      calendarType: "BS",
    },
  );
  token = reg.accessToken;
  const userId = reg.user.id;
  console.log(`  userId=${userId}`);

  // The register endpoint leaves the onboarding payment in PENDING_PAYMENT
  // for roles that need admin approval. Bypass that gate directly for the
  // test user since we don't want to go through the admin UI for a seed.
  await prisma.userOnboardingPayment.update({
    where: { userId },
    data: {
      state: "PAYMENT_APPROVED",
      lockedUntilApproved: false,
    },
  });

  console.log("Creating farm Green Farm ...");
  const farm = await api<{ data: { id: string } }>(
    "POST",
    "/farms/",
    { name: "Green Farm", capacity: 1000, description: "Reconcile test farm" },
  );
  const farmId = farm.data.id;

  console.log("Creating customer Ram ...");
  const cust = await api<{ data: { id: string } }>(
    "POST",
    "/sales/customers",
    { name: "Ram Buyer", phone: "+9779801111111" },
  );
  const customerId = cust.data.id;

  // 1. Fully-paid cash sale on OTHER item — backend uses `amount` as-is for
  //    non-broiler items, so what we send is what gets mirrored.
  console.log("Creating cash sale (fully paid, 5000) ...");
  await api("POST", "/sales/", {
    date: today(),
    amount: 5000,
    quantity: 1,
    unitPrice: 5000,
    itemType: "OTHER",
    isCredit: false,
    paidAmount: 5000,
    customerId,
    farmId,
    description: "Cash sale",
  });

  // 2. Credit sale with partial paid — SALE_PAYMENT mirror of 2000 IN, customer owes 3000
  console.log("Creating credit sale (partial 2000 of 5000) ...");
  await api("POST", "/sales/", {
    date: today(),
    amount: 5000,
    quantity: 1,
    unitPrice: 5000,
    itemType: "OTHER",
    isCredit: true,
    paidAmount: 2000,
    customerId,
    farmId,
    description: "Credit sale with 2000 partial payment",
  });

  // 3. Customer pays down 1500 — CUSTOMER_RECEIPT mirror of 1500 IN
  console.log("Adding customer receipt (1500) ...");
  await api("POST", `/sales/customers/${customerId}/payments`, {
    amount: 1500,
    date: today(),
    description: "Weekly collection",
  });

  // 4. Expense (non-inventory) — EXPENSE mirror of 800 OUT
  console.log("Fetching expense categories ...");
  const cats = await api<{ data: Array<{ id: string; name: string }> }>(
    "GET",
    "/expenses/categories",
  );
  const cat = cats.data.find((c) => c.name.toLowerCase() === "other") ?? cats.data[0];
  if (!cat) {
    throw new Error("No expense categories available — seed them first");
  }

  console.log("Creating non-inventory expense (800) ...");
  await api("POST", "/expenses/", {
    date: today(),
    amount: 800,
    description: "Electricity bill",
    categoryId: cat.id,
    quantity: 1,
    unitPrice: 800,
    farmId,
  });

  // 5. Supplier payment to a new dealer — SUPPLIER_PAYMENT mirror of 1200 OUT
  console.log("Creating dealer + supplier payment (1200) ...");
  const dealer = await api<{ data: { id: string } }>(
    "POST",
    "/dealers/",
    { name: "Feed Supplier Co", contact: "+9779802222222", classification: "SELF_CREATED" },
  );
  await api("POST", `/dealers/${dealer.data.id}/transactions`, {
    type: "PAYMENT",
    amount: 1200,
    date: today(),
    description: "Feed bill payment",
  });

  // Expected computed cash:
  //   +5000 (sale 1)
  //   +2000 (sale 2 partial)
  //   +1500 (customer receipt)
  //    -800 (expense)
  //   -1200 (supplier payment)
  //   ─────
  //    6500
  const expected = 5000 + 2000 + 1500 - 800 - 1200;

  console.log("");
  console.log("─".repeat(60));
  console.log("  Login:");
  console.log(`    phone:    ${phone}`);
  console.log(`    password: ${password}`);
  console.log(`    userId:   ${userId}`);
  console.log("");
  console.log(`  Expected wizard computed Cash:  NPR ${expected.toFixed(2)}`);
  console.log("─".repeat(60));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
