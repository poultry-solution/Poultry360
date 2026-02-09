"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Pill, Plus, TrendingUp, Loader2, Trash2, X } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { useState, useEffect } from "react";
import { getNowLocalDateTime } from "@/common/lib/utils";
import { Modal, ModalContent, ModalFooter } from "@/common/components/ui/modal";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { DataTable, Column, createColumn } from "@/common/components/ui/data-table";
import { useInventory } from "@/common/contexts/InventoryContext";
import { toast } from "sonner";
import {
  useGetAllMedicalSuppliers,
  useGetMedicalSupplierStatistics,
  useGetMedicalSupplierById,
  useCreateMedicalSupplier,
  useAddMedicalSupplierTransaction,
  useDeleteMedicalSupplierTransaction,
  useDeleteMedicalSupplier,
} from "@/fetchers/medicalSuppliers/medicalSupplierQueries";
import { TransactionType } from "@myapp/shared-types";
import { DateInput } from "@/common/components/ui/date-input";
import { DateDisplay } from "@/common/components/ui/date-display";
import { useI18n } from "@/i18n/useI18n";

export default function MedicalSupplierLedgerPage() {
  const { t } = useI18n();
  const [activeSupplierId, setActiveSupplierId] = useState<string | null>(null);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ password: "" });
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isDeleteSupplierOpen, setIsDeleteSupplierOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<{
    supplierId: string;
    entryId: string;
  } | null>(null);
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<{
    supplierId: string;
    entryId: string;
  } | null>(null);

  const { addInventoryItem } = useInventory();

  const [newSupplier, setNewSupplier] = useState({
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
    data: suppliersResponse,
    isLoading: suppliersLoading,
    error: suppliersError,
  } = useGetAllMedicalSuppliers();

  const { data: statisticsResponse, isLoading: statisticsLoading } =
    useGetMedicalSupplierStatistics();

  const { data: activeSupplierResponse, isLoading: activeSupplierLoading } =
    useGetMedicalSupplierById(activeSupplierId);

  // Mutations
  const createSupplierMutation = useCreateMedicalSupplier();
  const addTransactionMutation = useAddMedicalSupplierTransaction();
  const deleteTxn = useDeleteMedicalSupplierTransaction();
  const deleteSupplierMutation = useDeleteMedicalSupplier();

  // Extract data from responses
  const suppliers = suppliersResponse?.data || [];
  const statistics = statisticsResponse?.data || {
    totalSuppliers: 0,
    activeSuppliers: 0,
    outstandingAmount: 0,
    thisMonthAmount: 0,
  };
  const activeSupplier = activeSupplierResponse?.data;

  // Auto-select first supplier when data is available
  useEffect(() => {
    if (suppliers.length > 0 && !activeSupplierId) {
      setActiveSupplierId(suppliers[0].id);
    }
  }, [suppliers, activeSupplierId]);

  // Compute due date (7 days from purchase) for DateDisplay
  function getRowDueDateDate(date: string): Date {
    const base = new Date(date);
    const d = new Date(base);
    d.setDate(d.getDate() + 7);
    return d;
  }

  function toggleAll() {
    if (!activeSupplier?.transactionTable) return;
    if (selectedIds.size === activeSupplier.transactionTable.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(activeSupplier.transactionTable.map((r: any) => r.id)));
    }
  }

  function toggleOne(row: any) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const key = row.id;
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function exitDeleteMode() {
    setIsDeleteMode(false);
    setSelectedIds(new Set());
  }

  async function confirmDeleteSelected() {
    if (!activeSupplierId || selectedIds.size === 0) return;
    setIsConfirmDeleteOpen(false);
    setIsPasswordModalOpen(true);
  }

  async function handlePasswordConfirm() {
    if (!activeSupplierId || selectedIds.size === 0 || !passwordForm.password) return;

    const ids = Array.from(selectedIds);
    let failed = 0;

    try {
      await Promise.all(
        ids.map(async (entryId) => {
          try {
            await deleteTxn.mutateAsync({
              supplierId: activeSupplierId,
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

  // Column configuration for DataTable
  const ledgerColumns: Column[] = [
    createColumn("itemName", t("farmer.medicalLedger.table.item")),
    createColumn("rate", t("farmer.medicalLedger.table.rate"), {
      type: "currency",
      align: "right",
    }),
    createColumn("quantity", t("farmer.medicalLedger.table.quantity"), {
      type: "number",
      align: "right",
    }),
    createColumn("totalAmount", t("farmer.medicalLedger.table.amount"), {
      type: "currency",
      align: "right",
    }),
    createColumn("amountPaid", t("farmer.medicalLedger.table.paid"), {
      type: "currency",
      align: "right",
    }),
    createColumn("amountDue", t("farmer.medicalLedger.table.due"), {
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
                onClick={() => openPaymentModal(activeSupplierId, row.id)}
              >
                {t("farmer.medicalLedger.table.pay")}
              </Button>
            )}
          </div>
        );
      },
    }),
    createColumn("date", t("farmer.medicalLedger.table.date"), {
      type: "date",
    }),
    createColumn("dueDate", t("farmer.medicalLedger.table.dueDate"), {
      render: (_, row) =>
        row.date ? (
          <DateDisplay date={getRowDueDateDate(row.date)} format="short" />
        ) : (
          "—"
        ),
    }),
    createColumn("payments", t("farmer.medicalLedger.table.paymentHistory"), {
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
            onClick={() => openHistoryModal(activeSupplierId, row.id)}
          >
            {t("farmer.medicalLedger.table.historyText", {
              count: totalPayments,
              amount: `₹${totalPaid.toLocaleString()}`,
            })}
          </div>
        );
      },
    }),
  ];

  async function handleAddSupplier(e: React.FormEvent) {
    e.preventDefault();
    if (!newSupplier.name.trim()) return;

    try {
      await createSupplierMutation.mutateAsync({
        name: newSupplier.name.trim(),
        contact: newSupplier.contact.trim(),
        address: newSupplier.address.trim() || undefined,
      });

      toast.success("Medical supplier added successfully!");
      setIsAddSupplierOpen(false);
      setNewSupplier({ name: "", contact: "", address: "" });
    } catch (error) {
      console.error("Failed to add supplier:", error);
      // Error toast is handled by axios interceptor
    }
  }

  async function handleAddEntry(e: React.FormEvent) {
    e.preventDefault();
    const rate = Number(newEntry.rate);
    const quantity = Number(newEntry.quantity);
    const paid = Number(newEntry.paid);
    const date = newEntry.date || new Date().toISOString();
    if (!newEntry.item || !rate || !quantity || !activeSupplierId) return;

    try {
      // Add purchase transaction
      await addTransactionMutation.mutateAsync({
        supplierId: activeSupplierId,
        data: {
          type: "PURCHASE" as TransactionType,
          amount: rate * quantity,
          quantity,
          itemName: newEntry.item,
          date,
          description: `Purchase of ${newEntry.item}`,
          // 🔗 Include initial payment in the same request
          paymentAmount: paid > 0 ? paid : undefined,
          paymentDescription: paid > 0 ? `Initial payment for ${newEntry.item}` : undefined,
        },
      });

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
    if (!selectedEntry || !paymentForm.amount || !activeSupplierId) return;

    const paymentAmount = Number(paymentForm.amount);
    const paymentDate = paymentForm.date || new Date().toISOString();

    try {
      await addTransactionMutation.mutateAsync({
        supplierId: activeSupplierId,
        data: {
          type: "PAYMENT" as TransactionType,
          amount: paymentAmount,
          date: paymentDate,
          description: paymentForm.note || "Payment",
          // 🔗 Link follow-up payment to purchase row id
          paymentToPurchaseId: selectedEntry.entryId,
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

  function openPaymentModal(supplierId: string | null, entryId: string) {
    if (!supplierId) return;
    setSelectedEntry({ supplierId, entryId });
    setIsPaymentModalOpen(true);
  }

  function openHistoryModal(supplierId: string | null, entryId: string) {
    if (!supplierId) return;
    setSelectedHistoryEntry({ supplierId, entryId });
    setIsHistoryModalOpen(true);
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {t("farmer.medicalLedger.title")}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {t("farmer.medicalLedger.subtitle")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            className="text-xs md:text-sm bg-primary hover:bg-primary/90"
            onClick={() => setIsAddSupplierOpen(true)}
          >
            <Plus className="mr-1 md:mr-2 h-3.5 w-3.5 md:h-4 md:w-4" />
            <Plus className="mr-1 md:mr-2 h-3.5 w-3.5 md:h-4 md:w-4" />
            <span className="hidden sm:inline">{t("farmer.medicalLedger.addSupplier").replace("Supplier", "")}</span>{t("farmer.medicalLedger.addSupplier").replace("Add", "")}
          </Button>
        </div>
      </div>

      <div className="grid gap-2 grid-cols-3">
        <Card
          onClick={() => setIsSummaryOpen(true)}
          className="cursor-pointer transition-colors hover:bg-[#10841E] hover:text-white"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[10px] md:text-sm font-medium">
              {t("farmer.medicalLedger.stats.suppliers")}
            </CardTitle>
            <Pill className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            {statisticsLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <div className="text-base md:text-2xl font-bold">
                {statistics.totalSuppliers || 0}
              </div>
            )}
            <p className="text-[9px] md:text-xs text-muted-foreground">{t("farmer.medicalLedger.stats.medicine")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[10px] md:text-sm font-medium">{t("farmer.medicalLedger.stats.due")}</CardTitle>
            <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            {statisticsLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <div className="text-base md:text-2xl font-bold">
                <span className="hidden md:inline">रू</span>{(statistics.outstandingAmount || 0).toLocaleString()}
              </div>
            )}
            <p className="text-[9px] md:text-xs text-muted-foreground">{t("farmer.medicalLedger.stats.outstanding")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[10px] md:text-sm font-medium">{t("farmer.medicalLedger.stats.month")}</CardTitle>
            <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            {statisticsLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <div className="text-base md:text-2xl font-bold">
                <span className="hidden md:inline">रू</span>{(statistics.thisMonthAmount || 0).toLocaleString()}
              </div>
            )}
            <p className="text-[9px] md:text-xs text-muted-foreground">{t("farmer.medicalLedger.stats.purchases")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Summary Modal */}
      <Modal
        isOpen={isSummaryOpen}
        onClose={() => setIsSummaryOpen(false)}
        title={t("farmer.medicalLedger.summaryModal.title")}
      >
        <ModalContent>
          <div className="space-y-3">
            {suppliersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">{t("farmer.medicalLedger.loadingSuppliers")}</span>
              </div>
            ) : suppliers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">{t("farmer.medicalLedger.summaryModal.noSuppliers")}</p>
              </div>
            ) : (
              suppliers.map((supplier: any) => (
                <div
                  key={supplier.id}
                  className="flex items-center justify-between rounded-md border p-3 hover:border-primary/60"
                >
                  <div>
                    <div className="font-medium">{supplier.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {t("farmer.medicalLedger.summaryModal.contact")}: {supplier.contact}
                    </div>
                  </div>
                  <div className="text-right font-medium">
                    ₹{(supplier.balance || 0).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsSummaryOpen(false)}>
            {t("farmer.medicalLedger.summaryModal.close")}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Supplier Confirmation Modal */}
      <Modal
        isOpen={isDeleteSupplierOpen}
        onClose={() => setIsDeleteSupplierOpen(false)}
        title={t("farmer.medicalLedger.deleteSupplierModal.title")}
      >
        <ModalContent>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-800">
                <strong>Warning:</strong> This will permanently delete supplier{" "}
                <strong>{activeSupplier?.name ? ` ${activeSupplier.name}` : ""}</strong>.
              </p>
              {activeSupplier?.transactionTable?.length > 0 && (
                <p className="text-sm text-red-700 mt-2">
                  This supplier has {activeSupplier.transactionTable.length} transaction(s). You must delete all transactions first.
                </p>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{t("farmer.medicalLedger.deleteSupplierModal.proceed")}</p>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsDeleteSupplierOpen(false)}>
            {t("farmer.medicalLedger.deleteSupplierModal.cancel")}
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={async () => {
              if (!activeSupplierId) return;
              try {
                await deleteSupplierMutation.mutateAsync(activeSupplierId);
                toast.success("Supplier deleted successfully");
                setIsDeleteSupplierOpen(false);
                setSelectedIds(new Set());
                const remaining = (suppliers || []).filter((s: any) => s.id !== activeSupplierId);
                setActiveSupplierId(remaining.length > 0 ? remaining[0].id : null);
              } catch (e) {
                // handled globally
              }
            }}
            disabled={!activeSupplierId || deleteSupplierMutation.isPending || (activeSupplier?.transactionTable?.length || 0) > 0}
          >
            {deleteSupplierMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("farmer.medicalLedger.deleteSupplierModal.deleting")}
              </>
            ) : (
              t("farmer.medicalLedger.deleteSupplierModal.delete")
            )}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Confirm Delete Modal */}
      <Modal
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        title={t("farmer.medicalLedger.confirmDeleteModal.title", { count: selectedIds.size })}
      >
        <ModalContent>
          <p className="text-sm text-muted-foreground">
            {t("farmer.medicalLedger.confirmDeleteModal.body")}
          </p>
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsConfirmDeleteOpen(false)}>
            {t("farmer.medicalLedger.confirmDeleteModal.cancel")}
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={confirmDeleteSelected}
            disabled={deleteTxn.isPending}
          >
            {deleteTxn.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("farmer.medicalLedger.confirmDeleteModal.deleting")}
              </>
            ) : (
              t("farmer.medicalLedger.confirmDeleteModal.delete")
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
        title={t("farmer.medicalLedger.passwordModal.title")}
      >
        <ModalContent>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-800">
                <strong>{t("farmer.medicalLedger.passwordModal.warning")}</strong> {t("farmer.medicalLedger.passwordModal.body", { count: selectedIds.size })}
              </p>
            </div>
            <div>
              <Label htmlFor="password">{t("farmer.medicalLedger.passwordModal.label")}</Label>
              <Input
                id="password"
                type="password"
                value={passwordForm.password}
                onChange={(e) => setPasswordForm({ password: e.target.value })}
                placeholder={t("farmer.medicalLedger.passwordModal.placeholder")}
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
            {t("farmer.medicalLedger.passwordModal.cancel")}
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={handlePasswordConfirm}
            disabled={!passwordForm.password || deleteTxn.isPending}
          >
            {deleteTxn.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("farmer.medicalLedger.passwordModal.deleting")}
              </>
            ) : (
              t("farmer.medicalLedger.passwordModal.confirm")
            )}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Add Supplier Modal */}
      <Modal
        isOpen={isAddSupplierOpen}
        onClose={() => setIsAddSupplierOpen(false)}
        title={t("farmer.medicalLedger.addSupplierModal.title")}
      >
        <form onSubmit={handleAddSupplier}>
          <ModalContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="sname">{t("farmer.medicalLedger.addSupplierModal.name")}</Label>
                <Input
                  id="sname"
                  value={newSupplier.name}
                  onChange={(e) =>
                    setNewSupplier({ ...newSupplier, name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="scontact">{t("farmer.medicalLedger.addSupplierModal.contact")}</Label>
                <Input
                  id="scontact"
                  value={newSupplier.contact}
                  onChange={(e) =>
                    setNewSupplier({ ...newSupplier, contact: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="saddress">{t("farmer.medicalLedger.addSupplierModal.address")}</Label>
                <Input
                  id="saddress"
                  value={newSupplier.address}
                  onChange={(e) =>
                    setNewSupplier({ ...newSupplier, address: e.target.value })
                  }
                />
              </div>
            </div>
          </ModalContent>
          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddSupplierOpen(false)}
            >
              {t("farmer.medicalLedger.addSupplierModal.cancel")}
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90"
              disabled={createSupplierMutation.isPending}
            >
              {createSupplierMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("farmer.medicalLedger.addSupplierModal.adding")}
                </>
              ) : (
                t("farmer.medicalLedger.addSupplierModal.add")
              )}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Add Entry Modal */}
      <Modal
        isOpen={isAddEntryOpen}
        onClose={() => setIsAddEntryOpen(false)}
        title={t("farmer.medicalLedger.addEntryModal.title", { name: activeSupplier?.name || "Supplier" })}
      >
        <form onSubmit={handleAddEntry}>
          <ModalContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="item">{t("farmer.medicalLedger.addEntryModal.item")}</Label>
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
                  <Label htmlFor="rate">{t("farmer.medicalLedger.addEntryModal.rate")}</Label>
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
                  <Label htmlFor="quantity">{t("farmer.medicalLedger.addEntryModal.quantity")}</Label>
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
                  <Label htmlFor="paid">{t("farmer.medicalLedger.addEntryModal.paidAmount")}</Label>
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
                <DateInput
                  label={t("farmer.medicalLedger.addEntryModal.date")}
                  value={newEntry.date}
                  onChange={(value) => setNewEntry({ ...newEntry, date: value })}
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
              {t("farmer.medicalLedger.addEntryModal.cancel")}
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90"
              disabled={addTransactionMutation.isPending}
            >
              {addTransactionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("farmer.medicalLedger.addEntryModal.saving")}
                </>
              ) : (
                t("farmer.medicalLedger.addEntryModal.save")
              )}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={t("farmer.medicalLedger.paymentModal.title")}
      >
        <form onSubmit={handleAddPayment}>
          <ModalContent>
            <div className="space-y-4">
              {selectedEntry && activeSupplier && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>{t("farmer.medicalLedger.paymentModal.entry")}:</strong> {selectedEntry.entryId}
                  </p>
                  <p className="text-sm text-blue-800">
                    <strong>{t("farmer.medicalLedger.paymentModal.outstanding")}:</strong> ₹
                    {(activeSupplier.balance || 0).toLocaleString()}
                  </p>
                </div>
              )}
              <div>
                <Label htmlFor="paymentAmount">{t("farmer.medicalLedger.paymentModal.amount")}</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, amount: e.target.value })
                  }
                  placeholder={t("farmer.medicalLedger.paymentModal.placeholder")}
                  required
                />
              </div>
              <div>
                <DateInput
                  label={t("farmer.medicalLedger.paymentModal.date")}
                  value={paymentForm.date}
                  onChange={(value) => setPaymentForm({ ...paymentForm, date: value })}
                />
              </div>
              <div>
                <Label htmlFor="paymentNote">{t("farmer.medicalLedger.paymentModal.note")}</Label>
                <Input
                  id="paymentNote"
                  value={paymentForm.note}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, note: e.target.value })
                  }
                  placeholder={t("farmer.medicalLedger.paymentModal.notePlaceholder")}
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
              {t("farmer.medicalLedger.paymentModal.cancel")}
            </Button>
            <Button
              type="submit"
              className="bg-green-600 hover:bg-green-700"
              disabled={addTransactionMutation.isPending}
            >
              {addTransactionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("farmer.medicalLedger.paymentModal.recording")}
                </>
              ) : (
                t("farmer.medicalLedger.paymentModal.record")
              )}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Payment History Modal */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title={t("farmer.medicalLedger.historyModal.title")}
      >
        <ModalContent>
          <div className="space-y-4">
            {selectedHistoryEntry &&
              activeSupplier &&
              (() => {
                const entry = activeSupplier.transactionTable?.find(
                  (e: any) => e.id === selectedHistoryEntry.entryId
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
                          <span className="text-gray-600">{t("farmer.medicalLedger.historyModal.totalAmount")}:</span>
                          <span className="ml-2 font-medium">
                            ₹{totalAmount.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">{t("farmer.medicalLedger.historyModal.totalPaid")}:</span>
                          <span className="ml-2 font-medium text-green-600">
                            ₹{totalPaid.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">{t("farmer.medicalLedger.historyModal.remaining")}:</span>
                          <span
                            className={`ml-2 font-medium ${remaining > 0 ? "text-red-600" : "text-green-600"}`}
                          >
                            ₹{remaining.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">{t("farmer.medicalLedger.historyModal.payments")}:</span>
                          <span className="ml-2 font-medium">
                            {history.length}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">
                        {t("farmer.medicalLedger.historyModal.paymentDetails")}
                      </h4>
                      {history.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">
                          {t("farmer.medicalLedger.historyModal.noPayments")}
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
                                  <DateDisplay date={payment.date} format="short" />
                                </div>
                                {payment.reference && (
                                  <div className="text-sm text-gray-500">
                                    {payment.reference}
                                  </div>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">
                                {t("farmer.medicalLedger.historyModal.paymentNum", { number: index + 1 })}
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
            {t("farmer.medicalLedger.historyModal.close")}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Loading State */}
      {suppliersLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">{t("farmer.medicalLedger.loadingSuppliers")}</span>
        </div>
      )}

      {/* Error State */}
      {suppliersError && (
        <div className="text-center py-8">
          <p className="text-red-600">
            {t("farmer.medicalLedger.failedLoad")}
          </p>
        </div>
      )}

      {/* Tabs: one per supplier */}
      {!suppliersLoading && !suppliersError && (
        <div className="space-y-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {suppliers.map((supplier: any) => (
              <Button
                key={supplier.id}
                variant={
                  activeSupplierId === supplier.id ? "default" : "outline"
                }
                size="sm"
                className={`text-xs md:text-sm whitespace-nowrap ${activeSupplierId === supplier.id
                  ? "bg-primary hover:bg-primary/90"
                  : ""
                  }`}
                onClick={() => setActiveSupplierId(supplier.id)}
              >
                {supplier.name}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="text-xs md:text-sm whitespace-nowrap"
              onClick={() => setIsAddSupplierOpen(true)}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("farmer.medicalLedger.addSupplier").replace("Supplier", "")}</span>{t("farmer.medicalLedger.addSupplier").replace("Add", "")}
            </Button>
          </div>

          <Card>
            <CardHeader className="p-3 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="text-base md:text-lg truncate">
                  {activeSupplier?.name || t("farmer.medicalLedger.table.selectSupplier")}
                </CardTitle>
                <div className="flex gap-1 md:gap-2 flex-wrap">
                  {activeSupplierId && !isDeleteMode && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => setIsDeleteSupplierOpen(true)}
                      disabled={!activeSupplierId}
                    >
                      <Trash2 className="h-3.5 w-3.5 md:hidden" />
                      <span className="hidden md:inline">{t("farmer.medicalLedger.deleteSupplierModal.delete")}</span>
                    </Button>
                  )}
                  {isDeleteMode ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={exitDeleteMode}
                      >
                        <X className="mr-1 h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{t("farmer.medicalLedger.buttons.cancel")}</span>
                      </Button>
                      <Button
                        size="sm"
                        className="text-xs bg-red-600 hover:bg-red-700 text-white"
                        disabled={selectedIds.size === 0 || deleteTxn.isPending}
                        onClick={() => setIsConfirmDeleteOpen(true)}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{t("farmer.medicalLedger.buttons.delete")} </span>({selectedIds.size})
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => setIsDeleteMode(true)}
                        disabled={!activeSupplierId}
                      >
                        <Trash2 className="h-3.5 w-3.5 md:mr-1" />
                        <span className="hidden md:inline">{t("farmer.medicalLedger.buttons.delete")}</span>
                      </Button>
                      <Button
                        size="sm"
                        className="text-xs bg-primary hover:bg-primary/90"
                        onClick={() => setIsAddEntryOpen(true)}
                        disabled={!activeSupplierId}
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{t("farmer.medicalLedger.buttons.addEntry").replace("Entry", "")}</span>{t("farmer.medicalLedger.buttons.addEntry").replace("Add", "")}
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <CardDescription className="text-xs md:text-sm">
                {activeSupplier
                  ? `Ledger for ${activeSupplier.name}`
                  : t("farmer.medicalLedger.table.selectSupplier")}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {activeSupplierLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="ml-2 text-sm">{t("farmer.medicalLedger.loadingSuppliers")}</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <DataTable
                    data={activeSupplier?.transactionTable || []}
                    columns={ledgerColumns}
                    selectable={isDeleteMode}
                    isAllSelected={
                      !!activeSupplier?.transactionTable &&
                      selectedIds.size > 0 &&
                      selectedIds.size === activeSupplier.transactionTable.length
                    }
                    onToggleAll={toggleAll}
                    isRowSelected={(row: any) => selectedIds.has(row.id)}
                    onToggleRow={toggleOne}
                    getRowKey={(row: any) => row.id}
                    showFooter={true}
                    footerContent={
                      <div className="grid grid-cols-9 gap-4 text-sm">
                        <div className="col-span-3 font-semibold text-gray-900">
                          {t("farmer.medicalLedger.table.total")}
                        </div>
                        <div className="text-right font-medium">
                          ₹
                          {(
                            activeSupplier?.transactionTable?.reduce(
                              (sum: number, r: any) => sum + r.totalAmount,
                              0
                            ) || 0
                          ).toLocaleString()}
                        </div>
                        <div className="text-right font-medium">
                          ₹
                          {(
                            activeSupplier?.transactionTable?.reduce(
                              (sum: number, r: any) => sum + r.amountPaid,
                              0
                            ) || 0
                          ).toLocaleString()}
                        </div>
                        <div className="text-right font-medium">
                          ₹
                          {(
                            activeSupplier?.transactionTable?.reduce(
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
                    emptyMessage={t("farmer.medicalLedger.table.empty")}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
