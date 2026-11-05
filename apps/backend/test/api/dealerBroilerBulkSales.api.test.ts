import { ApiHelper } from "../helpers/api.helper";
import prisma from "../../src/utils/prisma";

/**
 * API-level regression suite for the bulk broiler-sale endpoint
 * (`POST /dealer/sales/broiler/bulk`). All tests share one dealer owner and
 * three buyer customers created in `beforeAll`. Each test uses a unique
 * invoice number (prefixed by `suffix`) to avoid collisions across cases.
 *
 * The whole endpoint is atomic: if any validation fails or the DB rejects a
 * row, nothing is persisted. Every test that expects failure also asserts
 * that the sale/ledger counts are unchanged.
 */
describe("Dealer bulk broiler sales — HTTP regressions", () => {
  const api = new ApiHelper();
  const password = "Dealer-bulk-broiler-123";
  const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`.slice(-10);
  const phone = `+97798${suffix}`;
  let ownerId: string;
  let dealerId: string;
  let sourceFarmerId: string;
  let b1Id: string;
  let b2Id: string;
  let b3Id: string;
  let foreignBuyerId: string; // belongs to a different dealer

  // --- Shared helpers ---------------------------------------------------------
  const invoice = (tag: string) => `BLK-${suffix.slice(-6)}-${tag}`;
  const row = (overrides: Record<string, any> = {}) => ({
    buyerId: b1Id,
    weightKg: 10,
    broilerCount: 20,
    ratePerKg: 300,
    paidAmount: 0,
    paymentMethod: "CASH",
    date: "2026-10-15",
    ...overrides,
  });

  const countsForDealer = async () => {
    const [sales, ledger] = await Promise.all([
      prisma.dealerSale.count({ where: { dealerId } }),
      prisma.dealerLedgerEntry.count({ where: { dealerId } }),
    ]);
    return { sales, ledger };
  };

  // --- Setup / teardown -------------------------------------------------------
  beforeAll(async () => {
    const registration = await api.post("/auth/register-entity", {
      name: `Dealer Owner ${suffix}`,
      phone,
      password,
      entityType: "DEALER",
      entityName: `Dealer Bulk Broiler ${suffix}`,
      entityContact: `98${suffix.slice(-8)}`,
      entityAddress: "Test city",
    });
    expect(registration.status).toBe(201);
    ownerId = registration.body.user.id;
    api.setAuthToken(registration.body.accessToken);
    expect((await api.post("/test/approve-current-user")).status).toBe(200);

    const dealer = await prisma.dealer.findUnique({ where: { ownerId } });
    expect(dealer).toBeTruthy();
    dealerId = dealer!.id;

    // Enable the broiler feature for this dealer account.
    await prisma.accountFeature.upsert({
      where: {
        accountId_featureKey: {
          accountId: ownerId,
          featureKey: "DEALER_BROILER_SALES_AND_SETTLEMENTS",
        },
      },
      update: { enabled: true, updatedById: ownerId },
      create: {
        accountId: ownerId,
        featureKey: "DEALER_BROILER_SALES_AND_SETTLEMENTS",
        enabled: true,
        updatedById: ownerId,
      },
    });

    // Create the shared customers (source farmer + three buyers).
    const makeCustomer = async (name: string) => {
      const res = await api.post("/dealer/sales/customers", { name });
      expect(res.status).toBe(201);
      const id = res.body?.data?.id ?? res.body?.id;
      expect(id).toBeTruthy();
      return id as string;
    };
    sourceFarmerId = await makeCustomer(`Source Farmer ${suffix}`);
    b1Id = await makeCustomer(`Buyer One ${suffix}`);
    b2Id = await makeCustomer(`Buyer Two ${suffix}`);
    b3Id = await makeCustomer(`Buyer Three ${suffix}`);

    // Foreign buyer — belongs to a separate dealer so cross-tenant tests have
    // a real id to try.
    const foreign = await prisma.user.create({
      data: {
        phone: `+97798${suffix.slice(0, 7)}99`,
        password: await (await import("bcrypt")).hash(password, 10),
        name: `Foreign Dealer ${suffix}`,
        role: "DEALER",
        status: "ACTIVE",
      },
    });
    const foreignCustomer = await prisma.customer.create({
      data: {
        userId: foreign.id,
        name: `Foreign Buyer ${suffix}`,
      },
    });
    foreignBuyerId = foreignCustomer.id;
    // Clean up foreign dealer after all tests run.
    (global as any).__foreignUserId = foreign.id;
  });

  afterAll(async () => {
    if (!ownerId) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
    await prisma.businessAuditLog.deleteMany({
      where: { OR: [{ accountOwnerId: ownerId }, { actorId: ownerId }] },
    });
    // Two models reference Customer with onDelete: Restrict, so purge them
    // explicitly before cascading the User → Customer delete chain:
    //   - DealerBroilerPurchase.sourceFarmer
    //   - BroilerSaleSettlement.farmer
    if (dealerId) {
      await prisma.dealerBroilerPurchase.deleteMany({ where: { dealerId } });
      // DealerSale.settlementId → BroilerSaleSettlement FK is Restrict; null
      // out the references before deleting the settlement rows.
      await prisma.dealerSale.updateMany({
        where: { dealerId, settlementId: { not: null } },
        data: { settlementId: null },
      });
      await prisma.broilerSaleSettlement.deleteMany({ where: { dealerId } });
    }
    await prisma.user.deleteMany({ where: { id: ownerId } });
    const foreignUserId = (global as any).__foreignUserId;
    if (foreignUserId) {
      await prisma.user.deleteMany({ where: { id: foreignUserId } });
    }
    await prisma.businessAuditLog.deleteMany({
      where: { OR: [{ accountOwnerId: ownerId }, { actorId: ownerId }] },
    });
  });

  // --- 1. Happy path ---------------------------------------------------------
  describe("Happy path", () => {
    it("creates N sales atomically with sequential invoice numbers", async () => {
      const before = await countsForDealer();
      const res = await api.post("/dealer/sales/broiler/bulk", {
        sourceFarmerId,
        rows: [
          row({ buyerId: b1Id, weightKg: 10, ratePerKg: 300, paidAmount: 3000 }),
          row({ buyerId: b2Id, weightKg: 15, ratePerKg: 310, paidAmount: 0 }),
          row({ buyerId: b3Id, weightKg: 8, ratePerKg: 295, paidAmount: 1180, broilerCount: 15 }),
        ],
      });
      expect(res.status).toBe(201);
      const sales = res.body?.data?.sales;
      expect(Array.isArray(sales)).toBe(true);
      expect(sales).toHaveLength(3);

      // Every returned sale has an invoice number + rowIndex.
      sales.forEach((s: any, i: number) => {
        expect(typeof s.invoiceNumber).toBe("string");
        expect(s.invoiceNumber.length).toBeGreaterThan(0);
        expect(s.rowIndex).toBe(i);
        expect(s.id).toBeTruthy();
      });

      // DB check: three new DealerSale rows, flagged as broiler, source farmer set.
      const dbSales = await prisma.dealerSale.findMany({
        where: { id: { in: sales.map((s: any) => s.id) } },
        orderBy: { createdAt: "asc" },
      });
      expect(dbSales).toHaveLength(3);
      for (const s of dbSales) {
        expect(s.isChickenSale).toBe(true);
        expect(s.sourceFarmerId).toBe(sourceFarmerId);
      }

      const after = await countsForDealer();
      expect(after.sales - before.sales).toBe(3);
    });
  });

  // --- 2. Running ledger balance ---------------------------------------------
  describe("Ledger ordering", () => {
    it("writes BROILER_SALE_PROCEEDS + optional PAYMENT_RECEIVED with a correct running balance", async () => {
      const startEntry = await prisma.dealerLedgerEntry.findFirst({
        where: { dealerId },
        orderBy: { createdAt: "desc" },
      });
      const startBalance = startEntry ? Number(startEntry.balance) : 0;

      const res = await api.post("/dealer/sales/broiler/bulk", {
        sourceFarmerId,
        rows: [
          row({ buyerId: b1Id, weightKg: 10, ratePerKg: 300, paidAmount: 1000 }),
          row({ buyerId: b2Id, weightKg: 20, ratePerKg: 250, paidAmount: 0 }),
        ],
      });
      expect(res.status).toBe(201);
      const saleIds = res.body.data.sales.map((s: any) => s.id);

      const entries = await prisma.dealerLedgerEntry.findMany({
        where: { saleId: { in: saleIds } },
        orderBy: { createdAt: "asc" },
      });
      // Row 1: PROCEEDS + PAYMENT_RECEIVED. Row 2: PROCEEDS only.
      expect(entries).toHaveLength(3);
      expect(entries[0].type).toBe("BROILER_SALE_PROCEEDS");
      expect(entries[1].type).toBe("PAYMENT_RECEIVED");
      expect(entries[2].type).toBe("BROILER_SALE_PROCEEDS");

      // Running balance arithmetic (rounded 2dp).
      // Row1: +3000 → startBalance+3000; -1000 → startBalance+2000.
      // Row2: +5000 → startBalance+7000.
      expect(Number(entries[0].balance)).toBeCloseTo(startBalance + 3000, 2);
      expect(Number(entries[1].balance)).toBeCloseTo(startBalance + 2000, 2);
      expect(Number(entries[2].balance)).toBeCloseTo(startBalance + 7000, 2);
    });
  });

  // --- 3. Atomicity ----------------------------------------------------------
  describe("All-or-nothing atomicity", () => {
    it("rejects the batch with a per-row error identifying the colliding invoice", async () => {
      // First seed a sale with a known invoice via the bulk endpoint itself.
      const seedInvoice = invoice("seed-atomic");
      const seed = await api.post("/dealer/sales/broiler/bulk", {
        sourceFarmerId,
        rows: [row({ buyerId: b1Id, invoiceNumber: seedInvoice })],
      });
      expect(seed.status).toBe(201);

      const before = await countsForDealer();
      const res = await api.post("/dealer/sales/broiler/bulk", {
        sourceFarmerId,
        rows: [
          row({ buyerId: b1Id, invoiceNumber: invoice("ok1") }),
          row({ buyerId: b2Id, invoiceNumber: seedInvoice }), // collision
          row({ buyerId: b3Id, invoiceNumber: invoice("ok3") }),
        ],
      });
      // The pre-check now surfaces the collision as a per-row 400 so the
      // frontend can highlight the exact row — compare to the generic 409
      // the P2002 safety net would have thrown.
      expect(res.status).toBe(400);
      expect(res.body?.errors?.rows?.["1"]).toEqual(
        expect.arrayContaining([expect.stringMatching(/already exists/i)])
      );
      // Rows 0 and 2 are flagged clean.
      expect(res.body?.errors?.rows?.["0"]).toBeUndefined();
      expect(res.body?.errors?.rows?.["2"]).toBeUndefined();

      const after = await countsForDealer();
      expect(after.sales).toBe(before.sales);
      expect(after.ledger).toBe(before.ledger);
    });
  });

  // --- 4. Same buyer twice ---------------------------------------------------
  describe("Same buyer twice in one batch", () => {
    it("creates two independent sales to the same buyer", async () => {
      const res = await api.post("/dealer/sales/broiler/bulk", {
        sourceFarmerId,
        rows: [
          row({ buyerId: b1Id, weightKg: 5, ratePerKg: 300 }),
          row({ buyerId: b1Id, weightKg: 7, ratePerKg: 320 }),
        ],
      });
      expect(res.status).toBe(201);
      const sales = res.body.data.sales;
      expect(sales).toHaveLength(2);
      expect(sales[0].customerId).toBe(b1Id);
      expect(sales[1].customerId).toBe(b1Id);
      expect(sales[0].invoiceNumber).not.toBe(sales[1].invoiceNumber);
    });
  });

  // --- 5. Discount mix -------------------------------------------------------
  describe("Discount handling", () => {
    it("records percent and flat discounts correctly and skips discount row when zero", async () => {
      const res = await api.post("/dealer/sales/broiler/bulk", {
        sourceFarmerId,
        rows: [
          row({ buyerId: b1Id, weightKg: 10, ratePerKg: 300, discount: { type: "PERCENT", value: 10 } }),
          row({ buyerId: b2Id, weightKg: 20, ratePerKg: 400, discount: { type: "FLAT", value: 500 } }),
          row({ buyerId: b3Id, weightKg: 5, ratePerKg: 200 }),
        ],
      });
      expect(res.status).toBe(201);
      const sales = res.body.data.sales;

      // Row 0: subtotal 3000, -10% = 2700
      expect(sales[0].totalAmount).toBeCloseTo(2700, 2);
      // Row 1: subtotal 8000, -500 = 7500
      expect(sales[1].totalAmount).toBeCloseTo(7500, 2);
      // Row 2: no discount, 1000
      expect(sales[2].totalAmount).toBeCloseTo(1000, 2);

      // Discount rows exist for first two sales only.
      const discounts = await prisma.saleDiscount.findMany({
        where: { dealerSaleId: { in: sales.map((s: any) => s.id) } },
      });
      expect(discounts).toHaveLength(2);
    });
  });

  // --- 6-11. Validation errors (nothing saved) -------------------------------
  describe("Validation errors — nothing saved", () => {
    const expectNothingSaved = async (
      body: any,
      assertion: (resp: any) => void
    ) => {
      const before = await countsForDealer();
      const res = await api.post("/dealer/sales/broiler/bulk", body);
      assertion(res);
      const after = await countsForDealer();
      expect(after.sales).toBe(before.sales);
      expect(after.ledger).toBe(before.ledger);
    };

    it("rejects a negative weight with a per-row error (bug 6)", async () => {
      await expectNothingSaved(
        {
          sourceFarmerId,
          rows: [row({ buyerId: b1Id }), row({ buyerId: b2Id, weightKg: -1 })],
        },
        (res) => {
          expect(res.status).toBe(400);
          expect(res.body.errors?.rows?.["1"]).toEqual(
            expect.arrayContaining([expect.stringMatching(/weight/i)])
          );
        }
      );
    });

    it("rejects a row where buyer equals source farmer (bug 7)", async () => {
      await expectNothingSaved(
        { sourceFarmerId, rows: [row({ buyerId: sourceFarmerId })] },
        (res) => {
          expect(res.status).toBe(400);
          expect(res.body.errors?.rows?.["0"]).toEqual(
            expect.arrayContaining([
              expect.stringMatching(/different from source farmer/i),
            ])
          );
        }
      );
    });

    it("rejects a buyer not owned by this dealer (bug 8 — cross-tenant guard)", async () => {
      await expectNothingSaved(
        { sourceFarmerId, rows: [row({ buyerId: foreignBuyerId })] },
        (res) => {
          expect(res.status).toBe(400);
          expect(res.body.errors?.rows?.["0"]).toEqual(
            expect.arrayContaining([expect.stringMatching(/not found/i)])
          );
        }
      );
    });

    it("rejects a discount percent above 100 (bug 9)", async () => {
      await expectNothingSaved(
        {
          sourceFarmerId,
          rows: [row({ buyerId: b1Id, discount: { type: "PERCENT", value: 150 } })],
        },
        (res) => {
          expect(res.status).toBe(400);
          expect(res.body.errors?.rows?.["0"]).toEqual(
            expect.arrayContaining([expect.stringMatching(/percent/i)])
          );
        }
      );
    });

    it("rejects paid > line total (bug 10)", async () => {
      await expectNothingSaved(
        {
          sourceFarmerId,
          rows: [row({ buyerId: b1Id, weightKg: 10, ratePerKg: 100, paidAmount: 5000 })],
        },
        (res) => {
          expect(res.status).toBe(400);
          expect(res.body.errors?.rows?.["0"]).toEqual(
            expect.arrayContaining([expect.stringMatching(/paid/i)])
          );
        }
      );
    });

    it("rejects a decimal broilerCount (bug 11)", async () => {
      await expectNothingSaved(
        { sourceFarmerId, rows: [row({ buyerId: b1Id, broilerCount: 12.5 })] },
        (res) => {
          expect(res.status).toBe(400);
          expect(res.body.errors?.rows?.["0"]).toEqual(
            expect.arrayContaining([expect.stringMatching(/whole number/i)])
          );
        }
      );
    });
  });

  // --- 12. In-batch duplicate invoices ---------------------------------------
  describe("In-batch duplicate custom invoices", () => {
    it("flags both offending rows and saves nothing", async () => {
      const dup = invoice("dup-in-batch");
      const before = await countsForDealer();
      const res = await api.post("/dealer/sales/broiler/bulk", {
        sourceFarmerId,
        rows: [
          row({ buyerId: b1Id, invoiceNumber: dup }),
          row({ buyerId: b2Id, invoiceNumber: invoice("other") }),
          row({ buyerId: b3Id, invoiceNumber: dup }),
        ],
      });
      expect(res.status).toBe(400);
      expect(res.body.errors?.rows?.["0"]).toBeTruthy();
      expect(res.body.errors?.rows?.["2"]).toBeTruthy();
      const after = await countsForDealer();
      expect(after.sales).toBe(before.sales);
    });
  });

  // --- 13. Row cap -----------------------------------------------------------
  describe("Row cap", () => {
    it("accepts 50 rows and rejects 51", async () => {
      const makeRows = (count: number) =>
        Array.from({ length: count }, () =>
          row({ buyerId: b1Id, invoiceNumber: undefined, paidAmount: 0 })
        );

      // 50 → OK.
      const ok = await api.post("/dealer/sales/broiler/bulk", {
        sourceFarmerId,
        rows: makeRows(50),
      });
      expect(ok.status).toBe(201);
      expect(ok.body.data.sales).toHaveLength(50);

      // 51 → rejected before any DB writes.
      const before = await countsForDealer();
      const tooMany = await api.post("/dealer/sales/broiler/bulk", {
        sourceFarmerId,
        rows: makeRows(51),
      });
      expect(tooMany.status).toBe(400);
      expect(String(tooMany.body.message)).toMatch(/too many/i);
      const after = await countsForDealer();
      expect(after.sales).toBe(before.sales);
    });
  });

  // --- 14. Feature gate ------------------------------------------------------
  describe("Feature gate", () => {
    it("returns 403 when DEALER_BROILER_SALES_AND_SETTLEMENTS is disabled", async () => {
      // Disable the feature.
      await prisma.accountFeature.update({
        where: {
          accountId_featureKey: {
            accountId: ownerId,
            featureKey: "DEALER_BROILER_SALES_AND_SETTLEMENTS",
          },
        },
        data: { enabled: false },
      });

      const before = await countsForDealer();
      const res = await api.post("/dealer/sales/broiler/bulk", {
        sourceFarmerId,
        rows: [row({ buyerId: b1Id })],
      });
      expect(res.status).toBe(403);
      expect(res.body.code).toBe("ACCOUNT_FEATURE_DISABLED");

      const after = await countsForDealer();
      expect(after.sales).toBe(before.sales);

      // Re-enable so later tests (if any) and settlement-visibility work.
      await prisma.accountFeature.update({
        where: {
          accountId_featureKey: {
            accountId: ownerId,
            featureKey: "DEALER_BROILER_SALES_AND_SETTLEMENTS",
          },
        },
        data: { enabled: true },
      });
    });
  });

  // --- 15. Settlement visibility ---------------------------------------------
  describe("Chicken-by-farmer visibility", () => {
    it("surfaces the farmer bucket with correct saleCount + tentativeRevenue", async () => {
      // Create a new farmer + two buyers specifically for this test so other
      // noise doesn't skew the saleCount.
      const freshFarmer = (await api.post("/dealer/sales/customers", {
        name: `Fresh Farmer ${suffix}`,
      })).body.data.id as string;
      const buyerX = (await api.post("/dealer/sales/customers", {
        name: `Buyer X ${suffix}`,
      })).body.data.id as string;
      const buyerY = (await api.post("/dealer/sales/customers", {
        name: `Buyer Y ${suffix}`,
      })).body.data.id as string;

      const res = await api.post("/dealer/sales/broiler/bulk", {
        sourceFarmerId: freshFarmer,
        rows: [
          row({ buyerId: buyerX, weightKg: 10, ratePerKg: 300, paidAmount: 0 }),
          row({ buyerId: buyerY, weightKg: 15, ratePerKg: 320, paidAmount: 0 }),
          row({ buyerId: buyerX, weightKg: 8, ratePerKg: 290, paidAmount: 0 }),
        ],
      });
      expect(res.status).toBe(201);
      const expectedRevenue = 10 * 300 + 15 * 320 + 8 * 290;

      const list = await api.get(`/dealer/sales/chicken-by-farmer?sourceFarmerId=${freshFarmer}`);
      expect(list.status).toBe(200);
      const bucket = (list.body?.data ?? []).find((b: any) => b.sourceFarmerId === freshFarmer);
      expect(bucket).toBeTruthy();
      expect(bucket.saleCount).toBe(3);
      expect(Number(bucket.tentativeRevenue)).toBeCloseTo(expectedRevenue, 2);
    });
  });

  // --- 16. Audit log ---------------------------------------------------------
  describe("Audit log", () => {
    it("writes one bulk audit entry with saleIds + invoiceNumbers in metadata", async () => {
      const res = await api.post("/dealer/sales/broiler/bulk", {
        sourceFarmerId,
        rows: [
          row({ buyerId: b1Id }),
          row({ buyerId: b2Id }),
          row({ buyerId: b3Id }),
        ],
      });
      expect(res.status).toBe(201);
      const saleIds: string[] = res.body.data.sales.map((s: any) => s.id);

      const audits = await prisma.businessAuditLog.findMany({
        where: {
          action: "dealer.broiler_sale.bulk_created",
          accountOwnerId: ownerId,
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      });
      expect(audits).toHaveLength(1);
      const audit = audits[0];
      expect(audit.targetId).toBe(saleIds[0]);
      const metadata = audit.metadata as any;
      expect(metadata?.saleCount).toBe(3);
      expect(metadata?.sourceFarmerId).toBe(sourceFarmerId);
      expect(Array.isArray(metadata?.saleIds)).toBe(true);
      expect(metadata.saleIds).toHaveLength(3);
      expect(Array.isArray(metadata?.invoiceNumbers)).toBe(true);
      expect(metadata.invoiceNumbers).toHaveLength(3);
    });
  });

  // ==================================================================
  // Phase 4: optional "What you bought" purchase block.
  // The purchase is purely informational (not referenced by settlement
  // logic) but IS created inside the same atomic $transaction as the
  // sales so the all-or-nothing contract still holds.
  // ==================================================================
  describe("Purchase block", () => {
    const makeFarmer = async (name: string) =>
      (await api.post("/dealer/sales/customers", { name })).body.data.id as string;

    it("creates one DealerBroilerPurchase row and returns it in the response", async () => {
      const farmer = await makeFarmer(`Pur Farmer A ${suffix}`);
      const buyer = await makeFarmer(`Pur Buyer A ${suffix}`);
      const before = await prisma.dealerBroilerPurchase.count({ where: { dealerId } });

      const res = await api.post("/dealer/sales/broiler/bulk", {
        sourceFarmerId: farmer,
        rows: [row({ buyerId: buyer, weightKg: 20, ratePerKg: 300, paidAmount: 6000 })],
        purchase: {
          weightKg: 100,
          ratePerKg: 150,
          totalCost: 15000,
          broilerCount: 500,
          notes: "paid cash on farm",
        },
      });
      expect(res.status).toBe(201);

      // Response includes the created purchase.
      const purchase = res.body?.data?.purchase;
      expect(purchase).toBeTruthy();
      expect(purchase.id).toEqual(expect.any(String));
      expect(Number(purchase.totalCost)).toBeCloseTo(15000, 2);
      expect(Number(purchase.weightKg)).toBeCloseTo(100, 2);
      expect(Number(purchase.ratePerKg)).toBeCloseTo(150, 2);
      expect(purchase.broilerCount).toBe(500);

      // DB row present + scoped to this dealer + source farmer.
      const stored = await prisma.dealerBroilerPurchase.findMany({
        where: { dealerId, sourceFarmerId: farmer },
      });
      expect(stored).toHaveLength(1);
      expect(Number(stored[0].totalCost)).toBeCloseTo(15000, 2);
      expect(stored[0].notes).toBe("paid cash on farm");
      expect(await prisma.dealerBroilerPurchase.count({ where: { dealerId } })).toBe(
        before + 1
      );
    });

    it("is optional — a request without `purchase` creates zero purchase rows", async () => {
      const farmer = await makeFarmer(`Pur Farmer B ${suffix}`);
      const buyer = await makeFarmer(`Pur Buyer B ${suffix}`);
      const before = await prisma.dealerBroilerPurchase.count({ where: { dealerId } });

      const res = await api.post("/dealer/sales/broiler/bulk", {
        sourceFarmerId: farmer,
        rows: [row({ buyerId: buyer })],
      });
      expect(res.status).toBe(201);
      expect(res.body?.data?.purchase ?? null).toBeNull();

      const after = await prisma.dealerBroilerPurchase.count({ where: { dealerId } });
      expect(after).toBe(before);
    });

    it("rejects negative purchase weight with a per-block error (nothing saved)", async () => {
      const farmer = await makeFarmer(`Pur Farmer C ${suffix}`);
      const buyer = await makeFarmer(`Pur Buyer C ${suffix}`);
      const saleBefore = await prisma.dealerSale.count({ where: { dealerId, sourceFarmerId: farmer } });
      const purchaseBefore = await prisma.dealerBroilerPurchase.count({ where: { dealerId, sourceFarmerId: farmer } });

      const res = await api.post("/dealer/sales/broiler/bulk", {
        sourceFarmerId: farmer,
        rows: [row({ buyerId: buyer })],
        purchase: { weightKg: -1, ratePerKg: 100, totalCost: 100 },
      });
      expect(res.status).toBe(400);
      expect(res.body?.errors?.purchase).toEqual(
        expect.arrayContaining([expect.stringMatching(/weight/i)])
      );

      expect(await prisma.dealerSale.count({ where: { dealerId, sourceFarmerId: farmer } })).toBe(saleBefore);
      expect(await prisma.dealerBroilerPurchase.count({ where: { dealerId, sourceFarmerId: farmer } })).toBe(purchaseBefore);
    });

    it("rejects decimal broilerCount in the purchase with a per-block error", async () => {
      const farmer = await makeFarmer(`Pur Farmer D ${suffix}`);
      const buyer = await makeFarmer(`Pur Buyer D ${suffix}`);
      const res = await api.post("/dealer/sales/broiler/bulk", {
        sourceFarmerId: farmer,
        rows: [row({ buyerId: buyer })],
        purchase: { weightKg: 100, ratePerKg: 150, totalCost: 15000, broilerCount: 12.5 },
      });
      expect(res.status).toBe(400);
      expect(res.body?.errors?.purchase).toEqual(
        expect.arrayContaining([expect.stringMatching(/whole number/i)])
      );
    });

    it("is atomic with the sales — invalid row aborts the purchase too", async () => {
      const farmer = await makeFarmer(`Pur Farmer E ${suffix}`);
      const purchaseBefore = await prisma.dealerBroilerPurchase.count({ where: { dealerId, sourceFarmerId: farmer } });
      const saleBefore = await prisma.dealerSale.count({ where: { dealerId, sourceFarmerId: farmer } });

      const res = await api.post("/dealer/sales/broiler/bulk", {
        sourceFarmerId: farmer,
        rows: [row({ buyerId: farmer, weightKg: 10, ratePerKg: 300 })], // buyer = farmer → invalid
        purchase: { weightKg: 50, ratePerKg: 100, totalCost: 5000 },
      });
      expect(res.status).toBe(400);
      expect(res.body?.errors?.rows).toBeTruthy();

      expect(await prisma.dealerBroilerPurchase.count({ where: { dealerId, sourceFarmerId: farmer } })).toBe(purchaseBefore);
      expect(await prisma.dealerSale.count({ where: { dealerId, sourceFarmerId: farmer } })).toBe(saleBefore);
    });

    it("writes purchaseId + purchaseCost to the audit metadata when a purchase is included", async () => {
      const farmer = await makeFarmer(`Pur Farmer F ${suffix}`);
      const buyer = await makeFarmer(`Pur Buyer F ${suffix}`);
      const res = await api.post("/dealer/sales/broiler/bulk", {
        sourceFarmerId: farmer,
        rows: [row({ buyerId: buyer })],
        purchase: { weightKg: 20, ratePerKg: 200, totalCost: 4000 },
      });
      expect(res.status).toBe(201);
      const purchaseId = res.body.data.purchase.id;

      const audits = await prisma.businessAuditLog.findMany({
        where: {
          action: "dealer.broiler_sale.bulk_created",
          accountOwnerId: ownerId,
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      });
      expect(audits).toHaveLength(1);
      const metadata = audits[0].metadata as any;
      expect(metadata?.purchaseId).toBe(purchaseId);
      expect(Number(metadata?.purchaseCost)).toBeCloseTo(4000, 2);
    });
  });

  // ==================================================================
  // Phase 4: GET /dealer/sales/chicken-by-farmer response changes.
  // Adds a `purchase` aggregate summary per farmer + a `sales` array
  // (unsettled sales, up to 25, enough to render the expand mini-table).
  // ==================================================================
  describe("Chicken-by-farmer — purchase aggregate + sales array", () => {
    const makeFarmer = async (name: string) =>
      (await api.post("/dealer/sales/customers", { name })).body.data.id as string;

    it("returns aggregated purchase summary + unsettled sales for the farmer bucket", async () => {
      const farmer = await makeFarmer(`CBF Farmer A ${suffix}`);
      const buyerX = await makeFarmer(`CBF Buyer X ${suffix}`);
      const buyerY = await makeFarmer(`CBF Buyer Y ${suffix}`);

      const saveRes = await api.post("/dealer/sales/broiler/bulk", {
        sourceFarmerId: farmer,
        rows: [
          row({ buyerId: buyerX, weightKg: 10, ratePerKg: 300, paidAmount: 3000 }),
          row({ buyerId: buyerY, weightKg: 15, ratePerKg: 320, paidAmount: 0 }),
        ],
        purchase: { weightKg: 25, ratePerKg: 240, totalCost: 6000, broilerCount: 100 },
      });
      expect(saveRes.status).toBe(201);

      const list = await api.get(`/dealer/sales/chicken-by-farmer?sourceFarmerId=${farmer}`);
      expect(list.status).toBe(200);
      const bucket = (list.body?.data ?? []).find((b: any) => b.sourceFarmerId === farmer);
      expect(bucket).toBeTruthy();

      // Purchase aggregate.
      expect(bucket.purchase).toBeTruthy();
      expect(Number(bucket.purchase.totalCost)).toBeCloseTo(6000, 2);
      expect(Number(bucket.purchase.totalWeightKg)).toBeCloseTo(25, 2);
      expect(bucket.purchase.totalBroilerCount).toBe(100);
      expect(bucket.purchase.recordCount).toBe(1);
      expect(Number(bucket.purchase.averageRatePerKg)).toBeCloseTo(240, 2);

      // Unsettled sales inline.
      expect(Array.isArray(bucket.sales)).toBe(true);
      expect(bucket.sales).toHaveLength(2);
      const buyerNames = bucket.sales.map((s: any) => s.buyerName).sort();
      expect(buyerNames).toEqual([`CBF Buyer X ${suffix}`, `CBF Buyer Y ${suffix}`].sort());
      const totals = bucket.sales.map((s: any) => Number(s.totalAmount)).sort((a: number, b: number) => a - b);
      expect(totals[0]).toBeCloseTo(10 * 300, 2);
      expect(totals[1]).toBeCloseTo(15 * 320, 2);
    });

    it("returns purchase: null when the dealer never recorded any purchase for this farmer", async () => {
      const farmer = await makeFarmer(`CBF Farmer B ${suffix}`);
      const buyer = await makeFarmer(`CBF Buyer B ${suffix}`);
      await api.post("/dealer/sales/broiler/bulk", {
        sourceFarmerId: farmer,
        rows: [row({ buyerId: buyer, weightKg: 10, ratePerKg: 300 })],
      });

      const list = await api.get(`/dealer/sales/chicken-by-farmer?sourceFarmerId=${farmer}`);
      const bucket = (list.body?.data ?? []).find((b: any) => b.sourceFarmerId === farmer);
      expect(bucket).toBeTruthy();
      expect(bucket.purchase).toBeNull();
      expect(Array.isArray(bucket.sales)).toBe(true);
      expect(bucket.sales).toHaveLength(1);
    });

    it("aggregates multiple purchases to the same farmer", async () => {
      const farmer = await makeFarmer(`CBF Farmer C ${suffix}`);
      const buyer = await makeFarmer(`CBF Buyer C ${suffix}`);

      await api.post("/dealer/sales/broiler/bulk", {
        sourceFarmerId: farmer,
        rows: [row({ buyerId: buyer, weightKg: 5, ratePerKg: 300 })],
        purchase: { weightKg: 40, ratePerKg: 100, totalCost: 4000 },
      });
      await api.post("/dealer/sales/broiler/bulk", {
        sourceFarmerId: farmer,
        rows: [row({ buyerId: buyer, weightKg: 5, ratePerKg: 300 })],
        purchase: { weightKg: 60, ratePerKg: 110, totalCost: 6600 },
      });

      const list = await api.get(`/dealer/sales/chicken-by-farmer?sourceFarmerId=${farmer}`);
      const bucket = (list.body?.data ?? []).find((b: any) => b.sourceFarmerId === farmer);
      expect(bucket.purchase.recordCount).toBe(2);
      expect(Number(bucket.purchase.totalWeightKg)).toBeCloseTo(100, 2);
      expect(Number(bucket.purchase.totalCost)).toBeCloseTo(10600, 2);
      // Weighted average: (40*100 + 60*110) / 100 = (4000 + 6600) / 100 = 106
      expect(Number(bucket.purchase.averageRatePerKg)).toBeCloseTo(106, 2);
    });

    it("scopes purchases to the SOURCE farmer only (no cross-farmer bleed)", async () => {
      const farmerA = await makeFarmer(`CBF Farmer D-A ${suffix}`);
      const farmerB = await makeFarmer(`CBF Farmer D-B ${suffix}`);
      const buyer = await makeFarmer(`CBF Buyer D ${suffix}`);

      // Only farmerA has a purchase.
      await api.post("/dealer/sales/broiler/bulk", {
        sourceFarmerId: farmerA,
        rows: [row({ buyerId: buyer, weightKg: 5, ratePerKg: 300 })],
        purchase: { weightKg: 20, ratePerKg: 100, totalCost: 2000 },
      });
      // farmerB has sales but no purchase.
      await api.post("/dealer/sales/broiler/bulk", {
        sourceFarmerId: farmerB,
        rows: [row({ buyerId: buyer, weightKg: 7, ratePerKg: 300 })],
      });

      const listA = await api.get(`/dealer/sales/chicken-by-farmer?sourceFarmerId=${farmerA}`);
      const bucketA = (listA.body?.data ?? []).find((b: any) => b.sourceFarmerId === farmerA);
      expect(bucketA.purchase?.recordCount).toBe(1);

      const listB = await api.get(`/dealer/sales/chicken-by-farmer?sourceFarmerId=${farmerB}`);
      const bucketB = (listB.body?.data ?? []).find((b: any) => b.sourceFarmerId === farmerB);
      expect(bucketB.purchase).toBeNull();
    });

    it("closes the lot on settle: open purchases get stamped and stop appearing on the next card", async () => {
      // Settlement defines lot identity. Any purchase that was still OPEN
      // (`settlementId: null`) at settle time is stamped with the new
      // settlement id. The next lot's card must NOT re-sum those.
      const farmer = await makeFarmer(`CBF Farmer E ${suffix}`);
      const buyer = await makeFarmer(`CBF Buyer E ${suffix}`);

      await api.post("/dealer/sales/broiler/bulk", {
        sourceFarmerId: farmer,
        rows: [row({ buyerId: buyer, weightKg: 10, ratePerKg: 300, paidAmount: 3000, date: "2026-10-01" })],
        purchase: { weightKg: 10, ratePerKg: 200, totalCost: 2000 },
      });
      const settleRes = await api.post("/dealer/sales/broiler-settlements", {
        sourceFarmerId: farmer,
        marginAmount: 0,
        paymentMethod: "CASH",
        date: "2026-10-02",
      });
      expect(settleRes.status).toBe(201);

      // The Oct 1 purchase is now linked to the settlement.
      const closedPurchase = await prisma.dealerBroilerPurchase.findFirst({
        where: { dealerId, sourceFarmerId: farmer },
      });
      expect(closedPurchase?.settlementId).not.toBeNull();

      // Lot 2 begins with a new sale, no purchase recorded yet.
      await api.post("/dealer/sales/broiler/bulk", {
        sourceFarmerId: farmer,
        rows: [row({ buyerId: buyer, weightKg: 8, ratePerKg: 310, paidAmount: 0, date: "2026-10-10" })],
      });
      const list = await api.get(`/dealer/sales/chicken-by-farmer?sourceFarmerId=${farmer}`);
      const bucket = (list.body?.data ?? []).find((b: any) => b.sourceFarmerId === farmer);
      expect(bucket?.purchase).toBeNull();

      // A NEW open purchase for lot 2 is shown by itself (not summed with
      // the closed one).
      await api.post("/dealer/sales/broiler-purchases", {
        sourceFarmerId: farmer, weightKg: 13, ratePerKg: 210, totalCost: 2730,
      });
      const list2 = await api.get(`/dealer/sales/chicken-by-farmer?sourceFarmerId=${farmer}`);
      const bucket2 = (list2.body?.data ?? []).find((b: any) => b.sourceFarmerId === farmer);
      expect(bucket2?.purchase?.recordCount).toBe(1);
      expect(Number(bucket2.purchase.totalCost)).toBeCloseTo(2730, 2);
    });

    it("reversing a settlement re-opens the lot: purchases become unsettled again", async () => {
      const farmer = await makeFarmer(`CBF Farmer E-R ${suffix}`);
      const buyer = await makeFarmer(`CBF Buyer E-R ${suffix}`);

      await api.post("/dealer/sales/broiler/bulk", {
        sourceFarmerId: farmer,
        rows: [row({ buyerId: buyer, weightKg: 5, ratePerKg: 300 })],
        purchase: { weightKg: 20, ratePerKg: 100, totalCost: 2000 },
      });
      const settle = await api.post("/dealer/sales/broiler-settlements", {
        sourceFarmerId: farmer, marginAmount: 0, paymentMethod: "CASH",
      });
      const settlementId = settle.body.data.id;

      const stamped = await prisma.dealerBroilerPurchase.findFirst({
        where: { dealerId, sourceFarmerId: farmer },
      });
      expect(stamped?.settlementId).toBe(settlementId);

      const rev = await api.delete(`/dealer/sales/broiler-settlements/${settlementId}`);
      expect(rev.status).toBe(200);

      const reopened = await prisma.dealerBroilerPurchase.findFirst({
        where: { dealerId, sourceFarmerId: farmer },
      });
      expect(reopened?.settlementId).toBeNull();

      const list = await api.get(`/dealer/sales/chicken-by-farmer?sourceFarmerId=${farmer}`);
      const bucket = (list.body?.data ?? []).find((b: any) => b.sourceFarmerId === farmer);
      expect(bucket?.purchase?.recordCount).toBe(1);
      expect(Number(bucket.purchase.totalCost)).toBeCloseTo(2000, 2);
    });

    // ==================================================================
    // Standalone broiler-purchase endpoint — lets the dealer record a
    // purchase lot retroactively, after the bulk-sale flow is done.
    // Append-only by design (no edit/delete endpoints).
    // ==================================================================
    describe("Standalone POST /dealer/sales/broiler-purchases", () => {
      const makeFarmer = async (name: string) =>
        (await api.post("/dealer/sales/customers", { name })).body.data.id as string;

      it("creates a standalone purchase row and returns it", async () => {
        const farmer = await makeFarmer(`SP Farmer A ${suffix}`);
        const before = await prisma.dealerBroilerPurchase.count({ where: { dealerId } });

        const res = await api.post("/dealer/sales/broiler-purchases", {
          sourceFarmerId: farmer,
          weightKg: 40,
          ratePerKg: 160,
          totalCost: 6400,
          broilerCount: 200,
          notes: "retroactive entry",
        });
        expect(res.status).toBe(201);
        const purchase = res.body?.data?.purchase;
        expect(purchase?.id).toEqual(expect.any(String));
        expect(Number(purchase.totalCost)).toBeCloseTo(6400, 2);
        expect(purchase.broilerCount).toBe(200);

        const after = await prisma.dealerBroilerPurchase.count({ where: { dealerId } });
        expect(after).toBe(before + 1);
      });

      it("rejects missing sourceFarmerId with 400", async () => {
        const res = await api.post("/dealer/sales/broiler-purchases", {
          weightKg: 10,
          ratePerKg: 100,
          totalCost: 1000,
        });
        expect(res.status).toBe(400);
        expect(res.body?.errors?.sourceFarmerId).toBeTruthy();
      });

      it("rejects a source farmer that does not belong to this dealer", async () => {
        const foreignCustomer = await prisma.customer.create({
          data: {
            userId: (global as any).__foreignUserId,
            name: `Foreign Farmer ${suffix}`,
          },
        });
        const res = await api.post("/dealer/sales/broiler-purchases", {
          sourceFarmerId: foreignCustomer.id,
          weightKg: 10,
          ratePerKg: 100,
          totalCost: 1000,
        });
        expect(res.status).toBe(404);
        // Also assert nothing got created for this foreign customer.
        const count = await prisma.dealerBroilerPurchase.count({
          where: { sourceFarmerId: foreignCustomer.id },
        });
        expect(count).toBe(0);
      });

      it("rejects negative weight with per-block error (nothing saved)", async () => {
        const farmer = await makeFarmer(`SP Farmer B ${suffix}`);
        const before = await prisma.dealerBroilerPurchase.count({ where: { dealerId, sourceFarmerId: farmer } });
        const res = await api.post("/dealer/sales/broiler-purchases", {
          sourceFarmerId: farmer,
          weightKg: -5,
          ratePerKg: 100,
          totalCost: 500,
        });
        expect(res.status).toBe(400);
        expect(res.body?.errors?.purchase).toEqual(
          expect.arrayContaining([expect.stringMatching(/weight/i)])
        );
        const after = await prisma.dealerBroilerPurchase.count({ where: { dealerId, sourceFarmerId: farmer } });
        expect(after).toBe(before);
      });

      it("defaults the date to today when none is provided", async () => {
        const farmer = await makeFarmer(`SP Farmer C ${suffix}`);
        const start = Date.now();
        const res = await api.post("/dealer/sales/broiler-purchases", {
          sourceFarmerId: farmer,
          weightKg: 10,
          ratePerKg: 100,
          totalCost: 1000,
        });
        expect(res.status).toBe(201);
        const id = res.body.data.purchase.id;
        const stored = await prisma.dealerBroilerPurchase.findUnique({ where: { id } });
        expect(stored?.date.getTime()).toBeGreaterThanOrEqual(start - 1000);
        expect(stored?.date.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
      });

      it("respects an explicit backdated date", async () => {
        const farmer = await makeFarmer(`SP Farmer D ${suffix}`);
        const res = await api.post("/dealer/sales/broiler-purchases", {
          sourceFarmerId: farmer,
          weightKg: 10,
          ratePerKg: 100,
          totalCost: 1000,
          date: "2026-08-15",
        });
        expect(res.status).toBe(201);
        const stored = await prisma.dealerBroilerPurchase.findUnique({
          where: { id: res.body.data.purchase.id },
        });
        // Day match in UTC — parseable round-trip.
        expect(stored?.date.toISOString().startsWith("2026-08-15")).toBe(true);
      });

      it("surfaces the retroactive purchase on the next chicken-by-farmer GET", async () => {
        const farmer = await makeFarmer(`SP Farmer E ${suffix}`);
        const buyer = await makeFarmer(`SP Buyer E ${suffix}`);

        // Record sales first — no purchase block included.
        await api.post("/dealer/sales/broiler/bulk", {
          sourceFarmerId: farmer,
          rows: [row({ buyerId: buyer, weightKg: 10, ratePerKg: 300 })],
        });

        // Dealer realises they forgot; adds purchase standalone.
        const pur = await api.post("/dealer/sales/broiler-purchases", {
          sourceFarmerId: farmer,
          weightKg: 15,
          ratePerKg: 220,
          totalCost: 3300,
        });
        expect(pur.status).toBe(201);

        const list = await api.get(`/dealer/sales/chicken-by-farmer?sourceFarmerId=${farmer}`);
        const bucket = (list.body?.data ?? []).find((b: any) => b.sourceFarmerId === farmer);
        expect(bucket?.purchase?.recordCount).toBe(1);
        expect(Number(bucket.purchase.totalCost)).toBeCloseTo(3300, 2);
      });

      it("lists current-lot purchases via GET /dealer/sales/broiler-purchases", async () => {
        const farmer = await makeFarmer(`SP Farmer G ${suffix}`);
        const pur1 = await api.post("/dealer/sales/broiler-purchases", {
          sourceFarmerId: farmer, weightKg: 10, ratePerKg: 100, totalCost: 1000,
        });
        const pur2 = await api.post("/dealer/sales/broiler-purchases", {
          sourceFarmerId: farmer, weightKg: 20, ratePerKg: 110, totalCost: 2200,
        });
        expect(pur1.status).toBe(201);
        expect(pur2.status).toBe(201);

        const list = await api.get(`/dealer/sales/broiler-purchases?sourceFarmerId=${farmer}`);
        expect(list.status).toBe(200);
        const ids = (list.body?.data ?? []).map((p: any) => p.id);
        expect(ids).toContain(pur1.body.data.purchase.id);
        expect(ids).toContain(pur2.body.data.purchase.id);
      });

      it("deletes a current-lot purchase and removes it from the aggregate", async () => {
        const farmer = await makeFarmer(`SP Farmer H ${suffix}`);
        const buyer = await makeFarmer(`SP Buyer H ${suffix}`);
        await api.post("/dealer/sales/broiler/bulk", {
          sourceFarmerId: farmer,
          rows: [row({ buyerId: buyer, weightKg: 5, ratePerKg: 300 })],
        });
        const create = await api.post("/dealer/sales/broiler-purchases", {
          sourceFarmerId: farmer, weightKg: 10, ratePerKg: 100, totalCost: 1000,
        });
        const purchaseId = create.body.data.purchase.id;

        const del = await api.delete(`/dealer/sales/broiler-purchases/${purchaseId}`);
        expect(del.status).toBe(200);

        const stored = await prisma.dealerBroilerPurchase.findUnique({ where: { id: purchaseId } });
        expect(stored).toBeNull();

        const list = await api.get(`/dealer/sales/chicken-by-farmer?sourceFarmerId=${farmer}`);
        const bucket = (list.body?.data ?? []).find((b: any) => b.sourceFarmerId === farmer);
        expect(bucket?.purchase).toBeNull();
      });

      it("refuses to delete a purchase that was recorded before the latest settlement", async () => {
        // The locked-by-settlement guard protects historical totals.
        const farmer = await makeFarmer(`SP Farmer I ${suffix}`);
        const buyer = await makeFarmer(`SP Buyer I ${suffix}`);

        await api.post("/dealer/sales/broiler/bulk", {
          sourceFarmerId: farmer,
          rows: [row({ buyerId: buyer, weightKg: 5, ratePerKg: 300, date: "2026-04-01" })],
          purchase: { weightKg: 10, ratePerKg: 100, totalCost: 1000 },
        });
        // Fetch the purchase id (there's exactly one for this farmer).
        const purchase = await prisma.dealerBroilerPurchase.findFirstOrThrow({
          where: { dealerId, sourceFarmerId: farmer },
        });
        await api.post("/dealer/sales/broiler-settlements", {
          sourceFarmerId: farmer, marginAmount: 0, paymentMethod: "CASH", date: "2026-04-02",
        });

        const del = await api.delete(`/dealer/sales/broiler-purchases/${purchase.id}`);
        expect(del.status).toBe(409);
        expect(del.body?.code).toBe("PURCHASE_LOCKED_BY_SETTLEMENT");

        const stored = await prisma.dealerBroilerPurchase.findUnique({ where: { id: purchase.id } });
        expect(stored).not.toBeNull();
      });

      it("blocks reversing a settlement when a newer open lot already exists", async () => {
        // Lot 1: sale + purchase, then settle.
        const farmer = await makeFarmer(`RL Farmer ${suffix}`);
        const buyer = await makeFarmer(`RL Buyer ${suffix}`);
        await api.post("/dealer/sales/broiler/bulk", {
          sourceFarmerId: farmer,
          rows: [row({ buyerId: buyer, weightKg: 5, ratePerKg: 300 })],
          purchase: { weightKg: 10, ratePerKg: 200, totalCost: 2000 },
        });
        const settle = await api.post("/dealer/sales/broiler-settlements", {
          sourceFarmerId: farmer, marginAmount: 0, paymentMethod: "CASH",
        });
        const settlementId = settle.body.data.id;

        // Lot 2 opens: new sale, no purchase yet.
        await api.post("/dealer/sales/broiler/bulk", {
          sourceFarmerId: farmer,
          rows: [row({ buyerId: buyer, weightKg: 3, ratePerKg: 310 })],
        });

        // Reverse of lot 1 must fail — merging would cross-contaminate lots.
        const rev = await api.delete(`/dealer/sales/broiler-settlements/${settlementId}`);
        expect(rev.status).toBe(409);
        expect(rev.body?.code).toBe("OPEN_LOT_EXISTS");

        // Settlement + its linkage still intact.
        const stillSettled = await prisma.dealerSale.findFirst({
          where: { dealerId, sourceFarmerId: farmer, settlementId },
        });
        expect(stillSettled).not.toBeNull();
      });

      it("allows reverse when the next lot is still empty", async () => {
        const farmer = await makeFarmer(`RL2 Farmer ${suffix}`);
        const buyer = await makeFarmer(`RL2 Buyer ${suffix}`);
        await api.post("/dealer/sales/broiler/bulk", {
          sourceFarmerId: farmer,
          rows: [row({ buyerId: buyer, weightKg: 5, ratePerKg: 300 })],
        });
        const settle = await api.post("/dealer/sales/broiler-settlements", {
          sourceFarmerId: farmer, marginAmount: 0, paymentMethod: "CASH",
        });
        const rev = await api.delete(`/dealer/sales/broiler-settlements/${settle.body.data.id}`);
        expect(rev.status).toBe(200);
      });

      it("purchase delete inside-tx re-asserts settlementId:null (TOCTOU guard)", async () => {
        // Simulate the race: create an open purchase, then settle the lot
        // directly via DB before the delete transaction runs. The delete
        // must refuse because the row is no longer open.
        const farmer = await makeFarmer(`TOCTOU Farmer ${suffix}`);
        const buyer = await makeFarmer(`TOCTOU Buyer ${suffix}`);
        await api.post("/dealer/sales/broiler/bulk", {
          sourceFarmerId: farmer,
          rows: [row({ buyerId: buyer, weightKg: 5, ratePerKg: 300 })],
        });
        const create = await api.post("/dealer/sales/broiler-purchases", {
          sourceFarmerId: farmer, weightKg: 10, ratePerKg: 100, totalCost: 1000,
        });
        const purchaseId = create.body.data.purchase.id;

        // Race: a settlement lands between the HTTP pre-check and the
        // inside-tx guard. We stand in for the race by directly stamping
        // the row's settlementId via Prisma — same observable effect.
        const fakeSettlement = await prisma.broilerSaleSettlement.create({
          data: {
            dealerId,
            farmerId: farmer,
            totalProceeds: 0, marginAmount: 0, creditRecovered: 0, farmerPayout: 0,
            paymentMethod: "CASH",
            date: new Date(),
          },
        });
        await prisma.dealerBroilerPurchase.update({
          where: { id: purchaseId },
          data: { settlementId: fakeSettlement.id },
        });

        const del = await api.delete(`/dealer/sales/broiler-purchases/${purchaseId}`);
        expect(del.status).toBe(409);
        expect(del.body?.code).toBe("PURCHASE_LOCKED_BY_SETTLEMENT");

        // Purchase still exists (inside-tx guard protected it).
        const stored = await prisma.dealerBroilerPurchase.findUnique({ where: { id: purchaseId } });
        expect(stored).not.toBeNull();

        // Clean up the fake settlement so afterAll teardown stays simple.
        await prisma.dealerBroilerPurchase.update({
          where: { id: purchaseId },
          data: { settlementId: null },
        });
        await prisma.broilerSaleSettlement.delete({ where: { id: fakeSettlement.id } });
      });

      it("customer delete: refuses when the customer has purchase rows", async () => {
        // Customer has ONLY a purchase (no sales, no payments). Without
        // the purchase check, the endpoint would say "deletable" and the
        // DB would then 500 on the Restrict FK.
        const farmer = await makeFarmer(`CD Farmer ${suffix}`);
        await api.post("/dealer/sales/broiler-purchases", {
          sourceFarmerId: farmer, weightKg: 10, ratePerKg: 100, totalCost: 1000,
        });

        const del = await api.delete(`/dealer/sales/customers/${farmer}`);
        expect(del.status).toBe(400);
        expect(del.body?.message).toMatch(/purchase/i);

        // Customer still exists; purchase still exists.
        const stored = await prisma.customer.findUnique({ where: { id: farmer } });
        expect(stored).not.toBeNull();
      });

      it("customer archive: allows archive when the customer has purchase rows (NOT deletable)", async () => {
        // The archive endpoint refuses when a customer IS deletable. A
        // customer with only purchases must be considered NOT deletable, so
        // archive should succeed.
        const farmer = await makeFarmer(`CA Farmer ${suffix}`);
        await api.post("/dealer/sales/broiler-purchases", {
          sourceFarmerId: farmer, weightKg: 10, ratePerKg: 100, totalCost: 1000,
        });

        const arch = await api.post(`/dealer/sales/customers/${farmer}/archive`, {});
        expect(arch.status).toBe(200);
      });

      it("refuses to delete someone else's purchase (cross-tenant)", async () => {
        // Create a purchase under a foreign dealer, then try to delete it as
        // the authenticated dealer — must 404 without deleting.
        const foreignUserId = (global as any).__foreignUserId;
        const foreignDealer = await prisma.dealer.create({
          data: { name: `FD ${suffix}-${Math.random()}`, contact: "0", ownerId: foreignUserId },
        });
        const foreignCustomer = await prisma.customer.create({
          data: { userId: foreignUserId, name: `FC ${suffix}-${Math.random()}` },
        });
        const foreignPurchase = await prisma.dealerBroilerPurchase.create({
          data: {
            dealerId: foreignDealer.id,
            sourceFarmerId: foreignCustomer.id,
            weightKg: 1, ratePerKg: 1, totalCost: 1,
            date: new Date(),
          },
        });

        const del = await api.delete(`/dealer/sales/broiler-purchases/${foreignPurchase.id}`);
        expect(del.status).toBe(404);
        const stored = await prisma.dealerBroilerPurchase.findUnique({ where: { id: foreignPurchase.id } });
        expect(stored).not.toBeNull();

        // Cleanup foreign row so afterAll can succeed.
        await prisma.dealerBroilerPurchase.delete({ where: { id: foreignPurchase.id } });
      });

      it("creates the purchase and its audit in one transaction (count stays consistent)", async () => {
        // We can't easily force the audit to fail from the API layer, but we
        // CAN verify that a successful create produced BOTH a purchase row
        // and a matching audit row in the same commit — and that the counts
        // stay aligned across many successful calls. If the two writes were
        // in separate transactions, a crash between them would drift these
        // counts; here we snapshot the delta.
        const farmer = await makeFarmer(`TX Farmer ${suffix}`);
        const beforePurchases = await prisma.dealerBroilerPurchase.count({ where: { dealerId } });
        const beforeAudits = await prisma.businessAuditLog.count({
          where: { action: "dealer.broiler_purchase.created", accountOwnerId: ownerId },
        });

        const res = await api.post("/dealer/sales/broiler-purchases", {
          sourceFarmerId: farmer, weightKg: 10, ratePerKg: 100, totalCost: 1000,
        });
        expect(res.status).toBe(201);

        const afterPurchases = await prisma.dealerBroilerPurchase.count({ where: { dealerId } });
        const afterAudits = await prisma.businessAuditLog.count({
          where: { action: "dealer.broiler_purchase.created", accountOwnerId: ownerId },
        });
        expect(afterPurchases - beforePurchases).toBe(1);
        expect(afterAudits - beforeAudits).toBe(1);
      });

      it("writes an audit entry under dealer.broiler_purchase.created", async () => {
        const farmer = await makeFarmer(`SP Farmer F ${suffix}`);
        const res = await api.post("/dealer/sales/broiler-purchases", {
          sourceFarmerId: farmer,
          weightKg: 10,
          ratePerKg: 100,
          totalCost: 1000,
        });
        expect(res.status).toBe(201);
        const audits = await prisma.businessAuditLog.findMany({
          where: {
            action: "dealer.broiler_purchase.created",
            accountOwnerId: ownerId,
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        });
        expect(audits).toHaveLength(1);
        expect(audits[0].targetId).toBe(res.body.data.purchase.id);
        const metadata = audits[0].metadata as any;
        expect(metadata?.sourceFarmerId).toBe(farmer);
        expect(Number(metadata?.totalCost)).toBeCloseTo(1000, 2);
      });
    });

    it("returns a purchase-only farmer (no open sales) so the dealer can still manage it", async () => {
      // Dealer recorded a sale + purchase, then deleted the sale via some
      // other flow. The purchase still exists (open) but the farmer would
      // vanish from the card if we only grouped by sales. The card must
      // still appear so the dealer can review or delete the purchase.
      const farmer = await makeFarmer(`PO Farmer ${suffix}`);
      // Create a purchase directly (no sales at all).
      await api.post("/dealer/sales/broiler-purchases", {
        sourceFarmerId: farmer, weightKg: 10, ratePerKg: 100, totalCost: 1000,
      });

      const list = await api.get(`/dealer/sales/chicken-by-farmer?sourceFarmerId=${farmer}`);
      expect(list.status).toBe(200);
      const bucket = (list.body?.data ?? []).find((b: any) => b.sourceFarmerId === farmer);
      expect(bucket).toBeTruthy();
      expect(bucket.saleCount).toBe(0);
      expect(Number(bucket.tentativeRevenue)).toBe(0);
      expect(bucket.purchase).toBeTruthy();
      expect(Number(bucket.purchase.totalCost)).toBeCloseTo(1000, 2);
      expect(bucket.sales).toEqual([]);
    });

    it("lot identity is independent of user-typed dates (settlement actions define lots, not dates)", async () => {
      // Backdated purchases, same-day settlements, pre-settlement calendar
      // dates — none of them matter. All that matters is whether a
      // settlement has been recorded against the purchase.
      const farmer = await makeFarmer(`CBF Farmer G ${suffix}`);
      const buyer = await makeFarmer(`CBF Buyer G ${suffix}`);

      // Open lot: sale + wildly-backdated standalone purchase.
      await api.post("/dealer/sales/broiler/bulk", {
        sourceFarmerId: farmer,
        rows: [row({ buyerId: buyer, weightKg: 5, ratePerKg: 300, date: "2026-07-20" })],
      });
      await api.post("/dealer/sales/broiler-purchases", {
        sourceFarmerId: farmer,
        weightKg: 8, ratePerKg: 220, totalCost: 1760,
        date: "2020-01-01", // ancient
      });
      const listA = await api.get(`/dealer/sales/chicken-by-farmer?sourceFarmerId=${farmer}`);
      const bucketA = (listA.body?.data ?? []).find((b: any) => b.sourceFarmerId === farmer);
      expect(bucketA?.purchase?.recordCount).toBe(1);
      expect(Number(bucketA.purchase.totalCost)).toBeCloseTo(1760, 2);
    });

    it("sales array contains only UNSETTLED sales (settled ones are excluded)", async () => {
      const farmer = await makeFarmer(`CBF Farmer F ${suffix}`);
      const buyer = await makeFarmer(`CBF Buyer F ${suffix}`);

      await api.post("/dealer/sales/broiler/bulk", {
        sourceFarmerId: farmer,
        rows: [row({ buyerId: buyer, weightKg: 10, ratePerKg: 300, date: "2026-09-01" })],
      });

      // Settle that lot.
      const settle = await api.post("/dealer/sales/broiler-settlements", {
        sourceFarmerId: farmer,
        marginAmount: 0,
        paymentMethod: "CASH",
        date: "2026-09-02",
      });
      expect(settle.status).toBe(201);

      // Add a NEW unsettled sale.
      await api.post("/dealer/sales/broiler/bulk", {
        sourceFarmerId: farmer,
        rows: [row({ buyerId: buyer, weightKg: 7, ratePerKg: 320, date: "2026-09-10" })],
      });

      const list = await api.get(`/dealer/sales/chicken-by-farmer?sourceFarmerId=${farmer}`);
      const bucket = (list.body?.data ?? []).find((b: any) => b.sourceFarmerId === farmer);
      expect(bucket).toBeTruthy();
      // saleCount reflects unsettled only.
      expect(bucket.saleCount).toBe(1);
      expect(bucket.sales).toHaveLength(1);
      expect(Number(bucket.sales[0].totalAmount)).toBeCloseTo(7 * 320, 2);
    });
  });
});
