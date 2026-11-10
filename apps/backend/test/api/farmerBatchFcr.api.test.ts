import { ApiHelper } from "../helpers/api.helper";

/**
 * Full broiler FCR/cFCR journey through the public app API.
 *
 * 10 chicks at 0.05 kg = 0.5 kg initial biomass
 * 2 natural deaths, 3 birds sold at 6 kg, 5 live birds at 2 kg = 16 kg output.
 * In the analytics response, totalMortality means natural deaths only; sales are
 * reported separately in totalSalesQuantity and are still removed from live birds.
 * 20 kg feed / (16 - 0.5) kg gain = 1.29032258 FCR
 * Average output is 2 kg, equal to the default cFCR target (2.0 kg), so cFCR equals FCR.
 * cFCR uses one standard per account (Settings), not per batch.
 */
describe("Farmer broiler FCR and cFCR API journey", () => {
  const api = new ApiHelper();
  const password = "Farmer-fcr-test-123";
  const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`.slice(-10);
  const phone = `+97790${suffix}`;
  const now = new Date().toISOString();

  let farmId: string | undefined;
  let batchId: string | undefined;
  let chicksItemId: string | undefined;
  let feedItemId: string | undefined;
  let mortalityId: string | undefined;
  let expenseId: string | undefined;
  let manualWeightId: string | undefined;
  let saleId: string | undefined;

  beforeAll(async () => {
    const registration = await api.post("/auth/register", {
      name: `FCR API Farmer ${suffix}`,
      phone,
      password,
      role: "OWNER",
    });
    expect(registration.status).toBe(201);
    api.setAuthToken(registration.body.accessToken);
    expect((await api.post("/test/approve-current-user")).status).toBe(200);
    expect((await api.put("/account-features/FARMER_CFCR", { enabled: true })).status).toBe(200);

    const farm = await api.post("/farms", { name: `FCR Farm ${suffix}`, capacity: 100 });
    expect(farm.status).toBe(201);
    farmId = farm.body.data.id;

    const [chicks, feed, categories] = await Promise.all([
      api.post("/inventory", { name: `FCR chicks ${suffix}`, currentStock: 10, unit: "bird", itemType: "CHICKS", rate: 25 }),
      api.post("/inventory", { name: `FCR feed ${suffix}`, currentStock: 20, unit: "KG", itemType: "FEED", rate: 20 }),
      api.get("/expenses/categories?type=EXPENSE"),
    ]);
    expect(chicks.status).toBe(201);
    expect(feed.status).toBe(201);
    chicksItemId = chicks.body.data.id;
    feedItemId = feed.body.data.id;
    const feedCategoryId = categories.body.data.find((category: { name: string }) => category.name === "Feed")?.id;
    expect(feedCategoryId).toBeDefined();

    const batch = await api.post("/batches", {
      batchNumber: `FCR-${suffix}`,
      startDate: now,
      batchType: "BROILER",
      initialChickWeight: 0.05,
      farmId,
      chicksInventory: [{ itemId: chicksItemId, quantity: 10 }],
    });
    expect(batch.status).toBe(201);
    batchId = batch.body.data.id;

    const mortality = await api.post("/mortalities", {
      batchId,
      date: now,
      count: 2,
      reason: "Natural loss",
    });
    expect(mortality.status).toBe(201);
    mortalityId = mortality.body.data.id;

    const feedExpense = await api.post("/expenses", {
      date: now,
      amount: 400,
      description: "FCR feed use",
      farmId,
      batchId,
      categoryId: feedCategoryId,
      inventoryItems: [{ itemId: feedItemId, quantity: 20 }],
    });
    expect(feedExpense.status).toBe(201);
    expenseId = feedExpense.body.data.id;

    const sale = await api.post("/sales", {
      date: now,
      amount: 1,
      quantity: 3,
      weight: 6,
      unitPrice: 100,
      farmId,
      batchId,
      itemType: "Chicken_Meat",
      isCredit: false,
    });
    expect(sale.status).toBe(201);
    saleId = sale.body.data.id;

    const weight = await api.post(`/batches/${batchId}/weights`, {
      date: now,
      avgWeight: 2,
      sampleCount: 5,
      notes: "FCR live-bird sample",
    });
    expect(weight.status).toBe(201);
    manualWeightId = weight.body.data.id;
  });

  afterAll(async () => {
    if (saleId) await api.delete(`/sales/${saleId}`);
    if (manualWeightId) await api.delete(`/batches/${batchId}/weights/${manualWeightId}`);
    if (mortalityId) await api.delete(`/mortalities/${mortalityId}`);
    if (expenseId) await api.delete(`/expenses/${expenseId}`);
    if (batchId) await api.delete(`/batches/${batchId}`);
    for (const itemId of [chicksItemId, feedItemId]) {
      if (itemId) {
        await api.put(`/inventory/${itemId}`, { currentStock: 0 });
        await api.delete(`/inventory/${itemId}`);
      }
    }
    if (farmId) await api.delete(`/farms/${farmId}`, { password });
  });

  it("calculates current FCR and cFCR from feed, deaths, sale weight, and live weight", async () => {
    const [analytics, fcrHistory] = await Promise.all([
      api.get(`/batches/${batchId}/analytics`),
      api.get(`/batches/${batchId}/fcr-history`),
    ]);

    expect(analytics.status).toBe(200);
    expect(analytics.body.data).toMatchObject({
      initialChicks: 10,
      currentChicks: 5,
      totalMortality: 2,
      totalSalesQuantity: 3,
      totalFeedConsumption: 20,
      currentAvgWeight: 2,
      fcrDisplayStatus: "FRESH",
      cfcrStatus: "CALCULATED",
    });
    expect(analytics.body.data.fcr).toBeCloseTo(20 / 15.5, 8);
    expect(analytics.body.data.rawFcr).toBeCloseTo(20 / 15.5, 8);
    expect(analytics.body.data.cfcr).toBeCloseTo(20 / 15.5, 8);
    expect(analytics.body.data.fcrData).toMatchObject({
      feedKg: 20,
      initialBiomassKg: 0.5,
      soldBirds: 3,
      soldLiveWeightKg: 6,
      deaths: 2,
      remainingBirds: 5,
      remainingLiveWeightKg: 10,
      producedLiveWeightKg: 16,
      weightGainKg: 15.5,
      averageOutputWeightKg: 2,
      outputBirdCount: 8,
      cfcrTargetWeightKg: 2,
      cfcrCorrectionFactorPerKg: 0.25,
    });

    expect(fcrHistory.status).toBe(200);
    expect(fcrHistory.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fcr: expect.any(Number),
          cfcr: expect.any(Number),
          cfcrStatus: "CALCULATED",
          feedKg: 20,
          soldBirds: 3,
          naturalDeaths: 2,
          remainingBirds: 5,
        }),
      ])
    );
  });

  it("uses the account cFCR standard from Settings for every batch", async () => {
    const standard = await api.get("/farmer/fcr-settings");
    expect(standard.status).toBe(200);
    expect(standard.body.data).toEqual({ targetWeightKg: 2, correctionFactorPerKg: 0.25, isDefault: true });

    for (const bad of [
      { targetWeightKg: 0.5, correctionFactorPerKg: 0.25 },
      { targetWeightKg: 5, correctionFactorPerKg: 0.25 },
      { targetWeightKg: 2, correctionFactorPerKg: 1.5 },
      { targetWeightKg: "abc", correctionFactorPerKg: 0.25 },
      {},
    ]) {
      const response = await api.put("/farmer/fcr-settings", bad);
      expect(response.status).toBe(400);
    }

    // Per-batch cFCR settings are refused.
    const perBatch = await api.put(`/batches/${batchId}`, { cfcrTargetWeightKg: 2.2 });
    expect(perBatch.status).toBe(400);
    expect(perBatch.body.message).toBe("cFCR is set once for all batches in Settings.");

    const saved = await api.put("/farmer/fcr-settings", { targetWeightKg: "2.2", correctionFactorPerKg: 0.3 });
    expect(saved.status).toBe(200);
    expect(saved.body.data).toEqual({ targetWeightKg: 2.2, correctionFactorPerKg: 0.3, isDefault: false });

    const [analytics, fcrHistory] = await Promise.all([
      api.get(`/batches/${batchId}/analytics`),
      api.get(`/batches/${batchId}/fcr-history`),
    ]);
    // Average output 2.0 kg: cFCR = FCR + (2.2 - 2.0) x 0.3
    expect(analytics.body.data.cfcr).toBeCloseTo(20 / 15.5 + 0.06, 8);
    expect(analytics.body.data.fcr).toBeCloseTo(20 / 15.5, 8);
    expect(analytics.body.data.lastKnownCfcrDate).toEqual(expect.any(String));
    expect(analytics.body.data.fcrData).toMatchObject({ cfcrTargetWeightKg: 2.2, cfcrCorrectionFactorPerKg: 0.3 });
    expect(fcrHistory.body.data.at(-1)).toMatchObject({ cfcrTargetWeightKg: 2.2, cfcrCorrectionFactorPerKg: 0.3 });
    // History is saved with 6 decimals.
    expect(fcrHistory.body.data.at(-1).cfcr).toBeCloseTo(20 / 15.5 + 0.06, 5);
  });

  it("hides cFCR everywhere when the feature is turned off", async () => {
    expect((await api.put("/account-features/FARMER_CFCR", { enabled: false })).status).toBe(200);
    const [analytics, fcrHistory, performance, flock] = await Promise.all([
      api.get(`/batches/${batchId}/analytics`),
      api.get(`/batches/${batchId}/fcr-history`),
      api.get("/dashboard/batch-performance"),
      api.get("/analytics/farmer/flock-comparison"),
    ]);
    expect(analytics.body.data.cfcr).toBeNull();
    expect(analytics.body.data.lastKnownCfcr).toBeNull();
    expect(analytics.body.data.fcrData.cfcr).toBeNull();
    expect(analytics.body.data.fcr).toBeCloseTo(20 / 15.5, 8);
    expect(fcrHistory.body.data.every((row: { cfcr: number | null }) => row.cfcr === null)).toBe(true);
    const row = performance.body.data.find((item: { id: string }) => item.id === batchId);
    expect(row.cfcr).toBe("N/A");
    expect(flock.status).toBe(200);
    expect(flock.body.data.cfcrStandard).toBeNull();
    expect(flock.body.data.batches.every((item: { cfcr: number | null }) => item.cfcr === null)).toBe(true);

    expect((await api.put("/account-features/FARMER_CFCR", { enabled: true })).status).toBe(200);
    const flockOn = await api.get("/analytics/farmer/flock-comparison");
    expect(flockOn.body.data.cfcrStandard).toMatchObject({ targetWeightKg: 2.2, correctionFactorPerKg: 0.3 });
    // cFCR is for finished batches: this batch still has live birds, so no cFCR in Analytics.
    const thisBatch = flockOn.body.data.batches.find((item: { id: string }) => item.id === batchId);
    expect(thisBatch.cfcr).toBeNull();
    expect(thisBatch.fcr).toBeCloseTo(20 / 15.5, 2);
  });
});
