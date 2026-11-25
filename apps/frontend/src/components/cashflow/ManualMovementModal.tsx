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
import { Textarea } from "@/common/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import { NepaliDatePicker } from "@/common/components/ui/nepali-date-picker";
import { AccountPicker } from "@/components/cashflow/AccountPicker";
import type {
  CashAccount,
  CashCategory,
} from "@/fetchers/farmer/farmerCashflowQueries";
import { toNepalDayAd, convertADtoBS } from "@/common/lib/nepali-date";
import { toast } from "sonner";

type Direction = "IN" | "OUT";

const CATEGORY_OPTIONS: Record<Direction, { value: CashCategory; label: string }[]> = {
  IN: [
    { value: "CASH_IN", label: "General cash in" },
    { value: "OWNER_INVEST", label: "Owner invest" },
    { value: "LOAN_RECEIVED", label: "Loan received" },
  ],
  OUT: [
    { value: "CASH_OUT", label: "General cash out" },
    { value: "OWNER_DRAW", label: "Owner draw" },
    { value: "LOAN_REPAYMENT", label: "Loan repayment" },
    { value: "PAYMENT_TO_DEALER", label: "Payment to supplier" },
  ],
};

function todayBs(): string {
  return convertADtoBS(toNepalDayAd(new Date()));
}

interface ManualMovementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  direction: Direction;
  accounts: CashAccount[];
  defaultAccountId?: string;
  submitting: boolean;
  onSubmit: (input: {
    accountId: string;
    category: CashCategory;
    amount: number;
    bsDate: string;
    partyName: string;
    notes?: string;
  }) => Promise<void> | void;
}

export function ManualMovementModal({
  open,
  onOpenChange,
  direction,
  accounts,
  defaultAccountId,
  submitting,
  onSubmit,
}: ManualMovementModalProps) {
  const defaultCategory = CATEGORY_OPTIONS[direction][0].value;
  const [accountId, setAccountId] = useState(defaultAccountId ?? "");
  const [category, setCategory] = useState<CashCategory>(defaultCategory);
  const [amountStr, setAmountStr] = useState("");
  const [bsDate, setBsDate] = useState(todayBs());
  const [partyName, setPartyName] = useState("");
  const [notes, setNotes] = useState("");

  function reset() {
    setAccountId(defaultAccountId ?? "");
    setCategory(defaultCategory);
    setAmountStr("");
    setBsDate(todayBs());
    setPartyName("");
    setNotes("");
  }

  // Start fresh each time the box opens: the right type list for this
  // direction and the Cash account picked (accounts load after first render).
  useEffect(() => {
    if (open) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, direction, defaultAccountId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(amountStr);
    if (!accountId) return toast.error("Choose an account");
    if (!Number.isFinite(amount) || amount <= 0)
      return toast.error("Enter a positive amount");
    if (!partyName.trim()) return toast.error("Enter the party name");

    await onSubmit({
      accountId,
      category,
      amount,
      bsDate,
      partyName: partyName.trim(),
      notes: notes.trim() || undefined,
    });
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {direction === "IN" ? "Record cash in" : "Record cash out"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Account</Label>
            <AccountPicker
              accounts={accounts}
              value={accountId}
              onChange={setAccountId}
            />
          </div>

          <div>
            <Label>Category</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as CashCategory)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS[direction].map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Amount (रू)</Label>
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label>Date (BS)</Label>
            <NepaliDatePicker
              defaultDate={bsDate}
              onChange={(v) => setBsDate(v.bsDate)}
            />
          </div>

          <div>
            <Label>Party / reason</Label>
            <Input
              value={partyName}
              onChange={(e) => setPartyName(e.target.value)}
              placeholder={direction === "IN" ? "e.g. Ram Thapa" : "e.g. Truck rent"}
            />
          </div>

          <div>
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
