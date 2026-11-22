"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { formatCashAmount } from "@/components/cash-in-hand/cashFormat";
import { Loader2 } from "lucide-react";

interface ReconcileWizardProps {
  computedCash: number;
  submitting: boolean;
  onSubmit: (drawer: number) => Promise<void> | void;
}

/**
 * One-shot anchor. The farmer is shown the cashbook's computed Cash balance
 * (opening + Σ movements) and asked to confirm what's actually in their
 * drawer. Any delta posts a single OPENING_ADJUSTMENT movement so the
 * cashbook balance exactly matches the physical drawer going forward.
 *
 * Intentionally non-dismissible — the backend only accepts one call per
 * farmer and the UI uses this exclusively as a post-backfill confirmation.
 * Further corrections go through normal Cash in / Cash out.
 *
 * Callers must only mount this component once the computed value is loaded
 * (e.g. `needsReconciliation === true` from a successful query). Mounting
 * with a stale 0 and later updating the prop would leave the input locked
 * to 0 — the exact bug that posted a bad OUT of (computed - 0) in local.
 */
export function ReconcileWizard({
  computedCash,
  submitting,
  onSubmit,
}: ReconcileWizardProps) {
  const [drawerStr, setDrawerStr] = useState(() =>
    Number.isFinite(computedCash) ? String(computedCash.toFixed(2)) : "0",
  );
  const [touched, setTouched] = useState(false);

  // Defensive sync in case the computed value changes while the wizard is
  // still mounted (e.g. a background refetch after a receipt was auto-posted
  // in another tab). Only overrides the input while the user hasn't touched
  // it — once they type, their value wins.
  useEffect(() => {
    if (touched) return;
    if (!Number.isFinite(computedCash)) return;
    setDrawerStr(computedCash.toFixed(2));
  }, [computedCash, touched]);

  const drawer = Number(drawerStr);
  const valid = Number.isFinite(drawer) && drawer >= 0;
  const diff = valid ? Math.round((drawer - computedCash) * 100) / 100 : 0;

  async function handleSubmit() {
    if (!valid) return;
    await onSubmit(drawer);
  }

  return (
    <Dialog open>
      <DialogContent
        className="max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Confirm your cash on hand</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-md bg-muted/50 p-3 text-sm">
            <p className="text-muted-foreground">
              Based on your sales, receipts, expenses and payments so far, your
              Cash balance should be:
            </p>
            <p className="mt-1 text-lg font-semibold">
              {formatCashAmount(computedCash)}
            </p>
          </div>

          <div>
            <Label htmlFor="drawer">What&apos;s actually in your drawer right now?</Label>
            <Input
              id="drawer"
              type="number"
              step="0.01"
              min="0"
              value={drawerStr}
              onChange={(e) => {
                setDrawerStr(e.target.value);
                setTouched(true);
              }}
              disabled={submitting}
              autoFocus
            />
            {!valid && touched && (
              <p className="mt-1 text-xs text-red-600">
                Enter a non-negative amount
              </p>
            )}
          </div>

          {valid && Math.abs(diff) >= 0.01 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              We&apos;ll record a one-time{" "}
              <strong>{diff > 0 ? "Cash in" : "Cash out"}</strong> of{" "}
              <strong>{formatCashAmount(Math.abs(diff))}</strong> so the
              balance matches your drawer. This stays visible in your history
              as a reconciliation.
            </div>
          )}
          {valid && Math.abs(diff) < 0.01 && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
              The computed balance already matches. We&apos;ll just confirm
              it — no adjustment needed.
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!valid || submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Confirming...
                </>
              ) : (
                "Confirm"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
