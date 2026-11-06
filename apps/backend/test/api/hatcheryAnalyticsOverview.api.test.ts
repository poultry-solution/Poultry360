import { ApiHelper } from "../helpers/api.helper";
import prisma from "../../src/utils/prisma";

/**
 * Overview "vs previous" window: it must be the same number of days as the
 * chosen range and end the day before it starts (it used to be 1 day longer).
 */
describe("Hatchery analytics overview — previous range", () => {
  const api = new ApiHelper();
  const password = "Hatch-analytics-test-123";
  const suffix = `${Date.now()}${Math.floor(Math.random() * 10_000)}`.slice(-10);
  const phone = `+97798${suffix}`;
  let ownerId: string;

  beforeAll(async () => {
    const registration = await api.post("/auth/register-entity", {
      name: `Hatch Owner ${suffix}`,
      phone,
      password,
      entityType: "HATCHERY",
      entityName: `Hatch Analytics ${suffix}`,
      entityContact: `98${suffix.slice(-8)}`,
      entityAddress: "Test city",
    });
    expect(registration.status).toBe(201);
    ownerId = registration.body.user.id;
    api.setAuthToken(registration.body.accessToken);
    expect((await api.post("/test/approve-current-user")).status).toBe(200);

    const batch = await prisma.hatcheryBatch.create({
      data: {
        hatcheryOwnerId: ownerId,
        code: "PF-T01",
        startDate: new Date("2026-01-01T00:00:00.000Z"),
      },
    });
    const expense = (day: string, amount: number) => ({
      batchId: batch.id,
      date: new Date(`${day}T12:00:00.000Z`),
      category: "other",
      itemName: `Test ${day}`,
      amount,
    });
    await prisma.hatcheryBatchExpense.createMany({
      data: [
        expense("2026-02-18", 1000), // 11 days before start: outside both
        expense("2026-02-19", 200), // first day of the previous window
        expense("2026-02-28", 30), // last day of the previous window
        expense("2026-03-01", 4), // first day of the chosen range
      ],
    });
  });

  afterAll(async () => {
    if (!ownerId) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
    await prisma.businessAuditLog.deleteMany({
      where: { OR: [{ accountOwnerId: ownerId }, { actorId: ownerId }] },
    });
    await prisma.user.deleteMany({ where: { id: ownerId } });
  });

  it("compares a 10-day range with the 10 days before it", async () => {
    const res = await api.get(
      "/hatchery/analytics/overview?startDate=2026-03-01&endDate=2026-03-10"
    );
    expect(res.status).toBe(200);
    const comparison = res.body.data?.comparison ?? res.body.comparison;
    expect(comparison.current.expenses).toBe(4);
    expect(comparison.previous.expenses).toBe(230);
  });
});
