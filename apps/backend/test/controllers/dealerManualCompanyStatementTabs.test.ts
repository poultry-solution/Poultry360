jest.mock("../../src/utils/prisma", () => ({
  __esModule: true,
  default: {
    dealer: { findUnique: jest.fn() },
    dealerManualCompany: { findUnique: jest.fn() },
    dealerManualPurchase: { count: jest.fn(), findMany: jest.fn() },
    dealerManualCompanyPayment: { count: jest.fn(), findMany: jest.fn() },
    dealerManualCompanyAdjustment: { count: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
    dealerSale: { count: jest.fn(), findMany: jest.fn() },
  },
}));

jest.mock("../../src/services/businessAuditService", () => ({
  writeBusinessAudit: jest.fn(),
}));

import prisma from "../../src/utils/prisma";
import { getManualCompanyStatement } from "../../src/controller/dealerManualCompanyController";

const db = prisma as any;
const at = (iso: string) => new Date(`${iso}T06:00:00.000Z`);

function makeResponse() {
  const response: any = { status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  return response;
}

async function run(query: Record<string, string>) {
  const res = makeResponse();
  await getManualCompanyStatement({ userId: "owner-1", params: { id: "supplier-1" }, query } as any, res);
  return res;
}

const body = (res: any) => res.json.mock.calls[0][0];

describe("Supplier statement tabs (paged in the database)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.dealer.findUnique.mockResolvedValue({ id: "dealer-1" });
    db.dealerManualCompany.findUnique.mockResolvedValue({
      id: "supplier-1",
      dealerId: "dealer-1",
      name: "Feed Co",
      balance: 7900,
      totalPurchases: 15900,
      totalPayments: 8000,
      totalSettlementSales: 0,
    });
    // Live rows have voidedAt null; voided rows are counted separately.
    db.dealerManualPurchase.count.mockImplementation(({ where }: any) =>
      Promise.resolve(where.voidedAt === null ? 23 : 2)
    );
    db.dealerManualCompanyPayment.count.mockImplementation(({ where }: any) =>
      Promise.resolve(where.voidedAt === null ? 4 : 1)
    );
    db.dealerSale.count.mockResolvedValue(0);
    db.dealerManualCompanyAdjustment.count.mockResolvedValue(1);
    db.dealerManualCompanyAdjustment.findFirst.mockResolvedValue({ amount: 500, date: at("2026-09-01"), notes: null });
    db.dealerManualPurchase.findMany.mockResolvedValue([
      { id: "p11", date: at("2026-10-01"), totalAmount: 7900, tradeDiscountAmount: 100, items: [{ totalAmount: 8000 }] },
    ]);
  });

  it("pages purchases in the database and returns true counts for every tab", async () => {
    const res = await run({ type: "purchases", page: "2" });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(db.dealerManualPurchase.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { manualCompanyId: "supplier-1", voidedAt: null },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }],
        skip: 10,
        take: 10,
      })
    );
    const data = body(res).data;
    expect(data.counts).toEqual({ purchases: 23, payments: 4, settlements: 0, adjustments: 1, voided: 3 });
    expect(data.pagination).toEqual({ page: 2, limit: 10, total: 23, totalPages: 3 });
    expect(data.rows[0]).toMatchObject({ type: "PURCHASE", id: "p11", amount: 7900, tradeDiscountAmount: 100 });
    expect(data.openingBalance).toMatchObject({ amount: 500 });
    expect(data.company.balance).toBe(7900);
  });

  it("merges voided purchases and payments by void time, newest first", async () => {
    db.dealerManualPurchase.findMany.mockResolvedValue([
      { id: "vp1", date: at("2026-09-01"), totalAmount: 100, voidedAt: at("2026-10-05"), items: [] },
      { id: "vp2", date: at("2026-09-02"), totalAmount: 200, voidedAt: at("2026-10-01"), items: [] },
    ]);
    db.dealerManualCompanyPayment.findMany.mockResolvedValue([
      { id: "vpay1", paymentDate: at("2026-09-03"), amount: 50, voidedAt: at("2026-10-03"), direction: "MADE" },
    ]);

    const res = await run({ type: "voided", limit: "2" });
    const data = body(res).data;
    expect(data.rows.map((r: any) => r.id)).toEqual(["vp1", "vpay1"]);
    expect(data.rows.map((r: any) => r.kind)).toEqual(["PURCHASE", "PAYMENT"]);
    expect(data.pagination).toMatchObject({ total: 3, totalPages: 2 });
    expect(db.dealerManualPurchase.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { manualCompanyId: "supplier-1", voidedAt: { not: null } }, take: 2 })
    );
  });

  it("pages payments by payment date", async () => {
    db.dealerManualCompanyPayment.findMany.mockResolvedValue([
      { id: "pay1", paymentDate: at("2026-10-02"), amount: 100, direction: "MADE", balanceAfter: 7900 },
    ]);
    const res = await run({ type: "payments" });
    expect(db.dealerManualCompanyPayment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }, { id: "desc" }], skip: 0, take: 10 })
    );
    expect(body(res).data.rows[0]).toMatchObject({ type: "PAYMENT", balanceAfter: 7900 });
  });

  it("rejects an unknown tab and keeps page and limit in range", async () => {
    expect((await run({ type: "everything" })).status).toHaveBeenCalledWith(400);

    const res = await run({ type: "purchases", page: "0", limit: "999" });
    expect(db.dealerManualPurchase.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 50 }));
    expect(body(res).data.pagination).toMatchObject({ page: 1, limit: 50 });
  });

  it("keeps the old mixed statement when no tab is asked for", async () => {
    db.dealerManualCompanyPayment.findMany.mockResolvedValue([]);
    db.dealerManualCompanyAdjustment.findMany.mockResolvedValue([]);
    db.dealerSale.findMany.mockResolvedValue([]);
    const res = await run({});
    const data = body(res).data;
    expect(data.transactions).toHaveLength(1);
    expect(data.voidedTransactions).toEqual([]);
    expect(data.pagination).toMatchObject({ page: 1, limit: 20, total: 1 });
    expect(data.rows).toBeUndefined();
  });

  it("does not show another dealer's supplier", async () => {
    db.dealerManualCompany.findUnique.mockResolvedValue({ id: "supplier-1", dealerId: "dealer-2" });
    expect((await run({ type: "purchases" })).status).toHaveBeenCalledWith(404);
    expect(db.dealerManualPurchase.findMany).not.toHaveBeenCalled();
  });
});
