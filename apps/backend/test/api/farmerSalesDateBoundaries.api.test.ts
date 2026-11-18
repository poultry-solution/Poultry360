import { ApiHelper } from "../helpers/api.helper";

/**
 * Nepal-day boundary and bad-input contract for the farmer (OWNER) sales list.
 *
 * The three sales below are placed at the three moments that split the UTC and
 * Nepal days near midnight:
 *
 *   A  2026-10-12T17:00:00Z  →  Nepal 2026-10-12 22:45  (Nepal day 2026-10-12)
 *   B  2026-10-12T19:00:00Z  →  Nepal 2026-10-13 00:45  (Nepal day 2026-10-13)
 *   C  2026-10-13T19:00:00Z  →  Nepal 2026-10-14 00:45  (Nepal day 2026-10-14)
 *
 * The B moment is the whole reason this file exists: on UTC servers the old
 * filter (`new Date("2026-10-13")`) treated it as 10-12, so a user asking for
 * "today = 10-13" lost it. The new `parseNepalRange` builds +05:45 bounds so
 * Nepal day 10-13 captures B and nothing else.
 *
 * Runs under TZ=UTC by default (see test/setup.ts). If this file passes on a
 * Mac that is in Asia/Kathmandu but fails under TZ=UTC, the boundary helper
 * has regressed — do not relax the test, fix the helper.
 */
