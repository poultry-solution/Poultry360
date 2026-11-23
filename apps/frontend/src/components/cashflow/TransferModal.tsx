"use client";

import { useState } from "react";
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
import { NepaliDatePicker } from "@/common/components/ui/nepali-date-picker";
import { AccountPicker } from "@/components/cashflow/AccountPicker";
import type { CashAccount } from "@/fetchers/farmer/farmerCashflowQueries";
import { toNepalDayAd, convertADtoBS } from "@/common/lib/nepali-date";
import { toast } from "sonner";

function todayBs(): string {
  return convertADtoBS(toNepalDayAd(new Date()));
}

interface TransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: CashAccount[];
  submitting: boolean;
  onSubmit: (input: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    bsDate: string;
    note?: string;
  }) => Promise<void> | void;
}

export function TransferModal({
  open,
  onOpenChange,
  accounts,
  submitting,
  onSubmit,
}: TransferModalProps) {
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [bsDate, setBsDate] = useState(todayBs());
  const [note, setNote] = useState("");

  function reset() {
    setFromId("");
    setToId("");
    setAmountStr("");
    setBsDate(todayBs());
    setNote("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(amountStr);
    if (!fromId || !toId) return toast.error("Choose both accounts");
    if (fromId === toId)
      return toast.error("Transfer requires two different accounts");
    if (!Number.isFinite(amount) || amount <= 0)
      return toast.error("Enter a positive amount");

    await onSubmit({
      fromAccountId: fromId,
      toAccountId: toId,
      amount,
      bsDate,
      note: note.trim() || undefined,
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
          <DialogTitle>Transfer between accounts</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>From</Label>
            <AccountPicker
              accounts={accounts}
              value={fromId}
              onChange={setFromId}
              disabledIds={toId ? [toId] : []}
            />
          </div>

          <div>
            <Label>To</Label>
            <AccountPicker
              accounts={accounts}
              value={toId}
              onChange={setToId}
              disabledIds={fromId ? [fromId] : []}
            />
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
            <Label>Note (optional)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
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
              {submitting ? "Transferring..." : "Transfer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
