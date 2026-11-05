"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, PackageOpen } from "lucide-react";
import { Card, CardContent } from "@/common/components/ui/card";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Textarea } from "@/common/components/ui/textarea";
import { Button } from "@/common/components/ui/button";
import { cn } from "@/common/lib/utils";
import {
  BulkBroilerPurchase,
  BulkBroilerPurchaseDerived,
  formatCurrency,
  hasPurchaseData,
  round2,
} from "./types";

interface Props {
  purchase: BulkBroilerPurchase;
  derived: BulkBroilerPurchaseDerived;
  /** Errors returned by the server under `errors.purchase` on the last save
   * attempt. Shown independently of `showErrors` so the dealer always sees
   * why the server refused. */
  serverErrors?: string[];
  showErrors: boolean;
  onChange: (patch: Partial<BulkBroilerPurchase>) => void;
}

export function BroilerPurchaseCard({ purchase, derived, serverErrors, showErrors, onChange }: Props) {
  const filled = hasPurchaseData(purchase);
  const hasServerErrors = !!serverErrors && serverErrors.length > 0;
  // Auto-open if the server flagged problems; otherwise open when there's
  // existing data. User can still manually collapse.
  const [open, setOpen] = useState(filled || hasServerErrors);
  useEffect(() => {
    if (hasServerErrors) setOpen(true);
  }, [hasServerErrors]);
  const clientErrors = showErrors ? derived.errors : [];

  const summary = filled
    ? `Bought ${purchase.weightKg || 0} kg${
        purchase.ratePerKg > 0 ? ` at रू${purchase.ratePerKg}/kg` : ""
      } = ${formatCurrency(purchase.totalCost)}${
        purchase.broilerCount ? ` · ${purchase.broilerCount} birds` : ""
      }`
    : "Not recorded — tap to add";

  // When weight or rate changes and the user has not touched totalCost, we
  // auto-fill the total. If the user has typed into totalCost themselves,
  // we stop clobbering it.
  const changeWeight = (weightKg: number) => {
    const next: Partial<BulkBroilerPurchase> = { weightKg };
    if (!purchase.totalCostTouched && purchase.ratePerKg > 0) {
      next.totalCost = round2(weightKg * purchase.ratePerKg);
    }
    onChange(next);
  };
  const changeRate = (ratePerKg: number) => {
    const next: Partial<BulkBroilerPurchase> = { ratePerKg };
    if (!purchase.totalCostTouched && purchase.weightKg > 0) {
      next.totalCost = round2(purchase.weightKg * ratePerKg);
    }
    onChange(next);
  };
  const changeTotal = (raw: string) => {
    const totalCost = parseFloat(raw) || 0;
    // Clearing the field returns to auto-compute; any typed value marks it as
    // user-controlled so weight/rate edits leave it alone.
    const totalCostTouched = raw.trim() !== "";
    onChange({ totalCost, totalCostTouched });
  };

  return (
    <Card>
      <CardContent className="p-0">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40"
          aria-expanded={open}
        >
          <div className="flex items-center gap-2">
            <PackageOpen className="h-4 w-4 text-amber-600" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">What you bought from this farmer</span>
                <span className="rounded-full border border-muted-foreground/30 px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
                  Optional
                </span>
              </div>
              <div className={cn("mt-0.5 text-xs", filled ? "text-foreground" : "text-muted-foreground")}>
                {summary}
              </div>
            </div>
          </div>
          {open ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
        </button>

        {open && (
          <div className="space-y-4 border-t p-4">
            <p className="text-xs text-muted-foreground">
              Helps you see your rough profit/loss on this lot. Not used for settlement math.
            </p>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="purchase-weight" className="text-xs">Weight bought (kg)</Label>
                <Input
                  id="purchase-weight"
                  type="number"
                  min={0}
                  step={0.01}
                  value={purchase.weightKg || ""}
                  onChange={(e) => changeWeight(parseFloat(e.target.value) || 0)}
                  className="h-9"
                  placeholder="0"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="purchase-rate" className="text-xs">Rate per kg (रू)</Label>
                <Input
                  id="purchase-rate"
                  type="number"
                  min={0}
                  step={0.01}
                  value={purchase.ratePerKg || ""}
                  onChange={(e) => changeRate(parseFloat(e.target.value) || 0)}
                  className="h-9"
                  placeholder="0"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="purchase-total" className="text-xs">
                  Total cost (रू)
                  {!purchase.totalCostTouched && purchase.weightKg > 0 && purchase.ratePerKg > 0 && (
                    <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                      (auto)
                    </span>
                  )}
                </Label>
                <Input
                  id="purchase-total"
                  type="number"
                  min={0}
                  step={0.01}
                  value={purchase.totalCost || ""}
                  onChange={(e) => changeTotal(e.target.value)}
                  className="h-9"
                  placeholder="0"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="purchase-birds" className="text-xs">Birds (optional)</Label>
                <Input
                  id="purchase-birds"
                  type="number"
                  min={1}
                  step={1}
                  value={purchase.broilerCount ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    onChange({ broilerCount: v === "" ? null : Number(v) });
                  }}
                  className="h-9"
                  placeholder="—"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="purchase-notes" className="text-xs">Notes (optional)</Label>
                <Textarea
                  id="purchase-notes"
                  value={purchase.notes}
                  onChange={(e) => onChange({ notes: e.target.value })}
                  rows={2}
                  placeholder="e.g. paid cash on the farm"
                />
              </div>
            </div>

            {(clientErrors.length > 0 || hasServerErrors) && (
              <ul className="list-disc rounded-md border border-destructive/30 bg-destructive/5 px-6 py-2 text-xs text-destructive">
                {clientErrors.map((e, i) => (
                  <li key={`c-${i}`}>{e}</li>
                ))}
                {(serverErrors ?? []).map((e, i) => (
                  <li key={`s-${i}`}>{e}</li>
                ))}
              </ul>
            )}

            {filled && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={() => {
                    onChange({
                      weightKg: 0,
                      ratePerKg: 0,
                      totalCost: 0,
                      totalCostTouched: false,
                      broilerCount: null,
                      notes: "",
                    });
                  }}
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
