import { ApiHelper } from "../helpers/api.helper";
import prisma from "../../src/utils/prisma";

/**
 * Layer batch journey: egg stock never goes below 0, and birds still alive at
 * closing are not counted as deaths.
 *
 * 20 hens. Eggs: 100 + 50 Large. Sales take 100. Then 2 die, 3 are sold,
 * and 15 are still alive when the batch is closed.
 */
async function cleanupUser(userId: string) {
  await prisma.farm.deleteMany({ where: { ownerId: userId } });
  await prisma.inventoryUsage.deleteMany({ where: { item: { userId } } });
  await prisma.inventoryTransaction.deleteMany({ where: { item: { userId } } });
  await prisma.businessAuditLog.deleteMany({ where: { OR: [{ accountOwnerId: userId }, { actorId: userId }] } });
  await prisma.user.deleteMany({ where: { id: userId } });
}

describe("Farmer layer batch API", () => {
  const api = new ApiHelper();
  const password = "Farmer-layer-test-123";
  const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`.slice(-10);
  const phone = `+97791${suffix}`;
  const day = (n: number) => `2026-10-${String(n).padStart(2, "0")}T00:00:00.000Z`;

  let userId: string;
  let farmId: string;
  let batchId: string;
  let largeId: string;
  let dayA: string;
  let dayB: string;

  const stock = async () =>
    Number((await api.get(`/egg-inventory?batchId=${batchId}`)).body.data.quantities[largeId] ?? 0);
  const eggSale = (lines: Array<{ quantity: number }>) =>
    api.post("/sales", {
      date: day(12),
      amount: 1,
      quantity: 1,
      unitPrice: 1,
      itemType: "EGGS",
      farmId,
      batchId,
      eggLineItems: lines.map((l) => ({ eggTypeId: largeId, quantity: l.quantity, unitPrice: 15 })),
    });

  beforeAll(async () => {
    const registration = await api.post("/auth/register", {
      name: `Layer API Farmer ${suffix}`,
      phone,
      password,
      role: "OWNER",
    });
    expect(registration.status).toBe(201);
    userId = registration.body.user.id;
    api.setAuthToken(registration.body.accessToken);
    expect((await api.post("/test/approve-current-user")).status).toBe(200);

    farmId = (await api.post("/farms", { name: `Layer Farm ${suffix}`, capacity: 50 })).body.data.id;
    const hens = await api.post("/inventory", {
      name: `Pullets ${suffix}`,
      currentStock: 20,
      unit: "bird",
      itemType: "CHICKS",
      rate: 650,
    });
    expect(hens.status).toBe(201);

    const batch = await api.post("/batches", {
      batchNumber: `LAYER-${suffix}`,
      startDate: day(1),
      batchType: "LAYERS",
      farmId,
      chicksInventory: [{ itemId: hens.body.data.id, quantity: 20 }],
    });
    expect(batch.status).toBe(201);
    batchId = batch.body.data.id;

    const large = await api.post("/egg-types", { name: "Large", code: `L${suffix.slice(-6)}` });
    expect(large.status).toBe(201);
    largeId = large.body.data.id;

    const a = await api.post(`/batches/${batchId}/egg-production`, { date: day(10), countByType: { [largeId]: 100 } });
    const b = await api.post(`/batches/${batchId}/egg-production`, { date: day(11), countByType: { [largeId]: 50 } });
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    dayA = a.body.data.id;
    dayB = b.body.data.id;
    // Feed for layers is saved as feed rows; the batch page must show their kg.
    await prisma.feedConsumption.create({
      data: { batchId, date: new Date(day(5)), quantity: 120, quantityKg: 120, feedType: "Layer mash" },
    });
  });

  afterAll(async () => {
    if (!userId) return;
    await cleanupUser(userId);
  });

  it("checks egg stock per egg type, even when the type is on two lines", async () => {
    expect(await stock()).toBe(150);

    const over = await eggSale([{ quantity: 80 }, { quantity: 80 }]);
    expect(over.status).toBe(400);
    expect(over.body.message).toMatch(/available 150, requested 160/);
    expect(await stock()).toBe(150);

    const ok = await eggSale([{ quantity: 50 }, { quantity: 50 }]);
    expect(ok.status).toBe(201);
    expect(await stock()).toBe(50);
  });

  it("does not let removing egg records push stock below 0", async () => {
    const del = await api.delete(`/batches/${batchId}/egg-production/${dayA}`);
    expect(del.status).toBe(400);
    expect(del.body.message).toMatch(/only 50 are in stock/);
    expect(await stock()).toBe(50);

    // Lowering a record is fine while enough eggs are left.
    const edit = await api.put(`/batches/${batchId}/egg-production/${dayA}`, { countByType: { [largeId]: 60 } });
    expect(edit.status).toBe(200);
    expect(await stock()).toBe(10);

    const tooMuch = await api.put(`/batches/${batchId}/egg-production/${dayB}`, { countByType: { [largeId]: 0 } });
    expect(tooMuch.status).toBe(400);
    expect(await stock()).toBe(10);

    expect((await api.delete(`/batches/${batchId}/egg-production/missing-id`)).status).toBe(404);
  });

  it("gives layer egg numbers and feed kg in batch analytics", async () => {
    const res = await api.get(`/batches/${batchId}/analytics`);
    expect(res.status).toBe(200);
    expect(res.body.data.layers).toEqual({ eggsCollected: 110, eggsInStock: 10, eggsSold: 100, eggSalesAmount: 1500 });
    expect(res.body.data.totalFeedConsumption).toBe(120);
    expect(res.body.data.leftAtClose).toBe(0);
  });

  it("does not count hens left at closing as deaths", async () => {
    expect((await api.post("/mortalities", { date: day(13), count: 2, reason: "Disease", batchId })).status).toBe(201);
    const henSale = await api.post("/sales", {
      date: day(14),
      amount: 1,
      quantity: 3,
      weight: 6,
      unitPrice: 300,
      itemType: "Chicken_Meat",
      farmId,
      batchId,
    });
    expect(henSale.status).toBe(201);

    const close = await api.post(`/batches/${batchId}/close`, { endDate: day(15), confirmRemainingAsDead: true });
    expect(close.status).toBe(200);

    const mort = await api.get(`/mortalities/batch/${batchId}`);
    expect(mort.body.statistics.totalMortality).toBe(2);
    expect(mort.body.statistics.leftAtClose).toBe(15);
    expect(mort.body.statistics.mortalityRate).toBe("10.00");
    expect(mort.body.statistics.currentBirds).toBe(0);

    const analytics = (await api.get(`/batches/${batchId}/analytics`)).body.data;
    expect(analytics.totalMortality).toBe(2);
    expect(analytics.leftAtClose).toBe(15);
    expect(analytics.mortalityRate).toBe(10);
    expect(analytics.currentChicks).toBe(0);

    const flock = await api.get(`/analytics/farmer/flock-comparison?batchId=${batchId}&startDate=2026-10-01&endDate=2026-10-31`);
    const row = (flock.body.data ?? flock.body).batches[0];
    expect({ died: row.died, sold: row.sold, leftAtClose: row.leftAtClose, alive: row.alive }).toEqual({
      died: 2,
      sold: 3,
      leftAtClose: 15,
      alive: 0,
    });
  });
});
