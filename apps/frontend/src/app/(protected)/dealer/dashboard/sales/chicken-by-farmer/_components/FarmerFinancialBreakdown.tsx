"use client";

import { ArrowDownRight, ArrowUpRight, ChevronDown, Minus, Plus } from "lucide-react";
import { ChickenByFarmerPurchaseSummary } from "@/fetchers/dealer/dealerSaleQueries";
import { PurchaseListPopover } from "./PurchaseListPopover";

/** Ledger-style financial breakdown for one source farmer's unsettled
 * broiler position. Shared between the per-farmer card on the settlements
 * page and the Settle dialog so the numbers always tell the same story. */
export function FarmerFinancialBreakdown({
  tentativeRevenue,
  existingDueAmount,
  purchase,
  dense,
  onAddPurchase,
  // When set, the "Your purchase cost" row becomes clickable and opens a
  // popover listing the individual lots with per-row delete. Omit in the
  // Settle dialog where the dealer shouldn't be editing records mid-flow.
  manageContext,
}: {
  tentativeRevenue: number;
  existingDueAmount: number;
  purchase: ChickenByFarmerPurchaseSummary | null;
  /** `dense` tightens spacing for the Settle dialog where vertical space matters. */
  dense?: boolean;
  /** When provided, renders an inline "Add purchase cost" / "Add another lot"
   * link. Omitted on the settle-dialog use so we don't offer the action mid-flow. */
  onAddPurchase?: () => void;
  manageContext?: { farmerId: string; farmerName: string };
}) {
  const revenue = Number(tentativeRevenue) || 0;
  const cost = purchase?.totalCost ?? 0;
  const showMargin = cost > 0;
  const grossMargin = showMargin ? round2(revenue - cost) : 0;
  const marginPct = showMargin && revenue > 0 ? Math.round((grossMargin / revenue) * 100) : 0;
  const farmerCredit = Number(existingDueAmount) || 0;

  const rowGap = dense ? "py-1" : "py-1.5";

  return (
    <div className="rounded-md border bg-white text-sm tabular-nums">
      {/* Section 1: broiler revenue vs cost */}
      <div className="divide-y">
        <LedgerRow label="Broiler revenue" sublabel="sold to butchers, unsettled" value={revenue} className={rowGap} />
        {showMargin ? (
          manageContext ? (
            <PurchaseListPopover
              farmerId={manageContext.farmerId}
              farmerName={manageContext.farmerName}
            >
              <button
                type="button"
                className={`group flex w-full items-start justify-between gap-4 px-3 text-left hover:bg-muted/30 ${rowGap}`}
                title="Click to review or delete individual purchase lots"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1 font-medium text-muted-foreground">
                    Your purchase cost
                    <ChevronDown className="h-3 w-3 opacity-50 transition-opacity group-hover:opacity-100" />
                  </div>
                  <div className="text-[11px] text-muted-foreground">{purchaseSublabel(purchase!)}</div>
                </div>
                <div className="shrink-0 font-semibold">{signedCurrency(-cost)}</div>
              </button>
            </PurchaseListPopover>
          ) : (
            <LedgerRow
              label="Your purchase cost"
              sublabel={purchaseSublabel(purchase!)}
              value={-cost}
              className={rowGap}
              muted
            />
          )
        ) : onAddPurchase ? (
          <button
            type="button"
            onClick={onAddPurchase}
            className="group flex w-full items-center justify-between gap-3 border-t border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-left hover:bg-amber-100"
          >
            <div className="flex items-center gap-2 text-amber-900">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white shadow-sm group-hover:bg-amber-600">
                <Plus className="h-3.5 w-3.5" strokeWidth={3} />
              </span>
              <div>
                <div className="text-sm font-semibold">Add purchase cost</div>
                <div className="text-[11px] text-amber-800">
                  Record what you paid {manageContext ? manageContext.farmerName : "the farmer"} to see rough profit
                </div>
              </div>
            </div>
            <span className="rounded-full border border-amber-400 bg-white px-2 py-0.5 text-[11px] font-medium text-amber-800 group-hover:bg-amber-50">
              Tap to add
            </span>
          </button>
        ) : null}
      </div>

      {showMargin && (
        <div className="border-t bg-muted/30 px-3 py-2">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Estimated gross margin
            </span>
            <div className="flex items-baseline gap-2">
              <MarginIcon profit={grossMargin} />
              <span
                className={`text-base font-semibold ${
                  grossMargin > 0
                    ? "text-green-700"
                    : grossMargin < 0
                      ? "text-red-600"
                      : "text-muted-foreground"
                }`}
              >
                {signedCurrency(grossMargin)}
              </span>
              {revenue > 0 && (
                <span className="text-[11px] text-muted-foreground">
                  ({grossMargin >= 0 ? "+" : ""}
                  {marginPct}%)
                </span>
              )}
            </div>
          </div>
          {onAddPurchase && (
            <button
              type="button"
              onClick={onAddPurchase}
              className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-amber-300 bg-white px-2 py-0.5 text-[11px] font-medium text-amber-800 hover:bg-amber-50"
            >
              <Plus className="h-3 w-3" /> Add another lot
            </button>
          )}
        </div>
      )}

      {/* Section 2: prior farmer balance — always shown so the dealer can
          see the full picture, even when the farmer has a zero balance. */}
      <div className="border-t divide-y">
        <LedgerRow
          label={
            farmerCredit > 0
              ? "Farmer owes you"
              : farmerCredit < 0
                ? "Farmer advance"
                : "Farmer balance"
          }
          sublabel={
            farmerCredit > 0
              ? "feed or other credit"
              : farmerCredit < 0
                ? "dealer owes farmer"
                : "nothing outstanding"
          }
          value={Math.abs(farmerCredit)}
          valueClassName={
            farmerCredit > 0
              ? "text-amber-700"
              : farmerCredit < 0
                ? "text-blue-700"
                : "text-muted-foreground"
          }
          className={rowGap}
        />
      </div>
    </div>
  );
}

