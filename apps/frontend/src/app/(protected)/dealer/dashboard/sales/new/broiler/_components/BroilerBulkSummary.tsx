"use client";

import { Button } from "@/common/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/common/components/ui/card";
import {
  BulkBroilerPurchase,
  BulkBroilerRow,
  BulkBroilerRowDerived,
  formatCurrency,
  hasPurchaseData,
  round2,
} from "./types";

interface Props {
  rows: BulkBroilerRow[];
  derived: BulkBroilerRowDerived[];
  purchase: BulkBroilerPurchase;
  disabled: boolean;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export function BroilerBulkSummary({ rows, derived, purchase, disabled, saving, onSave, onCancel }: Props) {
  const totalWeight = round2(rows.reduce((sum, r) => sum + r.weightKg, 0));
  const totalBroilers = rows.reduce((sum, r) => sum + (r.broilerCount ?? 0), 0);
  const totalSubtotal = round2(derived.reduce((sum, d) => sum + d.subtotal, 0));
  const totalDiscount = round2(derived.reduce((sum, d) => sum + d.discountAmount, 0));
  const totalRevenue = round2(derived.reduce((sum, d) => sum + d.lineTotal, 0));
  const totalPaid = round2(rows.reduce((sum, r) => sum + r.paidAmount, 0));
  const totalDue = round2(totalRevenue - totalPaid);
  const count = rows.length;
  const saveLabel = count <= 1 ? "Save broiler sale" : `Save ${count} broiler sales`;

  // Rough profit / loss only shown when the dealer has entered any purchase
  // info. The purchase is saved on the server alongside the sales.
  const showProfitLoss = hasPurchaseData(purchase) && purchase.totalCost > 0;
  const profit = showProfitLoss ? round2(totalRevenue - purchase.totalCost) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          <Row label="Buyers" value={String(count)} />
          <Row label="Total weight" value={`${totalWeight.toFixed(2)} kg`} />
          {totalBroilers > 0 && <Row label="Total broilers" value={String(totalBroilers)} />}
        </div>
        <div className="space-y-2 border-t pt-3 text-sm">
          {totalDiscount > 0 && (
            <>
              <Row label="Subtotal" value={formatCurrency(totalSubtotal)} />
              <Row label="Discount" value={`- ${formatCurrency(totalDiscount)}`} valueClassName="text-green-600" />
            </>
          )}
          <div className="flex items-baseline justify-between pt-1">
            <span className="font-medium">Revenue</span>
            <span className="text-xl font-bold">{formatCurrency(totalRevenue)}</span>
          </div>
          {totalPaid > 0 && (
            <Row label="Paid" value={formatCurrency(totalPaid)} valueClassName="text-green-600" />
          )}
          {totalDue > 0 && (
            <Row label="Due" value={formatCurrency(totalDue)} valueClassName="text-orange-600" />
          )}
        </div>
        {showProfitLoss && (
          <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
            <Row label="Your cost" value={formatCurrency(purchase.totalCost)} valueClassName="text-muted-foreground" />
            <div className="flex items-baseline justify-between pt-1">
              <span className="font-medium">
                {profit >= 0 ? "Rough profit" : "Rough loss"}
              </span>
              <span
                className={`text-base font-bold ${profit >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {profit >= 0
                  ? formatCurrency(profit)
                  : `- ${formatCurrency(Math.abs(profit))}`}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Based on what you entered above.
            </p>
          </div>
        )}
        <div className="space-y-2 border-t pt-3">
          <Button
            type="button"
            className="w-full"
            onClick={onSave}
            disabled={disabled || saving}
          >
            {saving ? "Saving..." : saveLabel}
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${valueClassName ?? ""}`}>{value}</span>
    </div>
  );
}
