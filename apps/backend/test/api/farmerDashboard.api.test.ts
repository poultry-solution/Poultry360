import { ApiHelper } from "../helpers/api.helper";

/**
 * Farmer home API journey.
 *
 * This suite deliberately uses HTTP requests only. It does not seed, inspect,
 * or clean data through Prisma: the data is made the same way a farmer makes it
 * in the product.
 */
describe("Farmer dashboard API journey", () => {
  const farmerApi = new ApiHelper();
  const otherFarmerApi = new ApiHelper();
  const password = "Farmer-dashboard-test-123";
  const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`.slice(-10);
  const farmerPhone = `+97798${suffix}`;
  const otherFarmerPhone = `+97797${suffix}`;

  let farmId: string | undefined;
  let chicksItemId: string | undefined;
  let batchId: string | undefined;

  beforeAll(async () => {
    const [farmerRegistration, otherFarmerRegistration] = await Promise.all([
      farmerApi.post("/auth/register", {
        name: `Dashboard API Farmer ${suffix}`,
        phone: farmerPhone,
        password,
        role: "OWNER",
        calendarType: "AD",
      }),
      otherFarmerApi.post("/auth/register", {
        name: `Other Dashboard API Farmer ${suffix}`,
        phone: otherFarmerPhone,
        password,
        role: "OWNER",
        calendarType: "AD",
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
    // Reverse the journey through the API. A test user remains because there is
    // no self-service account deletion endpoint, but no farm data is retained.
    if (batchId) await farmerApi.delete(`/batches/${batchId}`);
    if (chicksItemId) {
      await farmerApi.put(`/inventory/${chicksItemId}`, { currentStock: 0 });
      await farmerApi.delete(`/inventory/${chicksItemId}`);
    }
    if (farmId) await farmerApi.delete(`/farms/${farmId}`, { password });
  });

  it("rejects an anonymous dashboard request", async () => {
    const anonymousApi = new ApiHelper();
    const response = await anonymousApi.get("/dashboard/overview");

    expect(response.status).toBe(401);
  });

  it("shows an empty dashboard for a new farmer and clamps bad paging input", async () => {
    const [overview, farms, moneyToReceive] = await Promise.all([
      farmerApi.get("/dashboard/overview"),
      farmerApi.get("/farms/my-farms"),
      farmerApi.get("/dashboard/money-to-receive?page=-5&limit=9999"),
    ]);

    expect(overview.status).toBe(200);
    expect(overview.body.data).toMatchObject({
      totalFarms: 0,
      activeBatches: 0,
      completedBatches: 0,
      lifetimeProfit: 0,
      monthlyRevenue: 0,
      moneyToReceive: 0,
      customersOwingCount: 0,
      totalExpenses: 0,
    });
    expect(farms.status).toBe(200);
    expect(farms.body.data).toEqual([]);
    expect(moneyToReceive.status).toBe(200);
    expect(moneyToReceive.body.data).toMatchObject({
      totalAmount: 0,
      totalCustomers: 0,
      customers: [],
      pagination: { page: 1, limit: 100, total: 0, totalPages: 0 },
    });
  });

  it("validates farm input before creating the first farm", async () => {
    const response = await farmerApi.post("/farms", { name: "", capacity: 0 });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it("updates the dashboard after the farmer creates a farm and active batch", async () => {
    const farm = await farmerApi.post("/farms", {
      name: `Dashboard API Farm ${suffix}`,
      capacity: 100,
      description: "Created by the dashboard API test",
    });
    expect(farm.status).toBe(201);
    farmId = farm.body.data.id;

    const chicks = await farmerApi.post("/inventory", {
      name: `Dashboard API Chicks ${suffix}`,
      currentStock: 10,
      unit: "bird",
      itemType: "CHICKS",
      rate: 25,
    });
    expect(chicks.status).toBe(201);
    chicksItemId = chicks.body.data.id;

    const batch = await farmerApi.post("/batches", {
      batchNumber: `DASH-${suffix}`,
      startDate: new Date().toISOString(),
      batchType: "BROILER",
      farmId,
      chicksInventory: [{ itemId: chicksItemId, quantity: 10 }],
    });
    expect(batch.status).toBe(201);
    batchId = batch.body.data.id;

    const [overview, activeBatches, farmList] = await Promise.all([
      farmerApi.get("/dashboard/overview"),
      farmerApi.get("/batches?status=ACTIVE&limit=100"),
      farmerApi.get("/farms/my-farms?page=1&limit=10"),
    ]);

    expect(overview.status).toBe(200);
    expect(overview.body.data).toMatchObject({
      totalFarms: 1,
      activeBatches: 1,
      completedBatches: 0,
      lifetimeProfit: -250,
      totalExpenses: 250,
    });
    expect(activeBatches.status).toBe(200);
    expect(activeBatches.body.pagination.total).toBe(1);
    expect(activeBatches.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: batchId, farmId, status: "ACTIVE", currentChicks: 10 }),
      ])
    );
    expect(farmList.status).toBe(200);
    expect(farmList.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: farmId, birdsAlive: 10, running: 1, total: 1 }),
      ])
    );
  });

  it("does not let another farmer read this farm or its batches", async () => {
    const [farm, batches] = await Promise.all([
      otherFarmerApi.get(`/farms/${farmId}`),
      otherFarmerApi.get(`/batches?farmId=${farmId}`),
    ]);

    expect(farm.status).toBe(404);
    expect(batches.status).toBe(404);
  });
});
