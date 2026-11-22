"use client";

import { Button } from "@/common/components/ui/button";
import { Trash2 } from "lucide-react";
import type {
  CashAccount,
  CashCategory,
  CashMovement,
} from "@/fetchers/farmer/farmerCashflowQueries";
import { formatCashAmount } from "@/components/cash-in-hand/cashFormat";
import { BS_MONTH_NAMES } from "@/common/lib/nepali-date";

/** Pretty-print a BS "YYYY-MM-DD" string directly (no AD conversion). */
function formatBs(bsDate: string): string {
  const [y, m, d] = bsDate.split("-").map(Number);
  if (!y || !m || !d || m < 1 || m > 12) return bsDate;
  return `${BS_MONTH_NAMES[m - 1]} ${d}, ${y}`;
}

const CATEGORY_LABEL: Record<CashCategory, string> = {
  CASH_IN: "Cash in",
  CASH_OUT: "Cash out",
  SALE_RECEIPT: "Sale receipt",
  EXPENSE: "Expense",
  PAYMENT_TO_DEALER: "Payment to dealer",
  OWNER_INVEST: "Owner invest",
  OWNER_DRAW: "Owner draw",
  LOAN_RECEIVED: "Loan received",
  LOAN_REPAYMENT: "Loan repayment",
  TRANSFER: "Transfer",
  OPENING_ADJUSTMENT: "Opening adjustment",
};

interface MovementsTableProps {
  movements: CashMovement[];
  accounts: CashAccount[];
  deleting: string | null;
  onDelete: (movement: CashMovement) => void;
}

export function MovementsTable({
  movements,
  accounts,
  deleting,
  onDelete,
}: MovementsTableProps) {
  const nameOf = (id: string) =>
    accounts.find((a) => a.id === id)?.name ?? "(unknown)";

  if (movements.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-gray-200 py-8 text-center text-sm text-muted-foreground">
        No movements in this period yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Date (BS)</th>
            <th className="px-3 py-2">Account</th>
            <th className="px-3 py-2">Category</th>
            <th className="px-3 py-2">Party / note</th>
            <th className="px-3 py-2 text-right">Amount</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {movements.map((m) => {
            const signed = m.direction === "IN" ? m.amount : -m.amount;
            const canDelete =
              m.sourceType === "MANUAL" || m.sourceType === "TRANSFER";
            const tooltip = !canDelete
              ? "Auto-posted. Delete the source sale / receipt / expense instead."
              : m.sourceType === "TRANSFER"
                ? "Deletes both legs."
                : undefined;
            return (
              <tr key={m.id}>
                <td className="px-3 py-2 whitespace-nowrap">
                  {formatBs(m.bsDate)}
                </td>
                <td className="px-3 py-2">{nameOf(m.accountId)}</td>
                <td className="px-3 py-2">{CATEGORY_LABEL[m.category]}</td>
                <td className="px-3 py-2">
                  <div>{m.partyName ?? "—"}</div>
                  {m.notes && (
                    <div className="text-xs text-muted-foreground">
                      {m.notes}
                    </div>
                  )}
                </td>
                <td
                  className={`px-3 py-2 text-right tabular-nums ${
                    signed >= 0 ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {formatCashAmount(signed)}
                </td>
                <td className="px-3 py-2 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!canDelete || deleting === m.id}
                    title={tooltip}
                    onClick={() => onDelete(m)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
