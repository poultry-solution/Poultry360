import { BS_MONTH_NAMES } from "@/common/lib/nepali-date";
import { formatCashAmount } from "@/components/cash-in-hand/cashFormat";
import type { CashAccount } from "@/fetchers/farmer/farmerCashflowQueries";

/** "Mangsir 7, 2083" from a BS "2083-08-07" string. */
export function formatBsLong(bsDate: string): string {
  const [y, m, d] = bsDate.split("-").map(Number);
  if (!y || !m || !d || m < 1 || m > 12) return bsDate;
  return `${BS_MONTH_NAMES[m - 1]} ${d}, ${y}`;
}

/** Small line under an account name: when cash was counted, or when a bank starts. */
export function accountNote(a: Pick<CashAccount, "type" | "openingBalance" | "openingBsDate" | "openingBalanceSetAt">): string {
  if (a.type === "CASH") {
    return a.openingBalanceSetAt
      ? `Counted ${formatCashAmount(a.openingBalance)} on ${formatBsLong(a.openingBsDate)}`
      : "Cash count not set yet";
  }
  return `Started ${formatBsLong(a.openingBsDate)} with ${formatCashAmount(a.openingBalance)}`;
}
