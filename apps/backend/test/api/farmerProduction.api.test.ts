import { ApiHelper } from "../helpers/api.helper";

describe("Farmer self-feed production API journey", () => {
  const api = new ApiHelper();
  const otherApi = new ApiHelper();
  const password = "Farmer-production-test-123";
  const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`.slice(-10);
  const featureKey = "SELF_FEED_PRODUCTION";
  let maizeId: string | undefined;
  let soyId: string | undefined;
  let productId: string | undefined;
  let runId: string | undefined;

  const enableFeature = (client: ApiHelper) =>
    client.put(`/test/current-user/features/${featureKey}`, { enabled: true });

  beforeAll(async () => {
    const [registration, otherRegistration] = await Promise.all([
      api.post("/auth/register", {
        name: `Production Farmer ${suffix}`,
        phone: `+97784${suffix}`,
        password,
        role: "OWNER",
      }),
      otherApi.post("/auth/register", {
        name: `Other Production Farmer ${suffix}`,
        phone: `+97785${suffix}`,
        password,
        role: "OWNER",
      }),
    ]);
    expect(registration.status).toBe(201);
    expect(otherRegistration.status).toBe(201);
    api.setAuthToken(registration.body.accessToken);
    otherApi.setAuthToken(otherRegistration.body.accessToken);
    expect((await api.post("/test/approve-current-user")).status).toBe(200);
    expect((await otherApi.post("/test/approve-current-user")).status).toBe(200);
  });

  afterAll(async () => {
    if (runId) await api.delete(`/farmer/production/${runId}`);
    if (productId) await api.delete(`/farmer/products/${productId}`);
    for (const itemId of [maizeId, soyId]) {
      if (itemId) {
        await api.put(`/inventory/${itemId}`, { currentStock: 0 });
        await api.delete(`/inventory/${itemId}`);
      }
    }
    await api.put(`/test/current-user/features/${featureKey}`, { enabled: false });
    await otherApi.put(`/test/current-user/features/${featureKey}`, { enabled: false });
  });

  it("enforces the admin-managed feature switch and product validation", async () => {
    const disabled = await api.get("/farmer/products");
    expect(disabled.status).toBe(403);
    expect(disabled.body.code).toBe("ACCOUNT_FEATURE_DISABLED");

    const enabled = await enableFeature(api);
    expect(enabled.status).toBe(200);
    expect(enabled.body.data).toMatchObject({ key: featureKey, enabled: true });

    const invalidProduct = await api.post("/farmer/products", {
      name: `Invalid product ${suffix}`,
      unit: "KG",
      outputItemType: "BIRD",
    });
    expect(invalidProduct.status).toBe(400);

    const created = await api.post("/farmer/products", {
      name: `Test mash ${suffix}`,
      unit: "KG",
      outputItemType: "FEED",
      minStock: 2,
    });
    expect(created.status).toBe(201);
    productId = created.body.data.id;
    expect(Number(created.body.data.currentStock)).toBe(0);

    const duplicate = await api.post("/farmer/products", {
      name: `Test mash ${suffix}`,
      unit: "KG",
      outputItemType: "FEED",
    });
    expect(duplicate.status).toBe(409);
  });

  it("turns raw materials into stock with the right cost and safely reverses the run", async () => {
    const maize = await api.post("/inventory", {
      name: `Production maize ${suffix}`, currentStock: 10, unit: "KG",
      itemType: "RAW_MATERIAL", rate: 20,
    });
    const soy = await api.post("/inventory", {
      name: `Production soy ${suffix}`, currentStock: 5, unit: "KG",
      itemType: "RAW_MATERIAL", rate: 30,
    });
    expect(maize.status).toBe(201);
    expect(soy.status).toBe(201);
    maizeId = maize.body.data.id;
    soyId = soy.body.data.id;

    const badAllocation = await api.post("/farmer/production", {
      date: new Date().toISOString(),
      inputs: [{ inventoryItemId: maizeId, quantity: 1 }],
      outputs: [{ productId, quantity: 1, costAllocationPercent: 90 }],
    });
    expect(badAllocation.status).toBe(400);
    expect((await api.get(`/inventory/${maizeId}`)).body.data.currentStock).toBe("10");

    const insufficient = await api.post("/farmer/production", {
      date: new Date().toISOString(),
      inputs: [{ inventoryItemId: maizeId, quantity: 11 }],
      outputs: [{ productId, quantity: 11, costAllocationPercent: 100 }],
    });
    expect(insufficient.status).toBe(409);
    expect((await api.get(`/inventory/${maizeId}`)).body.data.currentStock).toBe("10");

    const production = await api.post("/farmer/production", {
      date: new Date().toISOString(),
      referenceNumber: `RUN-${suffix}`,
      notes: "API production test",
      inputs: [
        { inventoryItemId: maizeId, quantity: 4 },
        { inventoryItemId: soyId, quantity: 2 },
      ],
      outputs: [{ productId, quantity: 7, costAllocationPercent: 100 }],
    });
    expect(production.status).toBe(201);
    runId = production.body.data.id;
    expect(production.body.data.outputs).toEqual(expect.arrayContaining([
      expect.objectContaining({ productId, quantity: "7", amount: "140", unitCost: "20" }),
    ]));

    const [run, matchingRuns, products, maizeAfter, soyAfter] = await Promise.all([
      api.get(`/farmer/production/${runId}`),
      api.get(`/farmer/production?search=RUN-${suffix}`),
      api.get("/farmer/products"),
      api.get(`/inventory/${maizeId}`),
      api.get(`/inventory/${soyId}`),
    ]);
    expect(run.status).toBe(200);
    expect(matchingRuns.body.data).toEqual(expect.arrayContaining([expect.objectContaining({ id: runId })]));
    expect(products.body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: productId, currentStock: "7", unitCost: 20, lotCount: 1 }),
    ]));
    expect(maizeAfter.body.data.currentStock).toBe("6");
    expect(soyAfter.body.data.currentStock).toBe("3");

    const archiveWithStock = await api.delete(`/farmer/products/${productId}`);
    expect(archiveWithStock.status).toBe(409);

    expect((await enableFeature(otherApi)).status).toBe(200);
    expect((await otherApi.get(`/farmer/production/${runId}`)).status).toBe(404);
    expect((await otherApi.delete(`/farmer/production/${runId}`)).status).toBe(404);

    const reversed = await api.delete(`/farmer/production/${runId}`);
    expect(reversed.status).toBe(200);
    runId = undefined;
    expect((await api.get(`/farmer/production/${production.body.data.id}`)).status).toBe(404);
    expect((await api.get(`/inventory/${maizeId}`)).body.data.currentStock).toBe("10");
    expect((await api.get(`/inventory/${soyId}`)).body.data.currentStock).toBe("5");

    expect((await api.delete(`/farmer/products/${productId}`)).status).toBe(200);
    productId = undefined;
  });
});
