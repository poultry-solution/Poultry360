"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { Party } from "@/types/shop";
import { formatMoneyINR } from "@/lib/utils";

export function PartiesList() {
  const [parties, setParties] = useState<Party[]>([]);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ type: "customer", name: "", phone: "", address: "", openingBalance: "0" });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return parties;
    return parties.filter(p => p.name.toLowerCase().includes(q) || (p.phone || "").toLowerCase().includes(q));
  }, [parties, query]);

  function addParty() {
    const p: Party = {
      id: Date.now().toString(),
      type: form.type as any,
      name: form.name || "Party",
      phone: form.phone || undefined,
      address: form.address || undefined,
      openingBalance: Number(form.openingBalance || 0),
      balance: Number(form.openingBalance || 0),
    };
    setParties((prev) => [p, ...prev]);
    setIsOpen(false);
    setForm({ type: "customer", name: "", phone: "", address: "", openingBalance: "0" });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or phone" />
        <Button onClick={() => setIsOpen(true)}>Add Party</Button>
      </div>

      <div className="border rounded-lg divide-y">
        <div className="grid grid-cols-5 px-3 py-2 text-xs font-medium text-muted-foreground">
          <div>Type</div>
          <div>Name</div>
          <div>Phone</div>
          <div>Address</div>
          <div className="text-right">Balance</div>
        </div>
        {filtered.map((p) => (
          <div key={p.id} className="grid grid-cols-5 px-3 py-2 text-sm">
            <div className="capitalize">{p.type}</div>
            <div className="truncate">{p.name}</div>
            <div className="truncate">{p.phone || '-'}</div>
            <div className="truncate">{p.address || '-'}</div>
            <div className="text-right font-medium">{formatMoneyINR(p.balance)}</div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="px-3 py-6 text-sm text-muted-foreground">No parties.</div>
        )}
      </div>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Add Party">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ptype">Type</Label>
              <Input id="ptype" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="pname">Name</Label>
              <Input id="pname" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="addr">Address</Label>
              <Input id="addr" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
          </div>
          <div>
            <Label htmlFor="bal">Opening Balance</Label>
            <Input id="bal" type="number" value={form.openingBalance} onChange={(e) => setForm({ ...form, openingBalance: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={addParty}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

