jest.mock("../../src/utils/prisma", () => ({
  __esModule: true,
  default: {
    $queryRaw: jest.fn(),
    dealer: { findUnique: jest.fn() },
  },
}));

jest.mock("../../src/services/businessAuditService", () => ({
  writeBusinessAudit: jest.fn(),
}));

import prisma from "../../src/utils/prisma";
import { getDealerSalesTrend, mergeTrendDays } from "../../src/services/dealerSalesTrendService";
import { getSalesTrend } from "../../src/controller/dealerSaleController";

const db = prisma as any;

/** Prisma.sql template -> one string, to check what the query filters on. */
function sqlText(call: any[]) {
  const [strings, ...values] = call;
  return strings.raw.join("?") + JSON.stringify(values);
}

function makeResponse() {
  const response: any = { status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  return response;
}

describe("Dealer sales vs collected (Home graph)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("joins sales and collections per day, sorted, rounded to paisa", () => {
    expect(
      mergeTrendDays(
        [{ day: "2026-10-02", amount: "9000.004" }, { day: "2026-10-01", amount: 500 }],
        [{ day: "2026-10-02", amount: 110 }, { day: "2026-10-03", amount: "250.5" }]
      )
    ).toEqual([
      { day: "2026-10-01", sales: 500, collected: 0 },
      { day: "2026-10-02", sales: 9000, collected: 110 },
      { day: "2026-10-03", sales: 0, collected: 250.5 },
    ]);
  });

  it("leaves out Broiler and supplier settlement sales, and payments tied to Broiler sales", async () => {
    db.$queryRaw.mockResolvedValue([]);
    await getDealerSalesTrend("dealer-1", null);

    const salesSql = sqlText(db.$queryRaw.mock.calls[0]);
    expect(salesSql).toContain(`"isChickenSale" = false`);
    expect(salesSql).toContain(`"isSupplierSettlementSale" = false`);
    expect(salesSql).toContain("5 hours 45 minutes");

    const collectedSql = sqlText(db.$queryRaw.mock.calls[1]);
    expect(collectedSql).toContain(`'PAYMENT_RECEIVED'`);
    expect(collectedSql).toContain(`'CUSTOMER'`);
    expect(collectedSql).toContain(`s."isChickenSale" = false`);
  });

  it("filters by the Nepal-day range when dates are given", async () => {
    db.dealer.findUnique.mockResolvedValue({ id: "dealer-1" });
    db.$queryRaw.mockResolvedValue([]);
    const res = makeResponse();
    await getSalesTrend({ userId: "owner-1", query: { startDate: "2026-10-01", endDate: "2026-10-13" } } as any, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const salesSql = sqlText(db.$queryRaw.mock.calls[0]);
    expect(salesSql).toContain(new Date("2026-10-01T00:00:00.000+05:45").toISOString());
    expect(salesSql).toContain(new Date("2026-10-13T23:59:59.999+05:45").toISOString());
  });

  it("rejects a half-filled range", async () => {
    const res = makeResponse();
    await getSalesTrend({ userId: "owner-1", query: { startDate: "2026-10-01" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });
});
