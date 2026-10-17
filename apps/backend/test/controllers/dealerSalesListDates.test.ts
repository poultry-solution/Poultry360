jest.mock("../../src/utils/prisma", () => ({
  __esModule: true,
  default: {
    dealer: { findUnique: jest.fn() },
    dealerSale: { findMany: jest.fn(), count: jest.fn() },
  },
}));

jest.mock("../../src/services/businessAuditService", () => ({
  writeBusinessAudit: jest.fn(),
}));

import prisma from "../../src/utils/prisma";
import { getDealerSales } from "../../src/controller/dealerSaleController";

const db = prisma as any;

function makeResponse() {
  const response: any = { status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  return response;
}

async function run(query: Record<string, string>) {
  const res = makeResponse();
  await getDealerSales({ userId: "owner-1", query } as any, res);
  return res;
}

describe("Dealer sales list: date filter uses Nepal days", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.dealer.findUnique.mockResolvedValue({ id: "dealer-1" });
    db.dealerSale.findMany.mockResolvedValue([]);
    db.dealerSale.count.mockResolvedValue(0);
  });

  it("covers 12:00 AM to 11:59 PM Nepal time", async () => {
    await run({ startDate: "2026-10-01", endDate: "2026-10-13" });
    expect(db.dealerSale.findMany.mock.calls[0][0].where.date).toEqual({
      gte: new Date("2026-10-01T00:00:00.000+05:45"),
      lte: new Date("2026-10-13T23:59:59.999+05:45"),
    });
  });

  it("still allows only a start or only an end date", async () => {
    await run({ startDate: "2026-10-01" });
    expect(db.dealerSale.findMany.mock.calls[0][0].where.date).toEqual({
      gte: new Date("2026-10-01T00:00:00.000+05:45"),
    });
  });

  it("rejects a bad date instead of guessing", async () => {
    const res = await run({ startDate: "01/10/2026" });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(db.dealerSale.findMany).not.toHaveBeenCalled();
  });
});
