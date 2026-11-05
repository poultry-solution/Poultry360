"use client";

import { ChevronDown, ChevronRight, Receipt } from "lucide-react";
import { ChickenByFarmerSaleRow } from "@/fetchers/dealer/dealerSaleQueries";
import { DateDisplay } from "@/common/components/ui/date-display";

/** Compact table of this farmer's unsettled broiler sales. Data comes from
 * the chicken-by-farmer endpoint response (capped at 25 by the backend). */
export function FarmerSalesPanel({
  sales,
  saleCount,
  expanded,
  onToggle,
}: {
  sales: ChickenByFarmerSaleRow[];
  saleCount: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="mt-3 border-t pt-3">
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" />
        )}
        <Receipt className="h-3.5 w-3.5" />
        {expanded ? "Hide sales" : `Show sales (${saleCount})`}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          {sales.length < saleCount && (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
              Showing the latest {sales.length} of {saleCount} unsettled sales. Older
              rows are hidden here — open the Settle dialog to see totals across all of them.
            </div>
          )}
          <div className="overflow-x-auto rounded-md border">
          {sales.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No unsettled sales found for this farmer.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="p-2 font-medium">Buyer</th>
                  <th className="p-2 font-medium">Date</th>
                  <th className="p-2 text-right font-medium">Weight</th>
                  <th className="p-2 text-right font-medium">Rate</th>
                  <th className="p-2 text-right font-medium">Total</th>
                  <th className="p-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => {
                  const paid = Number(s.paidAmount);
                  const total = Number(s.totalAmount);
                  let statusLabel = "";
                  let statusClass = "";
                  if (paid >= total) {
                    statusLabel = "Paid";
                    statusClass = "text-green-700";
                  } else if (paid > 0) {
                    statusLabel = `Partial · due ${fmt(total - paid)}`;
                    statusClass = "text-amber-700";
                  } else {
                    statusLabel = `Due ${fmt(total)}`;
                    statusClass = "text-red-600";
                  }
                  return (
                    <tr key={s.id} className="border-t">
                      <td className="p-2 font-medium">{s.buyerName || "—"}</td>
                      <td className="p-2 text-muted-foreground">
                        <DateDisplay date={s.date} />
                      </td>
                      <td className="p-2 text-right">
                        {Number(s.weightKg).toFixed(2)} kg
                      </td>
                      <td className="p-2 text-right">{fmt(Number(s.ratePerKg))}</td>
                      <td className="p-2 text-right font-medium">{fmt(total)}</td>
                      <td className={`p-2 ${statusClass}`}>{statusLabel}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          </div>
        </div>
      )}
    </div>
  );
}

function fmt(amount: number): string {
  return `रू ${(Math.round(amount * 100) / 100).toFixed(2)}`;
}
