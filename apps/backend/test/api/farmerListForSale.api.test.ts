import { ApiHelper } from "../helpers/api.helper";

describe("Farmer list-for-sale API journey", () => {
  const api = new ApiHelper();
  const otherApi = new ApiHelper();
  const password = "Farmer-listing-test-123";
  const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`.slice(-10);
  const phone = `+97781${suffix}`;
  const otherPhone = `+97782${suffix}`;
  const from = new Date().toISOString();
  const to = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  let chickenId: string | undefined;
  let eggId: string | undefined;

  const featureKey = "FARMER_LIST_FOR_SALE";

  beforeAll(async () => {
    const [registration, otherRegistration] = await Promise.all([
      api.post("/auth/register", { name: `Listing Farmer ${suffix}`, phone, password, role: "OWNER" }),
      otherApi.post("/auth/register", { name: `Other Listing Farmer ${suffix}`, phone: otherPhone, password, role: "OWNER" }),
    ]);
    expect(registration.status).toBe(201);
    expect(otherRegistration.status).toBe(201);
    api.setAuthToken(registration.body.accessToken);
    otherApi.setAuthToken(otherRegistration.body.accessToken);
    expect((await api.post("/test/approve-current-user")).status).toBe(200);
    expect((await otherApi.post("/test/approve-current-user")).status).toBe(200);
  });

  afterAll(async () => {
    for (const id of [chickenId, eggId]) if (id) await api.delete(`/farmer/list-for-sale/${id}`);
    await api.put(`/account-features/${featureKey}`, { enabled: false });
    await otherApi.put(`/account-features/${featureKey}`, { enabled: false });
  });

  it("uses the owner-controlled feature gate and validates listing data", async () => {
    const disabled = await api.get("/farmer/list-for-sale");
    expect(disabled.status).toBe(403);
    expect(disabled.body.code).toBe("FEATURE_DISABLED");

    const enable = await api.put(`/account-features/${featureKey}`, { enabled: true });
    expect(enable.status).toBe(200);
    expect(enable.body.data).toMatchObject({ key: featureKey, enabled: true });

    const badChicken = await api.post("/farmer/list-for-sale", {
      category: "CHICKEN", phone: "9800000000", quantity: 10, unit: "bird",
      availabilityFrom: from, availabilityTo: to,
    });
    expect(badChicken.status).toBe(400);
    expect(badChicken.body.message).toContain("average weight");

    const backwardsDates = await api.post("/farmer/list-for-sale", {
      category: "LAYERS", phone: "9800000000", quantity: 10, unit: "bird",
      availabilityFrom: to, availabilityTo: from,
    });
    expect(backwardsDates.status).toBe(400);
  });

  it("publishes, filters, edits, archives, restores, and deletes own listings", async () => {
    const chicken = await api.post("/farmer/list-for-sale", {
      category: "CHICKEN",
      phone: "9800000000",
      rate: 500,
      quantity: 10,
      unit: "bird",
      avgWeightKg: 2.1,
      availabilityFrom: from,
      availabilityTo: to,
      province: "Bagmati",
      address: "Kathmandu, Bagmati Province",
      latitude: 27.7172,
      longitude: 85.324,
    });
    expect(chicken.status).toBe(201);
    chickenId = chicken.body.data.id;
    expect(chicken.body.data).toMatchObject({ category: "CHICKEN", status: "ACTIVE", province: "Bagmati Province" });
    expect(Number(chicken.body.data.quantity)).toBe(10);

    const eggs = await api.post("/farmer/list-for-sale", {
      category: "EGGS",
      phone: "9800000000",
      quantity: 30,
      unit: "pieces",
      availabilityFrom: from,
      availabilityTo: to,
      province: "Bagmati Province",
      eggVariants: [{ size: "Large", quantity: 30, rate: 20 }],
    });
    expect(eggs.status).toBe(201);
    eggId = eggs.body.data.id;

    const [ownActive, publicChicken, publicEggs, publicProvince] = await Promise.all([
      api.get("/farmer/list-for-sale?status=ACTIVE"),
      new ApiHelper().get("/public/list-for-sale?category=CHICKEN"),
      new ApiHelper().get("/public/list-for-sale?category=EGGS"),
      new ApiHelper().get("/public/list-for-sale?province=Bagmati"),
    ]);
    expect(ownActive.body.data).toEqual(expect.arrayContaining([expect.objectContaining({ id: chickenId }), expect.objectContaining({ id: eggId })]));
    expect(publicChicken.body.data).toEqual(expect.arrayContaining([expect.objectContaining({ id: chickenId, category: "CHICKEN" })]));
    expect(publicEggs.body.data).toEqual(expect.arrayContaining([expect.objectContaining({ id: eggId, category: "EGGS" })]));
    expect(publicProvince.body.data).toEqual(expect.arrayContaining([expect.objectContaining({ id: chickenId })]));

    const update = await api.put(`/farmer/list-for-sale/${chickenId}`, { quantity: 8, rate: 550 });
    expect(update.status).toBe(200);
    expect(Number(update.body.data.quantity)).toBe(8);
    expect(Number(update.body.data.rate)).toBe(550);

    expect((await otherApi.put(`/account-features/${featureKey}`, { enabled: true })).status).toBe(200);
    const [foreignRead, foreignChange, foreignDelete] = await Promise.all([
      otherApi.get(`/farmer/list-for-sale/${chickenId}`),
      otherApi.patch(`/farmer/list-for-sale/${chickenId}/archive`),
      otherApi.delete(`/farmer/list-for-sale/${chickenId}`),
    ]);
    expect(foreignRead.status).toBe(404);
    expect(foreignChange.status).toBe(404);
    expect(foreignDelete.status).toBe(404);

    const archive = await api.patch(`/farmer/list-for-sale/${chickenId}/archive`);
    expect(archive.status).toBe(200);
    expect(archive.body.data.status).toBe("ARCHIVED");
    const publicAfterArchive = await new ApiHelper().get("/public/list-for-sale?category=CHICKEN");
    expect(publicAfterArchive.body.data.some((listing: { id: string }) => listing.id === chickenId)).toBe(false);
    expect((await api.get("/farmer/list-for-sale?status=ARCHIVED")).body.data).toEqual(expect.arrayContaining([expect.objectContaining({ id: chickenId })]));

    expect((await api.patch(`/farmer/list-for-sale/${chickenId}/unarchive`)).body.data.status).toBe("ACTIVE");
    expect((await api.delete(`/farmer/list-for-sale/${chickenId}`)).status).toBe(200);
    chickenId = undefined;
    expect((await api.delete(`/farmer/list-for-sale/${eggId}`)).status).toBe(200);
    eggId = undefined;
  });
});
