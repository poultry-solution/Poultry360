import type { BsDateRange, CashCategory, CashMovement } from "./types";

const ALL_CATEGORIES: readonly CashCategory[] = [
  "CASH_IN",
  "CASH_OUT",
  "SALE_RECEIPT",
  "EXPENSE",
  "PAYMENT_TO_DEALER",
  "OWNER_INVEST",
  "OWNER_DRAW",
  "LOAN_RECEIVED",
  "LOAN_REPAYMENT",
  "TRANSFER",
  "OPENING_ADJUSTMENT",
];

export interface CashflowStatement {
  range: BsDateRange;
  openingBalance: number;
  inflow: Record<CashCategory, number>;
  outflow: Record<CashCategory, number>;
  totalInflow: number;
  totalOutflow: number;
  netChange: number;
  closingBalance: number;
  transfers: { in: number; out: number };
}

/**
 * Period-level inflow / outflow rollup over the movement list.
 *
 * Transfers move money between accounts but do not change the total, so they
 * are excluded from inflow/outflow and surface in their own section instead.
 * `openingBalance` is the computed total across all accounts at the start of
 * the range (callers derive this via `computeAccountBalance` per account).
 */
export function rollupCashflowStatement(
  movements: readonly CashMovement[],
  range: BsDateRange,
  openingBalance: number,
): CashflowStatement {
  const inflow = emptyCategoryRecord();
  const outflow = emptyCategoryRecord();
  const transfers = { in: 0, out: 0 };

  for (const m of movements) {
    if (m.bsDate < range.fromBsDate || m.bsDate > range.toBsDate) continue;
    if (m.category === "TRANSFER") {
      if (m.direction === "IN") transfers.in += m.amount;
      else transfers.out += m.amount;
      continue;
    }
    if (m.direction === "IN") inflow[m.category] += m.amount;
    else outflow[m.category] += m.amount;
  }

  const totalInflow = sumRecord(inflow);
  const totalOutflow = sumRecord(outflow);
  const netChange = totalInflow - totalOutflow;

  return {
    range,
    openingBalance,
    inflow,
    outflow,
    totalInflow,
    totalOutflow,
    netChange,
    closingBalance: openingBalance + netChange,
    transfers,
  };
}

function emptyCategoryRecord(): Record<CashCategory, number> {
  const r = {} as Record<CashCategory, number>;
  for (const c of ALL_CATEGORIES) r[c] = 0;
  return r;
}

function sumRecord(r: Record<CashCategory, number>): number {
  let total = 0;
  for (const c of ALL_CATEGORIES) {
    if (c === "TRANSFER") continue;
    total += r[c];
  }
  return total;
}
