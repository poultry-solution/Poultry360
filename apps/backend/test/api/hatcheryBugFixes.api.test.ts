import { ApiHelper } from "../helpers/api.helper";
import prisma from "../../src/utils/prisma";

/**
 * HTTP-level regression tests for hatchery module bug fixes landed in this
 * branch. Each case names the bug it closes against the Hatchery Bug List PDF
 * (checked 17 Oct 2026) and the phase it was fixed in (P0, P1, P2, P3 or P4).
 *
 * These stay deliberately shallow: they exercise one controller guard per
 * test so the setup is cheap and the signal is specific. Deeper journeys
 * (end-to-end sale with HB-#### invoice backfill, oversell under contention,
 * etc.) belong in a separate file because they need the full parent-flock →
 * inventory → incubation chain.
 */
describe("Hatchery bug fixes — HTTP regressions", () => {
  const api = new ApiHelper();
  const password = "Hatch-regress-test-123";
  const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`.slice(-10);
  const phone = `+97798${suffix}`;
  let ownerId: string;

  // Register a hatchery owner once for the whole suite.
  beforeAll(async () => {
    const registration = await api.post("/auth/register-entity", {
      name: `Hatch Owner ${suffix}`,
      phone,
      password,
      entityType: "HATCHERY",
      entityName: `Hatch Test Business ${suffix}`,
      entityContact: `98${suffix.slice(-8)}`,
      entityAddress: "Test city",
    });
    expect(registration.status).toBe(201);
    ownerId = registration.body.user.id;
    api.setAuthToken(registration.body.accessToken);
    expect((await api.post("/test/approve-current-user")).status).toBe(200);
  });

  afterAll(async () => {
    if (!ownerId) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
    await prisma.businessAuditLog.deleteMany({
      where: {
        OR: [{ accountOwnerId: ownerId }, { actorId: ownerId }],
      },
    });
    await prisma.user.deleteMany({ where: { id: ownerId } });
    await prisma.businessAuditLog.deleteMany({
      where: {
        OR: [{ accountOwnerId: ownerId }, { actorId: ownerId }],
      },
    });
  });

  describe("Incubation create validation (P1 — bug §7 HIGH / §5 LOW)", () => {
    const commonBody = { parentBatchId: "non-existent-parent", startDate: "2026-01-01" };

    it("rejects a negative eggsSetCount with a 400", async () => {
      // Fix: controller validates eggsSetCount BEFORE the parent lookup, so
      // a bogus parentBatchId never gets consulted. Previously `parseInt(-5)`
      // was `-5` and the row was created, adding eggs to parent stock.
      const res = await api.post("/hatchery/incubations", {
        ...commonBody,
        eggsSetCount: -5,
      });
      expect(res.status).toBe(400);
      expect(String(res.body.error ?? res.body.message ?? "")).toMatch(/positive whole number/i);
    });

    it("rejects a non-integer eggsSetCount (12.7) with a 400", async () => {
      // Fix: silently truncating "12.7" to 12 is bug §5 LOW "Whole numbers
      // cut silently". The new guard uses Number.isInteger, which rejects.
      const res = await api.post("/hatchery/incubations", {
        ...commonBody,
        eggsSetCount: 12.7,
      });
      expect(res.status).toBe(400);
      expect(String(res.body.error ?? res.body.message ?? "")).toMatch(/positive whole number/i);
    });

    it("rejects a non-numeric eggsSetCount with a 400", async () => {
      // Scientific-notation / string inputs would previously parseInt as 1
      // or NaN; now Number.isInteger makes them fail cleanly.
      const res = await api.post("/hatchery/incubations", {
        ...commonBody,
        eggsSetCount: "abc",
      });
      expect(res.status).toBe(400);
      expect(String(res.body.error ?? res.body.message ?? "")).toMatch(/positive whole number/i);
    });
  });

  describe("Egg sale validation (P1 — bug §5 HIGH 'minus money accepted')", () => {
    // The controller runs validation BEFORE the batch ownership check, so a
    // fake batchId path still exercises the guards. If a guard fires it
    // returns 400; otherwise we'd hit the batch 404. Either way, negative
    // values must not pass through.
    const path = "/hatchery/batches/non-existent-batch/egg-sales";

    it("rejects a negative unitPrice with a 400", async () => {
      const res = await api.post(path, {
        eggTypeId: "any-id",
        date: "2026-01-01",
        count: 10,
        unitPrice: -5,
      });
      expect(res.status).toBe(400);
      expect(String(res.body.error ?? res.body.message ?? "")).toMatch(/cannot be negative/i);
    });

    it("rejects a negative count with a 400", async () => {
      const res = await api.post(path, {
        eggTypeId: "any-id",
        date: "2026-01-01",
        count: -3,
        unitPrice: 10,
      });
      expect(res.status).toBe(400);
      expect(String(res.body.error ?? res.body.message ?? "")).toMatch(/positive whole number/i);
    });

    it("allows unitPrice=0 (free sale) past the validator — batch check then runs", async () => {
      // §5 HIGH report said "A price of 0 (free) is refused as 'required'".
      // The fix accepts 0 and surfaces the real batch error instead.
      const res = await api.post(path, {
        eggTypeId: "any-id",
        date: "2026-01-01",
        count: 10,
        unitPrice: 0,
      });
      // Validator passed → got to batch lookup → 404. Not a 400 about price.
      expect(res.status).toBe(404);
    });
  });

  describe("GET /hatchery/sales/:type/:saleId (new endpoint)", () => {
    it("returns 400 when :type is not a known sale type", async () => {
      const res = await api.get("/hatchery/sales/not-a-type/anything");
      expect(res.status).toBe(400);
      expect(String(res.body.error ?? "")).toMatch(/egg_sale|parent_sale|chick_sale/);
    });

    it("returns 404 when :saleId does not exist for any of the three tables", async () => {
      // Scoped to this hatchery's hatcheryOwnerId — a sale that doesn't
      // belong to us looks identical to a missing one. See bug §5 CRITICAL.
      const res = await api.get("/hatchery/sales/egg_sale/non-existent-sale-id");
      expect(res.status).toBe(404);
      expect(String(res.body.error ?? "")).toMatch(/not found/i);
    });

    it("returns 404 for parent_sale with an unknown id", async () => {
      const res = await api.get("/hatchery/sales/parent_sale/non-existent-sale-id");
      expect(res.status).toBe(404);
    });

    it("returns 404 for chick_sale with an unknown id", async () => {
      const res = await api.get("/hatchery/sales/chick_sale/non-existent-sale-id");
      expect(res.status).toBe(404);
    });
  });

  describe("Egg type delete guards", () => {
    it("rejects deleting the HATCHABLE egg type with a clear 400", async () => {
      // Seed owner gets a default hatchable type on first list; otherwise
      // create one. The pre-existing guard refuses deletion of the only
      // hatchable row — the P4 FK-sweep fix did not weaken this.
      const list = await api.get("/hatchery/egg-types");
      expect(list.status).toBe(200);
      let hatchable = (list.body.data ?? list.body ?? []).find((t: any) => t.isHatchable);
      if (!hatchable) {
        const create = await api.post("/hatchery/egg-types", {
          name: `Hatchable ${suffix}`,
          isHatchable: true,
        });
        expect(create.status).toBe(201);
        hatchable = create.body.data ?? create.body;
      }
      const del = await api.delete(`/hatchery/egg-types/${hatchable.id}`);
      expect(del.status).toBe(400);
      expect(String(del.body.error ?? "")).toMatch(/HATCHABLE/i);
    });

    it("deletes a plain egg type with no references (clean path)", async () => {
      // Belt-and-braces: the P4 FK sweep added 3 more count queries; this
      // asserts the clean-delete path still works when nothing references
      // the egg type.
      const create = await api.post("/hatchery/egg-types", {
        name: `Delete-me ${suffix}`,
        isHatchable: false,
      });
      expect(create.status).toBe(201);
      const id = create.body.data?.id ?? create.body?.id;
      const del = await api.delete(`/hatchery/egg-types/${id}`);
      expect(del.status).toBe(200);
    });
  });

  describe("Staff payment date validator (P4 — bug §10 LOW)", () => {
    let staffId: string;

    beforeAll(async () => {
      const create = await api.post("/hatchery/staff", {
        name: `Staff ${suffix}`,
        startDate: "2026-01-15",
        payType: "MONTHLY",
        rate: 15000,
      });
      expect(create.status).toBe(201);
      staffId = (create.body.data?.id ?? create.body?.id) as string;
      expect(staffId).toBeTruthy();
    });

    it("rejects a payment date in the future with a 400", async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const res = await api.post(`/hatchery/staff/${staffId}/payments`, {
        amount: 1000,
        paidAt: futureDate.toISOString().slice(0, 10),
      });
      expect(res.status).toBe(400);
      expect(String(res.body.message ?? res.body.error ?? "")).toMatch(/future/i);
    });

    it("rejects a payment date before the staff startDate", async () => {
      const res = await api.post(`/hatchery/staff/${staffId}/payments`, {
        amount: 1000,
        paidAt: "2025-01-01",
      });
      expect(res.status).toBe(400);
      expect(String(res.body.message ?? res.body.error ?? "")).toMatch(/joining|start/i);
    });

    // Nepal "today" as YYYY-MM-DD, sent the way the staff page sends it.
    const nepalDay = (offsetDays: number) =>
      new Date(Date.now() + (5 * 60 + 45) * 60 * 1000 + offsetDays * 86400000)
        .toISOString()
        .slice(0, 10);

    it("accepts today at any hour (the page sends 12:00 UTC = 17:45 Nepal)", async () => {
      const res = await api.post(`/hatchery/staff/${staffId}/payments`, {
        amount: 100,
        paidAt: `${nepalDay(0)}T12:00:00.000Z`,
      });
      expect(res.status).toBe(201);
    });

    it("accepts the joining day itself", async () => {
      const res = await api.post(`/hatchery/staff/${staffId}/payments`, {
        amount: 100,
        paidAt: "2026-01-15T12:00:00.000Z",
      });
      expect(res.status).toBe(201);
    });

    it("rejects tomorrow (Nepal day)", async () => {
      const res = await api.post(`/hatchery/staff/${staffId}/payments`, {
        amount: 100,
        paidAt: `${nepalDay(1)}T12:00:00.000Z`,
      });
      expect(res.status).toBe(400);
      expect(String(res.body.message ?? "")).toMatch(/future/i);
    });

    it("accepts a payment date between startDate and today", async () => {
      const res = await api.post(`/hatchery/staff/${staffId}/payments`, {
        amount: 500,
        paidAt: "2026-02-10",
      });
      expect(res.status).toBe(201);
    });
  });
});
