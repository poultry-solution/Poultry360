import type { CashAccount, CashMovement } from "./types";

type BalanceAccount = Pick<CashAccount, "id" | "openingBalance" | "openingBsDate"> &
  Partial<Pick<CashAccount, "openingBalanceSetAt">>;

/**
 * Does this movement change the account's balance?
 *
 * The opening balance is what the farmer counted at `openingBalanceSetAt`
 * ("cash I have right now"). Money already inside that count must not be
 * added again, so a movement is left out when:
 *   - it is dated before the account's start day, or
 *   - it is dated on the start day and was saved before the count.
 * Movements saved after the count on the start day, and every later day, count.
 */
export function countsInBalance(
  account: Pick<BalanceAccount, "openingBsDate" | "openingBalanceSetAt">,
  movement: Pick<CashMovement, "bsDate" | "createdAt">,
): boolean {
  if (movement.bsDate < account.openingBsDate) return false;
  if (
    movement.bsDate === account.openingBsDate &&
    account.openingBalanceSetAt &&
    movement.createdAt &&
    new Date(movement.createdAt).getTime() < new Date(account.openingBalanceSetAt).getTime()
  ) {
    return false;
  }
  return true;
}

/**
 * Balance of a cash account at a point in time.
 *
 *   balance(A, T) = 0,                                    if T < A.openingBsDate
 *   balance(A, T) = A.openingBalance + Σ movements,       otherwise
 *     where movement.accountId == A.id AND
 *           countsInBalance(A, movement) AND
 *           movement.bsDate    <= T (if T given)
 *
 * Returning 0 for dates before `openingBsDate` is important: a bank account
 * added today must not inject its opening balance into reports for last month.
 */
export function computeAccountBalance(
  account: BalanceAccount,
  movements: readonly CashMovement[],
  asOfBsDate?: string,
): number {
  if (asOfBsDate && asOfBsDate < account.openingBsDate) {
    return 0;
  }
  let total = account.openingBalance;
  for (const m of movements) {
    if (m.accountId !== account.id) continue;
    if (!countsInBalance(account, m)) continue;
    if (asOfBsDate && m.bsDate > asOfBsDate) continue;
    total += m.direction === "IN" ? m.amount : -m.amount;
  }
  return total;
}
