import { ApiHelper } from "../helpers/api.helper";

describe("Farmer settings API journey", () => {
  const ownerApi = new ApiHelper();
  const staffApi = new ApiHelper();
  const password = "Farmer-settings-owner-123";
  const staffPassword = "Farmer-settings-staff-123";
  const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`.slice(-10);
  const ownerPhone = `+97783${suffix}`;
  const staffPhone = `+977${suffix}`;
  let staffLoginId: string | undefined;

  beforeAll(async () => {
    const registration = await ownerApi.post("/auth/register", {
      name: `Settings Owner ${suffix}`, phone: ownerPhone, password, role: "OWNER",
    });
    expect(registration.status).toBe(201);
    ownerApi.setAuthToken(registration.body.accessToken);
    expect((await ownerApi.post("/test/approve-current-user")).status).toBe(200);
  });

  afterAll(async () => {
    for (const key of ["FARMER_PURCHASE_BILL_UPLOAD", "FARMER_CFCR", "FARMER_LIST_FOR_SALE"]) {
      await ownerApi.put(`/account-features/${key}`, { enabled: false });
    }
    await ownerApi.patch("/users/preferences", { language: "ENGLISH", calendarType: "AD" });
    if (staffLoginId) await ownerApi.patch(`/staff-auth/users/${staffLoginId}`, { isActive: false });
  });

  it("updates only valid owner preferences and self-configurable features", async () => {
    const initialFeatures = await ownerApi.get("/account-features");
    expect(initialFeatures.status).toBe(200);
    expect(initialFeatures.body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "FARMER_PURCHASE_BILL_UPLOAD", enabled: false }),
      expect.objectContaining({ key: "FARMER_CFCR", enabled: false }),
      expect.objectContaining({ key: "FARMER_LIST_FOR_SALE", enabled: false }),
    ]));

    const [badLanguage, badCalendar, emptyPreferences] = await Promise.all([
      ownerApi.patch("/users/preferences", { language: "HINDI" }),
      ownerApi.patch("/users/preferences", { calendarType: "LUNAR" }),
      ownerApi.patch("/users/preferences", {}),
    ]);
    expect(badLanguage.status).toBe(400);
    expect(badCalendar.status).toBe(400);
    expect(emptyPreferences.status).toBe(400);

    const preferences = await ownerApi.patch("/users/preferences", { language: "NEPALI", calendarType: "BS" });
    expect(preferences.status).toBe(200);
    expect(preferences.body.data).toMatchObject({ language: "NEPALI", calendarType: "BS" });
    expect((await ownerApi.get("/users/me")).body.data).toMatchObject({ language: "NEPALI", calendarType: "BS" });

    const [enableBill, enableCfcr, invalidFeature] = await Promise.all([
      ownerApi.put("/account-features/FARMER_PURCHASE_BILL_UPLOAD", { enabled: true }),
      ownerApi.put("/account-features/FARMER_CFCR", { enabled: true }),
      ownerApi.put("/account-features/FARMER_STAFF_OPERATIONS", { enabled: false }),
    ]);
    expect(enableBill.status).toBe(200);
    expect(enableCfcr.status).toBe(200);
    expect(invalidFeature.status).toBe(403);
  });

  it("blocks staff from changing owner account settings", async () => {
    const staff = await ownerApi.post("/staff-auth/users", {
      name: `Settings staff ${suffix}`,
      phone: staffPhone,
      password: staffPassword,
      permissions: ["FARMER_MANAGE_OPERATIONS"],
    });
    expect(staff.status).toBe(201);
    staffLoginId = staff.body.data.id;
    const login = await staffApi.post("/staff-auth/login", { phone: staffPhone, password: staffPassword });
    expect(login.status).toBe(200);
    staffApi.setAuthToken(login.body.accessToken);

    const preferenceDenied = await staffApi.patch("/users/preferences", { language: "ENGLISH" });
    expect(preferenceDenied.status).toBe(403);
    expect(preferenceDenied.body.code).toBe("OWNER_ONLY");

    const staffFeatureChange = await staffApi.put("/account-features/FARMER_LIST_FOR_SALE", { enabled: true });
    expect(staffFeatureChange.status).toBe(403);
    expect(staffFeatureChange.body.code).toBe("OWNER_ONLY");
    const featuresAfterStaffChange = await ownerApi.get("/account-features");
    expect(featuresAfterStaffChange.body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "FARMER_LIST_FOR_SALE", enabled: false }),
    ]));
  });
});
