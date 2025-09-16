"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Label } from "@/components/ui/label";
import { formatMoneyINR } from "@/lib/utils";
import { Item } from "@/types/shop";

interface InventoryListProps {
  items: Item[];
  onCreate: (item: Item) => void;
}

export function InventoryList({ items, onCreate }: InventoryListProps) {
  const [query, setQuery] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    sku: "",
    unit: "pcs",
    price: "",
    stockQty: "",
    reorderLevel: "",
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i =>
      i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q)
    );
  }, [items, query]);

  function handleCreate() {
    if (!form.name.trim()) return;
    const newItem: Item = {
      id: Date.now().toString(),
      sku: form.sku || `SKU-${Date.now()}`,
      name: form.name,
      categoryId: "",
      unit: form.unit,
      price: Number(form.price || 0),
      stockQty: Number(form.stockQty || 0),
      reorderLevel: form.reorderLevel ? Number(form.reorderLevel) : undefined,
      taxRate: 0,
      isActive: true,
    };
    onCreate(newItem);
    setIsAddOpen(false);
    setForm({ name: "", sku: "", unit: "pcs", price: "", stockQty: "", reorderLevel: "" });
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or SKU" />
        <Button onClick={() => setIsAddOpen(true)}>Add Item</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((i) => (
          <div key={i.id} className="border rounded-lg p-3 hover:bg-muted/50">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{i.name}</div>
                <div className="text-xs text-muted-foreground">{i.sku} • {i.unit}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold">{formatMoneyINR(i.price)}</div>
                <div className="text-xs">Stock: {i.stockQty}</div>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-sm text-muted-foreground">No items match.</div>
        )}
      </div>

      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add Item">
        <div className="space-y-3">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="unit">Unit</Label>
              <Input id="unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="price">Price</Label>
              <Input id="price" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="stockQty">Stock</Label>
              <Input id="stockQty" type="number" value={form.stockQty} onChange={(e) => setForm({ ...form, stockQty: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="reorderLevel">Reorder</Label>
              <Input id="reorderLevel" type="number" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

