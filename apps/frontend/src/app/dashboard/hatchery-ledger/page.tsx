"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Egg, Plus, TrendingUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { getTodayLocalDate } from "@/lib/utils";
import { Modal, ModalContent, ModalFooter } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable, Column, createColumn } from "@/components/ui/data-table";
import { toast } from "sonner";
import {
  useGetAllHatcheries,
  useGetHatcheryStatistics,
  useGetHatcheryById,
  useCreateHatchery,
  useAddHatcheryTransaction,
} from "@/fetchers/hatcheries/hatcheryQueries";
import { TransactionType } from "@myapp/shared-types";

export default function HatcheryLedgerPage() {
  const [activeHatcheryId, setActiveHatcheryId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddHatcheryOpen, setIsAddHatcheryOpen] = useState(false);
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<{
    hatcheryId: string;
    entryId: string;
  } | null>(null);
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<{
    hatcheryId: string;
    entryId: string;
  } | null>(null);

  const [newHatchery, setNewHatchery] = useState({
    name: "",
    contact: "",
    address: "",
  });
  const [newEntry, setNewEntry] = useState({
    item: "",
    rate: "",
    quantity: "",
    paid: "",
    date: "",
    dueDate: "",
  });
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    date: "",
    note: "",
  });

  // API Queries
  const {
    data: hatcheriesResponse,
    isLoading: hatcheriesLoading,
    error: hatcheriesError,
  } = useGetAllHatcheries();

  const { data: statisticsResponse, isLoading: statisticsLoading } =
    useGetHatcheryStatistics();

  const { data: activeHatcheryResponse, isLoading: activeHatcheryLoading } =
    useGetHatcheryById(activeHatcheryId);

  // Mutations
  const createHatcheryMutation = useCreateHatchery();
  const addTransactionMutation = useAddHatcheryTransaction();

  // Extract data from responses
  const hatcheries = hatcheriesResponse?.data || [];
  const statistics = statisticsResponse?.data || {
    totalHatcheries: 0,
    activeHatcheries: 0,
    outstandingAmount: 0,
    thisMonthAmount: 0,
  };
  const activeHatchery = activeHatcheryResponse?.data;

  // Auto-select first hatchery when data is available
  useEffect(() => {
    if (hatcheries.length > 0 && !activeHatcheryId) {
      setActiveHatcheryId(hatcheries[0].id);
    }
  }, [hatcheries, activeHatcheryId]);

  async function handleAddHatchery(e: React.FormEvent) {
    e.preventDefault();
    if (!newHatchery.name.trim()) return;

    try {
      await createHatcheryMutation.mutateAsync({
        name: newHatchery.name.trim(),
        contact: newHatchery.contact.trim(),
        address: newHatchery.address.trim() || undefined,
      });

      toast.success("Hatchery added successfully!");
      setIsAddHatcheryOpen(false);
      setNewHatchery({ name: "", contact: "", address: "" });
    } catch (error) {
      console.error("Failed to add hatchery:", error);
      // Error toast is handled by axios interceptor
    }
  }

  async function handleAddEntry(e: React.FormEvent) {
    e.preventDefault();
    const rate = Number(newEntry.rate);
    const quantity = Number(newEntry.quantity);
    const paid = Number(newEntry.paid);
    const date: Date = newEntry.date ? new Date(newEntry.date) : new Date();
    if (!newEntry.item || !rate || !quantity || !activeHatcheryId) return;

    try {
      // Add purchase transaction
      await addTransactionMutation.mutateAsync({
        hatcheryId: activeHatcheryId,
        data: {
          type: "PURCHASE" as TransactionType,
          amount: rate * quantity,
            quantity, 
          itemName: newEntry.item,
          date,
          description: `Purchase of ${newEntry.item}`,
          entityType: "HATCHERY",
          entityId: activeHatcheryId,
        },
      });

      // Add payment transaction if paid amount > 0
      if (paid > 0) {
        await addTransactionMutation.mutateAsync({
          hatcheryId: activeHatcheryId,
          data: {
            type: "PAYMENT" as TransactionType,
            amount: paid,
            date, 
            description: `Initial payment for ${newEntry.item}`,
            entityType: "HATCHERY",
            entityId: activeHatcheryId,
          },
    });
      }

      toast.success("Transaction added successfully!");
    setIsAddEntryOpen(false);
      setNewEntry({
        item: "",
        rate: "",
        quantity: "",
        paid: "",
        date: "",
        dueDate: "",
      });
    } catch (error) {
      console.error("Failed to add transaction:", error);
      // Error toast is handled by axios interceptor
    }
  }

  // When Add Entry modal opens, default the Date field to today's local date (editable)
  useEffect(() => {
    if (isAddEntryOpen) {
      setNewEntry((prev) => ({ ...prev, date: getTodayLocalDate() }));
    }
  }, [isAddEntryOpen]);

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEntry || !paymentForm.amount || !activeHatcheryId) return;
    
    const paymentAmount = Number(paymentForm.amount);
    const paymentDate: Date = paymentForm.date ? new Date(paymentForm.date) : new Date();

    try {
      await addTransactionMutation.mutateAsync({
        hatcheryId: activeHatcheryId,
        data: {
          type: "PAYMENT" as TransactionType,
          amount: paymentAmount,
          date: paymentDate,
          description: paymentForm.note || "Payment",
          entityType: "HATCHERY",
          entityId: activeHatcheryId,
        },
      });

      toast.success("Payment recorded successfully!");
    setIsPaymentModalOpen(false);
    setSelectedEntry(null);
    setPaymentForm({ amount: "", date: "", note: "" });
    } catch (error) {
      console.error("Failed to record payment:", error);
      // Error toast is handled by axios interceptor
    }
  }

  function openPaymentModal(hatcheryId: string | null, entryId: string) {
    if (!hatcheryId) return;
    setSelectedEntry({ hatcheryId, entryId });
    setIsPaymentModalOpen(true);
  }

  function openHistoryModal(hatcheryId: string | null, entryId: string) {
    if (!hatcheryId) return;
    setSelectedHistoryEntry({ hatcheryId, entryId });
    setIsHistoryModalOpen(true);
  }

  function getRowDueDate(date: string) {
    const base = new Date(date);
    const due = new Date(base.getTime() + 7 * 24 * 60 * 60 * 1000);
    const dd = String(due.getUTCDate()).padStart(2, "0");
    const mm = String(due.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = due.getUTCFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  // Column configuration for DataTable
  const ledgerColumns: Column[] = [
    createColumn("itemName", "Item"),
    createColumn("rate", "Rate", {
      type: "currency",
      align: "right",
    }),
    createColumn("quantity", "Quantity", {
      type: "number",
      align: "right",
    }),
    createColumn("totalAmount", "Amount", {
      type: "currency",
      align: "right",
    }),
    createColumn("amountPaid", "Amount Paid", {
      type: "currency",
      align: "right",
    }),
    createColumn("amountDue", "Amount Due", {
      type: "currency",
      align: "right",
      render: (_, row) => {
        const due = row.amountDue;
        return (
          <div className="flex items-center justify-between">
            <span
              className={
                due > 0
                  ? "text-red-600 font-medium"
                  : "text-green-600 font-medium"
              }
            >
              ₹{due.toLocaleString()}
            </span>
            {due > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="ml-2 h-6 px-2 text-xs bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                onClick={() => openPaymentModal(activeHatcheryId, row.itemName)}
              >
                Pay
              </Button>
            )}
          </div>
        );
      },
    }),
    createColumn("date", "Date", {
      type: "date",
    }),
    createColumn("dueDate", "Due Date", {
      render: (_, row) => getRowDueDate(row.date),
    }),
    createColumn("payments", "Payment History", {
      render: (_, row) => {
        const history = row.payments || [];
        const totalPayments = history.length;
        const totalPaid = history.reduce(
          (sum: number, payment: { amount: number }) => sum + payment.amount,
          0
        );
        
        return (
          <div 
            className="cursor-pointer text-blue-600 hover:text-blue-800 hover:underline"
            onClick={() => openHistoryModal(activeHatcheryId, row.itemName)}
          >
            {totalPayments} payment{totalPayments !== 1 ? "s" : ""} (₹
            {totalPaid.toLocaleString()})
          </div>
        );
      },
    }),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hatchery Ledger</h1>
          <p className="text-muted-foreground">
            Manage chick purchases and hatchery balances.
          </p>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90"
          onClick={() => setIsAddHatcheryOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Chicks Dealer
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card
          onClick={() => setIsModalOpen(true)}
          className="cursor-pointer transition-colors hover:bg-[#10841E] hover:text-white"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Hatcheries
            </CardTitle>
            <Egg className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statisticsLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold">
                {statistics.totalHatcheries || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Chick suppliers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statisticsLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold">
                ₹{(statistics.outstandingAmount || 0).toLocaleString()}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Amount Due</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statisticsLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold">
                ₹{(statistics.thisMonthAmount || 0).toLocaleString()}
              </div>
            )}
            <p className="text-xs text-muted-foreground">New purchases</p>
          </CardContent>
        </Card>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Hatcheries – Amount Due"
      >
        <ModalContent>
          <div className="space-y-3">
            {hatcheriesLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading hatcheries...</span>
              </div>
            ) : hatcheriesError ? (
              <div className="text-center py-4 text-red-600">
                Failed to load hatcheries
              </div>
            ) : (
              hatcheries.map((hatchery: any) => (
                <div
                  key={hatchery.id}
                  className="flex items-center justify-between rounded-md border p-3 hover:border-primary/60"
                >
                <div>
                    <div className="font-medium">{hatchery.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Contact: {hatchery.contact}
                    </div>
                  </div>
                  <div className="text-right font-medium">
                    ₹{(hatchery.balance || 0).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsModalOpen(false)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* Add Hatchery Modal */}
      <Modal
        isOpen={isAddHatcheryOpen}
        onClose={() => setIsAddHatcheryOpen(false)}
        title="Add Chicks Dealer"
      >
        <form onSubmit={handleAddHatchery}>
          <ModalContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="hname">Hatchery Name</Label>
                <Input
                  id="hname"
                  value={newHatchery.name}
                  onChange={(e) =>
                    setNewHatchery({ ...newHatchery, name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="hcontact">Contact</Label>
                <Input
                  id="hcontact"
                  value={newHatchery.contact}
                  onChange={(e) =>
                    setNewHatchery({ ...newHatchery, contact: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="haddress">Address (optional)</Label>
                <Input
                  id="haddress"
                  value={newHatchery.address}
                  onChange={(e) =>
                    setNewHatchery({ ...newHatchery, address: e.target.value })
                  }
                />
              </div>
            </div>
          </ModalContent>
          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddHatcheryOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90"
              disabled={createHatcheryMutation.isPending}
            >
              {createHatcheryMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add"
              )}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Add Entry Modal */}
      <Modal
        isOpen={isAddEntryOpen}
        onClose={() => setIsAddEntryOpen(false)}
        title={`Add Entry – ${activeHatchery?.name || "Hatchery"}`}
      >
        <form onSubmit={handleAddEntry}>
          <ModalContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="item">Item</Label>
                <Input
                  id="item"
                  value={newEntry.item}
                  onChange={(e) =>
                    setNewEntry({ ...newEntry, item: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="rate">Rate</Label>
                  <Input
                    id="rate"
                    type="number"
                    value={newEntry.rate}
                    onChange={(e) =>
                      setNewEntry({ ...newEntry, rate: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={newEntry.quantity}
                    onChange={(e) =>
                      setNewEntry({ ...newEntry, quantity: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="paid">Paid</Label>
                  <Input
                    id="paid"
                    type="number"
                    value={newEntry.paid}
                    onChange={(e) =>
                      setNewEntry({ ...newEntry, paid: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newEntry.date}
                    onChange={(e) =>
                      setNewEntry({ ...newEntry, date: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="dueDate">Due Date (optional)</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={newEntry.dueDate}
                    onChange={(e) =>
                      setNewEntry({ ...newEntry, dueDate: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
          </ModalContent>
          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddEntryOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90"
              disabled={addTransactionMutation.isPending}
            >
              {addTransactionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Add Payment"
      >
        <form onSubmit={handleAddPayment}>
          <ModalContent>
            <div className="space-y-4">
              {selectedEntry && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>Entry:</strong> {selectedEntry.entryId}
                  </p>
                  <p className="text-sm text-blue-800">
                    <strong>Amount Due:</strong> ₹
                    {(() => {
                      const entry = activeHatchery?.transactionTable?.find(
                        (e: any) => e.itemName === selectedEntry.entryId
                      );
                      return entry ? entry.amountDue.toLocaleString() : "0";
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
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, amount: e.target.value })
                  }
                  required 
                />
              </div>
              <div>
                <Label htmlFor="paymentDate">Payment Date</Label>
                <Input 
                  id="paymentDate" 
                  type="date" 
                  value={paymentForm.date} 
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, date: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="paymentNote">Note (optional)</Label>
                <Input 
                  id="paymentNote" 
                  value={paymentForm.note} 
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, note: e.target.value })
                  }
                />
              </div>
            </div>
          </ModalContent>
          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPaymentModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-green-600 hover:bg-green-700"
              disabled={addTransactionMutation.isPending}
            >
              {addTransactionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recording...
                </>
              ) : (
                "Record Payment"
              )}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Payment History Modal */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title="Payment History"
      >
        <ModalContent>
          <div className="space-y-4">
            {selectedHistoryEntry &&
              (() => {
                const entry = activeHatchery?.transactionTable?.find(
                  (e: any) => e.itemName === selectedHistoryEntry.entryId
                );
                const history = entry?.payments || [];
                const totalAmount = entry ? entry.totalAmount : 0;
                const totalPaid = entry ? entry.amountPaid : 0;
                const remaining = entry ? entry.amountDue : 0;
              
              return (
                <>
                  <div className="p-4 bg-gray-50 rounded-lg border">
                      <h3 className="font-semibold text-lg mb-2">
                        {entry?.itemName}
                      </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Total Amount:</span>
                          <span className="ml-2 font-medium">
                            ₹{totalAmount.toLocaleString()}
                          </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Total Paid:</span>
                          <span className="ml-2 font-medium text-green-600">
                            ₹{totalPaid.toLocaleString()}
                          </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Remaining:</span>
                          <span
                            className={`ml-2 font-medium ${remaining > 0 ? "text-red-600" : "text-green-600"}`}
                          >
                          ₹{remaining.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Payments:</span>
                          <span className="ml-2 font-medium">
                            {history.length}
                          </span>
                        </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">
                        Payment Details
                      </h4>
                    {history.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">
                          No payments recorded yet
                        </p>
                    ) : (
                      <div className="space-y-2">
                          {history.map((payment: any, index: number) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-white border rounded-lg"
                            >
                            <div>
                                <div className="font-medium">
                                  ₹{payment.amount.toLocaleString()}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {new Date(payment.date).toLocaleDateString()}
                                </div>
                                {payment.reference && (
                                  <div className="text-sm text-gray-500">
                                    {payment.reference}
                                  </div>
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
          <Button
            variant="outline"
            onClick={() => setIsHistoryModalOpen(false)}
          >
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* Tabs: one per hatchery */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {hatcheriesLoading ? (
            <div className="flex items-center">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span>Loading hatcheries...</span>
            </div>
          ) : hatcheriesError ? (
            <div className="text-red-600">Failed to load hatcheries</div>
          ) : (
            hatcheries.map((hatchery: any) => (
            <Button
                key={hatchery.id}
                variant={
                  activeHatcheryId === hatchery.id ? "default" : "outline"
                }
                className={
                  activeHatcheryId === hatchery.id
                    ? "bg-primary hover:bg-primary/90"
                    : ""
                }
                onClick={() => setActiveHatcheryId(hatchery.id)}
              >
                {hatchery.name}
            </Button>
            ))
          )}
          <Button variant="outline" onClick={() => setIsAddHatcheryOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Chicks Dealer
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {activeHatcheryLoading ? (
                  <div className="flex items-center">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading...
                  </div>
                ) : (
                  activeHatchery?.name || "Select a hatchery"
                )}
              </CardTitle>
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={() => setIsAddEntryOpen(true)}
                disabled={!activeHatcheryId}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Entry
              </Button>
            </div>
            <CardDescription>Itemized ledger for this hatchery</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {activeHatcheryLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading hatchery data...</span>
              </div>
            ) : (
            <DataTable
                data={activeHatchery?.transactionTable || []}
              columns={ledgerColumns}
              showFooter={true}
              footerContent={
                <div className="grid grid-cols-9 gap-4 text-sm">
                    <div className="col-span-3 font-semibold text-gray-900">
                      Total
                    </div>
                  <div className="text-right font-medium">
                      ₹
                      {activeHatchery?.transactionTable
                        ?.reduce(
                          (sum: number, r: any) => sum + r.totalAmount,
                          0
                        )
                        .toLocaleString() || "0"}
                  </div>
                  <div className="text-right font-medium">
                      ₹
                      {activeHatchery?.transactionTable
                        ?.reduce((sum: number, r: any) => sum + r.amountPaid, 0)
                        .toLocaleString() || "0"}
                  </div>
                  <div className="text-right font-medium">
                      ₹
                      {activeHatchery?.transactionTable
                        ?.reduce((sum: number, r: any) => sum + r.amountDue, 0)
                        .toLocaleString() || "0"}
                  </div>
                  <div></div>
                  <div></div>
                  <div></div>
                </div>
              }
              emptyMessage="No entries for this hatchery"
            />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
