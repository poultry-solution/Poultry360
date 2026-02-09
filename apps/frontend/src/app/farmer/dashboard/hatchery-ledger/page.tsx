"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Egg, Plus, TrendingUp, Loader2, Trash2, X } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { useState, useEffect } from "react";
import { getTodayLocalDate } from "@/common/lib/utils";
import { Modal, ModalContent, ModalFooter } from "@/common/components/ui/modal";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { DataTable, Column, createColumn } from "@/common/components/ui/data-table";
import { toast } from "sonner";
import {
  useGetAllHatcheries,
  useGetHatcheryStatistics,
  useGetHatcheryById,
  useCreateHatchery,
  useAddHatcheryTransaction,
  useDeleteHatcheryTransaction,
  useDeleteHatchery,
} from "@/fetchers/hatcheries/hatcheryQueries";
import { TransactionType } from "@myapp/shared-types";
import { DateInput } from "@/common/components/ui/date-input";
import { DateDisplay } from "@/common/components/ui/date-display";
import { useI18n } from "@/i18n/useI18n";

export default function HatcheryLedgerPage() {
  const { t } = useI18n();
  const [activeHatcheryId, setActiveHatcheryId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddHatcheryOpen, setIsAddHatcheryOpen] = useState(false);
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ password: "" });
  const [isDeleteHatcheryOpen, setIsDeleteHatcheryOpen] = useState(false);
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
  const [freeMode, setFreeMode] = useState<"count" | "percent">("count");
  const [freeValue, setFreeValue] = useState<string>("");
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
  const deleteTxn = useDeleteHatcheryTransaction();
  const deleteHatcheryMutation = useDeleteHatchery();

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

      toast.success(t("farmer.hatcheryLedger.toasts.hatcheryAdded"));
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
      // 🔗 NEW: Single request with both purchase and payment data
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
          // Free chicks handling
          ...(freeMode === "count" && freeValue
            ? { freeCount: Number(freeValue) }
            : {}),
          ...(freeMode === "percent" && freeValue
            ? { freePercent: Number(freeValue) }
            : {}),
          // 🔗 NEW: Include payment data in the same request
          paymentAmount: paid > 0 ? paid : undefined,
          paymentDescription:
            paid > 0 ? `Initial payment for ${newEntry.item}` : undefined,
        },
      });

      toast.success(t("farmer.hatcheryLedger.toasts.txnAdded"));
      setIsAddEntryOpen(false);
      setNewEntry({
        item: "",
        rate: "",
        quantity: "",
        paid: "",
        date: "",
        dueDate: "",
      });
      setFreeMode("count");
      setFreeValue("");
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
    const paymentDate: Date = paymentForm.date
      ? new Date(paymentForm.date)
      : new Date();

    try {
      // 🔗 NEW: For standalone payments, we still use the single request format
      // but without paymentAmount/paymentDescription (those are for purchase+payment combos)
      await addTransactionMutation.mutateAsync({
        hatcheryId: activeHatcheryId,
        data: {
          type: "PAYMENT" as TransactionType,
          amount: paymentAmount,
          date: paymentDate,
          description: paymentForm.note || "Payment",
          entityType: "HATCHERY",
          entityId: activeHatcheryId,
          // 🔗 Link follow-up payment to specific purchase row
          paymentToPurchaseId: selectedEntry.entryId,
          // Note: For standalone payments, we don't include paymentAmount/paymentDescription
          // The backend will create a regular PAYMENT transaction without paymentToPurchaseId
        },
      });

      toast.success(t("farmer.hatcheryLedger.toasts.paymentRecorded"));
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

  async function handlePasswordConfirm() {
    if (!activeHatcheryId || selectedIds.size === 0 || !passwordForm.password)
      return;

    const ids = Array.from(selectedIds);
    let failed = 0;

    try {
      await Promise.all(
        ids.map(async (entryId) => {
          try {
            await deleteTxn.mutateAsync({
              hatcheryId: activeHatcheryId,
              transactionId: entryId,
              password: passwordForm.password,
            });
          } catch (e) {
            failed += 1;
          }
        })
      );

      setIsDeleteMode(false);
      setSelectedIds(new Set());
      setIsPasswordModalOpen(false);
      setPasswordForm({ password: "" });

      if (failed === 0) {
        toast.success(t("farmer.hatcheryLedger.toasts.entriesDeleted"));
      } else {
        toast.error(
          t("farmer.hatcheryLedger.toasts.deleteFailed", { count: failed, suffix: failed === 1 ? "y" : "ies" })
        );
      }
    } catch (error) {
      toast.error(t("farmer.hatcheryLedger.toasts.passwordFailed"));
      setIsPasswordModalOpen(false);
      setPasswordForm({ password: "" });
    }
  }

  // Compute due date (7 days from purchase) for DateDisplay
  function getRowDueDateDate(date: string): Date {
    const base = new Date(date);
    const d = new Date(base);
    d.setDate(d.getDate() + 7);
    return d;
  }

  // Column configuration for DataTable
  const ledgerColumns: Column[] = [
    createColumn("itemName", t("farmer.hatcheryLedger.table.item")),
    createColumn("rate", t("farmer.hatcheryLedger.table.rate"), {
      type: "currency",
      align: "right",
    }),
    createColumn("quantity", t("farmer.hatcheryLedger.table.quantity"), {
      type: "number",
      align: "right",
      render: (_, row) => {
        const paid = Number(row.quantity || 0);
        const free = Number(row.freeQuantity || 0);
        const delivered = Number(row.deliveredQuantity || (paid + free));
        return (
          <div className="text-right">
            <div>
              <span className="font-medium">{paid}</span>
              {free > 0 && (
                <span className="ml-1 text-xs text-muted-foreground">{t("farmer.hatcheryLedger.table.free", { count: free })}</span>
              )}
            </div>
            {free > 0 && (
              <div className="text-xs text-gray-600">{t("farmer.hatcheryLedger.table.delivered", { count: delivered })}</div>
            )}
          </div>
        );
      },
    }),
    createColumn("totalAmount", t("farmer.hatcheryLedger.table.amount"), {
      type: "currency",
      align: "right",
    }),
    createColumn("amountDue", t("farmer.hatcheryLedger.table.amountDue"), {
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
                onClick={() => openPaymentModal(activeHatcheryId, row.id)}
              >
                {t("farmer.hatcheryLedger.table.pay")}
              </Button>
            )}
          </div>
        );
      },
    }),
    createColumn("date", t("farmer.hatcheryLedger.table.date"), {
      type: "date",
    }),
    createColumn("dueDate", t("farmer.hatcheryLedger.table.dueDate"), {
      render: (_, row) =>
        row.date ? (
          <DateDisplay date={getRowDueDateDate(row.date)} format="short" />
        ) : (
          "—"
        ),
    }),
    createColumn("payments", t("farmer.hatcheryLedger.table.paymentHistory"), {
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
            onClick={() => openHistoryModal(activeHatcheryId, row.id)}
          >
            {t("farmer.hatcheryLedger.table.historyText", {
              count: totalPayments,
              amount: `₹${totalPaid.toLocaleString()}`,
            })}
          </div>
        );
      },
    }),
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t("farmer.hatcheryLedger.title")}</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {t("farmer.hatcheryLedger.subtitle")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            className="text-xs md:text-sm bg-primary hover:bg-primary/90"
            onClick={() => setIsAddHatcheryOpen(true)}
          >
            <Plus className="mr-1 md:mr-2 h-3.5 w-3.5 md:h-4 md:w-4" />
            <span className="hidden sm:inline">{t("farmer.hatcheryLedger.addDealer").replace("Dealer", "")}</span>{t("farmer.hatcheryLedger.addDealer").replace("Add", "")}
          </Button>
        </div>
      </div>

      <div className="grid gap-2 grid-cols-3">
        <Card
          onClick={() => setIsModalOpen(true)}
          className="cursor-pointer transition-colors hover:bg-[#10841E] hover:text-white"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[10px] md:text-sm font-medium">
              {t("farmer.hatcheryLedger.stats.dealers")}
            </CardTitle>
            <Egg className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            {statisticsLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <div className="text-base md:text-2xl font-bold">
                {statistics.totalHatcheries || 0}
              </div>
            )}
            <p className="text-[9px] md:text-xs text-muted-foreground">{t("farmer.hatcheryLedger.stats.chicks")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[10px] md:text-sm font-medium">{t("farmer.hatcheryLedger.stats.due")}</CardTitle>
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
            <p className="text-[9px] md:text-xs text-muted-foreground">{t("farmer.hatcheryLedger.stats.outstanding")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[10px] md:text-sm font-medium">{t("farmer.hatcheryLedger.stats.month")}</CardTitle>
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
            <p className="text-[9px] md:text-xs text-muted-foreground">{t("farmer.hatcheryLedger.stats.purchases")}</p>
          </CardContent>
        </Card>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t("farmer.hatcheryLedger.summaryModal.title")}
      >
        <ModalContent>
          <div className="space-y-3">
            {hatcheriesLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">{t("farmer.hatcheryLedger.summaryModal.loading")}</span>
              </div>
            ) : hatcheriesError ? (
              <div className="text-center py-4 text-red-600">
                {t("farmer.hatcheryLedger.summaryModal.error")}
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
                      {t("farmer.hatcheryLedger.summaryModal.contact")}: {hatchery.contact}
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
            {t("farmer.hatcheryLedger.summaryModal.close")}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Hatchery Confirmation Modal */}
      <Modal
        isOpen={isDeleteHatcheryOpen}
        onClose={() => setIsDeleteHatcheryOpen(false)}
        title={t("farmer.hatcheryLedger.deleteHatcheryModal.title")}
      >
        <ModalContent>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-800">
                <strong>{t("farmer.hatcheryLedger.deleteHatcheryModal.warning")}</strong> {t("farmer.hatcheryLedger.deleteHatcheryModal.body", { name: activeHatchery?.name ? activeHatchery.name : "" })}
              </p>
              {activeHatchery?.transactionTable?.length > 0 && (
                <p className="text-sm text-red-700 mt-2">
                  {t("farmer.hatcheryLedger.deleteHatcheryModal.transactionWarning", { count: activeHatchery.transactionTable.length })}
                </p>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {t("farmer.hatcheryLedger.deleteHatcheryModal.proceed")}
            </p>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setIsDeleteHatcheryOpen(false)}
          >
            {t("farmer.hatcheryLedger.deleteHatcheryModal.cancel")}
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={async () => {
              if (!activeHatcheryId) return;
              try {
                await deleteHatcheryMutation.mutateAsync(activeHatcheryId);
                toast.success("Hatchery deleted successfully");
                setIsDeleteHatcheryOpen(false);
                setSelectedIds(new Set());
                const remaining = (hatcheries || []).filter(
                  (h: any) => h.id !== activeHatcheryId
                );
                setActiveHatcheryId(
                  remaining.length > 0 ? remaining[0].id : null
                );
              } catch (e) {
                // error handled globally
              }
            }}
            disabled={
              !activeHatcheryId ||
              deleteHatcheryMutation.isPending ||
              (activeHatchery?.transactionTable?.length || 0) > 0
            }
          >
            {deleteHatcheryMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("farmer.hatcheryLedger.deleteHatcheryModal.deleting")}
              </>
            ) : (
              t("farmer.hatcheryLedger.deleteHatcheryModal.delete")
            )}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Confirm Delete Modal */}
      <Modal
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        title={t("farmer.hatcheryLedger.confirmDeleteModal.title", { count: selectedIds.size })}
      >
        <ModalContent>
          <p className="text-sm text-muted-foreground">
            {t("farmer.hatcheryLedger.confirmDeleteModal.body")}
          </p>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setIsConfirmDeleteOpen(false)}
          >
            {t("farmer.hatcheryLedger.confirmDeleteModal.cancel")}
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={() => {
              setIsConfirmDeleteOpen(false);
              setIsPasswordModalOpen(true);
            }}
            disabled={deleteTxn.isPending}
          >
            {deleteTxn.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("farmer.hatcheryLedger.confirmDeleteModal.deleting")}
              </>
            ) : (
              t("farmer.hatcheryLedger.confirmDeleteModal.delete")
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
        title={t("farmer.hatcheryLedger.passwordModal.title")}
      >
        <ModalContent>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-800">
                <strong>{t("farmer.hatcheryLedger.passwordModal.warning")}</strong> {t("farmer.hatcheryLedger.passwordModal.body", { count: selectedIds.size })}
              </p>
            </div>
            <div>
              <Label htmlFor="password">
                {t("farmer.hatcheryLedger.passwordModal.label")}
              </Label>
              <Input
                id="password"
                type="password"
                value={passwordForm.password}
                onChange={(e) => setPasswordForm({ password: e.target.value })}
                placeholder={t("farmer.hatcheryLedger.passwordModal.placeholder")}
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
            {t("farmer.hatcheryLedger.passwordModal.cancel")}
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={handlePasswordConfirm}
            disabled={!passwordForm.password || deleteTxn.isPending}
          >
            {deleteTxn.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("farmer.hatcheryLedger.passwordModal.deleting")}
              </>
            ) : (
              t("farmer.hatcheryLedger.passwordModal.confirm")
            )}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Add Hatchery Modal */}
      <Modal
        isOpen={isAddHatcheryOpen}
        onClose={() => setIsAddHatcheryOpen(false)}
        title={t("farmer.hatcheryLedger.addHatcheryModal.title")}
      >
        <form onSubmit={handleAddHatchery}>
          <ModalContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="hname">{t("farmer.hatcheryLedger.addHatcheryModal.name")}</Label>
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
                <Label htmlFor="hcontact">{t("farmer.hatcheryLedger.addHatcheryModal.contact")}</Label>
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
                <Label htmlFor="haddress">{t("farmer.hatcheryLedger.addHatcheryModal.address")}</Label>
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
              {t("farmer.hatcheryLedger.addHatcheryModal.cancel")}
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90"
              disabled={createHatcheryMutation.isPending}
            >
              {createHatcheryMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("farmer.hatcheryLedger.addHatcheryModal.adding")}
                </>
              ) : (
                t("farmer.hatcheryLedger.addHatcheryModal.add")
              )}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Add Entry Modal */}
      <Modal
        isOpen={isAddEntryOpen}
        onClose={() => setIsAddEntryOpen(false)}
        title={t("farmer.hatcheryLedger.addEntryModal.title", { name: activeHatchery?.name || "Hatchery" })}
      >
        <form onSubmit={handleAddEntry}>
          <ModalContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="item">{t("farmer.hatcheryLedger.addEntryModal.item")}</Label>
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
                  <Label htmlFor="rate">{t("farmer.hatcheryLedger.addEntryModal.rate")}</Label>
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
                  <Label htmlFor="quantity">{t("farmer.hatcheryLedger.addEntryModal.quantity")}</Label>
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
                  <Label htmlFor="paid">{t("farmer.hatcheryLedger.addEntryModal.paid")}</Label>
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

              {/* Free chicks input */}
              <div className="space-y-2">
                <Label>{t("farmer.hatcheryLedger.addEntryModal.freeChicks")}</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={freeMode === "count" ? "default" : "outline"}
                    onClick={() => setFreeMode("count")}
                    className="h-8 px-3"
                  >
                    {t("farmer.hatcheryLedger.addEntryModal.freeCount")}
                  </Button>
                  <Button
                    type="button"
                    variant={freeMode === "percent" ? "default" : "outline"}
                    onClick={() => setFreeMode("percent")}
                    className="h-8 px-3"
                  >
                    {t("farmer.hatcheryLedger.addEntryModal.freePercent")}
                  </Button>
                  <Input
                    id="freeValue"
                    type="number"
                    placeholder={
                      freeMode === "count" ? t("farmer.hatcheryLedger.addEntryModal.countPlaceholder") : t("farmer.hatcheryLedger.addEntryModal.percentPlaceholder")
                    }
                    value={freeValue}
                    onChange={(e) => setFreeValue(e.target.value)}
                    className="max-w-[180px]"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("farmer.hatcheryLedger.addEntryModal.helperText")}
                </p>
                {(() => {
                  const qty = Number(newEntry.quantity || 0);
                  const fv = Number(freeValue || 0);
                  const freeCount =
                    freeMode === "count"
                      ? Math.max(0, Math.floor(fv))
                      : Math.max(0, Math.floor((qty * fv) / 100));
                  const totalDelivered =
                    qty + (Number.isFinite(freeCount) ? freeCount : 0);
                  return (
                    <div className="text-sm">
                      <span className="font-medium">{t("farmer.hatcheryLedger.addEntryModal.summary.paid")}</span>{" "}
                      {isNaN(qty) ? 0 : qty} &nbsp;|
                      <span className="font-medium ml-2">{t("farmer.hatcheryLedger.addEntryModal.summary.free")}</span>{" "}
                      {isNaN(freeCount) ? 0 : freeCount} &nbsp;|
                      <span className="font-medium ml-2">
                        {t("farmer.hatcheryLedger.addEntryModal.summary.delivered")}
                      </span>{" "}
                      {isNaN(totalDelivered) ? 0 : totalDelivered}
                    </div>
                  );
                })()}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <DateInput
                    label={t("farmer.hatcheryLedger.addEntryModal.date")}
                    value={newEntry.date}
                    onChange={(value) => setNewEntry({ ...newEntry, date: value })}
                    preferNativeInput
                  />
                </div>
                <div>
                  <DateInput
                    label={`${t("farmer.hatcheryLedger.table.dueDate")} (optional)`}
                    value={newEntry.dueDate}
                    onChange={(value) => setNewEntry({ ...newEntry, dueDate: value })}
                    preferNativeInput
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
              {t("farmer.hatcheryLedger.addEntryModal.cancel")}
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90"
              disabled={addTransactionMutation.isPending}
            >
              {addTransactionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("farmer.hatcheryLedger.addEntryModal.saving")}
                </>
              ) : (
                t("farmer.hatcheryLedger.addEntryModal.save")
              )}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={t("farmer.hatcheryLedger.paymentModal.title")}
      >
        <form onSubmit={handleAddPayment}>
          <ModalContent>
            <div className="space-y-4">
              {selectedEntry && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>{t("farmer.hatcheryLedger.paymentModal.entry")}:</strong> {selectedEntry.entryId}
                  </p>
                  <p className="text-sm text-blue-800">
                    <strong>{t("farmer.hatcheryLedger.paymentModal.outstanding")}:</strong> ₹
                    {(() => {
                      const entry = activeHatchery?.transactionTable?.find(
                        (e: any) => e.id === selectedEntry.entryId
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
                <DateInput
                  label={t("farmer.hatcheryLedger.paymentModal.date")}
                  value={paymentForm.date}
                  onChange={(value) => setPaymentForm({ ...paymentForm, date: value })}
                  preferNativeInput
                />
              </div>
              <div>
                <Label htmlFor="paymentNote">{t("farmer.hatcheryLedger.paymentModal.note")}</Label>
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
              {t("farmer.hatcheryLedger.paymentModal.cancel")}
            </Button>
            <Button
              type="submit"
              className="bg-green-600 hover:bg-green-700"
              disabled={addTransactionMutation.isPending}
            >
              {addTransactionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("farmer.hatcheryLedger.paymentModal.recording")}
                </>
              ) : (
                t("farmer.hatcheryLedger.paymentModal.record")
              )}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Payment History Modal */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title={t("farmer.hatcheryLedger.historyModal.title")}
      >
        <ModalContent>
          <div className="space-y-4">
            {selectedHistoryEntry &&
              (() => {
                const entry = activeHatchery?.transactionTable?.find(
                  (e: any) => e.id === selectedHistoryEntry.entryId
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
                          <span className="text-gray-600">{t("farmer.hatcheryLedger.historyModal.totalAmount")}:</span>
                          <span className="ml-2 font-medium">
                            ₹{totalAmount.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">{t("farmer.hatcheryLedger.historyModal.totalPaid")}:</span>
                          <span className="ml-2 font-medium text-green-600">
                            ₹{totalPaid.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">{t("farmer.hatcheryLedger.historyModal.remaining")}:</span>
                          <span
                            className={`ml-2 font-medium ${remaining > 0 ? "text-red-600" : "text-green-600"}`}
                          >
                            ₹{remaining.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">{t("farmer.hatcheryLedger.historyModal.payments")}:</span>
                          <span className="ml-2 font-medium">
                            {history.length}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">
                        {t("farmer.hatcheryLedger.historyModal.paymentDetails")}
                      </h4>
                      {history.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">
                          {t("farmer.hatcheryLedger.historyModal.noPayments")}
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
                                {t("farmer.hatcheryLedger.historyModal.paymentNum", { number: index + 1 })}
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
        </ModalContent >
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setIsHistoryModalOpen(false)}
          >
            {t("farmer.hatcheryLedger.historyModal.close")}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Tabs: one per hatchery */}
      <div className="space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {hatcheriesLoading ? (
            <div className="flex items-center">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm">{t("farmer.hatcheryLedger.summaryModal.loading")}</span>
            </div>
          ) : hatcheriesError ? (
            <div className="text-red-600 text-sm">{t("farmer.hatcheryLedger.summaryModal.error")}</div>
          ) : (
            hatcheries.map((hatchery: any) => (
              <Button
                key={hatchery.id}
                variant={
                  activeHatcheryId === hatchery.id ? "default" : "outline"
                }
                size="sm"
                className={`text-xs md:text-sm whitespace-nowrap ${activeHatcheryId === hatchery.id
                  ? "bg-primary hover:bg-primary/90"
                  : ""
                  }`}
                onClick={() => setActiveHatcheryId(hatchery.id)}
              >
                {hatchery.name}
              </Button>
            ))
          )}
          <Button
            variant="outline"
            size="sm"
            className="text-xs md:text-sm whitespace-nowrap"
            onClick={() => setIsAddHatcheryOpen(true)}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("farmer.hatcheryLedger.addDealer").replace("Dealer", "")}</span>{t("farmer.hatcheryLedger.addDealer").replace("Add", "")}
          </Button>
        </div>

        <Card>
          <CardHeader className="p-3 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <CardTitle className="text-base md:text-lg truncate">
                {activeHatcheryLoading ? (
                  <div className="flex items-center">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading...
                  </div>
                ) : (
                  activeHatchery?.name || t("farmer.hatcheryLedger.table.selectHatchery")
                )}
              </CardTitle>
              <div className="flex gap-1 md:gap-2 flex-wrap">
                {activeHatcheryId && !isDeleteMode && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => setIsDeleteHatcheryOpen(true)}
                    disabled={!activeHatcheryId}
                  >
                    <Trash2 className="h-3.5 w-3.5 md:hidden" />
                    <span className="hidden md:inline">{t("farmer.hatcheryLedger.deleteHatcheryModal.delete")}</span>
                  </Button>
                )}
                {isDeleteMode ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        setIsDeleteMode(false);
                        setSelectedIds(new Set());
                      }}
                    >
                      <X className="mr-1 h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{t("farmer.hatcheryLedger.buttons.cancel")}</span>
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs bg-red-600 hover:bg-red-700 text-white"
                      disabled={selectedIds.size === 0 || deleteTxn.isPending}
                      onClick={() => setIsConfirmDeleteOpen(true)}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{t("farmer.hatcheryLedger.buttons.delete")} </span>({selectedIds.size})
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setIsDeleteMode(true)}
                      disabled={!activeHatcheryId}
                    >
                      <Trash2 className="h-3.5 w-3.5 md:mr-1" />
                      <span className="hidden md:inline">{t("farmer.hatcheryLedger.buttons.delete")}</span>
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs bg-primary hover:bg-primary/90"
                      onClick={() => setIsAddEntryOpen(true)}
                      disabled={!activeHatcheryId}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{t("farmer.hatcheryLedger.buttons.addEntry").replace("Entry", "")}</span>{t("farmer.hatcheryLedger.buttons.addEntry").replace("Add", "")}
                    </Button>
                  </>
                )}
              </div>
            </div>
            <CardDescription className="text-xs md:text-sm">{t("farmer.hatcheryLedger.table.cardDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {activeHatcheryLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="ml-2 text-sm">{t("farmer.hatcheryLedger.summaryModal.loading")}</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <DataTable
                  data={activeHatchery?.transactionTable || []}
                  columns={ledgerColumns}
                  selectable={isDeleteMode}
                  isAllSelected={
                    !!activeHatchery?.transactionTable &&
                    selectedIds.size > 0 &&
                    selectedIds.size === activeHatchery.transactionTable.length
                  }
                  onToggleAll={() => {
                    if (!activeHatchery?.transactionTable) return;
                    if (
                      selectedIds.size === activeHatchery.transactionTable.length
                    )
                      setSelectedIds(new Set());
                    else
                      setSelectedIds(
                        new Set(
                          activeHatchery.transactionTable.map((r: any) => r.id)
                        )
                      );
                  }}
                  isRowSelected={(row: any) => selectedIds.has(row.id)}
                  onToggleRow={(row: any) => {
                    setSelectedIds((prev) => {
                      const next = new Set(prev);
                      const key = row.id;
                      if (next.has(key)) next.delete(key);
                      else next.add(key);
                      return next;
                    });
                  }}
                  getRowKey={(row: any) => row.id}
                  showFooter={true}
                  footerContent={
                    <div className="grid grid-cols-9 gap-4 text-sm">
                      <div className="col-span-3 font-semibold text-gray-900">
                        {t("farmer.hatcheryLedger.table.total")}
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
                  emptyMessage={t("farmer.hatcheryLedger.table.empty")}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
