"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users, Plus, TrendingUp, Loader2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { getNowLocalDateTime } from "@/lib/utils";
import { Modal, ModalContent, ModalFooter } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable, Column, createColumn } from "@/components/ui/data-table";
import { useInventory } from "@/contexts/InventoryContext";
import { toast } from "sonner";
import { 
  useGetAllDealers,
  useGetDealerStatistics,
  useGetDealerById,
  useCreateDealer,
  useAddDealerTransaction,
  useDeleteDealerTransaction,
} from "@/fetchers/dealers/dealerQueries";
import { TransactionType } from "@myapp/shared-types";

export default function DealerLedgerPage() {
  const [activeDealerId, setActiveDealerId] = useState<string>("");
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isAddDealerOpen, setIsAddDealerOpen] = useState(false);
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ password: "" });
  const [selectedEntry, setSelectedEntry] = useState<{
    dealerId: string;
    entryId: string;
  } | null>(null);
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<{
    dealerId: string;
    entryId: string;
  } | null>(null);

  const { addInventoryItem } = useInventory();

  const [newDealer, setNewDealer] = useState({
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
    data: dealersResponse,
    isLoading: dealersLoading,
    error: dealersError,
  } = useGetAllDealers();

  const { data: statisticsResponse, isLoading: statisticsLoading } =
    useGetDealerStatistics();

  const { data: activeDealerResponse, isLoading: activeDealerLoading } =
    useGetDealerById(activeDealerId);

  // Mutations
  const createDealerMutation = useCreateDealer();
  const addTransactionMutation = useAddDealerTransaction();
  const deleteTxn = useDeleteDealerTransaction();

  // Extract data
  const dealers = dealersResponse?.data || [];
  const statistics = statisticsResponse?.data || {};
  const activeDealer = activeDealerResponse?.data;

  // Set first dealer as active when dealers load
  useEffect(() => {
    if (dealers.length > 0 && !activeDealerId) {
      setActiveDealerId(dealers[0].id);
    }
  }, [dealers, activeDealerId]);

  // Helper functions for date formatting
  function getRowDueDate(date: string) {
    const base = new Date(date);
    const d = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from purchase
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = d.getUTCFullYear();
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
                onClick={() => openPaymentModal(activeDealerId, row.itemName)}
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
            onClick={() => openHistoryModal(activeDealerId, row.itemName)}
          >
            {totalPayments} payment{totalPayments !== 1 ? "s" : ""} (₹
            {totalPaid.toLocaleString()})
          </div>
        );
      },
    }),
  ];

  function toggleAll() {
    if (!activeDealer?.transactionTable) return;
    if (selectedIds.size === activeDealer.transactionTable.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(activeDealer.transactionTable.map((r: any) => r.transactionId)));
    }
  }

  function toggleOne(row: any) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const key = row.transactionId;
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function exitDeleteMode() {
    setIsDeleteMode(false);
    setSelectedIds(new Set());
  }

  async function confirmDeleteSelected() {
    if (!activeDealerId || selectedIds.size === 0) return;
    setIsConfirmDeleteOpen(false);
    setIsPasswordModalOpen(true);
  }

  async function handlePasswordConfirm() {
    if (!activeDealerId || selectedIds.size === 0 || !passwordForm.password) return;
    
    const ids = Array.from(selectedIds);
    let failed = 0;
    
    try {
      await Promise.all(
        ids.map(async (entryId) => {
          try {
            await deleteTxn.mutateAsync({ 
              dealerId: activeDealerId, 
              transactionId: entryId,
              password: passwordForm.password 
            });
          } catch (e) {
            failed += 1;
          }
        })
      );
      
      exitDeleteMode();
      setIsPasswordModalOpen(false);
      setPasswordForm({ password: "" });
      
      if (failed === 0) {
        toast.success("Selected entries deleted successfully");
      } else {
        toast.error(`Failed to delete ${failed} entr${failed === 1 ? 'y' : 'ies'}`);
      }
    } catch (error) {
      toast.error("Password verification failed. Deletion cancelled.");
      setIsPasswordModalOpen(false);
      setPasswordForm({ password: "" });
    }
  }

  async function handleAddDealer(e: React.FormEvent) {
    e.preventDefault();
    const name = newDealer.name.trim();
    const contact = newDealer.contact.trim();
    if (!name || !contact) return;

    try {
      await createDealerMutation.mutateAsync({
        name,
        contact,
        address: newDealer.address || undefined,
      });

      toast.success("Dealer created successfully!");
      setIsAddDealerOpen(false);
      setNewDealer({ name: "", contact: "", address: "" });
    } catch (error) {
      console.error("Failed to create dealer:", error);
      // Error toast is handled by axios interceptor
    }
  }

  async function handleAddEntry(e: React.FormEvent) {
    e.preventDefault();
    const rate = Number(newEntry.rate);
    const quantity = Number(newEntry.quantity);
    const paid = Number(newEntry.paid);
    const date = newEntry.date || new Date().toISOString();
    if (!newEntry.item || !rate || !quantity || !activeDealerId) return;

    try {
      // Add purchase transaction
      await addTransactionMutation.mutateAsync({
        dealerId: activeDealerId,
        data: {
          type: "PURCHASE" as TransactionType,
          amount: rate * quantity,
          quantity,
          itemName: newEntry.item,
          date,
          description: `Purchase of ${newEntry.item}`,
        },
      });

      // Add payment transaction if paid amount > 0
      if (paid > 0) {
        await addTransactionMutation.mutateAsync({
          dealerId: activeDealerId,
          data: {
            type: "PAYMENT" as TransactionType,
            amount: paid,
            date,
            description: `Initial payment for ${newEntry.item}`,
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

  // Default Add Entry date to user's local now when modal opens (editable)
  useEffect(() => {
    if (isAddEntryOpen) {
      setNewEntry((prev) => ({ ...prev, date: getNowLocalDateTime() }));
    }
  }, [isAddEntryOpen]);

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEntry || !paymentForm.amount || !activeDealerId) return;

    const paymentAmount = Number(paymentForm.amount);
    const paymentDate = paymentForm.date || new Date().toISOString();

    try {
      await addTransactionMutation.mutateAsync({
        dealerId: activeDealerId,
        data: {
          type: "PAYMENT" as TransactionType,
          amount: paymentAmount,
          date: paymentDate,
          description: paymentForm.note || "Payment",
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

  function openPaymentModal(dealerId: string, entryId: string) {
    setSelectedEntry({ dealerId, entryId });
    setIsPaymentModalOpen(true);
  }

  function openHistoryModal(dealerId: string, entryId: string) {
    setSelectedHistoryEntry({ dealerId, entryId });
    setIsHistoryModalOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Feed Dealer Ledger
          </h1>
          <p className="text-muted-foreground">
            Manage dealer purchases and balances.
          </p>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90"
          onClick={() => setIsAddDealerOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Feed Dealer
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card
          onClick={() => setIsSummaryOpen(true)}
          className="cursor-pointer transition-colors hover:bg-[#10841E] hover:text-white"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Dealers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statisticsLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold">
                {statistics.totalDealers || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Active suppliers</p>
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

      {/* Summary Modal */}
      <Modal
        isOpen={isSummaryOpen}
        onClose={() => setIsSummaryOpen(false)}
        title="Dealers – Amount Due"
      >
        <ModalContent>
          <div className="space-y-3">
            {dealersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading dealers...</span>
              </div>
            ) : dealers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No dealers found</p>
              </div>
            ) : (
              dealers.map((dealer: any) => (
                <div
                  key={dealer.id}
                  className="flex items-center justify-between rounded-md border p-3 hover:border-primary/60"
                >
                  <div>
                    <div className="font-medium">{dealer.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Contact: {dealer.contact}
                    </div>
                  </div>
                  <div className="text-right font-medium">
                    ₹{(dealer.balance || 0).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsSummaryOpen(false)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* Confirm Delete Modal */}
      <Modal
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        title={`Delete ${selectedIds.size} entr${selectedIds.size === 1 ? 'y' : 'ies'}?`}
      >
        <ModalContent>
          <p className="text-sm text-muted-foreground">
            This action cannot be undone. The selected entries will be permanently removed.
          </p>
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsConfirmDeleteOpen(false)}>
            Cancel
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={confirmDeleteSelected}
            disabled={deleteTxn.isPending}
          >
            {deleteTxn.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...
              </>
            ) : (
              "Delete"
            )}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Password Confirmation Modal */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => {
          setIsPasswordModalOpen(false);
          setPasswordForm({ password: "" });
        }}
        title="Confirm Deletion"
      >
        <ModalContent>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-800">
                <strong>Warning:</strong> This action cannot be undone. You are about to delete {selectedIds.size} transaction{selectedIds.size !== 1 ? 's' : ''}.
              </p>
            </div>
            <div>
              <Label htmlFor="password">Enter your password to confirm deletion</Label>
              <Input
                id="password"
                type="password"
                value={passwordForm.password}
                onChange={(e) => setPasswordForm({ password: e.target.value })}
                placeholder="Enter your password"
                required
                className="mt-1"
              />
            </div>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button 
            variant="outline" 
            onClick={() => {
              setIsPasswordModalOpen(false);
              setPasswordForm({ password: "" });
            }}
          >
            Cancel
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={handlePasswordConfirm}
            disabled={!passwordForm.password || deleteTxn.isPending}
          >
            {deleteTxn.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...
              </>
            ) : (
              "Confirm Deletion"
            )}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Add Dealer Modal */}
      <Modal
        isOpen={isAddDealerOpen}
        onClose={() => setIsAddDealerOpen(false)}
        title="Add Dealer"
      >
        <form onSubmit={handleAddDealer}>
          <ModalContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="dname">Dealer Name</Label>
                <Input
                  id="dname"
                  value={newDealer.name}
                  onChange={(e) =>
                    setNewDealer({ ...newDealer, name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="dcontact">Contact</Label>
                <Input
                  id="dcontact"
                  value={newDealer.contact}
                  onChange={(e) =>
                    setNewDealer({ ...newDealer, contact: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="daddress">Address (optional)</Label>
                <Input
                  id="daddress"
                  value={newDealer.address}
                  onChange={(e) =>
                    setNewDealer({ ...newDealer, address: e.target.value })
                  }
                />
              </div>
            </div>
          </ModalContent>
          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddDealerOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90"
              disabled={createDealerMutation.isPending}
            >
              {createDealerMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Dealer"
              )}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Add Entry Modal */}
      <Modal
        isOpen={isAddEntryOpen}
        onClose={() => setIsAddEntryOpen(false)}
        title={`Add Entry – ${activeDealer?.name || "Dealer"}`}
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
                  placeholder="Feed brand"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="rate">Rate (per kg)</Label>
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
                  <Label htmlFor="quantity">Quantity (kg)</Label>
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
                  <Label htmlFor="paid">Paid Amount</Label>
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
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="datetime-local"
                  value={newEntry.date}
                  onChange={(e) =>
                    setNewEntry({ ...newEntry, date: e.target.value })
                  }
                />
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
                "Save Entry"
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
              {selectedEntry && activeDealer && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>Entry:</strong> {selectedEntry.entryId}
                  </p>
                  <p className="text-sm text-blue-800">
                    <strong>Dealer:</strong> {activeDealer.name}
                  </p>
                  <p className="text-sm text-blue-800">
                    <strong>Outstanding Balance:</strong> ₹
                    {(activeDealer.balance || 0).toLocaleString()}
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
              activeDealer &&
              (() => {
                const entry = activeDealer.transactionTable?.find(
                  (e: any) => e.itemName === selectedHistoryEntry.entryId
                );
                const history = entry?.payments || [];
                const totalAmount = entry?.totalAmount || 0;
                const totalPaid = history.reduce(
                  (sum: number, payment: any) => sum + payment.amount,
                  0
                );
                const remaining = totalAmount - totalPaid;

                return (
                  <>
                    <div className="p-4 bg-gray-50 rounded-lg border">
                      <h3 className="font-semibold text-lg mb-2">
                        {entry?.itemName || "Transaction"}
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

      {/* Loading State */}
      {dealersLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading dealers...</span>
        </div>
      )}

      {/* Error State */}
      {dealersError && (
        <div className="text-center py-8">
          <p className="text-red-600">
            Failed to load dealers. Please try again.
          </p>
        </div>
      )}

      {/* Tabs: one per dealer */}
      {!dealersLoading && !dealersError && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {dealers.map((dealer: any) => (
              <Button
                key={dealer.id}
                variant={activeDealerId === dealer.id ? "default" : "outline"}
                className={
                  activeDealerId === dealer.id
                    ? "bg-primary hover:bg-primary/90"
                    : ""
                }
                onClick={() => setActiveDealerId(dealer.id)}
              >
                {dealer.name}
              </Button>
            ))}
            <Button variant="outline" onClick={() => setIsAddDealerOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Feed Dealer
            </Button>
          </div>

          {dealers.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No dealers found</h3>
                <p className="text-muted-foreground mb-4">
                  Get started by creating your first dealer.
                </p>
                <Button onClick={() => setIsAddDealerOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Dealer
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    {activeDealer?.name || "Select a dealer"}
                  </CardTitle>
                  <div className="flex gap-2">
                    {isDeleteMode ? (
                      <>
                        <Button variant="outline" onClick={exitDeleteMode}>
                          <X className="mr-2 h-4 w-4" /> Cancel
                        </Button>
                        <Button
                          className="bg-red-600 hover:bg-red-700 text-white"
                          disabled={selectedIds.size === 0 || deleteTxn.isPending}
                          onClick={() => setIsConfirmDeleteOpen(true)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete ({selectedIds.size})
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => setIsDeleteMode(true)}
                          disabled={!activeDealerId}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete Entries
                        </Button>
                        <Button
                          className="bg-primary hover:bg-primary/90"
                          onClick={() => setIsAddEntryOpen(true)}
                          disabled={!activeDealerId}
                        >
                          <Plus className="mr-2 h-4 w-4" /> Add Entry
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <CardDescription>
                  {activeDealer
                    ? `Itemized ledger for ${activeDealer.name}`
                    : "Select a dealer to view transactions"}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {activeDealerLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Loading dealer details...</span>
                  </div>
                ) : (
                  <DataTable
                    data={activeDealer?.transactionTable || []}
                    columns={ledgerColumns}
                    selectable={isDeleteMode}
                    isAllSelected={
                      !!activeDealer?.transactionTable &&
                      selectedIds.size > 0 &&
                      selectedIds.size === activeDealer.transactionTable.length
                    }
                    onToggleAll={toggleAll}
                    isRowSelected={(row: any) => selectedIds.has(row.transactionId)}
                    onToggleRow={toggleOne}
                    getRowKey={(row: any) => row.transactionId}
                    showFooter={true}
                    footerContent={
                      <div className="grid grid-cols-9 gap-4 text-sm">
                        <div className="col-span-3 font-semibold text-gray-900">
                          Total
                        </div>
                        <div className="text-right font-medium">
                          ₹
                          {(
                            activeDealer?.transactionTable?.reduce(
                              (sum: number, r: any) => sum + r.totalAmount,
                              0
                            ) || 0
                          ).toLocaleString()}
                        </div>
                        <div className="text-right font-medium">
                          ₹
                          {(
                            activeDealer?.transactionTable?.reduce(
                              (sum: number, r: any) => sum + r.amountPaid,
                              0
                            ) || 0
                          ).toLocaleString()}
                        </div>
                        <div className="text-right font-medium">
                          ₹
                          {(
                            activeDealer?.transactionTable?.reduce(
                              (sum: number, r: any) => sum + r.amountDue,
                              0
                            ) || 0
                          ).toLocaleString()}
                        </div>
                        <div></div>
                        <div></div>
                        <div></div>
                      </div>
                    }
                    emptyMessage="No transactions for this dealer"
                  />
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
