import { ApiHelper } from "../helpers/api.helper";

describe("Farmer staff management and access API journey", () => {
  const ownerApi = new ApiHelper();
  const staffApi = new ApiHelper();
  const password = "Farmer-staff-owner-123";
  const staffPassword = "Farmer-staff-login-123";
  const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`.slice(-10);
  const ownerPhone = `+97790${suffix}`;
  const staffPhone = `+977${suffix}`;
  const today = new Date().toISOString();
  let staffLoginId: string | undefined;
  let payrollStaffId: string | undefined;
  let inventoryItemId: string | undefined;

  beforeAll(async () => {
    const registration = await ownerApi.post("/auth/register", {
      name: `Staff Access Owner ${suffix}`,
      phone: ownerPhone,
      password,
      role: "OWNER",
    });
    expect(registration.status).toBe(201);
    ownerApi.setAuthToken(registration.body.accessToken);
    expect((await ownerApi.post("/test/approve-current-user")).status).toBe(200);
  });

  afterAll(async () => {
    if (inventoryItemId) {
      await ownerApi.put(`/inventory/${inventoryItemId}`, { currentStock: 0 });
      await ownerApi.delete(`/inventory/${inventoryItemId}`);
    }
    if (payrollStaffId) {
      await ownerApi.patch(`/farmer/staff/${payrollStaffId}/stop`, { endDate: today });
      await ownerApi.delete(`/farmer/staff/${payrollStaffId}`);
    }
    // There is no delete route for staff login accounts. Disable this isolated
    // test login so it cannot be used after the test run.
    if (staffLoginId) await ownerApi.patch(`/staff-auth/users/${staffLoginId}`, { isActive: false });
  });

  it("lets the owner manage payroll staff and blocks invalid staff dates", async () => {
    const invalid = await ownerApi.post("/farmer/staff", {
      name: "Invalid payroll staff",
      payType: "YEARLY",
      startDate: today,
      rate: 100,
    });
    expect(invalid.status).toBe(400);

    const created = await ownerApi.post("/farmer/staff", {
      name: `Daily worker ${suffix}`,
      payType: "DAILY",
      startDate: today,
      rate: 100,
    });
    expect(created.status).toBe(201);
    payrollStaffId = created.body.data.id;
    expect(created.body.data).toMatchObject({ name: `Daily worker ${suffix}`, payType: "DAILY", status: "ACTIVE" });

    const attendance = await ownerApi.put(`/farmer/staff/${payrollStaffId}/attendance`, {
      date: today,
      status: "PRESENT",
    });
    expect(attendance.status).toBe(200);
    const payment = await ownerApi.post(`/farmer/staff/${payrollStaffId}/payments`, {
      amount: 50,
      paidAt: today,
      note: "Test wage payment",
    });
    expect(payment.status).toBe(201);

    const [list, summary, transactions] = await Promise.all([
      ownerApi.get("/farmer/staff?payType=DAILY"),
      ownerApi.get("/farmer/staff/summary"),
      ownerApi.get(`/farmer/staff/${payrollStaffId}/transactions`),
    ]);
    expect(list.body.data).toEqual(expect.arrayContaining([expect.objectContaining({ id: payrollStaffId })]));
    expect(summary.body.data.totalStaff).toBe(1);
    expect(transactions.body.data.transactions).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "payment", amount: 50 }),
    ]));

    const stopBeforeStart = await ownerApi.patch(`/farmer/staff/${payrollStaffId}/stop`, { endDate: "2000-01-01" });
    expect(stopBeforeStart.status).toBe(400);
  });

  it("applies staff permissions at the API boundary and invalidates a disabled login", async () => {
    const createdLogin = await ownerApi.post("/staff-auth/users", {
      name: `Farm staff ${suffix}`,
      phone: staffPhone,
      password: staffPassword,
      permissions: ["FARMER_MANAGE_OPERATIONS"],
    });
    expect(createdLogin.status).toBe(201);
    staffLoginId = createdLogin.body.data.id;
    expect(createdLogin.body.data.permissions).toEqual(["FARMER_MANAGE_OPERATIONS"]);

    const login = await staffApi.post("/staff-auth/login", { phone: staffPhone, password: staffPassword });
    expect(login.status).toBe(200);
    staffApi.setAuthToken(login.body.accessToken);
    expect(login.body.user).toMatchObject({ isStaff: true, role: "OWNER", permissions: ["FARMER_MANAGE_OPERATIONS"] });
    expect((await staffApi.get("/staff-auth/@me")).status).toBe(200);

    const item = await staffApi.post("/inventory", {
      name: `Staff-added feed ${suffix}`,
      currentStock: 1,
      unit: "KG",
      itemType: "FEED",
      rate: 10,
    });
    expect(item.status).toBe(201);
    inventoryItemId = item.body.data.id;

    const [analyticsDenied, cashDenied, payrollDenied, staffUsersDenied] = await Promise.all([
      staffApi.get("/analytics/farmer/overview"),
      staffApi.get("/farmer/cash-in-hand/today"),
      staffApi.get("/farmer/staff"),
      staffApi.get("/staff-auth/users"),
    ]);
    for (const response of [analyticsDenied, cashDenied, payrollDenied]) {
      expect(response.status).toBe(403);
      expect(response.body.code).toBe("STAFF_PERMISSION_DENIED");
    }
    expect(staffUsersDenied.status).toBe(403);
    expect(staffUsersDenied.body.code).toBe("OWNER_ONLY");

    const permissionsUpdate = await ownerApi.patch(`/staff-auth/users/${staffLoginId}`, {
      permissions: [
        "FARMER_MANAGE_OPERATIONS",
        "FARMER_VIEW_FINANCIAL_SUMMARIES",
        "FARMER_VIEW_CASH_HISTORY",
        "FARMER_VIEW_ANALYTICS",
        "FARMER_VIEW_STAFF_MANAGEMENT",
      ],
    });
    expect(permissionsUpdate.status).toBe(200);

    const [analyticsAllowed, cashAllowed, payrollAllowed] = await Promise.all([
      staffApi.get("/analytics/farmer/overview"),
      staffApi.get("/farmer/cash-in-hand/today"),
      staffApi.get("/farmer/staff"),
    ]);
    expect(analyticsAllowed.status).toBe(200);
    expect(cashAllowed.status).toBe(200);
    expect(payrollAllowed.status).toBe(200);

    expect((await ownerApi.patch(`/staff-auth/users/${staffLoginId}`, { isActive: false })).status).toBe(200);
    const afterDisable = await staffApi.get("/inventory");
    expect(afterDisable.status).toBe(401);
  });
});
