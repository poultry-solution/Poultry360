import type { CashAccount, CashMovement } from "./types";

/**
 * Balance of a cash account at a point in time.
 *
 *   balance(A, T) = 0,                                    if T < A.openingBsDate
 *   balance(A, T) = A.openingBalance + Σ movements,       otherwise
 *     where movement.accountId == A.id AND
 *           movement.bsDate    >= A.openingBsDate AND
 *           movement.bsDate    <= T (if T given)
 *
 * Returning 0 for dates before `openingBsDate` is important: a bank account
 * added today must not inject its opening balance into reports for last month.
 */
export function computeAccountBalance(
  account: Pick<CashAccount, "id" | "openingBalance" | "openingBsDate">,
  movements: readonly CashMovement[],
  asOfBsDate?: string,
): number {
  if (asOfBsDate && asOfBsDate < account.openingBsDate) {
    return 0;
  }
  let total = account.openingBalance;
  for (const m of movements) {
    if (m.accountId !== account.id) continue;
    if (m.bsDate < account.openingBsDate) continue;
    if (asOfBsDate && m.bsDate > asOfBsDate) continue;
    total += m.direction === "IN" ? m.amount : -m.amount;
  }
  return total;
}
