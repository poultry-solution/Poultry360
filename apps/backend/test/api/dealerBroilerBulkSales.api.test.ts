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
});
