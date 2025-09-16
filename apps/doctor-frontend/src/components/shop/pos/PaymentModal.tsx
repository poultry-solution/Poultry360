"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatMoneyINR } from "@/lib/utils";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amountDue: number;
  onConfirm: (paidTotal: number, split: { cash: number; upi: number; card: number; bank: number }) => void;
}

export function PaymentModal({ isOpen, onClose, amountDue, onConfirm }: PaymentModalProps) {
  const [split, setSplit] = useState({ cash: "", upi: "", card: "", bank: "" });
  const paid = useMemo(() => {
    return [split.cash, split.upi, split.card, split.bank].reduce((s, v) => s + Number(v || 0), 0);
  }, [split]);
  const remaining = Math.max(0, amountDue - paid);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Take Payment">
      <div className="space-y-3">
        <div className="p-3 bg-muted rounded-md text-sm">
          <div className="flex justify-between"><span>Amount Due</span><span className="font-semibold">{formatMoneyINR(amountDue)}</span></div>
          <div className="flex justify-between"><span>Paid</span><span className="font-semibold">{formatMoneyINR(paid)}</span></div>
          <div className="flex justify-between"><span>Remaining</span><span className="font-semibold">{formatMoneyINR(remaining)}</span></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="pcash">Cash</Label>
            <Input id="pcash" type="number" value={split.cash} onChange={(e) => setSplit({ ...split, cash: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="pupi">UPI</Label>
            <Input id="pupi" type="number" value={split.upi} onChange={(e) => setSplit({ ...split, upi: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="pcard">Card</Label>
            <Input id="pcard" type="number" value={split.card} onChange={(e) => setSplit({ ...split, card: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="pbank">Bank</Label>
            <Input id="pbank" type="number" value={split.bank} onChange={(e) => setSplit({ ...split, bank: e.target.value })} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onConfirm(paid, { cash: Number(split.cash || 0), upi: Number(split.upi || 0), card: Number(split.card || 0), bank: Number(split.bank || 0) })}>Confirm</Button>
        </div>
      </div>
    </Modal>
  );
}

