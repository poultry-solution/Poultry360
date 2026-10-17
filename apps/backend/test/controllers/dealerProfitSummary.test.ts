jest.mock("../../src/utils/prisma", () => ({
  __esModule: true,
  default: {
    dealer: { findUnique: jest.fn() },
    dealerSale: { aggregate: jest.fn() },
    dealerSaleItem: { aggregate: jest.fn(), count: jest.fn() },
    dealerLedgerEntry: { aggregate: jest.fn() },
    dealerManualPurchase: { aggregate: jest.fn() },
  },
}));

jest.mock("../../src/services/businessAuditService", () => ({
  writeBusinessAudit: jest.fn(),
}));

import prisma from "../../src/utils/prisma";
import { getDealerProfitSummary } from "../../src/controller/dealerManualCompanyController";

const db = prisma as any;

function makeResponse() {
  const response: any = { status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  return response;
}

function run(query: Record<string, string> = {}) {
  const res = makeResponse();
  return getDealerProfitSummary({ userId: "owner-1", query } as any, res).then(() => res);
}

describe("Dealer profit summary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.dealer.findUnique.mockResolvedValue({ id: "dealer-1" });
    db.dealerSale.aggregate.mockResolvedValue({ _sum: { totalAmount: 9000 } });
    db.dealerSaleItem.aggregate.mockResolvedValue({ _sum: { costAmount: 7600 } });
    db.dealerSaleItem.count.mockResolvedValue(0);
    db.dealerLedgerEntry.aggregate.mockResolvedValue({ _sum: { amount: 300 } });
    db.dealerManualPurchase.aggregate.mockResolvedValue({ _sum: { totalAmount: 80000 } });
  });

  it("is sales minus cost of items sold plus Broiler margin, not minus all purchases", async () => {
    const res = await run();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json.mock.calls[0][0].data).toEqual({
      totalPurchases: 80000,
      totalSales: 9300,
      normalSales: 9000,
      costOfGoodsSold: 7600,
      broilerMargin: 300,
      profit: 1700,
      itemsMissingCost: 0,
    });
  });

  it("counts purchases without voided bills", async () => {
    await run();
    expect(db.dealerManualPurchase.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { manualCompany: { dealerId: "dealer-1" }, voidedAt: null },
        _sum: { totalAmount: true },
      })
    );
  });

  it("uses the same sales for revenue and cost, without Broiler or farmer sales", async () => {
    await run();
    const saleWhere = db.dealerSale.aggregate.mock.calls[0][0].where;
    expect(saleWhere).toEqual({ dealerId: "dealer-1", farmerId: null, accountId: null, isChickenSale: false });
    expect(db.dealerSaleItem.aggregate.mock.calls[0][0].where).toEqual({ sale: saleWhere });
  });

  it("filters everything by full Nepal days", async () => {
    await run({ startDate: "2026-10-01", endDate: "2026-10-13" });
    const range = {
      gte: new Date("2026-10-01T00:00:00.000+05:45"),
      lte: new Date("2026-10-13T23:59:59.999+05:45"),
    };
    expect(db.dealerSale.aggregate.mock.calls[0][0].where.date).toEqual(range);
    expect(db.dealerSaleItem.aggregate.mock.calls[0][0].where.sale.date).toEqual(range);
    expect(db.dealerLedgerEntry.aggregate.mock.calls[0][0].where.date).toEqual(range);
    expect(db.dealerManualPurchase.aggregate.mock.calls[0][0].where.date).toEqual(range);
  });

  it("rejects a bad range", async () => {
    const onlyStart = await run({ startDate: "2026-10-01" });
    expect(onlyStart.status).toHaveBeenCalledWith(400);
    const backwards = await run({ startDate: "2026-10-13", endDate: "2026-10-01" });
    expect(backwards.status).toHaveBeenCalledWith(400);
    expect(db.dealerSale.aggregate).not.toHaveBeenCalled();
  });

  it("reports old items with no saved cost", async () => {
    db.dealerSaleItem.count.mockResolvedValue(2);
    const res = await run();
    expect(res.json.mock.calls[0][0].data.itemsMissingCost).toBe(2);
    expect(db.dealerSaleItem.count.mock.calls[0][0].where.OR).toEqual([{ productId: null }, { costAmount: null }]);
  });

  it("shows a loss as a negative number", async () => {
    db.dealerSaleItem.aggregate.mockResolvedValue({ _sum: { costAmount: 9500.5 } });
    db.dealerLedgerEntry.aggregate.mockResolvedValue({ _sum: { amount: null } });
    const res = await run();
    expect(res.json.mock.calls[0][0].data.profit).toBe(-500.5);
  });
});
