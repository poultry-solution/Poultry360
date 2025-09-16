"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatMoneyINR } from "@/lib/utils";

interface SaleSummaryRow { date: string; orders: number; amount: number }
interface LowStockRow { sku: string; name: string; stock: number; reorder: number }

export function ReportsView() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const sales: SaleSummaryRow[] = [
    { date: "2025-09-10", orders: 5, amount: 8200 },
    { date: "2025-09-11", orders: 7, amount: 12600 },
  ];
  const lowStock: LowStockRow[] = [
    { sku: "MED-001", name: "Antibiotic Injection", stock: 3, reorder: 10 },
    { sku: "VIT-025", name: "Vitamin Supplement", stock: 5, reorder: 15 },
  ];

  const filteredSales = useMemo(() => {
    return sales.filter(r => (!from || r.date >= from) && (!to || r.date <= to));
  }, [sales, from, to]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="text-sm font-medium">Sales Summary</div>
        <div className="flex gap-2">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <Button variant="outline" onClick={() => { setFrom(""); setTo(""); }}>Clear</Button>
        </div>
        <div className="border rounded-lg divide-y">
          <div className="grid grid-cols-3 px-3 py-2 text-xs font-medium text-muted-foreground">
            <div>Date</div>
            <div className="text-right">Orders</div>
            <div className="text-right">Amount</div>
          </div>
          {filteredSales.map((r) => (
            <div key={r.date} className="grid grid-cols-3 px-3 py-2 text-sm">
              <div>{r.date}</div>
              <div className="text-right">{r.orders}</div>
              <div className="text-right font-medium">{formatMoneyINR(r.amount)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">Low Stock</div>
        <div className="border rounded-lg divide-y">
          <div className="grid grid-cols-4 px-3 py-2 text-xs font-medium text-muted-foreground">
            <div>SKU</div>
            <div>Name</div>
            <div className="text-right">Stock</div>
            <div className="text-right">Reorder</div>
          </div>
          {lowStock.map((r) => (
            <div key={r.sku} className="grid grid-cols-4 px-3 py-2 text-sm">
              <div>{r.sku}</div>
              <div className="truncate">{r.name}</div>
              <div className="text-right">{r.stock}</div>
              <div className="text-right">{r.reorder}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

