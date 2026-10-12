"use client";

import { Input } from "@/common/components/ui/input";
import { computeBroilerSaleAmount, parseWeightDiscountPercent } from "@/fetchers/sale/broilerSaleAmount";

interface BroilerWeightDiscountFieldProps {
  enabled: boolean;
  percent: string;
  weight: string;
  error?: string;
  onEnabledChange: (enabled: boolean) => void;
  onPercentChange: (percent: string) => void;
}

/** Above this the % is allowed but flagged, since "10" typed for "1.0" is an easy slip. */
const LARGE_DISCOUNT_PERCENT = 10;

/**
 * Buyers of broilers often take a % off the weighed amount. Only the bill uses
 * the reduced weight; the sale keeps the real weight for FCR and bird weight.
 */
export function BroilerWeightDiscountField({
  enabled,
  percent,
  weight,
  error,
  onEnabledChange,
  onPercentChange,
}: BroilerWeightDiscountFieldProps) {
  const realWeight = Number(weight || 0);
  const parsed = parseWeightDiscountPercent(enabled, percent);
  const billedWeight = parsed && realWeight > 0 ? computeBroilerSaleAmount(realWeight, 0, parsed).billedWeight : null;

  return (
    <div className="space-y-2 rounded-md border border-dashed p-3">
      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
          className="h-4 w-4"
        />
        Weight discount (%)
      </label>

      {enabled && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step="0.01"
              min={0}
              max={99.99}
              value={percent}
              onChange={(e) => onPercentChange(e.target.value)}
              placeholder="1"
              className="w-28"
              aria-label="Weight discount percent"
            />
            <span className="text-sm text-muted-foreground">% of weight not charged</span>
          </div>
          {error ? (
            <p className="text-xs text-red-600">{error}</p>
          ) : billedWeight !== null ? (
            <p className="text-xs text-green-700">
              {realWeight.toFixed(2)} kg − {parsed}% = <span className="font-semibold">{billedWeight.toFixed(2)} kg billed</span>
            </p>
          ) : null}
          {parsed !== null && parsed > LARGE_DISCOUNT_PERCENT && (
            <p className="text-xs text-amber-600">This is a large discount. Please check the %.</p>
          )}
          <p className="text-xs text-muted-foreground">
            FCR and bird weight still use the full {realWeight > 0 ? `${realWeight.toFixed(2)} kg` : "weight"}.
          </p>
        </div>
      )}
    </div>
  );
}
