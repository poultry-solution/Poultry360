"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Pill, Plus, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Modal, ModalContent, ModalFooter } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable, Column, createColumn } from "@/components/ui/data-table";

export default function MedicalSupplierLedgerPage() {
  const [suppliers, setSuppliers] = useState<string[]>(["Medico Pharma", "HealthPlus", "VetCare"]);
  const [active, setActive] = useState<string>("Medico Pharma");
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<{ supplier: string; entryId: number } | null>(null);
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<{ supplier: string; entryId: number } | null>(null);

  const [newSupplier, setNewSupplier] = useState({ name: "", phone: "" });
  const [newEntry, setNewEntry] = useState({ item: "", rate: "", quantity: "", paid: "", date: "", dueDate: "" });
  const [paymentForm, setPaymentForm] = useState({ amount: "", date: "", note: "" });

  const [ledgerBySupplier, setLedgerBySupplier] = useState<Record<string, { id: number; item: string; rate: number; quantity: number; paid: number; date: string; dueDate?: string; paymentHistory?: { amount: number; date: string; note?: string }[] }[]>>({
    "Medico Pharma": [
      { id: 1, item: "Amoxicillin 500mg", rate: 12, quantity: 300, paid: 1500, date: "2025-08-18", paymentHistory: [{ amount: 1500, date: "2025-08-18", note: "Initial payment" }] },
    ],
    "HealthPlus": [
      { id: 1, item: "Vitamin Mix", rate: 25, quantity: 120, paid: 2000, date: "2025-08-22", paymentHistory: [{ amount: 2000, date: "2025-08-22", note: "Initial payment" }] },
    ],
    "VetCare": [
      { id: 1, item: "Antibiotic X", rate: 30, quantity: 80, paid: 1000, date: "2025-08-25", paymentHistory: [{ amount: 1000, date: "2025-08-25", note: "Initial payment" }] },
    ],
  });

  function getDueFor(name: string) {
    const rows = ledgerBySupplier[name] ?? [];
    const total = rows.reduce((s, r) => s + r.rate * r.quantity, 0);
    const paid = rows.reduce((s, r) => s + r.paid, 0);
    return Math.max(0, total - paid);
  }

  function getSupplierDueDate(name: string) {
    const rows = ledgerBySupplier[name] ?? [];
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
      render: (_, row) => {
        const due = row.rate * row.quantity - row.paid;
        return (
          <div className="flex items-center justify-between">
            <span className={due > 0 ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
              ₹{due.toLocaleString()}
            </span>
            {due > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="ml-2 h-6 px-2 text-xs bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                onClick={() => openPaymentModal(active, row.id)}
              >
                Pay
              </Button>
            )}
          </div>
        );
      }
    }),
    createColumn('date', 'Date', {
      type: 'date'
    }),
    createColumn('dueDate', 'Due Date', {
      render: (_, row) => row.dueDate && row.dueDate !== "" ? row.dueDate : getRowDueDate(row.date)
    }),
    createColumn('paymentHistory', 'Payment History', {
      render: (_, row) => {
        const history = row.paymentHistory || [];
        const totalPayments = history.length;
        const totalPaid = history.reduce((sum: number, payment: { amount: number }) => sum + payment.amount, 0);
        
        return (
          <div 
            className="cursor-pointer text-blue-600 hover:text-blue-800 hover:underline"
            onClick={() => openHistoryModal(active, row.id)}
          >
            {totalPayments} payment{totalPayments !== 1 ? 's' : ''} (₹{totalPaid.toLocaleString()})
          </div>
        );
      }
    })
  ];

  function handleAddSupplier(e: React.FormEvent) {
    e.preventDefault();
    const name = newSupplier.name.trim();
    if (!name) return;
    if (suppliers.includes(name)) {
      setIsAddSupplierOpen(false);
      setNewSupplier({ name: "", phone: "" });
      return;
    }
    setSuppliers((prev) => [...prev, name]);
    setLedgerBySupplier((prev) => ({ ...prev, [name]: [] }));
    setActive(name);
    setIsAddSupplierOpen(false);
    setNewSupplier({ name: "", phone: "" });
  }

  function handleAddEntry(e: React.FormEvent) {
    e.preventDefault();
    const rate = Number(newEntry.rate);
    const quantity = Number(newEntry.quantity);
    const paid = Number(newEntry.paid);
    const date = newEntry.date || new Date().toISOString().slice(0, 10);
    const dueDate = newEntry.dueDate || "";
    if (!newEntry.item || !rate || !quantity) return;
    setLedgerBySupplier((prev) => {
      const rows = prev[active] ?? [];
      const next = {
        ...prev,
        [active]: [
          ...rows,
          { 
            id: rows.length ? rows[rows.length - 1].id + 1 : 1, 
            item: newEntry.item, 
            rate, 
            quantity, 
            paid: paid || 0, 
            date, 
            dueDate: dueDate || undefined,
            paymentHistory: paid > 0 ? [{ amount: paid, date, note: "Initial payment" }] : []
          },
        ],
      };
      return next;
    });
    setIsAddEntryOpen(false);
    setNewEntry({ item: "", rate: "", quantity: "", paid: "", date: "", dueDate: "" });
  }

  function handleAddPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEntry || !paymentForm.amount) return;
    
    const paymentAmount = Number(paymentForm.amount);
    const paymentDate = paymentForm.date || new Date().toISOString().slice(0, 10);
    
    setLedgerBySupplier((prev) => {
      const supplier = selectedEntry.supplier;
      const rows = prev[supplier] || [];
      const updatedRows = rows.map((row) => {
        if (row.id === selectedEntry.entryId) {
          const newPaid = row.paid + paymentAmount;
          const newPaymentHistory = [
            ...(row.paymentHistory || []),
            { amount: paymentAmount, date: paymentDate, note: paymentForm.note || "Payment" }
          ];
          return { ...row, paid: newPaid, paymentHistory: newPaymentHistory };
        }
        return row;
      });
      
      return { ...prev, [supplier]: updatedRows };
    });
    
    setIsPaymentModalOpen(false);
    setSelectedEntry(null);
    setPaymentForm({ amount: "", date: "", note: "" });
  }

  function openPaymentModal(supplier: string, entryId: number) {
    setSelectedEntry({ supplier, entryId });
    setIsPaymentModalOpen(true);
  }

  function openHistoryModal(supplier: string, entryId: number) {
    setSelectedHistoryEntry({ supplier, entryId });
    setIsHistoryModalOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Medical Supplier Ledger</h1>
          <p className="text-muted-foreground">Track medicine purchases and supplier balances.</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90" onClick={() => setIsAddSupplierOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Supplier
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card onClick={() => setIsSummaryOpen(true)} className="cursor-pointer transition-colors hover:bg-[#10841E] hover:text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Suppliers</CardTitle>
            <Pill className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suppliers.length}</div>
            <p className="text-xs text-muted-foreground">Medicine suppliers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{suppliers.reduce((s, name) => s + getDueFor(name), 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Amount Due</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹15,000</div>
            <p className="text-xs text-muted-foreground">New purchases</p>
          </CardContent>
        </Card>
      </div>

      {/* Summary Modal */}
      <Modal isOpen={isSummaryOpen} onClose={() => setIsSummaryOpen(false)} title="Suppliers – Amount Due">
        <ModalContent>
          <div className="space-y-3">
            {suppliers.map((name) => (
              <div key={name} className="flex items-center justify-between rounded-md border p-3 hover:border-primary/60">
                <div>
                  <div className="font-medium">{name}</div>
                  <div className="text-xs text-muted-foreground">Due Date: {getSupplierDueDate(name)}</div>
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

      {/* Add Supplier Modal */}
      <Modal isOpen={isAddSupplierOpen} onClose={() => setIsAddSupplierOpen(false)} title="Add Supplier">
        <form onSubmit={handleAddSupplier}>
          <ModalContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="sname">Supplier Name</Label>
                <Input id="sname" value={newSupplier.name} onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })} placeholder="e.g., Medico Pharma" required />
              </div>
              <div>
                <Label htmlFor="sphone">Phone (optional)</Label>
                <Input id="sphone" value={newSupplier.phone} onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })} placeholder="98XXXXXXXX" />
              </div>
            </div>
          </ModalContent>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setIsAddSupplierOpen(false)}>Cancel</Button>
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
                <Input id="item" value={newEntry.item} onChange={(e) => setNewEntry({ ...newEntry, item: e.target.value })} placeholder="Medicine name" required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="rate">Rate</Label>
                  <Input id="rate" type="number" value={newEntry.rate} onChange={(e) => setNewEntry({ ...newEntry, rate: e.target.value })} placeholder="12" required />
                </div>
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input id="quantity" type="number" value={newEntry.quantity} onChange={(e) => setNewEntry({ ...newEntry, quantity: e.target.value })} placeholder="100" required />
                </div>
                <div>
                  <Label htmlFor="paid">Paid</Label>
                  <Input id="paid" type="number" value={newEntry.paid} onChange={(e) => setNewEntry({ ...newEntry, paid: e.target.value })} placeholder="1000" />
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

      {/* Payment Modal */}
      <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="Add Payment">
        <form onSubmit={handleAddPayment}>
          <ModalContent>
            <div className="space-y-4">
              {selectedEntry && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>Entry:</strong> {ledgerBySupplier[selectedEntry.supplier]?.find(e => e.id === selectedEntry.entryId)?.item}
                  </p>
                  <p className="text-sm text-blue-800">
                    <strong>Amount Due:</strong> ₹{(() => {
                      const entry = ledgerBySupplier[selectedEntry.supplier]?.find(e => e.id === selectedEntry.entryId);
                      return entry ? (entry.rate * entry.quantity - entry.paid).toLocaleString() : '0';
                    })()}
                  </p>
                </div>
              )}
              <div>
                <Label htmlFor="paymentAmount">Payment Amount</Label>
                <Input 
                  id="paymentAmount" 
                  type="number" 
                  value={paymentForm.amount} 
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} 
                  placeholder="Enter amount" 
                  required 
                />
              </div>
              <div>
                <Label htmlFor="paymentDate">Payment Date</Label>
                <Input 
                  id="paymentDate" 
                  type="date" 
                  value={paymentForm.date} 
                  onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })} 
                />
              </div>
              <div>
                <Label htmlFor="paymentNote">Note (optional)</Label>
                <Input 
                  id="paymentNote" 
                  value={paymentForm.note} 
                  onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })} 
                  placeholder="Payment reference or note" 
                />
              </div>
            </div>
          </ModalContent>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setIsPaymentModalOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-green-600 hover:bg-green-700">Record Payment</Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Payment History Modal */}
      <Modal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} title="Payment History">
        <ModalContent>
          <div className="space-y-4">
            {selectedHistoryEntry && (() => {
              const entry = ledgerBySupplier[selectedHistoryEntry.supplier]?.find(e => e.id === selectedHistoryEntry.entryId);
              const history = entry?.paymentHistory || [];
              const totalAmount = entry ? entry.rate * entry.quantity : 0;
              const totalPaid = history.reduce((sum: number, payment: { amount: number }) => sum + payment.amount, 0);
              const remaining = totalAmount - totalPaid;
              
              return (
                <>
                  <div className="p-4 bg-gray-50 rounded-lg border">
                    <h3 className="font-semibold text-lg mb-2">{entry?.item}</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Total Amount:</span>
                        <span className="ml-2 font-medium">₹{totalAmount.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Total Paid:</span>
                        <span className="ml-2 font-medium text-green-600">₹{totalPaid.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Remaining:</span>
                        <span className={`ml-2 font-medium ${remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          ₹{remaining.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Payments:</span>
                        <span className="ml-2 font-medium">{history.length}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Payment Details</h4>
                    {history.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No payments recorded yet</p>
                    ) : (
                      <div className="space-y-2">
                        {history.map((payment, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                            <div>
                              <div className="font-medium">₹{payment.amount.toLocaleString()}</div>
                              <div className="text-sm text-gray-600">{payment.date}</div>
                              {payment.note && (
                                <div className="text-sm text-gray-500">{payment.note}</div>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
                              Payment #{index + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsHistoryModalOpen(false)}>Close</Button>
        </ModalFooter>
      </Modal>

      {/* Tabs: one per supplier */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {suppliers.map((name) => (
            <Button
              key={name}
              variant={active === name ? "default" : "outline"}
              className={active === name ? "bg-primary hover:bg-primary/90" : ""}
              onClick={() => setActive(name)}
            >
              {name}
            </Button>
          ))}
          <Button variant="outline" onClick={() => setIsAddSupplierOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Supplier
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
            <CardDescription>Itemized ledger for this supplier</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              data={ledgerBySupplier[active] || []}
              columns={ledgerColumns}
              showFooter={true}
              footerContent={
                <div className="grid grid-cols-9 gap-4 text-sm">
                  <div className="col-span-3 font-semibold text-gray-900">Total</div>
                  <div className="text-right font-medium">
                    ₹{ledgerBySupplier[active]?.reduce((sum, r) => sum + r.rate * r.quantity, 0).toLocaleString() || '0'}
                  </div>
                  <div className="text-right font-medium">
                    ₹{ledgerBySupplier[active]?.reduce((sum, r) => sum + r.paid, 0).toLocaleString() || '0'}
                  </div>
                  <div className="text-right font-medium">
                    ₹{ledgerBySupplier[active]?.reduce((sum, r) => sum + (r.rate * r.quantity - r.paid), 0).toLocaleString() || '0'}
                  </div>
                  <div></div>
                  <div></div>
                  <div></div>
                </div>
              }
              emptyMessage="No entries for this supplier"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
