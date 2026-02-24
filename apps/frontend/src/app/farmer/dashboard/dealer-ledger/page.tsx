"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Users, Plus, TrendingUp, Loader2, Trash2, X, Link2, FileCheck, DollarSign } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { getNowLocalDateTime } from "@/common/lib/utils";
import { Modal, ModalContent, ModalFooter } from "@/common/components/ui/modal";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { DataTable, Column, createColumn } from "@/common/components/ui/data-table";
import { useInventory } from "@/common/contexts/InventoryContext";
import { toast } from "sonner";
import {
  useGetAllDealers,
  useGetDealerStatistics,
  useGetDealerById,
  useCreateDealer,
  useAddDealerTransaction,
  useDeleteDealerTransaction,
  useDeleteDealer,
} from "@/fetchers/dealers/dealerQueries";
import { useQueryClient } from "@tanstack/react-query";
import { TransactionType } from "@myapp/shared-types";
import { DateInput } from "@/common/components/ui/date-input";
import { DateDisplay } from "@/common/components/ui/date-display";
import { useI18n } from "@/i18n/useI18n";

export default function DealerLedgerPage() {
  const router = useRouter();
  const { t } = useI18n();
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
  const [isDeleteDealerOpen, setIsDeleteDealerOpen] = useState(false);
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
    useGetDealerById(activeDealerId, {
      enabled: !!activeDealerId && activeDealerId.trim() !== "",
    });

  // Debug log to track activeDealerId changes
  useEffect(() => {
    console.log("🔍 Active Dealer ID changed:", activeDealerId);
  }, [activeDealerId]);

  // Mutations
  const createDealerMutation = useCreateDealer();
  const addTransactionMutation = useAddDealerTransaction();
  const deleteTxn = useDeleteDealerTransaction();
  const deleteDealerMutation = useDeleteDealer();

  // Query client for cache invalidation
  const queryClient = useQueryClient();

  // Extract data
  const dealers = dealersResponse?.data || [];
  const statistics = statisticsResponse?.data || {};
  const activeDealer = activeDealerResponse?.data;

  // Set first dealer as active when dealers load or when current active dealer is not found
  useEffect(() => {
    console.log("🔍 Dealers useEffect triggered:", {
      dealersCount: dealers.length,
      activeDealerId,
      dealerIds: dealers.map((d: any) => d.id),
    });

    if (dealers.length > 0) {
      // If no active dealer or current active dealer is not in the list (deleted)
      if (
        !activeDealerId ||
        !dealers.find((d: any) => d.id === activeDealerId)
      ) {
        console.log("🔄 Setting new active dealer:", dealers[0].id);
        setActiveDealerId(dealers[0].id);
      }
    } else if (dealers.length === 0 && activeDealerId) {
      // If no dealers left, clear the active dealer
      console.log("🔄 Clearing active dealer - no dealers left");
      setActiveDealerId("");
    }
  }, [dealers, activeDealerId]);

  // Compute due date (30 days from purchase) for DateDisplay
  function getRowDueDateDate(date: string): Date {
    const base = new Date(date);
    const d = new Date(base);
    d.setDate(d.getDate() + 30);
    return d;
  }

  // Column configuration for DataTable
  const ledgerColumns: Column[] = [
    createColumn("itemName", t("farmer.dealerLedger.table.description")),
    createColumn("rate", t("farmer.dealerLedger.table.amount"), {
      type: "currency",
      align: "right",
    }),
    createColumn("quantity", t("farmer.dealerLedger.table.quantity"), {
      type: "number",
      align: "right",
    }),
    createColumn("totalAmount", t("farmer.dealerLedger.table.amount"), {
      type: "currency",
      align: "right",
    }),
    createColumn("amountPaid", t("farmer.dealerLedger.table.paid"), {
      type: "currency",
      align: "right",
    }),
    // ... (rest of simple columns)
    createColumn("amountDue", t("farmer.dealerLedger.table.balance"), {
      type: "currency",
      align: "right",
      render: (_, row) => {
        const due = row.amountDue;
        return (
          <span
            className={
              due > 0
                ? "text-red-600 font-medium"
                : "text-green-600 font-medium"
            }
          >
            ₹{due.toLocaleString()}
          </span>
        );
      },
    }),
    createColumn("date", t("farmer.dealerLedger.table.date"), {
      type: "date",
    }),
    createColumn("dueDate", t("farmer.dealerLedger.table.dueDate"), {
      render: (_, row) =>
        row.date ? (
          <DateDisplay date={getRowDueDateDate(row.date)} format="short" />
        ) : (
          "—"
        ),
    }),
    createColumn("payments", t("farmer.dealerLedger.table.history"), {
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
            onClick={() => openHistoryModal(activeDealerId, row.id)}
          >
            {totalPayments} {t("farmer.dealerLedger.dialogs.history.paymentsCount").toLowerCase()}{totalPayments !== 1 ? "s" : ""} (₹
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
      setSelectedIds(
        new Set(activeDealer.transactionTable.map((r: any) => r.id))
      );
    }
  }

  function toggleOne(row: any) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const key = row.id;
      if (next.has(key)) next.delete(key);
      else next.add(key);
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
    if (!activeDealerId || selectedIds.size === 0 || !passwordForm.password)
      return;

    const ids = Array.from(selectedIds);
    let failed = 0;

    try {
      await Promise.all(
        ids.map(async (entryId) => {
          try {
            await deleteTxn.mutateAsync({
              dealerId: activeDealerId,
              transactionId: entryId,
              password: passwordForm.password,
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

        // Check if all transactions were deleted and clear selection if needed
        if (
          activeDealer?.transactionTable &&
          selectedIds.size === activeDealer.transactionTable.length
        ) {
          // All transactions were deleted, the dealer should now be deletable
          // No need to change activeDealerId, just let the data refresh
        }
      } else {
        toast.error(
          `Failed to delete ${failed} entr${failed === 1 ? "y" : "ies"}`
        );
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
          // 🔗 NEW: include initial payment in the same request
          paymentAmount: paid > 0 ? paid : undefined,
          paymentDescription: paid > 0 ? `Initial payment for ${newEntry.item}` : undefined,
        },
      });

      // (Removed) separate PAYMENT call for initial payment; now included in purchase request

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
          // 🔗 Link follow-up payment to the purchase row
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

  function openPaymentModal(dealerId: string, entryId: string) {
    setSelectedEntry({ dealerId, entryId });
    setIsPaymentModalOpen(true);
  }

  function openHistoryModal(dealerId: string, entryId: string) {
    setSelectedHistoryEntry({ dealerId, entryId });
    setIsHistoryModalOpen(true);
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-bold tracking-tight">
            {t("farmer.dealerLedger.title")}
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            {t("farmer.dealerLedger.subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <Button
            variant="outline"
            size="sm"
            className="hover:bg-green-50 hover:text-green-700 border-green-200 text-xs md:text-sm h-9"
            onClick={() => router.push("/farmer/dashboard/dealers")}
          >
            <Users className="mr-2 h-4 w-4" />
            {t("farmer.dealers.title")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="hover:bg-green-50 hover:text-green-700 border-green-200 text-xs md:text-sm h-9"
            onClick={() => router.push("/farmer/dashboard/sale-requests")}
          >
            <FileCheck className="mr-2 h-4 w-4" />
            {t("farmer.dealers.buttons.saleRequests")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="hover:bg-green-50 hover:text-green-700 border-green-200 text-xs md:text-sm h-9"
            onClick={() => router.push("/farmer/dashboard/payment-requests")}
          >
            <DollarSign className="mr-2 h-4 w-4" />
            {t("farmer.dealers.buttons.paymentRequests")}
          </Button>
        </div>
      </div>

      <div className="grid gap-2 md:gap-4 grid-cols-3">
        <Card
          onClick={() => setIsSummaryOpen(true)}
          className="cursor-pointer transition-colors hover:bg-[#10841E] hover:text-white"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[10px] md:text-sm font-medium">{t("farmer.dealers.labels.dealer")}s</CardTitle>
            <Users className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            {statisticsLoading ? (
              <Loader2 className="h-4 w-4 md:h-6 md:w-6 animate-spin" />
            ) : (
              <div className="text-base md:text-2xl font-bold">
                {statistics.totalDealers || 0}
              </div>
            )}
            <p className="text-[9px] md:text-xs text-muted-foreground hidden sm:block">{t("farmer.dealers.stats.active")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[10px] md:text-sm font-medium">{t("farmer.dealerLedger.stats.toPay")}</CardTitle>
            <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            {statisticsLoading ? (
              <Loader2 className="h-4 w-4 md:h-6 md:w-6 animate-spin" />
            ) : (
              <div className="text-base md:text-2xl font-bold">
                <span className="hidden md:inline">₹{(statistics.outstandingAmount || 0).toLocaleString()}</span>
                <span className="md:hidden">₹{Math.round(statistics.outstandingAmount || 0).toLocaleString()}</span>
              </div>
            )}
            <p className="text-[9px] md:text-xs text-muted-foreground hidden sm:block">{t("farmer.dealerLedger.stats.dealersOwe", { amount: "" }).replace(":", "")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[10px] md:text-sm font-medium">{t("farmer.dashboard.stats.thisMonth")}</CardTitle>
            <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            {statisticsLoading ? (
              <Loader2 className="h-4 w-4 md:h-6 md:w-6 animate-spin" />
            ) : (
              <div className="text-base md:text-2xl font-bold">
                <span className="hidden md:inline">₹{(statistics.thisMonthAmount || 0).toLocaleString()}</span>
                <span className="md:hidden">₹{Math.round(statistics.thisMonthAmount || 0).toLocaleString()}</span>
              </div>
            )}
            <p className="text-[9px] md:text-xs text-muted-foreground hidden sm:block">{t("farmer.dealerLedger.transactionTypes.purchase")}s</p>
          </CardContent>
        </Card>
      </div>

      {/* Summary Modal */}
      <Modal
        isOpen={isSummaryOpen}
        onClose={() => setIsSummaryOpen(false)}
        title={t("farmer.dealerLedger.stats.netBalance")}
      >
        <ModalContent>
          <div className="space-y-3">
            {dealersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">{t("farmer.dealerLedger.loading")}</span>
              </div>
            ) : dealers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">{t("farmer.dealers.connectedSection.emptyTitle")}</p>
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
                      {t("farmer.dealers.labels.contact")}: {dealer.contact}
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
            {t("farmer.dashboard.close")}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Dealer Confirmation Modal */}
      <Modal
        isOpen={isDeleteDealerOpen}
        onClose={() => setIsDeleteDealerOpen(false)}
        title="Delete Dealer"
      >
        <ModalContent>
          <div className="space-y-4">
            {activeDealer?.connectionType === "CONNECTED" ? (
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  <strong>{t("farmer.dealerLedger.dialogs.warnings.connectedDealer")}</strong>
                </p>
                <p className="text-sm text-yellow-700 mt-2">
                  {t("farmer.dealerLedger.dialogs.warnings.connectedHint")}
                </p>
              </div>
            ) : (
              <>
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm text-red-800">
                    <strong>{t("farmer.dealerLedger.dialogs.warnings.deleteDealer", { name: activeDealer?.name || "" })}</strong>
                  </p>
                  {activeDealer?.transactions?.length > 0 && (
                    <p className="text-sm text-red-700 mt-2">
                      {t("farmer.dealerLedger.dialogs.warnings.deleteTransactionsFirst", { count: activeDealer?.transactions?.length })}
                    </p>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("farmer.dealerLedger.dialogs.warnings.confirmProceed")}
                </p>
              </>
            )}
          </div>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setIsDeleteDealerOpen(false)}
          >
            {activeDealer?.connectionType === "CONNECTED" ? t("farmer.dashboard.close") : t("farmer.dealers.dialogs.applyCancel")}
          </Button>
          {activeDealer?.connectionType !== "CONNECTED" && (
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={async () => {
                if (!activeDealerId) return;
                const dealerIdToDelete = activeDealerId;

                try {
                  // Clear active dealer ID immediately to prevent further queries
                  setActiveDealerId("");

                  await deleteDealerMutation.mutateAsync(dealerIdToDelete);

                  // Invalidate the specific dealer query to remove it from cache
                  queryClient.removeQueries({
                    queryKey: ["dealers", "detail", dealerIdToDelete],
                  });

                  // Invalidate the dealers list to get fresh data
                  queryClient.invalidateQueries({
                    queryKey: ["dealers", "list"],
                  });

                  toast.success("Dealer deleted successfully");
                  setIsDeleteDealerOpen(false);
                  setSelectedIds(new Set());
                  setIsDeleteMode(false);

                  // Don't set activeDealerId here - let the useEffect handle it
                  // when the fresh dealers data comes in
                } catch (e) {
                  // Restore the activeDealerId if deletion failed
                  setActiveDealerId(dealerIdToDelete);
                  // Error toast likely handled by interceptor
                }
              }}
              disabled={
                !activeDealerId ||
                deleteDealerMutation.isPending ||
                (activeDealer?.transactions?.length || 0) > 0
              }
            >
              {deleteDealerMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("farmer.dealerLedger.dialogs.buttons.deleting")}
                </>
              ) : (
                t("farmer.dealerLedger.dialogs.buttons.delete")
              )}
            </Button>
          )}
        </ModalFooter>
      </Modal>

      {/* Confirm Delete Modal */}
      <Modal
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        title={t("farmer.dealerLedger.dialogs.confirmDeleteEntriesTitle", { count: selectedIds.size })}
      >
        <ModalContent>
          <p className="text-sm text-muted-foreground">
            {t("farmer.dealerLedger.dialogs.warnings.deleteEntries")}
          </p>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setIsConfirmDeleteOpen(false)}
          >
            {t("farmer.dealerLedger.dialogs.buttons.cancel")}
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={confirmDeleteSelected}
            disabled={deleteTxn.isPending}
          >
            {deleteTxn.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("farmer.dealerLedger.dialogs.buttons.deleting")}
              </>
            ) : (
              t("farmer.dealerLedger.dialogs.buttons.delete")
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
        title={t("farmer.dealerLedger.dialogs.confirmDeletionTitle")}
      >
        <ModalContent>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-800">
                <strong>{t("farmer.dealerLedger.dialogs.warnings.deleteEntriesCount", { count: selectedIds.size })}</strong>
              </p>
            </div>
            <div>
              <Label htmlFor="password">
                {t("farmer.dealerLedger.dialogs.labels.password")}
              </Label>
              <Input
                id="password"
                type="password"
                value={passwordForm.password}
                onChange={(e) => setPasswordForm({ password: e.target.value })}
                placeholder={t("farmer.dealerLedger.dialogs.labels.passwordPlaceholder")}
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
            {t("farmer.dealerLedger.dialogs.buttons.cancel")}
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={handlePasswordConfirm}
            disabled={!passwordForm.password || deleteTxn.isPending}
          >
            {deleteTxn.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("farmer.dealerLedger.dialogs.buttons.deleting")}
              </>
            ) : (
              t("farmer.dealerLedger.dialogs.buttons.confirm")
            )}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Payment History Modal */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title={t("farmer.dealerLedger.dialogs.paymentHistoryTitle")}
      >
        <ModalContent>
          <div className="space-y-4">
            {selectedHistoryEntry &&
              activeDealer &&
              (() => {
                const entry = activeDealer.transactionTable?.find(
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
                          <span className="text-gray-600">{t("farmer.dealerLedger.dialogs.history.totalAmount")}:</span>
                          <span className="ml-2 font-medium">
                            ₹{totalAmount.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">{t("farmer.dealerLedger.dialogs.history.totalPaid")}:</span>
                          <span className="ml-2 font-medium text-green-600">
                            ₹{totalPaid.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">{t("farmer.dealerLedger.dialogs.history.remaining")}:</span>
                          <span
                            className={`ml-2 font-medium ${remaining > 0 ? "text-red-600" : "text-green-600"}`}
                          >
                            ₹{remaining.toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">{t("farmer.dealerLedger.dialogs.history.paymentsCount")}:</span>
                          <span className="ml-2 font-medium">
                            {history.length}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">
                        {t("farmer.dealerLedger.dialogs.history.paymentDetails")}
                      </h4>
                      {history.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">
                          {t("farmer.dealerLedger.dialogs.history.noPayments")}
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
                                {t("farmer.dealerLedger.dialogs.history.paymentNum", { number: index + 1 })}
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
            {t("farmer.dealerLedger.dialogs.buttons.close")}
          </Button>
        </ModalFooter>
      </Modal>
      {/* Add Dealer Modal */}
      <Modal
        isOpen={isAddDealerOpen}
        onClose={() => setIsAddDealerOpen(false)}
        title={t("farmer.dealerLedger.dialogs.addDealerTitle")}
      >
        <form onSubmit={handleAddDealer}>
          <ModalContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="dname">{t("farmer.dealerLedger.dialogs.labels.dealerName")}</Label>
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
                <Label htmlFor="dcontact">{t("farmer.dealerLedger.dialogs.labels.contact")}</Label>
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
                <Label htmlFor="daddress">{t("farmer.dealerLedger.dialogs.labels.address")}</Label>
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
              {t("farmer.dealerLedger.dialogs.buttons.cancel")}
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90"
              disabled={createDealerMutation.isPending}
            >
              {createDealerMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("farmer.dealerLedger.dialogs.buttons.adding")}
                </>
              ) : (
                t("farmer.dealerLedger.dialogs.buttons.addDealer")
              )}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Add Entry Modal */}
      <Modal
        isOpen={isAddEntryOpen}
        onClose={() => setIsAddEntryOpen(false)}
        title={t("farmer.dealerLedger.dialogs.addEntryTitle", { dealer: activeDealer?.name || t("farmer.dealers.labels.dealer") })}
      >
        <form onSubmit={handleAddEntry}>
          <ModalContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="item">{t("farmer.dealerLedger.dialogs.labels.item")}</Label>
                <Input
                  id="item"
                  value={newEntry.item}
                  onChange={(e) =>
                    setNewEntry({ ...newEntry, item: e.target.value })
                  }
                  placeholder={t("farmer.dealerLedger.dialogs.labels.itemPlaceholder")}
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="rate">{t("farmer.dealerLedger.dialogs.labels.rate")}</Label>
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
                  <Label htmlFor="quantity">{t("farmer.dealerLedger.dialogs.labels.quantity")}</Label>
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
                  <Label htmlFor="paid">{t("farmer.dealerLedger.dialogs.labels.paidAmount")}</Label>
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
                  label={t("farmer.dealerLedger.dialogs.labels.date")}
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
              {t("farmer.dealerLedger.dialogs.buttons.cancel")}
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90"
              disabled={addTransactionMutation.isPending}
            >
              {addTransactionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("farmer.dealerLedger.dialogs.buttons.saving")}
                </>
              ) : (
                t("farmer.dealerLedger.dialogs.buttons.save")
              )}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={t("farmer.dealerLedger.dialogs.addPaymentTitle")}
      >
        <form onSubmit={handleAddPayment}>
          <ModalContent>
            <div className="space-y-4">
              {selectedEntry && activeDealer && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>{t("farmer.dealerLedger.dialogs.paymentInfo.entry")}:</strong> {selectedEntry.entryId}
                  </p>
                  <p className="text-sm text-blue-800">
                    <strong>{t("farmer.dealerLedger.dialogs.paymentInfo.dealer")}:</strong> {activeDealer.name}
                  </p>
                  <p className="text-sm text-blue-800">
                    <strong>{t("farmer.dealerLedger.dialogs.paymentInfo.outstanding")}:</strong> ₹
                    {(activeDealer.balance || 0).toLocaleString()}
                  </p>
                </div>
              )}
              <div>
                <Label htmlFor="paymentAmount">{t("farmer.dealerLedger.dialogs.labels.paymentAmount")}</Label>
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
                  label={t("farmer.dealerLedger.dialogs.labels.paymentDate")}
                  value={paymentForm.date}
                  onChange={(value) => setPaymentForm({ ...paymentForm, date: value })}
                />
              </div>
              <div>
                <Label htmlFor="paymentNote">{t("farmer.dealerLedger.dialogs.labels.note")}</Label>
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
              {t("farmer.dealerLedger.dialogs.buttons.cancel")}
            </Button>
            <Button
              type="submit"
              className="bg-green-600 hover:bg-green-700"
              disabled={addTransactionMutation.isPending}
            >
              {addTransactionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("farmer.dealerLedger.dialogs.buttons.recording")}
                </>
              ) : (
                t("farmer.dealerLedger.dialogs.buttons.record")
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
                                  <DateDisplay date={payment.date} format="short" />
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
      {
        dealersLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading dealers...</span>
          </div>
        )
      }

      {/* Error State */}
      {
        dealersError && (
          <div className="text-center py-8">
            <p className="text-red-600">
              Failed to load dealers. Please try again.
            </p>
          </div>
        )
      }

      {/* Tabs: one per dealer */}
      {
        !dealersLoading && !dealersError && (
          <div className="space-y-3">
            <div className="overflow-x-auto pb-2">
              <div className="flex gap-2 min-w-max">
                {dealers.map((dealer: any) => (
                  <Button
                    key={dealer.id}
                    variant={activeDealerId === dealer.id ? "default" : "outline"}
                    size="sm"
                    className={
                      `text-xs md:text-sm whitespace-nowrap ${activeDealerId === dealer.id
                        ? "bg-primary hover:bg-primary/90"
                        : ""}`
                    }
                    onClick={() => setActiveDealerId(dealer.id)}
                  >
                    <span className="flex items-center gap-1">
                      {dealer.name}
                      {dealer.connectionType === "CONNECTED" && (
                        <Badge
                          variant="secondary"
                          className="ml-1 bg-blue-100 text-blue-800 hover:bg-blue-100 text-[9px] md:text-xs px-1"
                        >
                          <Link2 className="h-2.5 w-2.5 mr-0.5" />
                          <span className="hidden sm:inline">Connected</span>
                        </Badge>
                      )}
                    </span>
                  </Button>
                ))}
                <Button variant="outline" size="sm" className="text-xs md:text-sm whitespace-nowrap" onClick={() => setIsAddDealerOpen(true)}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t("farmer.dealerLedger.dialogs.addDealerBtn")}</span>
                  <span className="sm:hidden">{t("farmer.dealerLedger.dialogs.buttons.add")}</span>
                </Button>
              </div>
            </div>

            {dealers.length === 0 ? (
              <Card>
                <CardContent className="text-center py-6">
                  <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <h3 className="text-base font-semibold mb-2">No dealers found</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Create your first dealer.
                  </p>
                  <Button size="sm" onClick={() => setIsAddDealerOpen(true)}>
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    {t("farmer.dealerLedger.dialogs.addDealerBtn")}
                  </Button>
                </CardContent>
              </Card>
            ) : activeDealerId ? (
              <Card>
                <CardHeader className="p-3 md:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <CardTitle className="text-base md:text-lg">
                      {activeDealer?.name || t("farmer.dealerLedger.dialogs.applySelectDealer")}
                    </CardTitle>
                    <div className="flex flex-wrap gap-1.5">
                      {activeDealerId && !isDeleteMode && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-200 hover:bg-red-50 h-7 text-xs"
                          onClick={() => setIsDeleteDealerOpen(true)}
                          disabled={!activeDealerId}
                        >
                          <Trash2 className="h-3 w-3 mr-1 sm:mr-0" />
                          <span className="hidden sm:inline sm:ml-1">{t("farmer.dealerLedger.dialogs.buttons.delete")}</span>
                        </Button>
                      )}
                      {isDeleteMode ? (
                        <>
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={exitDeleteMode}>
                            <X className="h-3 w-3 mr-1" /> {t("farmer.dealerLedger.dialogs.buttons.cancel")}
                          </Button>
                          <Button
                            className="bg-red-600 hover:bg-red-700 text-white h-7 text-xs"
                            size="sm"
                            disabled={
                              selectedIds.size === 0 || deleteTxn.isPending
                            }
                            onClick={() => setIsConfirmDeleteOpen(true)}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            {selectedIds.size}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setIsDeleteMode(true)}
                            disabled={!activeDealerId}
                          >
                            <Trash2 className="h-3 w-3 mr-1 sm:mr-0" />
                            <span className="hidden sm:inline sm:ml-1">{t("farmer.dealerLedger.dialogs.buttons.entries")}</span>
                          </Button>
                          <Button
                            className="bg-primary hover:bg-primary/90 h-7 text-xs"
                            size="sm"
                            onClick={() => setIsAddEntryOpen(true)}
                            disabled={!activeDealerId}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            <span className="hidden sm:inline">{t("farmer.dealerLedger.dialogs.buttons.add")}</span>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  <CardDescription className="text-[10px] md:text-sm mt-1">
                    {activeDealer
                      ? `Ledger for ${activeDealer.name}`
                      : t("farmer.dealerLedger.dialogs.applySelectDealer")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  {activeDealerLoading ? (
                    <div className="flex items-center justify-center py-6 text-sm">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="ml-2">Loading...</span>
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
                      isRowSelected={(row: any) =>
                        selectedIds.has(row.id)
                      }
                      onToggleRow={toggleOne}
                      getRowKey={(row: any) => row.id}
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
            ) : (
              <Card>
                <CardContent className="text-center py-6">
                  <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <h3 className="text-base font-semibold mb-2">
                    No dealer selected
                  </h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Create a new dealer to get started.
                  </p>
                  <Button size="sm" onClick={() => setIsAddDealerOpen(true)}>
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add Dealer
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )
      }
    </div >
  );
}
