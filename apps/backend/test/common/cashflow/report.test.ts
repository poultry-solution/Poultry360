import { rollupCashflowStatement } from "../../../src/common/cashflow/report";
import type { CashMovement } from "../../../src/common/cashflow/types";

const mk = (
  overrides: Partial<CashMovement> & Pick<CashMovement, "accountId" | "bsDate" | "direction" | "amount" | "category">,
): CashMovement => ({
  id: overrides.id ?? "m",
  userId: overrides.userId ?? "u1",
  accountId: overrides.accountId,
  bsDate: overrides.bsDate,
  direction: overrides.direction,
  amount: overrides.amount,
  category: overrides.category,
  sourceType: overrides.sourceType ?? "MANUAL",
  sourceId: overrides.sourceId ?? null,
  transferId: overrides.transferId ?? null,
  partyName: overrides.partyName ?? "test",
  notes: overrides.notes ?? null,
  createdAt: overrides.createdAt ?? new Date(0),
});

describe("rollupCashflowStatement", () => {
  const range = { fromBsDate: "2083-04-01", toBsDate: "2083-04-30" };

  it("sums IN into inflow and OUT into outflow by category", () => {
    const movements = [
      mk({ accountId: "cash-1", bsDate: "2083-04-05", direction: "IN", amount: 1000, category: "SALE_RECEIPT" }),
      mk({ accountId: "cash-1", bsDate: "2083-04-10", direction: "IN", amount: 200, category: "SALE_RECEIPT" }),
      mk({ accountId: "cash-1", bsDate: "2083-04-15", direction: "OUT", amount: 300, category: "EXPENSE" }),
      mk({ accountId: "cash-1", bsDate: "2083-04-20", direction: "IN", amount: 5000, category: "OWNER_INVEST" }),
    ];
    const r = rollupCashflowStatement(movements, range, 100);

    expect(r.inflow.SALE_RECEIPT).toBe(1200);
    expect(r.inflow.OWNER_INVEST).toBe(5000);
    expect(r.outflow.EXPENSE).toBe(300);
    expect(r.totalInflow).toBe(1200 + 5000);
    expect(r.totalOutflow).toBe(300);
    expect(r.netChange).toBe(1200 + 5000 - 300);
    expect(r.openingBalance).toBe(100);
    expect(r.closingBalance).toBe(100 + 1200 + 5000 - 300);
  });

  it("excludes TRANSFER movements from inflow/outflow and surfaces them in the transfers section", () => {
    const movements = [
      mk({ accountId: "cash-1", bsDate: "2083-04-05", direction: "OUT", amount: 500, category: "TRANSFER" }),
      mk({ accountId: "bank-1", bsDate: "2083-04-05", direction: "IN", amount: 500, category: "TRANSFER" }),
    ];
    const r = rollupCashflowStatement(movements, range, 0);

    expect(r.totalInflow).toBe(0);
    expect(r.totalOutflow).toBe(0);
    expect(r.netChange).toBe(0);
    expect(r.transfers.in).toBe(500);
    expect(r.transfers.out).toBe(500);
  });

  it("excludes movements outside the inclusive BS date range", () => {
    const movements = [
      mk({ accountId: "cash-1", bsDate: "2083-03-31", direction: "IN", amount: 9999, category: "SALE_RECEIPT" }),
      mk({ accountId: "cash-1", bsDate: "2083-04-01", direction: "IN", amount: 100, category: "SALE_RECEIPT" }),
      mk({ accountId: "cash-1", bsDate: "2083-04-30", direction: "IN", amount: 200, category: "SALE_RECEIPT" }),
      mk({ accountId: "cash-1", bsDate: "2083-05-01", direction: "IN", amount: 9999, category: "SALE_RECEIPT" }),
    ];
    const r = rollupCashflowStatement(movements, range, 0);
    expect(r.totalInflow).toBe(300);
  });
});
