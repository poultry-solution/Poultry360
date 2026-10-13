jest.mock("../../src/utils/prisma", () => ({
  __esModule: true,
  default: {
    customer: { findMany: jest.fn(), count: jest.fn() },
    dealer: { findUnique: jest.fn() },
    customerTransaction: { findMany: jest.fn() },
    dealerSale: { groupBy: jest.fn() },
    dealerLedgerEntry: { groupBy: jest.fn() },
  },
}));

jest.mock("../../src/services/businessAuditService", () => ({
  writeBusinessAudit: jest.fn(),
}));

import prisma from "../../src/utils/prisma";
import { getDealerCustomers } from "../../src/controller/dealerSaleController";

const db = prisma as any;

function makeResponse() {
  const response: any = { status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  return response;
}

async function run(query: Record<string, string>) {
  const res = makeResponse();
  await getDealerCustomers({ userId: "owner-1", query } as any, res);
  return res;
}

describe("Dealer customers list: owing filter (Analytics top 5)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.customer.findMany.mockResolvedValue([{ id: "c1", name: "Ram", balance: 8990 }]);
    db.customer.count.mockResolvedValue(137);
    db.dealer.findUnique.mockResolvedValue({ id: "dealer-1" });
    db.customerTransaction.findMany.mockResolvedValue([]);
    db.dealerSale.groupBy.mockResolvedValue([]);
    db.dealerLedgerEntry.groupBy.mockResolvedValue([]);
  });

  it("returns only customers who owe, biggest balance first, with the true count", async () => {
    const res = await run({ owing: "true", limit: "5", archived: "false" });
    const call = db.customer.findMany.mock.calls[0][0];
    expect(call.where).toMatchObject({ userId: "owner-1", farmerId: null, archivedAt: null, balance: { gt: 0 } });
    expect(call.orderBy).toEqual([{ balance: "desc" }, { createdAt: "desc" }]);
    expect(call.take).toBe(5);
    expect(db.customer.count).toHaveBeenCalledWith({ where: call.where });
    expect(res.json.mock.calls[0][0].pagination.total).toBe(137);
  });

  it("keeps the normal list unchanged without the filter", async () => {
    await run({});
    const call = db.customer.findMany.mock.calls[0][0];
    expect(call.where.balance).toBeUndefined();
    expect(call.orderBy).toEqual({ createdAt: "desc" });
  });
});
