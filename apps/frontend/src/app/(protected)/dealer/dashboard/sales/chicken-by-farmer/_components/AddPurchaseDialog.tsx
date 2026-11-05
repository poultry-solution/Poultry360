"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Textarea } from "@/common/components/ui/textarea";
import { NepaliDatePicker } from "@/common/components/ui/nepali-date-picker";
import { convertADtoBS, getNepalTodayAd } from "@/common/lib/nepali-date";
import { useCreateStandaloneBroilerPurchase } from "@/fetchers/dealer/dealerSaleQueries";

/** Compact dialog for entering a broiler-purchase lot retroactively. Mirrors
 * the inline purchase card on the bulk-sale page: weight + rate auto-compute
 * total cost; the moment the user types into total cost, auto-compute
 * disengages. Append-only — successful submit closes; no edit/delete. */
export function AddPurchaseDialog({
  open,
  onOpenChange,
  farmerId,
  farmerName,
  hasExistingPurchase,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  farmerId: string;
  farmerName: string;
  /** Affects only the dialog title copy — "Add" vs "Add another lot". */
  hasExistingPurchase: boolean;
}) {
  const [weightKg, setWeightKg] = useState("");
  const [ratePerKg, setRatePerKg] = useState("");
  const [totalCost, setTotalCost] = useState("");
  const [totalCostTouched, setTotalCostTouched] = useState(false);
  const [broilerCount, setBroilerCount] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(() => getNepalTodayAd());
  const mutation = useCreateStandaloneBroilerPurchase();

  // Reset form each time the dialog opens so stale values from a previous
  // farmer don't bleed in.
  useEffect(() => {
    if (open) {
      setWeightKg("");
      setRatePerKg("");
      setTotalCost("");
      setTotalCostTouched(false);
      setBroilerCount("");
      setNotes("");
      setDate(getNepalTodayAd());
    }
  }, [open]);

  // Auto-compute total cost from weight × rate when the user hasn't
  // explicitly typed into the total-cost field.
  const handleWeight = (v: string) => {
    setWeightKg(v);
    if (!totalCostTouched) {
      const w = parseFloat(v) || 0;
      const r = parseFloat(ratePerKg) || 0;
      if (w > 0 && r > 0) setTotalCost((Math.round(w * r * 100) / 100).toString());
    }
  };
  const handleRate = (v: string) => {
    setRatePerKg(v);
    if (!totalCostTouched) {
      const w = parseFloat(weightKg) || 0;
      const r = parseFloat(v) || 0;
      if (w > 0 && r > 0) setTotalCost((Math.round(w * r * 100) / 100).toString());
    }
  };
  const handleTotalCost = (v: string) => {
    setTotalCost(v);
    setTotalCostTouched(v.trim() !== "");
  };

  const w = parseFloat(weightKg) || 0;
  const r = parseFloat(ratePerKg) || 0;
  const c = parseFloat(totalCost) || 0;
  const errors: string[] = [];
  if (w <= 0) errors.push("Weight must be greater than 0");
  if (r <= 0) errors.push("Rate must be greater than 0");
  if (c <= 0) errors.push("Total cost must be greater than 0");
  if (broilerCount.trim() !== "") {
    const bc = Number(broilerCount);
    if (!Number.isInteger(bc) || bc <= 0) errors.push("Bird count must be a positive whole number");
  }
  const canSave = errors.length === 0 && !mutation.isPending;

  const submit = async () => {
    if (!canSave) return;
    try {
      await mutation.mutateAsync({
        sourceFarmerId: farmerId,
        weightKg: w,
        ratePerKg: r,
        totalCost: c,
        broilerCount: broilerCount.trim() === "" ? null : Number(broilerCount),
        notes: notes.trim() || undefined,
        date,
      });
      toast.success("Purchase recorded");
      onOpenChange(false);
    } catch (err: any) {
      const message =
        err?.response?.data?.errors?.purchase?.[0] ||
        err?.response?.data?.message ||
        "Unable to save purchase";
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader>
          <DialogTitle>
            {hasExistingPurchase ? "Add another purchase lot" : "Add purchase cost"}
          </DialogTitle>
          <DialogDescription>
            What you paid {farmerName} for broilers. Informational only — not used in settlement math.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pur-weight" className="text-xs">Weight (kg)</Label>
              <Input
                id="pur-weight"
                type="number"
                min={0}
                step={0.01}
                value={weightKg}
                onChange={(e) => handleWeight(e.target.value)}
                className="h-9"
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pur-rate" className="text-xs">Rate per kg (रू)</Label>
              <Input
                id="pur-rate"
                type="number"
                min={0}
                step={0.01}
                value={ratePerKg}
                onChange={(e) => handleRate(e.target.value)}
                className="h-9"
                placeholder="0"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pur-total" className="text-xs">
              Total cost (रू)
              {!totalCostTouched && w > 0 && r > 0 && (
                <span className="ml-1 text-[10px] font-normal text-muted-foreground">(auto)</span>
              )}
            </Label>
            <Input
              id="pur-total"
              type="number"
              min={0}
              step={0.01}
              value={totalCost}
              onChange={(e) => handleTotalCost(e.target.value)}
              className="h-9"
              placeholder="0"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pur-birds" className="text-xs">Birds (optional)</Label>
              <Input
                id="pur-birds"
                type="number"
                min={1}
                step={1}
                value={broilerCount}
                onChange={(e) => setBroilerCount(e.target.value)}
                className="h-9"
                placeholder="—"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Date</Label>
              <NepaliDatePicker
                defaultDate={convertADtoBS(date)}
                onChange={({ adDate }) => setDate(adDate.split("T")[0])}
                className="w-full rounded-md border border-input"
                theme="light"
                language="en"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pur-notes" className="text-xs">Notes (optional)</Label>
            <Textarea
              id="pur-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. paid cash on farm"
            />
          </div>
          {errors.length > 0 && (
            <ul className="list-disc rounded-md border border-destructive/30 bg-destructive/5 px-6 py-2 text-xs text-destructive">
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSave}>
            {mutation.isPending ? "Saving…" : "Save purchase"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
