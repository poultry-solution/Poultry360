"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function SettingsView() {
  const [form, setForm] = useState({
    unitDefault: "pcs",
    taxDefault: "0",
    skuPrefix: "SKU",
    invoicePrefix: "INV",
    shopName: "Veterinary Shop",
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="shop">Shop Name</Label>
          <Input id="shop" value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="unit">Default Unit</Label>
          <Input id="unit" value={form.unitDefault} onChange={(e) => setForm({ ...form, unitDefault: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="tax">Default Tax %</Label>
          <Input id="tax" type="number" value={form.taxDefault} onChange={(e) => setForm({ ...form, taxDefault: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="sku">SKU Prefix</Label>
          <Input id="sku" value={form.skuPrefix} onChange={(e) => setForm({ ...form, skuPrefix: e.target.value })} />
        </div>
        <div>
          <Label htmlFor="inv">Invoice Prefix</Label>
          <Input id="inv" value={form.invoicePrefix} onChange={(e) => setForm({ ...form, invoicePrefix: e.target.value })} />
        </div>
      </div>
      <div className="flex justify-end">
        <Button>Save Settings</Button>
      </div>
    </div>
  );
}

