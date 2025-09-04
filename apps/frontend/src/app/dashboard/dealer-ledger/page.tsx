"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Plus, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Modal, ModalContent, ModalFooter } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function DealerLedgerPage() {
  const [dealers, setDealers] = useState<string[]>(["Dealer One", "Dealer Two", "Dealer Three"]);
  const [active, setActive] = useState<string>("Dealer One");
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isAddDealerOpen, setIsAddDealerOpen] = useState(false);
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);

  const [newDealer, setNewDealer] = useState({ name: "", phone: "" });
  const [newEntry, setNewEntry] = useState({ item: "", rate: "", quantity: "", paid: "", date: "", dueDate: "" });

  const [ledgerByDealer, setLedgerByDealer] = useState<Record<string, { id: number; item: string; rate: number; quantity: number; paid: number; date: string; dueDate?: string }[]>>({
    "Dealer One": [
      { id: 1, item: "Feed Brand A", rate: 28, quantity: 100, paid: 1500, date: "2025-08-18" },
    ],
    "Dealer Two": [
      { id: 1, item: "Feed Brand B", rate: 30, quantity: 80, paid: 1000, date: "2025-08-22" },
    ],
    "Dealer Three": [
      { id: 1, item: "Feed Brand C", rate: 27, quantity: 120, paid: 2500, date: "2025-08-25" },
    ],
  });

  function getDueFor(name: string) {
    const rows = ledgerByDealer[name] ?? [];
    const total = rows.reduce((s, r) => s + r.rate * r.quantity, 0);
    const paid = rows.reduce((s, r) => s + r.paid, 0);
    return Math.max(0, total - paid);
  }

  function getDealerDueDate(name: string) {
    const rows = ledgerByDealer[name] ?? [];
    if (rows.length === 0) return "—";
    const latest = rows.map((r) => new Date(r.date + "T00:00:00Z").getTime()).reduce((a, b) => Math.max(a, b), 0);
    const d = new Date(latest + 7 * 24 * 60 * 60 * 1000);
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = d.getUTCFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  function getRowDueDate(date: string) {
    const base = new Date(date + "T00:00:00Z");
    const d = new Date(base.getTime() + 7 * 24 * 60 * 60 * 1000);
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = d.getUTCFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  function handleAddDealer(e: React.FormEvent) {
    e.preventDefault();
    const name = newDealer.name.trim();
    if (!name) return;
    if (dealers.includes(name)) {
      setIsAddDealerOpen(false);
      setNewDealer({ name: "", phone: "" });
      return;
    }
    setDealers((prev) => [...prev, name]);
    setLedgerByDealer((prev) => ({ ...prev, [name]: [] }));
    setActive(name);
    setIsAddDealerOpen(false);
    setNewDealer({ name: "", phone: "" });
  }

  function handleAddEntry(e: React.FormEvent) {
    e.preventDefault();
    const rate = Number(newEntry.rate);
    const quantity = Number(newEntry.quantity);
    const paid = Number(newEntry.paid);
    const date = newEntry.date || new Date().toISOString().slice(0, 10);
    const dueDate = newEntry.dueDate || "";
    if (!newEntry.item || !rate || !quantity) return;
    setLedgerByDealer((prev) => {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Feed Dealer Ledger</h1>
          <p className="text-muted-foreground">Manage dealer purchases and balances.</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90" onClick={() => setIsAddDealerOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Dealer
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card onClick={() => setIsSummaryOpen(true)} className="cursor-pointer transition-colors hover:bg-[#10841E] hover:text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Dealers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dealers.length}</div>
            <p className="text-xs text-muted-foreground">Active suppliers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{dealers.reduce((s, name) => s + getDueFor(name), 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Amount Due</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹45,000</div>
            <p className="text-xs text-muted-foreground">New purchases</p>
          </CardContent>
        </Card>
      </div>

      {/* Summary Modal */}
      <Modal isOpen={isSummaryOpen} onClose={() => setIsSummaryOpen(false)} title="Dealers – Amount Due">
        <ModalContent>
          <div className="space-y-3">
            {dealers.map((name) => (
              <div key={name} className="flex items-center justify-between rounded-md border p-3 hover:border-primary/60">
                <div>
                  <div className="font-medium">{name}</div>
                  <div className="text-xs text-muted-foreground">Due Date: {getDealerDueDate(name)}</div>
                </div>
                <div className="text-right font-medium">₹{getDueFor(name).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsSummaryOpen(false)}>Close</Button>
        </ModalFooter>
      </Modal>

      {/* Add Dealer Modal */}
      <Modal isOpen={isAddDealerOpen} onClose={() => setIsAddDealerOpen(false)} title="Add Dealer">
        <form onSubmit={handleAddDealer}>
          <ModalContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="dname">Dealer Name</Label>
                <Input id="dname" value={newDealer.name} onChange={(e) => setNewDealer({ ...newDealer, name: e.target.value })} placeholder="e.g., Dealer One" required />
              </div>
              <div>
                <Label htmlFor="dphone">Phone (optional)</Label>
                <Input id="dphone" value={newDealer.phone} onChange={(e) => setNewDealer({ ...newDealer, phone: e.target.value })} placeholder="98XXXXXXXX" />
              </div>
            </div>
          </ModalContent>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setIsAddDealerOpen(false)}>Cancel</Button>
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
                <Input id="item" value={newEntry.item} onChange={(e) => setNewEntry({ ...newEntry, item: e.target.value })} placeholder="Feed brand" required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="rate">Rate</Label>
                  <Input id="rate" type="number" value={newEntry.rate} onChange={(e) => setNewEntry({ ...newEntry, rate: e.target.value })} placeholder="28" required />
                </div>
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input id="quantity" type="number" value={newEntry.quantity} onChange={(e) => setNewEntry({ ...newEntry, quantity: e.target.value })} placeholder="100" required />
                </div>
                <div>
                  <Label htmlFor="paid">Paid</Label>
                  <Input id="paid" type="number" value={newEntry.paid} onChange={(e) => setNewEntry({ ...newEntry, paid: e.target.value })} placeholder="2000" />
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

      {/* Tabs: one per dealer */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {dealers.map((name) => (
            <Button
              key={name}
              variant={active === name ? "default" : "outline"}
              className={active === name ? "bg-primary hover:bg-primary/90" : ""}
              onClick={() => setActive(name)}
            >
              {name}
            </Button>
          ))}
          <Button variant="outline" onClick={() => setIsAddDealerOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Dealer
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
            <CardDescription>Itemized ledger for this dealer</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-separate border-spacing-0 rounded-lg overflow-hidden">
                <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur supports-[backdrop-filter]:bg-muted/40">
                  <tr>
                    <th className="text-left px-3 py-2 border-b">Item</th>
                    <th className="text-right px-3 py-2 border-b">Rate</th>
                    <th className="text-right px-3 py-2 border-b">Quantity</th>
                    <th className="text-right px-3 py-2 border-b">Amount</th>
                    <th className="text-right px-3 py-2 border-b">Amount Paid</th>
                    <th className="text-right px-3 py-2 border-b">Amount Due</th>
                    <th className="text-left px-3 py-2 border-b">Date</th>
                    <th className="text-left px-3 py-2 border-b">Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerByDealer[active]?.map((row) => (
                    <tr key={`${active}-${row.id}`} className="hover:bg-primary/5">
                      <td className="px-3 py-2 border-b">{row.item}</td>
                      <td className="px-3 py-2 border-b text-right">₹{row.rate.toLocaleString()}</td>
                      <td className="px-3 py-2 border-b text-right">{row.quantity.toLocaleString()}</td>
                      <td className="px-3 py-2 border-b text-right">₹{(row.rate * row.quantity).toLocaleString()}</td>
                      <td className="px-3 py-2 border-b text-right">₹{row.paid.toLocaleString()}</td>
                      <td className="px-3 py-2 border-b text-right">₹{(row.rate * row.quantity - row.paid).toLocaleString()}</td>
                      <td className="px-3 py-2 border-b">{row.date}</td>
                      <td className="px-3 py-2 border-b">{row.dueDate && row.dueDate !== "" ? row.dueDate : getRowDueDate(row.date)}</td>
                    </tr>
                  ))}
                  {ledgerByDealer[active]?.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">No entries</td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="px-3 py-2" colSpan={3}>Total</td>
                    <td className="px-3 py-2 text-right font-medium">
                      ₹{ledgerByDealer[active]?.reduce((sum, r) => sum + r.rate * r.quantity, 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right font-medium">
                      ₹{ledgerByDealer[active]?.reduce((sum, r) => sum + r.paid, 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right font-medium">
                      ₹{ledgerByDealer[active]?.reduce((sum, r) => sum + (r.rate * r.quantity - r.paid), 0).toLocaleString()}
                    </td>
                    <td />
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
