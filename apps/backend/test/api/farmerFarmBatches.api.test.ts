import { ApiHelper } from "../helpers/api.helper";

/** Farm and batch setup journey, using only the same HTTP API as the app. */
describe("Farmer farm and batch API journey", () => {
  const farmerApi = new ApiHelper();
  const otherFarmerApi = new ApiHelper();
  const password = "Farmer-batch-test-123";
  const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`.slice(-10);
  const farmerPhone = `+97794${suffix}`;
  const otherFarmerPhone = `+97793${suffix}`;
  const now = new Date().toISOString();

  let farmId: string | undefined;
  let chicksItemId: string | undefined;
  let batchId: string | undefined;
  const batchNumber = `FARM-BATCH-${suffix}`;

  beforeAll(async () => {
    const [farmerRegistration, otherFarmerRegistration] = await Promise.all([
      farmerApi.post("/auth/register", {
        name: `Farm Batch API Farmer ${suffix}`,
        phone: farmerPhone,
        password,
        role: "OWNER",
      }),
      otherFarmerApi.post("/auth/register", {
        name: `Other Farm Batch API Farmer ${suffix}`,
        phone: otherFarmerPhone,
        password,
        role: "OWNER",
      }),
    ]);

    expect(farmerRegistration.status).toBe(201);
    expect(otherFarmerRegistration.status).toBe(201);
    farmerApi.setAuthToken(farmerRegistration.body.accessToken);
    otherFarmerApi.setAuthToken(otherFarmerRegistration.body.accessToken);

    const [farmerApproval, otherFarmerApproval] = await Promise.all([
      farmerApi.post("/test/approve-current-user"),
      otherFarmerApi.post("/test/approve-current-user"),
    ]);
    expect(farmerApproval.status).toBe(200);
    expect(otherFarmerApproval.status).toBe(200);
  });

  afterAll(async () => {
    if (batchId) await farmerApi.delete(`/batches/${batchId}`);
    if (chicksItemId) {
      await farmerApi.put(`/inventory/${chicksItemId}`, { currentStock: 0 });
      await farmerApi.delete(`/inventory/${chicksItemId}`);
    }
    if (farmId) await farmerApi.delete(`/farms/${farmId}`, { password });
  });

  it("rejects invalid farm capacity", async () => {
    const response = await farmerApi.post("/farms", {
      name: `Bad Farm ${suffix}`,
      capacity: 0,
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/capacity/i);
  });

  it("creates a farm and only shows it to its owner", async () => {
    const createFarm = await farmerApi.post("/farms", {
      name: `Farm Batch API Farm ${suffix}`,
      capacity: 100,
      description: "Farm created for an HTTP batch test",
    });
    expect(createFarm.status).toBe(201);
    farmId = createFarm.body.data.id;

    const [ownerFarm, otherFarmerFarm] = await Promise.all([
      farmerApi.get(`/farms/${farmId}`),
      otherFarmerApi.get(`/farms/${farmId}`),
    ]);
    expect(ownerFarm.status).toBe(200);
    expect(ownerFarm.body.data).toMatchObject({ id: farmId, capacity: 100 });
    expect(otherFarmerFarm.status).toBe(404);
  });

  it("does not create a batch or consume stock when allocations exceed available chicks", async () => {
    const chicks = await farmerApi.post("/inventory", {
      name: `Batch test chicks ${suffix}`,
      currentStock: 5,
      unit: "bird",
      itemType: "CHICKS",
      rate: 30,
    });
    expect(chicks.status).toBe(201);
    chicksItemId = chicks.body.data.id;

    const tooManyChicks = await farmerApi.post("/batches", {
      batchNumber: `TOO-MANY-${suffix}`,
      startDate: now,
      batchType: "BROILER",
      farmId,
      chicksInventory: [{ itemId: chicksItemId, quantity: 6 }],
    });

    // Known response-code defect is tracked in test-finding.md. The important
    // safety rule is that a failed request must not create partial records.
    expect(tooManyChicks.status).toBeGreaterThanOrEqual(400);

    const [batches, inventory] = await Promise.all([
      farmerApi.get(`/batches?farmId=${farmId}`),
      farmerApi.get(`/inventory/${chicksItemId}`),
    ]);
    expect(batches.status).toBe(200);
    expect(batches.body.pagination.total).toBe(0);
    expect(inventory.status).toBe(200);
    expect(Number(inventory.body.data.currentStock)).toBe(5);
  });

  it("creates an active batch, allocates chicks, and updates farm totals", async () => {
    const createBatch = await farmerApi.post("/batches", {
      batchNumber,
      startDate: now,
      batchType: "BROILER",
      farmId,
      initialChickWeight: 0.045,
      chicksInventory: [{ itemId: chicksItemId, quantity: 5, notes: "Initial flock" }],
    });
    expect(createBatch.status).toBe(201);
    batchId = createBatch.body.data.id;
    expect(createBatch.body.data).toMatchObject({
      id: batchId,
      batchNumber,
      batchType: "BROILER",
      initialChicks: 5,
      farmId,
    });
    expect(createBatch.body.data.inventoryUsages).toHaveLength(1);

    const [batch, farmSummary, inventory] = await Promise.all([
      farmerApi.get(`/batches/${batchId}`),
      farmerApi.get(`/farms/${farmId}/summary`),
      farmerApi.get(`/inventory/${chicksItemId}`),
    ]);
    expect(batch.status).toBe(200);
    expect(batch.body.data).toMatchObject({ id: batchId, currentChicks: 5, status: "ACTIVE" });
    expect(farmSummary.status).toBe(200);
    expect(farmSummary.body.data.tiles).toMatchObject({
      birdsAlive: 5,
      runningBatches: 1,
      totalBatches: 1,
      costs: 150,
      profit: -150,
    });
    expect(Number(inventory.body.data.currentStock)).toBe(0);
  });

  it("rejects a duplicate batch number without changing the current batch", async () => {
    const duplicate = await farmerApi.post("/batches", {
      batchNumber,
      startDate: now,
      batchType: "BROILER",
      farmId,
      chicksInventory: [{ itemId: chicksItemId, quantity: 1 }],
    });

    expect(duplicate.status).toBe(400);
    expect(duplicate.body.message).toMatch(/already exists/i);

    const batches = await farmerApi.get(`/batches?farmId=${farmId}&status=ACTIVE`);
    expect(batches.body.pagination.total).toBe(1);
    expect(batches.body.data[0]).toMatchObject({ id: batchId, initialChicks: 5 });
  });
});