describe("Farmer sales list — Nepal-day boundaries and bad input", () => {
  const api = new ApiHelper();
  const password = "Date-boundary-test-123";
  const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`.slice(-10);
  const phone = `+97792${suffix}`;

  const SALE_A_ISO = "2026-10-12T17:00:00.000Z"; // Nepal 10-12 22:45
  const SALE_B_ISO = "2026-10-12T19:00:00.000Z"; // Nepal 10-13 00:45  ← boundary case
  const SALE_C_ISO = "2026-10-13T19:00:00.000Z"; // Nepal 10-14 00:45

  let farmId: string | undefined;
  let batchId: string | undefined;
  let chicksItemId: string | undefined;
  let customerId: string | undefined;
  let saleAId: string | undefined;
  let saleBId: string | undefined;
  let saleCId: string | undefined;

  beforeAll(async () => {
    const registration = await api.post("/auth/register", {
      name: `Date API Farmer ${suffix}`,
      phone,
      password,
      role: "OWNER",
    });
    expect(registration.status).toBe(201);
    api.setAuthToken(registration.body.accessToken);
    expect((await api.post("/test/approve-current-user")).status).toBe(200);

    const farm = await api.post("/farms", {
      name: `Date Farm ${suffix}`,
      capacity: 50,
    });
    expect(farm.status).toBe(201);
    farmId = farm.body.data.id;

    const chicks = await api.post("/inventory", {
      name: `Date chicks ${suffix}`,
      currentStock: 30,
      unit: "bird",
      itemType: "CHICKS",
      rate: 25,
    });
    expect(chicks.status).toBe(201);
    chicksItemId = chicks.body.data.id;

    // Batch starts well before the boundary moments so sales dated 2026-10-12
    // and 2026-10-13 are inside the batch's active window.
    const batch = await api.post("/batches", {
      batchNumber: `DATE-${suffix}`,
      startDate: "2026-10-01T00:00:00.000Z",
      batchType: "BROILER",
      farmId,
      chicksInventory: [{ itemId: chicksItemId, quantity: 30 }],
    });
    expect(batch.status).toBe(201);
    batchId = batch.body.data.id;

    const customer = await api.post("/sales/customers", {
      name: `Date customer ${suffix}`,
      phone: `97${suffix.slice(-8)}`,
      category: "Trader",
    });
    expect(customer.status).toBe(201);
    customerId = customer.body.data.id;

    const makeSale = async (iso: string, label: string) => {
      const res = await api.post("/sales", {
        date: iso,
        amount: 1,
        quantity: 1,
        weight: 2,
        unitPrice: 100,
        farmId,
        batchId,
        customerId,
        itemType: "Chicken_Meat",
        isCredit: false,
        description: `Boundary sale ${label}`,
      });
      expect(res.status).toBe(201);
      return res.body.data.id as string;
    };

    saleAId = await makeSale(SALE_A_ISO, "A");
    saleBId = await makeSale(SALE_B_ISO, "B");
    saleCId = await makeSale(SALE_C_ISO, "C");
  });

  afterAll(async () => {
    for (const id of [saleAId, saleBId, saleCId]) {
      if (id) await api.delete(`/sales/${id}`);
    }
    if (customerId) await api.delete(`/sales/customers/${customerId}`);
    if (batchId) await api.delete(`/batches/${batchId}`);
    if (chicksItemId) {
      await api.put(`/inventory/${chicksItemId}`, { currentStock: 0 });
      await api.delete(`/inventory/${chicksItemId}`);
    }
    if (farmId) await api.delete(`/farms/${farmId}`, { password });
  });

  const idsIn = (body: { data?: Array<{ id: string }> }): Set<string> =>
    new Set((body.data ?? []).map((row) => row.id));

  // Filter requests include customerId so only this test's sales come back, even
  // if an earlier journey left records for other customers on the same account.
  const list = (query: string) => api.get(`/sales?customerId=${customerId}&${query}`);

  it("returns every sale when no date range is sent", async () => {
    const res = await list(`limit=50`);
    expect(res.status).toBe(200);
    const ids = idsIn(res.body);
    expect(ids.has(saleAId!)).toBe(true);
    expect(ids.has(saleBId!)).toBe(true);
    expect(ids.has(saleCId!)).toBe(true);
  });

  it("maps a Nepal-midnight moment to the Nepal day, not the UTC day", async () => {
    // The whole bug the sweep fixed: B is Nepal 10-13 even though its UTC clock reads 10-12.
    const res = await list(`startDate=2026-10-13&endDate=2026-10-13`);
    expect(res.status).toBe(200);
    const ids = idsIn(res.body);
    expect(ids.has(saleBId!)).toBe(true);
    expect(ids.has(saleAId!)).toBe(false);
    expect(ids.has(saleCId!)).toBe(false);
  });

  it("does not leak the following Nepal day into a single-day filter", async () => {
    const res = await list(`startDate=2026-10-12&endDate=2026-10-12`);
    expect(res.status).toBe(200);
    const ids = idsIn(res.body);
    expect(ids.has(saleAId!)).toBe(true);
    expect(ids.has(saleBId!)).toBe(false);
    expect(ids.has(saleCId!)).toBe(false);
  });

  it("includes both ends of an inclusive multi-day range", async () => {
    const res = await list(`startDate=2026-10-12&endDate=2026-10-14`);
    expect(res.status).toBe(200);
    const ids = idsIn(res.body);
    expect(ids.has(saleAId!)).toBe(true);
    expect(ids.has(saleBId!)).toBe(true);
    expect(ids.has(saleCId!)).toBe(true);
  });

  it("accepts a half-open range (startDate only)", async () => {
    const res = await list(`startDate=2026-10-13`);
    expect(res.status).toBe(200);
    const ids = idsIn(res.body);
    expect(ids.has(saleAId!)).toBe(false);
    expect(ids.has(saleBId!)).toBe(true);
    expect(ids.has(saleCId!)).toBe(true);
  });

  it("rejects malformed startDate with HTTP 400", async () => {
    const res = await list(`startDate=not-a-date&endDate=2026-10-13`);
    expect(res.status).toBe(400);
    expect(typeof res.body.message).toBe("string");
  });

  it("rejects impossible calendar dates with HTTP 400", async () => {
    const res = await list(`startDate=2026-02-30&endDate=2026-02-30`);
    expect(res.status).toBe(400);
  });

  it("rejects an inverted range with HTTP 400", async () => {
    const res = await list(`startDate=2026-10-14&endDate=2026-10-13`);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/before or equal/i);
  });
});
