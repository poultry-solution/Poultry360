"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Label } from "@/components/ui/label";
import { formatMoneyINR, getTodayLocalDate } from "@/lib/utils";

interface PurchaseRow {
  id: string;
  date: string;
  supplier: string;
  billNo?: string;
  amount: number;
  paid: number;
  due: number;
}

export function PurchaseList() {
  const [rows, setRows] = useState<PurchaseRow[]>([]);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ date: getTodayLocalDate(), supplier: "", billNo: "", amount: "", paid: "" });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => r.supplier.toLowerCase().includes(q) || (r.billNo || "").toLowerCase().includes(q));
  }, [rows, query]);

  function addRow() {
    const amount = Number(form.amount || 0);
    const paid = Number(form.paid || 0);
    const due = amount - paid;
    const row: PurchaseRow = { id: Date.now().toString(), date: form.date, supplier: form.supplier || "Supplier", billNo: form.billNo, amount, paid, due };
    setRows((prev) => [row, ...prev]);
    setIsOpen(false);
    setForm({ date: getTodayLocalDate(), supplier: "", billNo: "", amount: "", paid: "" });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search supplier or bill no" />
        <Button onClick={() => setIsOpen(true)}>Add Purchase</Button>
      </div>

      <div className="border rounded-lg divide-y">
        <div className="grid grid-cols-6 px-3 py-2 text-xs font-medium text-muted-foreground">
          <div>Date</div>
          <div>Supplier</div>
          <div>Bill No</div>
          <div className="text-right">Amount</div>
          <div className="text-right">Paid</div>
          <div className="text-right">Due</div>
        </div>
        {filtered.map((r) => (
          <div key={r.id} className="grid grid-cols-6 px-3 py-2 text-sm">
            <div>{r.date}</div>
            <div className="truncate">{r.supplier}</div>
            <div className="truncate">{r.billNo || '-'}</div>
            <div className="text-right">{formatMoneyINR(r.amount)}</div>
            <div className="text-right">{formatMoneyINR(r.paid)}</div>
            <div className="text-right">{formatMoneyINR(r.due)}</div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="px-3 py-6 text-sm text-muted-foreground">No purchases.</div>
        )}
      </div>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Add Purchase">
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="pdate">Date</Label>
              <Input id="pdate" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="supp">Supplier</Label>
              <Input id="supp" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="bill">Bill No</Label>
              <Input id="bill" value={form.billNo} onChange={(e) => setForm({ ...form, billNo: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="amt">Amount</Label>
              <Input id="amt" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="paid">Paid</Label>
              <Input id="paid" type="number" value={form.paid} onChange={(e) => setForm({ ...form, paid: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={addRow}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

