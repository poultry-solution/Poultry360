import { ApiHelper } from "../helpers/api.helper";

describe("Farmer activity history API journey", () => {
  const ownerApi = new ApiHelper();
  const staffApi = new ApiHelper();
  const otherApi = new ApiHelper();
  const password = "Farmer-activity-owner-123";
  const staffPassword = "Farmer-activity-staff-123";
  const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`.slice(-10);
  const ownerPhone = `+97791${suffix}`;
  const staffPhone = `+977${suffix}`;
  const otherPhone = `+97792${suffix}`;
  const day = new Date().toISOString().slice(0, 10);
  let staffLoginId: string | undefined;
  let ownerItemId: string | undefined;
  let staffItemId: string | undefined;

  async function waitForLog(match: (rows: any[]) => boolean) {
    let last: any;
    for (let attempt = 0; attempt < 15; attempt += 1) {
      last = await ownerApi.get("/business-activity?archived=all&limit=100");
      if (last.status === 200 && match(last.body.data)) return last;
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
    return last;
  }

  beforeAll(async () => {
    const [ownerRegistration, otherRegistration] = await Promise.all([
      ownerApi.post("/auth/register", { name: `Activity Owner ${suffix}`, phone: ownerPhone, password, role: "OWNER" }),
      otherApi.post("/auth/register", { name: `Other Activity Owner ${suffix}`, phone: otherPhone, password, role: "OWNER" }),
    ]);
    expect(ownerRegistration.status).toBe(201);
    expect(otherRegistration.status).toBe(201);
    ownerApi.setAuthToken(ownerRegistration.body.accessToken);
    otherApi.setAuthToken(otherRegistration.body.accessToken);
    expect((await ownerApi.post("/test/approve-current-user")).status).toBe(200);
    expect((await otherApi.post("/test/approve-current-user")).status).toBe(200);
  });

  afterAll(async () => {
    for (const itemId of [ownerItemId, staffItemId]) {
      if (itemId) {
        await ownerApi.put(`/inventory/${itemId}`, { currentStock: 0 });
        await ownerApi.delete(`/inventory/${itemId}`);
      }
    }
    if (staffLoginId) await ownerApi.patch(`/staff-auth/users/${staffLoginId}`, { isActive: false });
  });

  it("shows owner and staff actions only to the account owner, with useful filters and export", async () => {
    const ownerItem = await ownerApi.post("/inventory", {
      name: `Owner activity item ${suffix}`, currentStock: 1, unit: "KG", itemType: "FEED", rate: 10,
    });
    expect(ownerItem.status).toBe(201);
    ownerItemId = ownerItem.body.data.id;

    const staffLogin = await ownerApi.post("/staff-auth/users", {
      name: `Activity staff ${suffix}`,
      phone: staffPhone,
      password: staffPassword,
      permissions: ["FARMER_MANAGE_OPERATIONS", "FARMER_VIEW_ANALYTICS"],
    });
    expect(staffLogin.status).toBe(201);
    staffLoginId = staffLogin.body.data.id;
    const login = await staffApi.post("/staff-auth/login", { phone: staffPhone, password: staffPassword });
    expect(login.status).toBe(200);
    staffApi.setAuthToken(login.body.accessToken);

    const staffItem = await staffApi.post("/inventory", {
      name: `Staff activity item ${suffix}`, currentStock: 1, unit: "KG", itemType: "FEED", rate: 10,
    });
    expect(staffItem.status).toBe(201);
    staffItemId = staffItem.body.data.id;

    // Updates carry the record ID in the route, so the activity entry can be
    // tied to the exact owner or staff record without reading the database.
    expect((await ownerApi.put(`/inventory/${ownerItemId}`, { currentStock: 2 })).status).toBe(200);
    expect((await staffApi.put(`/inventory/${staffItemId}`, { currentStock: 2 })).status).toBe(200);

    const allLogs = await waitForLog((rows) =>
      rows.some((row) => row.targetId === ownerItemId && row.actorType === "USER") &&
      rows.some((row) => row.targetId === staffItemId && row.actorType === "STAFF")
    );
    expect(allLogs.status).toBe(200);
    expect(allLogs.body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ targetId: ownerItemId, actorType: "USER" }),
      expect.objectContaining({ targetId: staffItemId, actorType: "STAFF" }),
    ]));

    const [staffOnly, actionSearch, dated, paged, exported] = await Promise.all([
      ownerApi.get("/business-activity?archived=all&actorType=STAFF&limit=100"),
      ownerApi.get("/business-activity?archived=all&action=inventory&limit=100"),
      ownerApi.get(`/business-activity?archived=all&startDate=${day}&limit=100`),
      ownerApi.get("/business-activity?archived=all&page=1&limit=1"),
      ownerApi.get("/business-activity/export?archived=all"),
    ]);
    expect(staffOnly.status).toBe(200);
    expect(staffOnly.body.data).toEqual(expect.arrayContaining([expect.objectContaining({ targetId: staffItemId, actorType: "STAFF" })]));
    expect(staffOnly.body.data.every((row: { actorType: string }) => row.actorType === "STAFF")).toBe(true);
    expect(actionSearch.body.data).toEqual(expect.arrayContaining([expect.objectContaining({ targetId: ownerItemId })]));
    expect(dated.body.data).toEqual(expect.arrayContaining([expect.objectContaining({ targetId: ownerItemId })]));
    expect(paged.body.pagination).toMatchObject({ page: 1, limit: 1 });
    expect(paged.body.data).toHaveLength(1);
    expect(exported.status).toBe(200);
    expect(exported.body.data).toEqual(expect.arrayContaining([expect.objectContaining({ targetId: staffItemId })]));

    const [staffRead, staffExport, otherOwnerRead] = await Promise.all([
      staffApi.get("/business-activity?archived=all"),
      staffApi.get("/business-activity/export?archived=all"),
      otherApi.get("/business-activity?archived=all"),
    ]);
    expect(staffRead.status).toBe(403);
    expect(staffRead.body.message).toContain("cannot view");
    expect(staffExport.status).toBe(403);
    expect(staffExport.body.message).toContain("cannot export");
    expect(otherOwnerRead.status).toBe(200);
    expect(otherOwnerRead.body.data).toHaveLength(0);
  });
});
