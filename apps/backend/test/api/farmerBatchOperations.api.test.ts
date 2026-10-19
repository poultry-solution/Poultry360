import { ApiHelper } from "../helpers/api.helper";

/** Deaths, weights, and inventory-backed feed expenses inside an active batch. */
describe("Farmer batch operations API journey", () => {
  const api = new ApiHelper();
  const otherApi = new ApiHelper();
  const password = "Farmer-batch-operations-test-123";
  const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`.slice(-10);
  const now = new Date().toISOString();
  const farmerPhone = `+97792${suffix}`;
  const otherPhone = `+97791${suffix}`;

  let farmId: string | undefined;
  let batchId: string | undefined;
  let chicksItemId: string | undefined;
  let feedItemId: string | undefined;
  let mortalityId: string | undefined;
  let weightId: string | undefined;
  let expenseId: string | undefined;
  let feedCategoryId: string | undefined;

  beforeAll(async () => {
    const [farmer, otherFarmer] = await Promise.all([
      api.post("/auth/register", { name: `Batch Operations Farmer ${suffix}`, phone: farmerPhone, password, role: "OWNER" }),
      otherApi.post("/auth/register", { name: `Other Batch Operations Farmer ${suffix}`, phone: otherPhone, password, role: "OWNER" }),
    ]);
    expect(farmer.status).toBe(201);
    expect(otherFarmer.status).toBe(201);
    api.setAuthToken(farmer.body.accessToken);
    otherApi.setAuthToken(otherFarmer.body.accessToken);
    expect((await api.post("/test/approve-current-user")).status).toBe(200);
    expect((await otherApi.post("/test/approve-current-user")).status).toBe(200);

    const farm = await api.post("/farms", { name: `Operations Farm ${suffix}`, capacity: 100 });
    expect(farm.status).toBe(201);
    farmId = farm.body.data.id;

    const [chicks, feed, categories] = await Promise.all([
      api.post("/inventory", { name: `Operations chicks ${suffix}`, currentStock: 10, unit: "bird", itemType: "CHICKS", rate: 25 }),
      api.post("/inventory", { name: `Operations feed ${suffix}`, currentStock: 10, unit: "KG", itemType: "FEED", rate: 20 }),
      api.get("/expenses/categories?type=EXPENSE"),
    ]);
    expect(chicks.status).toBe(201);
    expect(feed.status).toBe(201);
    chicksItemId = chicks.body.data.id;
    feedItemId = feed.body.data.id;
    feedCategoryId = categories.body.data.find((category: { name: string }) => category.name === "Feed")?.id;
    expect(feedCategoryId).toBeDefined();

    const batch = await api.post("/batches", {
      batchNumber: `OPERATIONS-${suffix}`,
      startDate: now,
      batchType: "BROILER",
      farmId,
      chicksInventory: [{ itemId: chicksItemId, quantity: 10 }],
    });
    expect(batch.status).toBe(201);
    batchId = batch.body.data.id;
  });

  afterAll(async () => {
    if (expenseId) await api.delete(`/expenses/${expenseId}`);
    if (weightId) await api.delete(`/batches/${batchId}/weights/${weightId}`);
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

  it("records a death, lowers live birds, and rejects more deaths than live birds", async () => {
    const mortality = await api.post("/mortalities", {
      batchId,
      date: now,
      count: 2,
      reason: "Heat stress",
    });
    expect(mortality.status).toBe(201);
    mortalityId = mortality.body.data.id;

    const tooManyDeaths = await api.post("/mortalities", {
      batchId,
      date: now,
      count: 9,
      reason: "Invalid test record",
    });
    expect(tooManyDeaths.status).toBe(400);
    expect(tooManyDeaths.body.message).toMatch(/only 8 birds/i);

    const list = await api.get(`/mortalities/batch/${batchId}`);
    expect(list.status).toBe(200);
    expect(list.body.statistics).toMatchObject({ totalRecords: 1, totalMortality: 2, currentBirds: 8 });
  });

  it("records a weight only when its sample count fits the live bird count", async () => {
    const tooLargeSample = await api.post(`/batches/${batchId}/weights`, {
      date: now,
      avgWeight: 0.85,
      sampleCount: 9,
    });
    expect(tooLargeSample.status).toBe(400);
    expect(tooLargeSample.body.message).toMatch(/greater than 8 live birds/i);

    const weight = await api.post(`/batches/${batchId}/weights`, {
      date: now,
      avgWeight: 0.85,
      sampleCount: 8,
      notes: "Morning sample",
    });
    expect(weight.status).toBe(201);
    weightId = weight.body.data.id;

    const weights = await api.get(`/batches/${batchId}/weights`);
    expect(weights.status).toBe(200);
    expect(weights.body.data).toMatchObject({ currentWeight: 0.85, growthMetrics: { recordCount: 1 } });
  });

  it("records feed use as batch expense and lowers feed stock", async () => {
    const expense = await api.post("/expenses", {
      date: now,
      amount: 60,
      description: "Feed used today",
      farmId,
      batchId,
      categoryId: feedCategoryId,
      inventoryItems: [{ itemId: feedItemId, quantity: 3 }],
    });
    expect(expense.status).toBe(201);
    expenseId = expense.body.data.id;
    expect(expense.body.data.inventoryUsages).toHaveLength(1);

    const [expenses, feed] = await Promise.all([
      api.get(`/expenses/batch/${batchId}?category=Feed`),
      api.get(`/inventory/${feedItemId}`),
    ]);
    expect(expenses.status).toBe(200);
    expect(expenses.body.summary).toMatchObject({ totalCount: 1, totalAmount: 60 });
    expect(Number(feed.body.data.currentStock)).toBe(7);
  });

  it("does not expose a batch's deaths, weights, or costs to another farmer", async () => {
    const [deaths, weights, expenses] = await Promise.all([
      otherApi.get(`/mortalities/batch/${batchId}`),
      otherApi.get(`/batches/${batchId}/weights`),
      otherApi.get(`/expenses/batch/${batchId}`),
    ]);
    expect(deaths.status).toBe(404);
    expect(weights.status).toBe(404);
    expect(expenses.status).toBe(404);
  });
});