function LedgerRow({
  label,
  sublabel,
  value,
  valueClassName,
  className,
  muted,
}: {
  label: string;
  sublabel?: string;
  value: number;
  valueClassName?: string;
  className?: string;
  muted?: boolean;
}) {
  return (
    <div className={`flex items-start justify-between gap-4 px-3 ${className ?? "py-1.5"}`}>
      <div className="min-w-0">
        <div className={`font-medium ${muted ? "text-muted-foreground" : ""}`}>
          {label}
        </div>
        {sublabel && (
          <div className="text-[11px] text-muted-foreground">{sublabel}</div>
        )}
      </div>
      <div className={`shrink-0 font-semibold ${valueClassName ?? ""}`}>
        {signedCurrency(value)}
      </div>
    </div>
  );
}

function MarginIcon({ profit }: { profit: number }) {
  if (profit > 0) return <ArrowUpRight className="h-4 w-4 text-green-600" />;
  if (profit < 0) return <ArrowDownRight className="h-4 w-4 text-red-600" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function purchaseSublabel(p: ChickenByFarmerPurchaseSummary): string {
  const parts: string[] = [];
  if (p.totalWeightKg > 0) parts.push(`${p.totalWeightKg} kg`);
  if (p.averageRatePerKg > 0) parts.push(`avg ${fmtPlain(p.averageRatePerKg)}/kg`);
  if (p.totalBroilerCount > 0) parts.push(`${p.totalBroilerCount} birds`);
  if (p.recordCount > 1) parts.push(`${p.recordCount} lots`);
  return parts.join(" · ");
}

function signedCurrency(amount: number): string {
  const n = Math.round(amount * 100) / 100;
  const abs = Math.abs(n).toFixed(2);
  if (n < 0) return `-रू ${abs}`;
  return `रू ${abs}`;
}

function fmtPlain(amount: number): string {
  return `रू ${(Math.round(amount * 100) / 100).toFixed(2)}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
