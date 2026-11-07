import { ApiHelper } from "../helpers/api.helper";
import prisma from "../../src/utils/prisma";

/**
 * GET /batches/:id/egg-cost — the Egg cost tab of a layer batch.
 * 20 pullets at रू 650 (13,000). Laying starts on day 10: 100 eggs, then feed
 * 1,500 on day 11 and 50 more eggs. 100 eggs sold for 1,500.
 */
async function cleanupUser(userId: string) {
  await prisma.farm.deleteMany({ where: { ownerId: userId } });
  await prisma.inventoryUsage.deleteMany({ where: { item: { userId } } });
  await prisma.inventoryTransaction.deleteMany({ where: { item: { userId } } });
  await prisma.businessAuditLog.deleteMany({ where: { OR: [{ accountOwnerId: userId }, { actorId: userId }] } });
  await prisma.user.deleteMany({ where: { id: userId } });
}

describe("Farmer layer egg cost API", () => {
  const owner = new ApiHelper();
  const other = new ApiHelper();
  const staff = new ApiHelper();
  const password = "Farmer-eggcost-test-123";
  const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`.slice(-9);
  const day = (n: number) => `2026-10-${String(n).padStart(2, "0")}T00:00:00.000Z`;
  const userIds: string[] = [];
  let farmId: string;
  let layerId: string;
  let broilerId: string;

  async function register(api: ApiHelper, tag: string) {
    const res = await api.post("/auth/register", {
      name: `Egg cost ${tag} ${suffix}`,
      phone: `+97791${tag}${suffix}`,
      password,
      role: "OWNER",
    });
    expect(res.status).toBe(201);
    userIds.push(res.body.user.id);
    api.setAuthToken(res.body.accessToken);
    expect((await api.post("/test/approve-current-user")).status).toBe(200);
  }

  beforeAll(async () => {
    await register(owner, "1");
    await register(other, "2");
    farmId = (await owner.post("/farms", { name: `Egg cost farm ${suffix}`, capacity: 100 })).body.data.id;

    const birds = await owner.post("/inventory", { name: `Birds ${suffix}`, currentStock: 30, unit: "bird", itemType: "CHICKS", rate: 650 });
    expect(birds.status).toBe(201);
    const make = async (type: "LAYERS" | "BROILER", qty: number) => {
      const res = await owner.post("/batches", {
        batchNumber: `${type}-${suffix}`,
        startDate: day(1),
        batchType: type,
        farmId,
        chicksInventory: [{ itemId: birds.body.data.id, quantity: qty }],
      });
      expect(res.status).toBe(201);
      return res.body.data.id as string;
    };
    layerId = await make("LAYERS", 20);
    broilerId = await make("BROILER", 10);

    const large = await owner.post("/egg-types", { name: "Large", code: `L${suffix.slice(-6)}` });
    const largeId = large.body.data.id;
    expect((await owner.post(`/batches/${layerId}/egg-production`, { date: day(10), countByType: { [largeId]: 100 } })).status).toBe(201);
    expect((await owner.post(`/batches/${layerId}/egg-production`, { date: day(12), countByType: { [largeId]: 50 } })).status).toBe(201);
    const sale = await owner.post("/sales", {
      date: day(12),
      amount: 1,
      quantity: 1,
      unitPrice: 1,
      itemType: "EGGS",
      farmId,
      batchId: layerId,
      eggLineItems: [{ eggTypeId: largeId, quantity: 100, unitPrice: 15 }],
    });
    expect(sale.status).toBe(201);
    // A running cost after laying started (category made the same way the app does).
    const feedCategory = await prisma.category.upsert({
      where: { userId_type_name: { userId: userIds[0], type: "EXPENSE", name: "Feed" } },
      update: {},
      create: { userId: userIds[0], type: "EXPENSE", name: "Feed" },
    });
    await prisma.expense.create({
      data: { date: new Date(day(11)), amount: 1500, batchId: layerId, farmId, categoryId: feedCategory.id },
    });
  });

  afterAll(async () => {
    for (const id of userIds) await cleanupUser(id);
  });

  it("gives the owner the egg cost view of a layer batch", async () => {
    const res = await owner.get(`/batches/${layerId}/egg-cost`);
    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.status).toBe("OK");
    expect(data.payback).toMatchObject({ flockCost: 13000, chicks: 13000, rearing: 0, recovered: 0 }); // 1,500 sales − 1,500 running
    expect(data.full).toMatchObject({ totalCost: 14500, totalEggs: 150, fullPerEgg: 96.67 });
    expect(data.periods.whole).toMatchObject({ eggs: 150, runningCost: 1500, runningPerEgg: 10, salePrice: 15, marginPerEgg: 5 });
    expect(data.prices.stockWorth).toBe(750); // 50 left × रू 15
  });

  it("refuses a broiler batch and hides other farmers' batches", async () => {
    const broiler = await owner.get(`/batches/${broilerId}/egg-cost`);
    expect(broiler.status).toBe(400);
    expect(broiler.body.message).toMatch(/only for layer/);
    expect((await other.get(`/batches/${layerId}/egg-cost`)).status).toBe(404);
  });

  it("lets farm staff who can open the batch see it too", async () => {
    const staffPhone = `98${suffix.slice(-8)}`;
    const created = await owner.post("/staff-auth/users", {
      name: `Egg cost staff ${suffix}`,
      phone: staffPhone,
      password,
      permissions: ["FARMER_MANAGE_OPERATIONS"],
    });
    expect(created.status).toBe(201);
    const login = await staff.post("/staff-auth/login", { phone: staffPhone, password });
    expect(login.status).toBe(200);
    staff.setAuthToken(login.body.accessToken);
    expect((await staff.get(`/batches/${layerId}/egg-cost`)).status).toBe(200);
  });
});
