"use client";

import { Button } from "@/common/components/ui/button";
import { Trash2 } from "lucide-react";
import type {
  CashAccount,
  CashCategory,
  CashMovement,
} from "@/fetchers/farmer/farmerCashflowQueries";
import { formatCashAmount } from "@/components/cash-in-hand/cashFormat";
import { formatBsLong as formatBs } from "@/components/cashflow/cashflowText";

const CATEGORY_LABEL: Record<CashCategory, string> = {
  CASH_IN: "Cash in",
  CASH_OUT: "Cash out",
  SALE_RECEIPT: "Money received",
  EXPENSE: "Expense",
  PAYMENT_TO_DEALER: "Payment to dealer",
  OWNER_INVEST: "Owner invest",
  OWNER_DRAW: "Owner draw",
  LOAN_RECEIVED: "Loan received",
  LOAN_REPAYMENT: "Loan repayment",
  TRANSFER: "Transfer",
  OPENING_ADJUSTMENT: "Cash correction",
};

/** Auto entries read better by where they came from. */
function labelFor(m: CashMovement): string {
  if (m.sourceType === "STAFF_PAYMENT") return "Salary";
  if (m.sourceType === "SUPPLIER_PAYMENT") return "Supplier payment";
  if (m.sourceType === "DEALER_SALE_PAYMENT") return "Sale payment";
  if (m.sourceType === "DEALER_LEDGER_RECEIPT") return "Customer payment";
  if (m.sourceType === "DEALER_LEDGER_PAYMENT") return "Customer refund / advance";
  if (m.sourceType === "DEALER_SUPPLIER_PAYMENT") return "Supplier payment";
  if (m.sourceType === "BROILER_SETTLEMENT_PROCEEDS") return "Broiler settlement — proceeds";
  if (m.sourceType === "BROILER_SETTLEMENT_PAYOUT") return "Broiler settlement — farmer payout";
  return CATEGORY_LABEL[m.category];
}

const NOT_COUNTED_NOTE = "Not in balance (before your cash count)";

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
        No entries in this period yet.
      </div>
    );
  }

  const canDeleteOf = (m: CashMovement) =>
    m.sourceType === "MANUAL" || m.sourceType === "TRANSFER";

  return (
    <>
    {/* Phone: one card per entry so the amount is always visible. */}
    <ul className="divide-y divide-gray-100 rounded-md border border-gray-200 sm:hidden">
      {movements.map((m) => {
        const signed = m.direction === "IN" ? m.amount : -m.amount;
        const counted = m.countedInBalance !== false;
        return (
          <li key={m.id} className={`flex items-start justify-between gap-3 px-3 py-3 ${counted ? "" : "opacity-60"}`}>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{m.partyName ?? "—"}</div>
              <div className="text-xs text-muted-foreground">
                {formatBs(m.bsDate)} · {labelFor(m)} · {nameOf(m.accountId)}
              </div>
              {m.notes && <div className="text-xs text-muted-foreground">{m.notes}</div>}
              {!counted && <div className="text-xs text-amber-700">{NOT_COUNTED_NOTE}</div>}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <span className={`whitespace-nowrap text-sm font-semibold tabular-nums ${signed >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                {formatCashAmount(signed)}
              </span>
              {canDeleteOf(m) && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={deleting === m.id}
                  onClick={() => onDelete(m)}
                  aria-label="Delete entry"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
    <div className="hidden overflow-x-auto rounded-md border border-gray-200 sm:block">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Date (BS)</th>
            <th className="px-3 py-2">Account</th>
            <th className="px-3 py-2">Type</th>
            <th className="px-3 py-2">Party / note</th>
            <th className="px-3 py-2 text-right">Amount</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {movements.map((m) => {
            const signed = m.direction === "IN" ? m.amount : -m.amount;
            const canDelete = canDeleteOf(m);
            const counted = m.countedInBalance !== false;
            const tooltip = !canDelete
              ? "Added automatically. To remove it, delete the sale, payment or expense it came from."
              : m.sourceType === "TRANSFER"
                ? "Deletes both legs."
                : undefined;
            return (
              <tr key={m.id} className={counted ? "" : "opacity-60"}>
                <td className="px-3 py-2 whitespace-nowrap">
                  {formatBs(m.bsDate)}
                </td>
                <td className="px-3 py-2">{nameOf(m.accountId)}</td>
                <td className="px-3 py-2">{labelFor(m)}</td>
                <td className="px-3 py-2">
                  <div>{m.partyName ?? "—"}</div>
                  {m.notes && (
                    <div className="text-xs text-muted-foreground">
                      {m.notes}
                    </div>
                  )}
                  {!counted && (
                    <div className="text-xs text-amber-700">{NOT_COUNTED_NOTE}</div>
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
    </>
  );
}
