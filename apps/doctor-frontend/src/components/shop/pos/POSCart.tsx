"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatMoneyINR } from "@/lib/utils";
import { PaymentModal } from "./PaymentModal";
import { ReceiptPreview } from "./ReceiptPreview";
import { Item } from "@/types/shop";

interface CartLine {
  id: string;
  itemId: string;
  name: string;
  qty: number;
  rate: number;
  discount: number; // percent
  tax: number; // percent
}

interface POSCartProps {
  items: Item[];
}

export function POSCart({ items }: POSCartProps) {
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState("0");
  const [tax, setTax] = useState("0");
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [lastPaid, setLastPaid] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 12);
    return items.filter(i => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q)).slice(0, 12);
  }, [items, query]);

  function addToCart(item: Item) {
    setCart((prev) => {
      const existing = prev.find((l) => l.itemId === item.id);
      if (existing) {
        return prev.map((l) => l.itemId === item.id ? { ...l, qty: l.qty + 1 } : l);
      }
      return [...prev, { id: `${item.id}-${Date.now()}`, itemId: item.id, name: item.name, qty: 1, rate: item.price, discount: 0, tax: 0 }];
    });
  }

  function updateLine(id: string, changes: Partial<CartLine>) {
    setCart((prev) => prev.map((l) => l.id === id ? { ...l, ...changes } : l));
  }

  function removeLine(id: string) {
    setCart((prev) => prev.filter((l) => l.id !== id));
  }

  const subTotal = cart.reduce((s, l) => s + l.qty * l.rate * (1 - (l.discount || 0)/100), 0);
  const billDiscount = subTotal * (Number(discount || 0) / 100);
  const taxable = subTotal - billDiscount;
  const billTax = taxable * (Number(tax || 0) / 100);
  const grandTotal = taxable + billTax;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search items to add" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filtered.map((i) => (
            <button key={i.id} className="border rounded-md p-3 text-left hover:bg-muted/50" onClick={() => addToCart(i)}>
              <div className="font-medium truncate">{i.name}</div>
              <div className="text-xs text-muted-foreground">{i.sku}</div>
              <div className="text-sm font-semibold mt-1">{formatMoneyINR(i.price)}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="border rounded-lg divide-y">
          <div className="grid grid-cols-6 px-3 py-2 text-xs font-medium text-muted-foreground">
            <div className="col-span-2">Item</div>
            <div className="text-right">Qty</div>
            <div className="text-right">Rate</div>
            <div className="text-right">Disc %</div>
            <div className="text-right">Amount</div>
          </div>
          {cart.map((l) => {
            const amount = l.qty * l.rate * (1 - (l.discount || 0)/100);
            return (
              <div key={l.id} className="grid grid-cols-6 px-3 py-2 items-center gap-2">
                <div className="col-span-2 truncate">{l.name}</div>
                <div className="text-right"><Input value={l.qty} type="number" onChange={(e) => updateLine(l.id, { qty: Number(e.target.value || 0) })} /></div>
                <div className="text-right"><Input value={l.rate} type="number" onChange={(e) => updateLine(l.id, { rate: Number(e.target.value || 0) })} /></div>
                <div className="text-right"><Input value={l.discount} type="number" onChange={(e) => updateLine(l.id, { discount: Number(e.target.value || 0) })} /></div>
                <div className="text-right font-medium">{formatMoneyINR(amount)}</div>
                <div className="col-span-6 flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => removeLine(l.id)}>Remove</Button>
                </div>
              </div>
            );
          })}
          {cart.length === 0 && (
            <div className="px-3 py-6 text-sm text-muted-foreground">No items in cart.</div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="bdisc">Bill Discount %</Label>
            <Input id="bdisc" value={discount} type="number" onChange={(e) => setDiscount(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="btax">Tax %</Label>
            <Input id="btax" value={tax} type="number" onChange={(e) => setTax(e.target.value)} />
          </div>
        </div>

        <div className="p-3 bg-muted rounded-lg space-y-1 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span className="font-medium">{formatMoneyINR(subTotal)}</span></div>
          <div className="flex justify-between"><span>Discount</span><span className="font-medium">{formatMoneyINR(billDiscount)}</span></div>
          <div className="flex justify-between"><span>Tax</span><span className="font-medium">{formatMoneyINR(billTax)}</span></div>
          <div className="flex justify-between text-base font-semibold"><span>Grand Total</span><span>{formatMoneyINR(grandTotal)}</span></div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsPayOpen(true)}>Take Payment</Button>
          <Button onClick={() => setIsPayOpen(true)}>Save & Print</Button>
        </div>

        {cart.length > 0 && (
          <ReceiptPreview
            shopName="Veterinary Shop"
            billNo={`INV-${Date.now()}`}
            date=""
            lines={cart.map((l) => ({ name: l.name, qty: l.qty, rate: l.rate, amount: l.qty * l.rate * (1 - (l.discount || 0)/100) }))}
            subTotal={subTotal}
            discount={billDiscount}
            tax={billTax}
            grandTotal={grandTotal}
          />
        )}

        <PaymentModal
          isOpen={isPayOpen}
          onClose={() => setIsPayOpen(false)}
          amountDue={grandTotal}
          onConfirm={(paidTotal) => { setLastPaid(paidTotal); setIsPayOpen(false); }}
        />
      </div>
    </div>
  );
}

