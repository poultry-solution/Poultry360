import { ApiHelper } from "../helpers/api.helper";

describe("Farmer analytics API journey", () => {
  const api = new ApiHelper();
  const otherApi = new ApiHelper();
  const password = "Farmer-analytics-test-123";
  const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`.slice(-10);
  const phone = `+97793${suffix}`;
  const otherPhone = `+97794${suffix}`;
  const now = new Date().toISOString();
  const day = now.slice(0, 10);

  let farmId: string | undefined;
  let batchId: string | undefined;
  let chicksItemId: string | undefined;
  let feedItemId: string | undefined;
  let mortalityId: string | undefined;
  let expenseId: string | undefined;
  let saleId: string | undefined;

  beforeAll(async () => {
    const [registration, otherRegistration] = await Promise.all([
      api.post("/auth/register", { name: `Analytics Farmer ${suffix}`, phone, password, role: "OWNER" }),
      otherApi.post("/auth/register", { name: `Other Analytics Farmer ${suffix}`, phone: otherPhone, password, role: "OWNER" }),
    ]);
    expect(registration.status).toBe(201);
    expect(otherRegistration.status).toBe(201);
    api.setAuthToken(registration.body.accessToken);
    otherApi.setAuthToken(otherRegistration.body.accessToken);
    expect((await api.post("/test/approve-current-user")).status).toBe(200);
    expect((await otherApi.post("/test/approve-current-user")).status).toBe(200);

    const farm = await api.post("/farms", { name: `Analytics Farm ${suffix}`, capacity: 20 });
    expect(farm.status).toBe(201);
    farmId = farm.body.data.id;
    const [chicks, feed, categories] = await Promise.all([
      api.post("/inventory", { name: `Analytics chicks ${suffix}`, currentStock: 10, unit: "bird", itemType: "CHICKS", rate: 25 }),
      api.post("/inventory", { name: `Analytics feed ${suffix}`, currentStock: 5, unit: "KG", itemType: "FEED", rate: 10 }),
      api.get("/expenses/categories?type=EXPENSE"),
    ]);
    expect(chicks.status).toBe(201);
    expect(feed.status).toBe(201);
    chicksItemId = chicks.body.data.id;
    feedItemId = feed.body.data.id;
    const feedCategoryId = categories.body.data.find((category: { name: string }) => category.name === "Feed")?.id;
    expect(feedCategoryId).toBeDefined();

    const batch = await api.post("/batches", {
      batchNumber: `ANALYTICS-${suffix}`,
      startDate: now,
      batchType: "BROILER",
      farmId,
      chicksInventory: [{ itemId: chicksItemId, quantity: 10 }],
    });
    expect(batch.status).toBe(201);
    batchId = batch.body.data.id;

    const mortality = await api.post("/mortalities", { batchId, date: now, count: 1, reason: "Natural loss" });
    expect(mortality.status).toBe(201);
    mortalityId = mortality.body.data.id;

    const expense = await api.post("/expenses", {
      date: now,
      amount: 50,
      description: "Analytics feed cost",
      farmId,
      batchId,
      categoryId: feedCategoryId,
      inventoryItems: [{ itemId: feedItemId, quantity: 5 }],
    });
    expect(expense.status).toBe(201);
    expenseId = expense.body.data.id;

    const sale = await api.post("/sales", {
      date: now,
      amount: 1,
      quantity: 2,
      weight: 4,
      unitPrice: 100,
      farmId,
      batchId,
      itemType: "Chicken_Meat",
      isCredit: false,
    });
    expect(sale.status).toBe(201);
    saleId = sale.body.data.id;
  });

  afterAll(async () => {
    if (saleId) await api.delete(`/sales/${saleId}`);
    if (expenseId) await api.delete(`/expenses/${expenseId}`);
    if (mortalityId) await api.delete(`/mortalities/${mortalityId}`);
    if (batchId) await api.delete(`/batches/${batchId}`);
    for (const itemId of [chicksItemId, feedItemId]) {
      if (itemId) {
        await api.put(`/inventory/${itemId}`, { currentStock: 0 });
        await api.delete(`/inventory/${itemId}`);
      }
    }
    if (farmId) await api.delete(`/farms/${farmId}`, { password });
  });

  it("returns one filtered, internally consistent view across analytics tabs", async () => {
    const query = `farmId=${farmId}&batchId=${batchId}&startDate=${day}&endDate=${day}&groupBy=daily`;
    const [overview, money, batches, health, report] = await Promise.all([
      api.get(`/analytics/farmer/overview?${query}`),
      api.get(`/analytics/farmer/finance?${query}`),
      api.get(`/analytics/farmer/flock-comparison?${query}`),
      api.get(`/analytics/farmer/operations?${query}`),
      api.get(`/analytics/farmer/reports?${query}&reportType=money`),
    ]);

    expect(overview.status).toBe(200);
    expect(overview.body.data).toMatchObject({
      range: { startDay: day, endDay: day, groupBy: "daily", allTime: false },
      tiles: { sales: 400, costs: 50, profit: 350, activeBatches: 1, birdsAlive: 7, deaths: 1 },
    });
    expect(overview.body.data.running).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: batchId, alive: 7 }),
    ]));

    expect(money.status).toBe(200);
    expect(money.body.data.totals).toMatchObject({ sales: 400, costs: 50, profit: 350, salesCount: 1, costsCount: 1 });
    expect(money.body.data.series).toEqual(expect.arrayContaining([
      expect.objectContaining({ sales: 400, costs: 50, profit: 350 }),
    ]));

    expect(batches.status).toBe(200);
    expect(batches.body.data.batches).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: batchId, alive: 7 }),
    ]));

    expect(health.status).toBe(200);
    expect(health.body.data.health).toMatchObject({ deaths: 1 });
    expect(report.status).toBe(200);
    expect(report.body.success).toBe(true);
  });

  it("rejects bad date ranges and another farmer's farm", async () => {
    const [badRange, foreignFarm] = await Promise.all([
      api.get("/analytics/farmer/overview?startDate=2026-02-20&endDate=2026-02-01"),
      otherApi.get(`/analytics/farmer/overview?farmId=${farmId}`),
    ]);
    expect(badRange.status).toBe(400);
    expect(badRange.body.message).toContain("Start date must be before end date");
    expect(foreignFarm.status).toBe(403);
  });
});
