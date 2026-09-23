import bcrypt from "bcrypt";
import { UserRole } from "@prisma/client";
import { ApiHelper } from "../helpers/api.helper";
import prisma from "../../src/utils/prisma";

const FEATURE_KEY = "DEALER_STAFF_OPERATIONS";
const HATCHERY_FEATURE_KEY = "HATCHERY_STAFF_OPERATIONS";
const FARMER_FEATURE_KEY = "FARMER_STAFF_OPERATIONS";
const TEST_PASSWORD = "password123";
const TEST_ACCOUNTS = {
  admin: "+9779800000881",
  dealer: "+9779800000882",
  farmer: "+9779800000883",
  otherDealer: "+9779800000884",
  managedStaff: "+9779800000885",
  hatchery: "+9779800000886",
  hatcheryStaff: "+9779800000887",
  farmerStaff: "+9779800000888",
  company: "+9779800000889",
  companyStaff: "+9779800000890",
};

describe("Account feature API", () => {
  const apiHelper = new ApiHelper();
  let adminId: string;
  let dealerId: string;
  let farmerId: string;
  let otherDealerId: string;
  let managedStaffId: string;
  let hatcheryId: string;
  let hatcheryStaffId: string;
  let farmerStaffId: string;
  let companyId: string;
  let companyStaffId: string;

  beforeAll(async () => {
    const password = await bcrypt.hash(TEST_PASSWORD, 10);
    const [admin, hatchery, dealer, farmer, otherDealer, company] = await Promise.all([
      prisma.user.upsert({
        where: { phone: TEST_ACCOUNTS.admin },
        update: { password, role: UserRole.SUPER_ADMIN, status: "ACTIVE" },
        create: {
          phone: TEST_ACCOUNTS.admin,
          password,
          name: "Account Feature Test Admin",
          role: UserRole.SUPER_ADMIN,
        },
      }),
      prisma.user.upsert({
        where: { phone: TEST_ACCOUNTS.hatchery },
        update: { password, role: UserRole.HATCHERY, status: "ACTIVE" },
        create: {
          phone: TEST_ACCOUNTS.hatchery,
          password,
          name: "Account Feature Test Hatchery",
          role: UserRole.HATCHERY,
        },
      }),
      prisma.user.upsert({
        where: { phone: TEST_ACCOUNTS.dealer },
        update: { password, role: UserRole.DEALER, status: "ACTIVE" },
        create: {
          phone: TEST_ACCOUNTS.dealer,
          password,
          name: "Account Feature Test Dealer",
          role: UserRole.DEALER,
        },
      }),
      prisma.user.upsert({
        where: { phone: TEST_ACCOUNTS.farmer },
        update: { password, role: UserRole.OWNER, status: "ACTIVE" },
        create: {
          phone: TEST_ACCOUNTS.farmer,
          password,
          name: "Account Feature Test Farmer",
          role: UserRole.OWNER,
        },
      }),
      prisma.user.upsert({
        where: { phone: TEST_ACCOUNTS.otherDealer },
        update: { password, role: UserRole.DEALER, status: "ACTIVE" },
        create: {
          phone: TEST_ACCOUNTS.otherDealer,
          password,
          name: "Account Feature Other Dealer",
          role: UserRole.DEALER,
        },
      }),
      prisma.user.upsert({
        where: { phone: TEST_ACCOUNTS.company },
        update: { password, role: UserRole.COMPANY, status: "ACTIVE" },
        create: {
          phone: TEST_ACCOUNTS.company,
          password,
          name: "Account Feature Test Company Owner",
          role: UserRole.COMPANY,
        },
      }),
    ]);

    adminId = admin.id;
    dealerId = dealer.id;
    farmerId = farmer.id;
    otherDealerId = otherDealer.id;
    hatcheryId = hatchery.id;
    companyId = company.id;
    await prisma.accountFeature.deleteMany({
      where: { accountId: { in: [dealerId, farmerId, hatcheryId, companyId] } },
    });

    const dealerBusiness = await prisma.dealer.upsert({
      where: { ownerId: dealerId },
      update: { name: "Account Feature Test Dealer", contact: TEST_ACCOUNTS.dealer },
      create: {
        name: "Account Feature Test Dealer",
        contact: TEST_ACCOUNTS.dealer,
        ownerId: dealerId,
      },
    });
    const managedStaff = await prisma.staffUser.upsert({
      where: { phone: TEST_ACCOUNTS.managedStaff },
      update: {
        ownerId: dealerId,
        accountRole: UserRole.DEALER,
        isActive: true,
      },
      create: {
        ownerId: dealerId,
        accountRole: UserRole.DEALER,
        name: "Account Feature Managed Staff",
        phone: TEST_ACCOUNTS.managedStaff,
        passwordHash: password,
      },
    });
    managedStaffId = managedStaff.id;
    await prisma.hatcheryBusiness.upsert({
      where: { ownerId: hatcheryId },
      update: { name: "Account Feature Test Hatchery", contact: TEST_ACCOUNTS.hatchery },
      create: { ownerId: hatcheryId, name: "Account Feature Test Hatchery", contact: TEST_ACCOUNTS.hatchery },
    });
    const hatcheryStaff = await prisma.staffUser.upsert({
      where: { phone: TEST_ACCOUNTS.hatcheryStaff },
      update: { ownerId: hatcheryId, accountRole: UserRole.HATCHERY, isActive: true },
      create: {
        ownerId: hatcheryId,
        accountRole: UserRole.HATCHERY,
        name: "Account Feature Hatchery Staff",
        phone: TEST_ACCOUNTS.hatcheryStaff,
        passwordHash: password,
        permissions: ["HATCHERY_MANAGE_OPERATIONS"],
      },
    });
    hatcheryStaffId = hatcheryStaff.id;
    const farmerStaff = await prisma.staffUser.upsert({
      where: { phone: TEST_ACCOUNTS.farmerStaff },
      update: {
        ownerId: farmerId,
        accountRole: UserRole.OWNER,
        passwordHash: password,
        isActive: true,
        permissions: ["FARMER_MANAGE_OPERATIONS"],
      },
      create: {
        ownerId: farmerId,
        accountRole: UserRole.OWNER,
        name: "Account Feature Farmer Staff",
        phone: TEST_ACCOUNTS.farmerStaff,
        passwordHash: password,
        permissions: ["FARMER_MANAGE_OPERATIONS"],
      },
    });
    farmerStaffId = farmerStaff.id;
    await prisma.company.upsert({
      where: { ownerId: companyId },
      update: { name: "Account Feature Test Company" },
      create: {
        ownerId: companyId,
        name: "Account Feature Test Company",
      },
    });
    const companyStaff = await prisma.staffUser.upsert({
      where: { phone: TEST_ACCOUNTS.companyStaff },
      update: {
        ownerId: companyId,
        accountRole: UserRole.COMPANY,
        passwordHash: password,
        isActive: true,
        permissions: ["COMPANY_MANAGE_OPERATIONS"],
      },
      create: {
        ownerId: companyId,
        accountRole: UserRole.COMPANY,
        name: "Account Feature Company Staff",
        phone: TEST_ACCOUNTS.companyStaff,
        passwordHash: password,
        permissions: ["COMPANY_MANAGE_OPERATIONS"],
      },
    });
    companyStaffId = companyStaff.id;
  });

  afterAll(async () => {
    const accountIds = [adminId, dealerId, farmerId, otherDealerId, hatcheryId, companyId].filter(Boolean);
    if (accountIds.length === 0) return;

    await prisma.businessAuditLog.deleteMany({
      where: {
        OR: [
          { accountOwnerId: { in: accountIds } },
          { actorId: { in: accountIds } },
        ],
      },
    });
    await prisma.accountFeature.deleteMany({
      where: { accountId: { in: accountIds } },
    });
    if (managedStaffId) {
      await prisma.staffUser.deleteMany({ where: { id: managedStaffId } });
    }
    if (hatcheryStaffId) {
      await prisma.staffUser.deleteMany({ where: { id: hatcheryStaffId } });
    }
    if (farmerStaffId) {
      await prisma.staffUser.deleteMany({ where: { id: farmerStaffId } });
    }
    if (companyStaffId) {
      await prisma.staffUser.deleteMany({ where: { id: companyStaffId } });
    }
    await prisma.dealer.deleteMany({ where: { ownerId: dealerId } });
    await prisma.hatcheryBusiness.deleteMany({ where: { ownerId: hatcheryId } });
    await prisma.company.deleteMany({ where: { ownerId: companyId } });
    await prisma.user.deleteMany({ where: { id: { in: accountIds } } });
  });

  async function login(phone: string) {
    const response = await apiHelper.post("/auth/login", {
      emailOrPhone: phone,
      password: TEST_PASSWORD,
    });
    expect(response.status).toBe(200);
    apiHelper.setAuthToken(response.body.accessToken);
  }

  async function waitForAudit(action: string, accountOwnerId = hatcheryId) {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const audit = await prisma.businessAuditLog.findFirst({
        where: { accountOwnerId, action },
        orderBy: { createdAt: "desc" },
      });
      if (audit) return audit;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    return null;
  }

  it("resolves Dealer Staff Operations as enabled by default for a Dealer", async () => {
    await login(TEST_ACCOUNTS.dealer);

    const response = await apiHelper.get("/account-features");

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: FEATURE_KEY, enabled: true }),
      ])
    );
  });

  it("resolves Hatchery Staff Operations as enabled by default for a Hatchery", async () => {
    await login(TEST_ACCOUNTS.hatchery);
    const response = await apiHelper.get("/account-features");
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: HATCHERY_FEATURE_KEY, enabled: true }),
      ])
    );
  });

  it("resolves Farmer Staff Operations as enabled by default for a Farmer", async () => {
    await login(TEST_ACCOUNTS.farmer);
    const response = await apiHelper.get("/account-features");
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: FARMER_FEATURE_KEY, enabled: true }),
      ])
    );
  });

  it("resolves Company Staff Operations as enabled by default for a Company", async () => {
    await login(TEST_ACCOUNTS.company);
    const response = await apiHelper.get("/account-features");
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "COMPANY_STAFF_OPERATIONS", enabled: true }),
      ])
    );
  });

  it("authenticates a Farmer staff identity with access to daily farm operations only", async () => {
    const response = await apiHelper.post("/staff-auth/login", {
      emailOrPhone: TEST_ACCOUNTS.farmerStaff,
      password: TEST_PASSWORD,
    });
    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      role: UserRole.OWNER,
      isStaff: true,
      farmer: expect.objectContaining({ ownerId: farmerId }),
      permissions: ["FARMER_MANAGE_OPERATIONS"],
    });

    apiHelper.setAuthToken(response.body.accessToken);
    expect((await apiHelper.get("/farms/my-farms")).status).toBe(200);
    expect((await apiHelper.get("/dealers")).status).toBe(200);
    expect((await apiHelper.get("/sales")).status).toBe(200);
    expect((await apiHelper.get("/expenses")).status).toBe(200);
    expect((await apiHelper.get("/conversations")).status).toBe(200);
    expect((await apiHelper.get("/dashboard/overview")).status).toBe(403);
    expect((await apiHelper.get("/analytics/farmer/overview")).status).toBe(403);
  });

  it("authenticates a Company staff identity with access to daily Company operations only", async () => {
    const response = await apiHelper.post("/staff-auth/login", {
      emailOrPhone: TEST_ACCOUNTS.companyStaff,
      password: TEST_PASSWORD,
    });
    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      role: UserRole.COMPANY,
      isStaff: true,
      company: expect.objectContaining({ ownerId: companyId }),
      permissions: ["COMPANY_MANAGE_OPERATIONS"],
    });

    apiHelper.setAuthToken(response.body.accessToken);
    expect((await apiHelper.get("/company/products")).status).toBe(200);
    expect((await apiHelper.get("/company/suppliers")).status).toBe(200);
    expect((await apiHelper.get("/company/sales")).status).toBe(200);
    expect((await apiHelper.get("/company/dealers/accounts")).status).toBe(200);
    expect((await apiHelper.get("/company/ledger/summary")).status).toBe(403);
    expect((await apiHelper.get("/company/analytics")).status).toBe(403);
    expect((await apiHelper.get("/business-activity")).status).toBe(403);
    expect((await apiHelper.get("/notifications")).status).toBe(403);
  });

  it("writes Dealer payroll changes to the account activity feed", async () => {
    await login(TEST_ACCOUNTS.dealer);
    const staff = await apiHelper.post("/dealer/staff", {
      name: "Account Feature Dealer Payroll Staff",
      startDate: "2026-09-01",
      monthlySalary: 25000,
    });
    expect(staff.status).toBe(201);

    const audit = await waitForAudit("dealer.payroll.staff.created", dealerId);
    expect(audit).toMatchObject({
      description: "Added a payroll staff member",
      targetType: "Dealer payroll staff",
    });
  });

  it("requires the Company staff salary permission for payroll records", async () => {
    const staffLogin = await apiHelper.post("/staff-auth/login", {
      emailOrPhone: TEST_ACCOUNTS.companyStaff,
      password: TEST_PASSWORD,
    });
    expect(staffLogin.status).toBe(200);
    apiHelper.setAuthToken(staffLogin.body.accessToken);
    expect((await apiHelper.get("/company/staff")).status).toBe(403);

    await prisma.staffUser.update({
      where: { id: companyStaffId },
      data: { permissions: ["COMPANY_MANAGE_OPERATIONS", "COMPANY_VIEW_STAFF_MANAGEMENT"] },
    });
    expect((await apiHelper.get("/company/staff")).status).toBe(200);

    await prisma.staffUser.update({
      where: { id: companyStaffId },
      data: { permissions: ["COMPANY_MANAGE_OPERATIONS"] },
    });
  });

  it("authenticates a Hatchery staff identity under the Hatchery role", async () => {
    const response = await apiHelper.post("/staff-auth/login", {
      emailOrPhone: TEST_ACCOUNTS.hatcheryStaff,
      password: TEST_PASSWORD,
    });
    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      role: UserRole.HATCHERY,
      isStaff: true,
      hatchery: expect.objectContaining({ ownerId: hatcheryId }),
    });
  });

  it("enforces Hatchery staff permissions on direct API requests", async () => {
    const loginResponse = await apiHelper.post("/staff-auth/login", {
      emailOrPhone: TEST_ACCOUNTS.hatcheryStaff,
      password: TEST_PASSWORD,
    });
    apiHelper.setAuthToken(loginResponse.body.accessToken);
    const analytics = await apiHelper.get("/hatchery/analytics/overview");
    expect(analytics.status).toBe(403);
  });

  it("allows Super Admin to turn the Dealer feature off and on", async () => {
    const staffLogin = await apiHelper.post("/staff-auth/login", {
      emailOrPhone: TEST_ACCOUNTS.managedStaff,
      password: TEST_PASSWORD,
    });
    expect(staffLogin.status).toBe(200);
    const existingStaffToken = staffLogin.body.accessToken;

    await login(TEST_ACCOUNTS.admin);

    const disabled = await apiHelper.put(
      `/admin/users/${dealerId}/features/${FEATURE_KEY}`,
      { enabled: false }
    );
    expect(disabled.status).toBe(200);
    expect(disabled.body.data).toMatchObject({ key: FEATURE_KEY, enabled: false });

    const blockedLogin = await apiHelper.post("/staff-auth/login", {
      emailOrPhone: TEST_ACCOUNTS.managedStaff,
      password: TEST_PASSWORD,
    });
    expect(blockedLogin.status).toBe(403);
    expect(blockedLogin.body.code).toBe("STAFF_OPERATIONS_DISABLED");

    apiHelper.setAuthToken(existingStaffToken);
    const blockedExistingSession = await apiHelper.get("/dealer/sales");
    expect(blockedExistingSession.status).toBe(403);
    expect(blockedExistingSession.body.code).toBe("STAFF_OPERATIONS_DISABLED");

    await login(TEST_ACCOUNTS.dealer);
    const featureResponse = await apiHelper.get("/account-features");
    expect(featureResponse.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: FEATURE_KEY, enabled: false }),
      ])
    );

    await login(TEST_ACCOUNTS.admin);
    const enabled = await apiHelper.put(
      `/admin/users/${dealerId}/features/${FEATURE_KEY}`,
      { enabled: true }
    );
    expect(enabled.status).toBe(200);
    expect(enabled.body.data).toMatchObject({ key: FEATURE_KEY, enabled: true });

    const audit = await prisma.businessAuditLog.findFirst({
      where: { action: "admin.account_feature.changed", actorId: adminId },
      orderBy: { createdAt: "desc" },
    });
    expect(audit?.accountOwnerId).toBe(adminId);
  });

  it("allows Super Admin to turn the Hatchery staff feature off and on", async () => {
    await login(TEST_ACCOUNTS.admin);
    const disabled = await apiHelper.put(
      `/admin/users/${hatcheryId}/features/${HATCHERY_FEATURE_KEY}`,
      { enabled: false }
    );
    expect(disabled.status).toBe(200);
    expect(disabled.body.data).toMatchObject({ key: HATCHERY_FEATURE_KEY, enabled: false });

    const enabled = await apiHelper.put(
      `/admin/users/${hatcheryId}/features/${HATCHERY_FEATURE_KEY}`,
      { enabled: true }
    );
    expect(enabled.status).toBe(200);
    expect(enabled.body.data).toMatchObject({ key: HATCHERY_FEATURE_KEY, enabled: true });
  });

  it("returns count-only, account-scoped usage totals to Super Admin", async () => {
    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: dealerId },
      select: { id: true },
    });
    expect(dealer).toBeTruthy();

    const suffix = Date.now();
    await prisma.dealerManualCompany.createMany({
      data: [
        {
          dealerId: dealer!.id,
          name: `Account Usage Historic Company ${suffix}`,
          createdAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
        },
        {
          dealerId: dealer!.id,
          name: `Account Usage Recent Company ${suffix}`,
        },
      ],
    });

    await login(TEST_ACCOUNTS.farmer);
    expect((await apiHelper.get(`/admin/users/${dealerId}/usage`)).status).toBe(403);

    await login(TEST_ACCOUNTS.admin);
    const response = await apiHelper.get(`/admin/users/${dealerId}/usage`);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      accountId: dealerId,
      role: UserRole.DEALER,
    });
    expect(response.body.data).not.toHaveProperty("records");
    const companyRecords = response.body.data.metrics.find(
      (usageMetric: { key: string }) => usageMetric.key === "company_records"
    );
    expect(companyRecords).toMatchObject({
      label: "Company records",
      total: expect.any(Number),
      last30Days: expect.any(Number),
    });
    expect(companyRecords.total).toBeGreaterThanOrEqual(2);
    expect(companyRecords.last30Days).toBeGreaterThanOrEqual(1);

    expect((await apiHelper.get("/admin/users/missing-account/usage")).status).toBe(404);
  });

  it("blocks new and active Farmer staff sessions while Farmer Staff Operations is off", async () => {
    const staffLogin = await apiHelper.post("/staff-auth/login", {
      emailOrPhone: TEST_ACCOUNTS.farmerStaff,
      password: TEST_PASSWORD,
    });
    expect(staffLogin.status).toBe(200);
    const existingStaffToken = staffLogin.body.accessToken;

    await login(TEST_ACCOUNTS.admin);
    const disabled = await apiHelper.put(
      `/admin/users/${farmerId}/features/${FARMER_FEATURE_KEY}`,
      { enabled: false }
    );
    expect(disabled.status).toBe(200);

    const blockedLogin = await apiHelper.post("/staff-auth/login", {
      emailOrPhone: TEST_ACCOUNTS.farmerStaff,
      password: TEST_PASSWORD,
    });
    expect(blockedLogin.status).toBe(403);
    expect(blockedLogin.body.code).toBe("STAFF_OPERATIONS_DISABLED");

    apiHelper.setAuthToken(existingStaffToken);
    const blockedExistingSession = await apiHelper.get("/farms/my-farms");
    expect(blockedExistingSession.status).toBe(403);
    expect(blockedExistingSession.body.code).toBe("STAFF_OPERATIONS_DISABLED");

    await login(TEST_ACCOUNTS.admin);
    const enabled = await apiHelper.put(
      `/admin/users/${farmerId}/features/${FARMER_FEATURE_KEY}`,
      { enabled: true }
    );
    expect(enabled.status).toBe(200);
  });

  it("blocks new and active Company staff sessions while Company Staff Operations is off", async () => {
    const staffLogin = await apiHelper.post("/staff-auth/login", {
      emailOrPhone: TEST_ACCOUNTS.companyStaff,
      password: TEST_PASSWORD,
    });
    expect(staffLogin.status).toBe(200);
    const existingStaffToken = staffLogin.body.accessToken;

    await login(TEST_ACCOUNTS.admin);
    const disabled = await apiHelper.put(
      `/admin/users/${companyId}/features/COMPANY_STAFF_OPERATIONS`,
      { enabled: false }
    );
    expect(disabled.status).toBe(200);

    const blockedLogin = await apiHelper.post("/staff-auth/login", {
      emailOrPhone: TEST_ACCOUNTS.companyStaff,
      password: TEST_PASSWORD,
    });
    expect(blockedLogin.status).toBe(403);
    expect(blockedLogin.body.code).toBe("STAFF_OPERATIONS_DISABLED");

    apiHelper.setAuthToken(existingStaffToken);
    const blockedExistingSession = await apiHelper.get("/company/products");
    expect(blockedExistingSession.status).toBe(403);
    expect(blockedExistingSession.body.code).toBe("STAFF_OPERATIONS_DISABLED");

    await login(TEST_ACCOUNTS.admin);
    const enabled = await apiHelper.put(
      `/admin/users/${companyId}/features/COMPANY_STAFF_OPERATIONS`,
      { enabled: true }
    );
    expect(enabled.status).toBe(200);
  });

  it("writes Company mutation activity and exposes it through the shared account feed", async () => {
    await login(TEST_ACCOUNTS.company);
    const rawMaterial = await apiHelper.post("/company/raw-materials", {
      name: `Account Feature Company Material ${Date.now()}`,
      unit: "KG",
    });
    expect(rawMaterial.status).toBe(201);
    const audit = await waitForAudit("company.raw-materials.created", companyId);
    expect(audit).toMatchObject({
      description: "Added a raw material",
      targetType: "Company raw material",
    });

    const activity = await apiHelper.get("/business-activity");
    expect(activity.status).toBe(200);
    expect(activity.body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({
        action: "company.raw-materials.created",
        actorId: companyId,
      }),
    ]));
  });

  it("writes Hatchery mutation activity and exposes it through the shared account feed", async () => {
    await login(TEST_ACCOUNTS.hatchery);
    const supplier = await apiHelper.post("/hatchery/suppliers", {
      name: "Account Feature Test Hatchery Supplier",
      contact: "+9779800000999",
    });
    expect(supplier.status).toBe(201);

    expect(await waitForAudit("hatchery.suppliers.created")).toBeTruthy();

    const activity = await apiHelper.get("/business-activity");
    expect(activity.status).toBe(200);
    expect(activity.body.data).toEqual(expect.arrayContaining([
      expect.objectContaining({
        action: "hatchery.suppliers.created",
        actorId: hatcheryId,
      }),
    ]));
  });

  it("rejects applying Dealer Staff Operations to a non-Dealer or using an unknown feature", async () => {
    await login(TEST_ACCOUNTS.admin);

    const invalidRole = await apiHelper.put(
      `/admin/users/${farmerId}/features/${FEATURE_KEY}`,
      { enabled: true }
    );
    expect(invalidRole.status).toBe(400);
    expect(invalidRole.body.message).toContain("not available");

    const unknownFeature = await apiHelper.put(
      `/admin/users/${dealerId}/features/NOT_A_FEATURE`,
      { enabled: true }
    );
    expect(unknownFeature.status).toBe(400);
    expect(unknownFeature.body.message).toBe("Unknown account feature");
  });

  it("does not expose historical Admin audit records in the Dealer activity feed", async () => {
    await prisma.businessAuditLog.create({
      data: {
        accountOwnerId: dealerId,
        businessType: "ADMIN",
        actorId: adminId,
        actorType: "USER",
        actorName: "Account Feature Test Admin",
        actorRole: UserRole.SUPER_ADMIN,
        action: "admin.account_feature.changed",
        targetType: "AccountFeature",
        targetId: FEATURE_KEY,
        description: "Dealer Staff Operations turned off",
      },
    });

    await login(TEST_ACCOUNTS.dealer);
    const response = await apiHelper.get("/dealer/activity");

    expect(response.status).toBe(200);
    expect(response.body.data).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "admin.account_feature.changed" }),
      ])
    );
  });

  it("limits Dealer activity and exports to the owner and that owner's managed staff", async () => {
    await prisma.businessAuditLog.createMany({
      data: [
        {
          accountOwnerId: dealerId,
          businessType: "DEALER",
          actorId: dealerId,
          actorType: "USER",
          actorName: "Account Feature Test Dealer",
          actorRole: UserRole.DEALER,
          action: "audit.scope.owner",
          targetType: "TestRecord",
          targetId: "owner-record",
          description: "Owner action",
        },
        {
          accountOwnerId: dealerId,
          businessType: "DEALER",
          actorId: managedStaffId,
          actorType: "STAFF",
          actorName: "Account Feature Managed Staff",
          actorRole: "DEALER_STAFF",
          action: "audit.scope.staff",
          targetType: "TestRecord",
          targetId: "staff-record",
          description: "Managed staff action",
        },
        {
          // Simulates a historical row whose accountOwnerId was written incorrectly.
          accountOwnerId: dealerId,
          businessType: "DEALER",
          actorId: otherDealerId,
          actorType: "USER",
          actorName: "Account Feature Other Dealer",
          actorRole: UserRole.DEALER,
          action: "audit.scope.foreign",
          targetType: "TestRecord",
          targetId: "foreign-record",
          description: "Foreign dealer action",
        },
        {
          accountOwnerId: otherDealerId,
          businessType: "DEALER",
          actorId: otherDealerId,
          actorType: "USER",
          actorName: "Account Feature Other Dealer",
          actorRole: UserRole.DEALER,
          action: "audit.scope.other_account",
          targetType: "TestRecord",
          targetId: "other-account-record",
          description: "Other account action",
        },
      ],
    });

    await login(TEST_ACCOUNTS.dealer);
    const activity = await apiHelper.get(
      `/dealer/activity?accountOwnerId=${otherDealerId}`
    );
    const exported = await apiHelper.get(
      `/dealer/activity/export?accountOwnerId=${otherDealerId}`
    );

    for (const response of [activity, exported]) {
      expect(response.status).toBe(200);
      const actions = response.body.data.map((row: { action: string }) => row.action);
      expect(actions).toEqual(
        expect.arrayContaining(["audit.scope.owner", "audit.scope.staff"])
      );
      expect(actions).not.toEqual(
        expect.arrayContaining([
          "audit.scope.foreign",
          "audit.scope.other_account",
          "admin.account_feature.changed",
        ])
      );
    }
  });
});
