"use client";

/** Ledger-style decomposition of a completed settlement. Shows where the
 * broiler revenue went: dealer's margin, farmer's prior credit cleared,
 * and the remainder paid to the farmer. The three line items always sum
 * to the broiler revenue — a clean "follow the money" layout. */
export function SettledFinancialBreakdown({
  totalProceeds,
  marginAmount,
  creditRecovered,
  farmerPayout,
}: {
  totalProceeds: number;
  marginAmount: number;
  creditRecovered: number;
  farmerPayout: number;
}) {
  const revenue = Number(totalProceeds) || 0;
  const margin = Number(marginAmount) || 0;
  const credit = Number(creditRecovered) || 0;
  const payout = Number(farmerPayout) || 0;

  return (
    <div className="rounded-md border bg-white text-sm tabular-nums">
      <div className="divide-y">
        <LedgerRow
          label="Broiler revenue"
          sublabel="collected from butchers"
          value={revenue}
        />
        <LedgerRow
          label="Your margin"
          sublabel="you kept this"
          value={margin}
          valueClassName="text-green-700"
        />
        <LedgerRow
          label="Farmer credit cleared"
          sublabel={credit > 0 ? "applied to prior due" : "nothing to clear"}
          value={credit}
          valueClassName={credit > 0 ? "" : "text-muted-foreground"}
          muted={credit === 0}
        />
      </div>
      <div className="border-t bg-muted/30 px-3 py-2">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            Paid to farmer
          </span>
          <span className="text-base font-semibold text-amber-800">
            {fmt(payout)}
          </span>
        </div>
      </div>
    </div>
  );
}

function LedgerRow({
  label,
  sublabel,
  value,
  valueClassName,
  muted,
}: {
  label: string;
  sublabel?: string;
  value: number;
  valueClassName?: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-3 py-1.5">
      <div className="min-w-0">
        <div className={`font-medium ${muted ? "text-muted-foreground" : ""}`}>
          {label}
        </div>
        {sublabel && (
          <div className="text-[11px] text-muted-foreground">{sublabel}</div>
        )}
      </div>
      <div className={`shrink-0 font-semibold ${valueClassName ?? ""}`}>
        {fmt(value)}
      </div>
    </div>
  );
}

function fmt(amount: number): string {
  return `रू ${(Math.round(amount * 100) / 100).toFixed(2)}`;
}
