"use client";

import { formatMoneyINR, getTodayLocalDate } from "@/lib/utils";

interface ReceiptLine { name: string; qty: number; rate: number; amount: number }

interface ReceiptPreviewProps {
  shopName: string;
  billNo: string;
  date: string;
  lines: ReceiptLine[];
  subTotal: number;
  discount: number;
  tax: number;
  grandTotal: number;
}

export function ReceiptPreview({ shopName, billNo, date, lines, subTotal, discount, tax, grandTotal }: ReceiptPreviewProps) {
  return (
    <div className="border rounded-md p-4 text-sm bg-white">
      <div className="text-center mb-3">
        <div className="font-semibold">{shopName}</div>
        <div className="text-xs text-muted-foreground">Bill #{billNo} • {date || getTodayLocalDate()}</div>
      </div>
      <div className="divide-y">
        <div className="grid grid-cols-4 pb-2 font-medium">
          <div className="col-span-2">Item</div>
          <div className="text-right">Qty</div>
          <div className="text-right">Amount</div>
        </div>
        {lines.map((l, idx) => (
          <div key={idx} className="grid grid-cols-4 py-1">
            <div className="col-span-2 truncate">{l.name}</div>
            <div className="text-right">{l.qty}</div>
            <div className="text-right">{formatMoneyINR(l.amount)}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-1">
        <div className="flex justify-between"><span>Subtotal</span><span>{formatMoneyINR(subTotal)}</span></div>
        <div className="flex justify-between"><span>Discount</span><span>{formatMoneyINR(discount)}</span></div>
        <div className="flex justify-between"><span>Tax</span><span>{formatMoneyINR(tax)}</span></div>
        <div className="flex justify-between font-semibold"><span>Grand Total</span><span>{formatMoneyINR(grandTotal)}</span></div>
      </div>
    </div>
  );
}

