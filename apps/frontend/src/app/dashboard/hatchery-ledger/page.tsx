"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Egg, Plus, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Modal, ModalContent, ModalFooter } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable, Column, createColumn } from "@/components/ui/data-table";

export default function HatcheryLedgerPage() {
  const [hatcheries, setHatcheries] = useState<string[]>(["Hatchery A", "Hatchery B", "Hatchery C"]);
  const [active, setActive] = useState<string>("Hatchery A");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddHatcheryOpen, setIsAddHatcheryOpen] = useState(false);
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);

  const [newHatchery, setNewHatchery] = useState({ name: "", phone: "" });
  const [newEntry, setNewEntry] = useState({ item: "", rate: "", quantity: "", paid: "", date: "", dueDate: "" });

  const [ledgerByHatchery, setLedgerByHatchery] = useState<Record<string, { id: number; item: string; rate: number; quantity: number; paid: number; date: string; dueDate?: string }[]>>({
    "Hatchery A": [
      { id: 1, item: "Broiler Chicks", rate: 45, quantity: 1200, paid: 45000, date: "2025-08-20" },
      { id: 2, item: "Broiler Chicks", rate: 44, quantity: 800, paid: 35200, date: "2025-08-28" },
    ],
    "Hatchery B": [
      { id: 1, item: "Layer Chicks", rate: 52, quantity: 600, paid: 25000, date: "2025-08-22" },
    ],
    "Hatchery C": [
      { id: 1, item: "Broiler Chicks", rate: 46, quantity: 1000, paid: 20000, date: "2025-08-25" },
    ],
  });

  function handleAddHatchery(e: React.FormEvent) {
    e.preventDefault();
    const name = newHatchery.name.trim();
    if (!name) return;
    if (hatcheries.includes(name)) {
      setIsAddHatcheryOpen(false);
      setNewHatchery({ name: "", phone: "" });
      return;
    }
    setHatcheries((prev) => [...prev, name]);
    setLedgerByHatchery((prev) => ({ ...prev, [name]: [] }));
    setActive(name);
    setIsAddHatcheryOpen(false);
    setNewHatchery({ name: "", phone: "" });
  }

  function handleAddEntry(e: React.FormEvent) {
    e.preventDefault();
    const rate = Number(newEntry.rate);
    const quantity = Number(newEntry.quantity);
    const paid = Number(newEntry.paid);
    const date = newEntry.date || new Date().toISOString().slice(0, 10);
    const dueDate = newEntry.dueDate || "";
    if (!newEntry.item || !rate || !quantity) return;
    setLedgerByHatchery((prev) => {
      const rows = prev[active] ?? [];
      const next = {
        ...prev,
        [active]: [
          ...rows,
          { id: rows.length ? rows[rows.length - 1].id + 1 : 1, item: newEntry.item, rate, quantity, paid: paid || 0, date, dueDate: dueDate || undefined },
        ],
      };
      return next;
    });
    setIsAddEntryOpen(false);
    setNewEntry({ item: "", rate: "", quantity: "", paid: "", date: "", dueDate: "" });
  }

  function getDueFor(h: string) {
    const rows = ledgerByHatchery[h] ?? [];
    const total = rows.reduce((s, r) => s + r.rate * r.quantity, 0);
    const paid = rows.reduce((s, r) => s + r.paid, 0);
    return Math.max(0, total - paid);
  }

  function getDueDateFor(h: string) {
    const rows = ledgerByHatchery[h] ?? [];
    if (rows.length === 0) return "—";
    const latest = rows
      .map((r) => new Date(r.date + "T00:00:00Z").getTime())
      .reduce((a, b) => Math.max(a, b), 0);
    const dueTs = latest + 7 * 24 * 60 * 60 * 1000; // +7 days
    const d = new Date(dueTs);
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = d.getUTCFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  function getRowDueDate(date: string) {
    const base = new Date(date + "T00:00:00Z");
    const due = new Date(base.getTime() + 7 * 24 * 60 * 60 * 1000);
    const dd = String(due.getUTCDate()).padStart(2, "0");
    const mm = String(due.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = due.getUTCFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  // Column configuration for DataTable
  const ledgerColumns: Column[] = [
    createColumn('item', 'Item'),
    createColumn('rate', 'Rate', {
      type: 'currency',
      align: 'right'
    }),
    createColumn('quantity', 'Quantity', {
      type: 'number',
      align: 'right'
    }),
    createColumn('amount', 'Amount', {
      type: 'currency',
      align: 'right',
      render: (_, row) => `₹${(row.rate * row.quantity).toLocaleString()}`
    }),
    createColumn('paid', 'Amount Paid', {
      type: 'currency',
      align: 'right'
    }),
    createColumn('due', 'Amount Due', {
      type: 'currency',
      align: 'right',
      render: (_, row) => `₹${(row.rate * row.quantity - row.paid).toLocaleString()}`
    }),
    createColumn('date', 'Date', {
      type: 'date'
    }),
    createColumn('dueDate', 'Due Date', {
      render: (_, row) => row.dueDate && row.dueDate !== "" ? row.dueDate : getRowDueDate(row.date)
    })
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hatchery Ledger</h1>
          <p className="text-muted-foreground">Manage chick purchases and hatchery balances.</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90" onClick={() => setIsAddHatcheryOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Hatchery
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card onClick={() => setIsModalOpen(true)} className="cursor-pointer transition-colors hover:bg-[#10841E] hover:text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hatcheries</CardTitle>
            <Egg className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Chick suppliers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹75,000</div>
            <p className="text-xs text-muted-foreground">Amount Due</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹25,000</div>
            <p className="text-xs text-muted-foreground">New purchases</p>
          </CardContent>
        </Card>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Hatcheries – Amount Due">
        <ModalContent>
          <div className="space-y-3">
            {hatcheries.map((h) => (
              <div key={h} className="flex items-center justify-between rounded-md border p-3 hover:border-primary/60">
                <div>
                  <div className="font-medium">{h}</div>
                  <div className="text-xs text-muted-foreground">Due Date: {getDueDateFor(h)}</div>
                </div>
                <div className="text-right font-medium">₹{getDueFor(h).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsModalOpen(false)}>Close</Button>
        </ModalFooter>
      </Modal>

      {/* Add Hatchery Modal */}
      <Modal isOpen={isAddHatcheryOpen} onClose={() => setIsAddHatcheryOpen(false)} title="Add Hatchery">
        <form onSubmit={handleAddHatchery}>
          <ModalContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="hname">Hatchery Name</Label>
                <Input id="hname" value={newHatchery.name} onChange={(e) => setNewHatchery({ ...newHatchery, name: e.target.value })} placeholder="e.g., Sunrise Hatchery" required />
              </div>
              <div>
                <Label htmlFor="hphone">Phone (optional)</Label>
                <Input id="hphone" value={newHatchery.phone} onChange={(e) => setNewHatchery({ ...newHatchery, phone: e.target.value })} placeholder="98XXXXXXXX" />
              </div>
            </div>
          </ModalContent>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setIsAddHatcheryOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90">Add</Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Add Entry Modal */}
      <Modal isOpen={isAddEntryOpen} onClose={() => setIsAddEntryOpen(false)} title={`Add Entry – ${active}`}>
        <form onSubmit={handleAddEntry}>
          <ModalContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="item">Item</Label>
                <Input id="item" value={newEntry.item} onChange={(e) => setNewEntry({ ...newEntry, item: e.target.value })} placeholder="Broiler Chicks" required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="rate">Rate</Label>
                  <Input id="rate" type="number" value={newEntry.rate} onChange={(e) => setNewEntry({ ...newEntry, rate: e.target.value })} placeholder="45" required />
                </div>
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input id="quantity" type="number" value={newEntry.quantity} onChange={(e) => setNewEntry({ ...newEntry, quantity: e.target.value })} placeholder="1000" required />
                </div>
                <div>
                  <Label htmlFor="paid">Paid</Label>
                  <Input id="paid" type="number" value={newEntry.paid} onChange={(e) => setNewEntry({ ...newEntry, paid: e.target.value })} placeholder="20000" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" type="date" value={newEntry.date} onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="dueDate">Due Date (optional)</Label>
                  <Input id="dueDate" type="date" value={newEntry.dueDate} onChange={(e) => setNewEntry({ ...newEntry, dueDate: e.target.value })} />
                </div>
              </div>
            </div>
          </ModalContent>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setIsAddEntryOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90">Save</Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Tabs: one per hatchery */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {hatcheries.map((h) => (
            <Button
              key={h}
              variant={active === h ? "default" : "outline"}
              className={active === h ? "bg-primary hover:bg-primary/90" : ""}
              onClick={() => setActive(h)}
            >
              {h}
            </Button>
          ))}
          <Button variant="outline" onClick={() => setIsAddHatcheryOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Hatchery
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{active}</CardTitle>
              <Button className="bg-primary hover:bg-primary/90" onClick={() => setIsAddEntryOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Entry
              </Button>
            </div>
            <CardDescription>Itemized ledger for this hatchery</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              data={ledgerByHatchery[active] || []}
              columns={ledgerColumns}
              showFooter={true}
              footerContent={
                <div className="grid grid-cols-8 gap-4 text-sm">
                  <div className="col-span-3 font-semibold text-gray-900">Total</div>
                  <div className="text-right font-medium">
                    ₹{ledgerByHatchery[active]?.reduce((sum, r) => sum + r.rate * r.quantity, 0).toLocaleString() || '0'}
                  </div>
                  <div className="text-right font-medium">
                    ₹{ledgerByHatchery[active]?.reduce((sum, r) => sum + r.paid, 0).toLocaleString() || '0'}
                  </div>
                  <div className="text-right font-medium">
                    ₹{ledgerByHatchery[active]?.reduce((sum, r) => sum + (r.rate * r.quantity - r.paid), 0).toLocaleString() || '0'}
                  </div>
                  <div></div>
                  <div></div>
                </div>
              }
              emptyMessage="No entries for this hatchery"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
