jest.mock("../../src/utils/prisma", () => ({
  __esModule: true,
  default: {
    farm: { findMany: jest.fn(), count: jest.fn() },
    batch: { count: jest.fn(), findMany: jest.fn() },
    sale: { aggregate: jest.fn(), findMany: jest.fn() },
    expense: { aggregate: jest.fn(), findMany: jest.fn() },
    customer: { aggregate: jest.fn(), findMany: jest.fn() },
    dealer: { findMany: jest.fn() },
    dealerFarmerAccount: { findMany: jest.fn() },
  },
}));

import prisma from "../../src/utils/prisma";
import { getDashboardOverview, getMoneyToReceiveDetails } from "../../src/controller/dashboardController";
import { getNepalBsMonthWindow } from "../../src/utils/nepalBsDate";

const db = prisma as any;

function makeResponse() {
  const response: any = { status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  return response;
}

describe("Nepali month window for Home figures", () => {
  it("starts at Nepal midnight of BS day 1 and compares the same days of last month", () => {
    // 2026-10-13 15:45 Nepal = Ashwin 27, 2083
    const w = getNepalBsMonthWindow(new Date("2026-10-13T10:00:00Z"));
    expect(w.monthLabel).toBe("Ashwin 2083");
    expect(w.daysElapsed).toBe(27);
    expect(w.currentStart.toISOString()).toBe("2026-09-16T18:15:00.000Z"); // Ashwin 1 = 2026-09-17 00:00 NPT
    expect(w.previousStart.toISOString()).toBe("2026-08-16T18:15:00.000Z"); // Bhadra 1
    expect(w.previousSameDaysEnd.toISOString()).toBe("2026-09-12T18:14:59.999Z"); // end of Bhadra 27
  });

  it("uses the Nepal day, not the UTC day, just after midnight in Nepal", () => {
    // 2026-10-12 19:00 UTC is already 2026-10-13 00:45 in Nepal
    expect(getNepalBsMonthWindow(new Date("2026-10-12T19:00:00Z")).daysElapsed).toBe(27);
  });

  it("rolls back to Chaitra of the previous year on Baisakh 1", () => {
    const w = getNepalBsMonthWindow(new Date("2026-04-14T00:00:00Z"));
    expect(w.monthLabel).toBe("Baisakh 2083");
    expect(w.daysElapsed).toBe(1);
    expect(w.previousStart.toISOString()).toBe("2026-03-14T18:15:00.000Z"); // Chaitra 1, 2082
  });
});

describe("Farmer Home overview", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.dealer.findMany.mockResolvedValue([]);
    db.dealerFarmerAccount.findMany.mockResolvedValue([]);
    db.farm.findMany.mockResolvedValue([{ id: "farm-1" }]);
    db.farm.count.mockResolvedValue(1);
    db.batch.count.mockResolvedValue(1);
    db.batch.findMany.mockResolvedValue([]);
    db.sale.aggregate.mockResolvedValue({ _sum: { amount: 1000 } });
    db.expense.aggregate.mockResolvedValue({ _sum: { amount: 400 } });
    db.sale.findMany.mockResolvedValue([]);
    db.expense.findMany.mockResolvedValue([]);
    db.customer.aggregate.mockResolvedValue({ _sum: { balance: 110339.64 }, _count: { _all: 3 } });
  });

  it("money to receive is what customers owe now, not the old per-sale due", async () => {
    const res = makeResponse();
    await getDashboardOverview({ userId: "farmer-1" } as any, res);
    const data = res.json.mock.calls[0][0].data;
    expect(data.moneyToReceive).toBe(110339.64);
    expect(data.customersOwingCount).toBe(3);
    expect(db.customer.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "farmer-1", balance: { gt: 0 } } })
    );
    expect(db.sale.aggregate.mock.calls.some(([arg]: any[]) => arg?._sum?.dueAmount)).toBe(false);
    expect(data.monthLabel).toMatch(/^\w+ \d{4}$/);
  });

  it("this month figures start at the current Nepali month", async () => {
    const res = makeResponse();
    await getDashboardOverview({ userId: "farmer-1" } as any, res);
    const monthStart = getNepalBsMonthWindow().currentStart.getTime();
    const monthCalls = db.sale.aggregate.mock.calls.filter(([arg]: any[]) => arg.where?.date?.gte && !arg.where.date.lte);
    expect(monthCalls).toHaveLength(1);
    expect(monthCalls[0][0].where.date.gte.getTime()).toBe(monthStart);
  });
});

describe("Money to receive popup", () => {
  beforeEach(() => jest.clearAllMocks());

  it("lists customers who owe, biggest first, with a total over all of them", async () => {
    db.customer.findMany.mockResolvedValue([
      { id: "c1", name: "Laxmi Hotel", phone: "1", balance: 88814 },
      { id: "c2", name: "Ram", phone: "2", balance: 15035.64 },
    ]);
    db.customer.aggregate.mockResolvedValue({ _sum: { balance: 110339.64 }, _count: { _all: 3 } });
    db.sale.findMany.mockResolvedValue([{ id: "s1", customerId: "c1", amount: 100000, dueAmount: 100000, date: new Date(), farm: { name: "F" }, category: { name: "Chicken" } }]);

    const res = makeResponse();
    await getMoneyToReceiveDetails({ userId: "farmer-1", query: { page: "1", limit: "2" } } as any, res);
    const data = res.json.mock.calls[0][0].data;
    expect(db.customer.findMany.mock.calls[0][0]).toMatchObject({ where: { userId: "farmer-1", balance: { gt: 0 } }, take: 2, skip: 0 });
    expect(data.totalAmount).toBe(110339.64);
    expect(data.totalCustomers).toBe(3);
    expect(data.customers[0]).toMatchObject({ customerName: "Laxmi Hotel", totalDueAmount: 88814, salesCount: 1 });
    expect(data.pagination).toMatchObject({ total: 3, totalPages: 2 });
  });
});
