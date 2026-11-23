import { computeAccountBalance, countsInBalance } from "../../../src/common/cashflow/balance";
import type { CashAccount, CashMovement } from "../../../src/common/cashflow/types";

const mk = (
  overrides: Partial<CashMovement> & Pick<CashMovement, "accountId" | "bsDate" | "direction" | "amount">,
): CashMovement => ({
  id: overrides.id ?? "m",
  userId: overrides.userId ?? "u1",
  accountId: overrides.accountId,
  bsDate: overrides.bsDate,
  direction: overrides.direction,
  amount: overrides.amount,
  category: overrides.category ?? "CASH_IN",
  sourceType: overrides.sourceType ?? "MANUAL",
  sourceId: overrides.sourceId ?? null,
  transferId: overrides.transferId ?? null,
  partyName: overrides.partyName ?? "test",
  notes: overrides.notes ?? null,
  createdAt: overrides.createdAt ?? new Date(0),
});

const cashAccount = (overrides: Partial<CashAccount> = {}): CashAccount => ({
  id: "cash-1",
  userId: "u1",
  type: "CASH",
  name: "Cash",
  openingBalance: 0,
  openingBsDate: "2083-01-01",
  archivedAt: null,
  openingBalanceSetAt: null,
  ...overrides,
});

describe("computeAccountBalance", () => {
  it("returns opening balance when there are no movements", () => {
    expect(computeAccountBalance(cashAccount({ openingBalance: 1000 }), [])).toBe(1000);
  });

  it("adds IN and subtracts OUT for the account", () => {
    const a = cashAccount({ openingBalance: 500 });
    const ms = [
      mk({ accountId: "cash-1", bsDate: "2083-04-10", direction: "IN", amount: 200 }),
      mk({ accountId: "cash-1", bsDate: "2083-04-11", direction: "OUT", amount: 50 }),
    ];
    expect(computeAccountBalance(a, ms)).toBe(650);
  });

  it("ignores movements belonging to other accounts", () => {
    const a = cashAccount();
    const ms = [
      mk({ accountId: "cash-1", bsDate: "2083-04-10", direction: "IN", amount: 100 }),
      mk({ accountId: "bank-x", bsDate: "2083-04-10", direction: "IN", amount: 9999 }),
    ];
    expect(computeAccountBalance(a, ms)).toBe(100);
  });

  it("caps at asOfBsDate when provided", () => {
    const a = cashAccount({ openingBalance: 100 });
    const ms = [
      mk({ accountId: "cash-1", bsDate: "2083-04-10", direction: "IN", amount: 50 }),
      mk({ accountId: "cash-1", bsDate: "2083-04-20", direction: "IN", amount: 1000 }),
    ];
    expect(computeAccountBalance(a, ms, "2083-04-15")).toBe(150);
  });

  it("respects opening date — a bank added later must not alter the past", () => {
    const bank = cashAccount({
      id: "bank-1",
      type: "BANK",
      openingBalance: 10_000,
      openingBsDate: "2083-08-01",
    });
    const ms = [
      // From a time before the bank existed — ignored.
      mk({ accountId: "bank-1", bsDate: "2083-07-30", direction: "IN", amount: 5000 }),
      // On opening day — included.
      mk({ accountId: "bank-1", bsDate: "2083-08-01", direction: "OUT", amount: 1000 }),
      // After opening — included.
      mk({ accountId: "bank-1", bsDate: "2083-08-05", direction: "IN", amount: 500 }),
    ];

    // Before opening date → account did not exist yet, so it contributes 0.
    expect(computeAccountBalance(bank, ms, "2083-07-30")).toBe(0);
    // On opening date → opening - 1000.
    expect(computeAccountBalance(bank, ms, "2083-08-01")).toBe(9_000);
    // After opening date → opening - 1000 + 500.
    expect(computeAccountBalance(bank, ms, "2083-08-05")).toBe(9_500);
  });
});

describe("cash count (openingBalanceSetAt)", () => {
  const countedAt = new Date("2026-11-23T10:00:00Z");
  const counted = cashAccount({
    openingBalance: 25000,
    openingBsDate: "2083-08-07",
    openingBalanceSetAt: countedAt,
  });
  const before = new Date("2026-11-23T04:00:00Z");
  const after = new Date("2026-11-23T12:00:00Z");

  it("leaves out entries dated before the count day", () => {
    expect(countsInBalance(counted, { bsDate: "2083-08-06", createdAt: after })).toBe(false);
  });

  it("leaves out same-day entries saved before the count", () => {
    expect(countsInBalance(counted, { bsDate: "2083-08-07", createdAt: before })).toBe(false);
  });

  it("counts same-day entries saved after the count, and later days", () => {
    expect(countsInBalance(counted, { bsDate: "2083-08-07", createdAt: after })).toBe(true);
    expect(countsInBalance(counted, { bsDate: "2083-08-08", createdAt: before })).toBe(true);
  });

  it("balance equals the typed count when today's entries were saved before it", () => {
    const movements = [
      mk({ id: "a", accountId: "cash-1", bsDate: "2083-08-07", direction: "OUT", amount: 2500, createdAt: before }),
      mk({ id: "b", accountId: "cash-1", bsDate: "2083-08-07", direction: "IN", amount: 3000, createdAt: before }),
      mk({ id: "c", accountId: "cash-1", bsDate: "2083-08-06", direction: "IN", amount: 1000, createdAt: after }),
    ];
    expect(computeAccountBalance(counted, movements)).toBe(25000);
  });

  it("adds entries saved after the count", () => {
    const movements = [
      mk({ id: "a", accountId: "cash-1", bsDate: "2083-08-07", direction: "OUT", amount: 300, createdAt: after }),
    ];
    expect(computeAccountBalance(counted, movements)).toBe(24700);
  });

  it("uses only the date rule when the count was never set (banks)", () => {
    const bank = cashAccount({ id: "bank-1", type: "BANK", openingBalance: 10000, openingBsDate: "2083-08-07" });
    const movements = [
      mk({ id: "a", accountId: "bank-1", bsDate: "2083-08-07", direction: "IN", amount: 2000, createdAt: before }),
      mk({ id: "b", accountId: "bank-1", bsDate: "2083-08-06", direction: "IN", amount: 1500, createdAt: after }),
    ];
    expect(computeAccountBalance(bank, movements)).toBe(12000);
  });
});
