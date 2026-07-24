"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import {
  Users,
  Plus,
  TrendingUp,
  Loader2,
  Trash2,
  X,
  DollarSign,
  Eye,
} from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { getNowLocalDateTime } from "@/common/lib/utils";
import {
  Modal,
  ModalContent,
  ModalFooter,
} from "@/common/components/ui/modal";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import {
  DataTable,
  Column,
  createColumn,
} from "@/common/components/ui/data-table";
import { LedgerPagination } from "@/common/components/ui/ledger-pagination";
import { toast } from "sonner";
import {
  useGetAllDealers,
  useGetDealerStatistics,
  useGetDealerById,
  useGetDealerTransactions,
  useCreateDealer,
  useAddDealerTransaction,
  useDeleteDealerTransaction,
  useDeleteDealer,
  useSetDealerOpeningBalance,
} from "@/fetchers/dealers/dealerQueries";
import { useQueryClient } from "@tanstack/react-query";
import { TransactionType } from "@myapp/shared-types";
import { DateInput } from "@/common/components/ui/date-input";
import { DateDisplay } from "@/common/components/ui/date-display";
import { ImageUpload } from "@/common/components/ui/image-upload";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/common/components/ui/tabs";
import { useI18n } from "@/i18n/useI18n";

const PURCHASE_CATEGORY_VALUES = [
  "FEED",
  "MEDICINE",
  "CHICKS",
  "OTHER",
] as const;
const CATEGORY_I18N_KEYS: Record<(typeof PURCHASE_CATEGORY_VALUES)[number], string> = {
  FEED: "farmer.supplierLedger.categories.feed",
  MEDICINE: "farmer.supplierLedger.categories.medicine",
  CHICKS: "farmer.supplierLedger.categories.chicks",
  OTHER: "farmer.supplierLedger.categories.other",
};

const LEDGER_PAGE_LIMIT = 10;

function getCategoryBadgeColor(category: string | null | undefined) {
  switch (category) {
    case "FEED":
      return "bg-amber-100 text-amber-800";
    case "MEDICINE":
      return "bg-blue-100 text-blue-800";
    case "CHICKS":
      return "bg-yellow-100 text-yellow-800";
    case "OTHER":
      return "bg-purple-100 text-purple-800";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

export default function SupplierLedgerPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [activeSupplierId, setActiveSupplierId] = useState<string>("");
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ password: "" });
  const [isDeleteSupplierOpen, setIsDeleteSupplierOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<{ message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"purchases" | "payments">("purchases");
  const [purchasePage, setPurchasePage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);

  const [newSupplier, setNewSupplier] = useState({
    name: "",
    contact: "",
    address: "",
    openingBalanceAmount: "",
    openingBalanceDirection: "OWED" as "OWED" | "ADVANCE",
  });
  const [newEntry, setNewEntry] = useState({
    category: "FEED",
    item: "",
    rate: "",
    quantity: "",
    unit: "",
    date: "",
    expiryDate: "",
    description: "",
  });
  // Free chicks state (only relevant when category is CHICKS)
  const [freeMode, setFreeMode] = useState<"count" | "percent">("count");
  const [freeValue, setFreeValue] = useState<string>("");
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    date: "",
    note: "",
    receiptImageUrl: "",
  });

  // API Queries
  const {
    data: dealersResponse,
    isLoading: dealersLoading,
    error: dealersError,
  } = useGetAllDealers({ all: true });

  const { data: statisticsResponse, isLoading: statisticsLoading } =
    useGetDealerStatistics();

  const {
    data: activeSupplierResponse,
    isLoading: activeSupplierLoading,
  } = useGetDealerById(activeSupplierId, {
    enabled: !!activeSupplierId && activeSupplierId.trim() !== "",
  });

  const {
    data: activePurchasesResponse,
    isLoading: activePurchasesLoading,
  } = useGetDealerTransactions(
    activeSupplierId,
    {
      page: purchasePage,
      limit: LEDGER_PAGE_LIMIT,
      type: "PURCHASE",
    },
    {
      enabled: !!activeSupplierId && activeTab === "purchases",
    }
  );

  const {
    data: activePaymentsResponse,
    isLoading: activePaymentsLoading,
  } = useGetDealerTransactions(
    activeSupplierId,
    {
      page: paymentPage,
      limit: LEDGER_PAGE_LIMIT,
      type: "PAYMENT",
    },
    {
      enabled: !!activeSupplierId && activeTab === "payments",
    }
  );

  // Mutations
  const createDealerMutation = useCreateDealer();
  const setOpeningBalanceMutation = useSetDealerOpeningBalance();
  const addTransactionMutation = useAddDealerTransaction();
  const deleteTxn = useDeleteDealerTransaction();
  const deleteDealerMutation = useDeleteDealer();
  const queryClient = useQueryClient();

  // Extract data
  const suppliers = dealersResponse?.data || [];
  const statistics = statisticsResponse?.data || {};
  const activeSupplier = activeSupplierResponse?.data;
  const activePurchases = activePurchasesResponse?.data || [];
  const activePurchasesPagination = activePurchasesResponse?.pagination;
  const activePayments = activePaymentsResponse?.data || [];
  const activePaymentsPagination = activePaymentsResponse?.pagination;
  const activeSummary = activeSupplier?.summary || {};
  const currentLedgerRows =
    activeTab === "purchases" ? activePurchases : activePayments;

  // Set first supplier as active when suppliers load
  useEffect(() => {
    if (suppliers.length > 0) {
      if (
        !activeSupplierId ||
        !suppliers.find((s: any) => s.id === activeSupplierId)
      ) {
        setActiveSupplierId(suppliers[0].id);
      }
    } else if (suppliers.length === 0 && activeSupplierId) {
      setActiveSupplierId("");
    }
  }, [suppliers, activeSupplierId]);

  useEffect(() => {
    setPurchasePage(1);
    setPaymentPage(1);
    exitDeleteMode();
  }, [activeSupplierId]);

  useEffect(() => {
    exitDeleteMode();
  }, [activeTab]);

  useEffect(() => {
    if (purchasePage > Number(activePurchasesPagination?.totalPages || 1)) {
      setPurchasePage(Math.max(1, Number(activePurchasesPagination?.totalPages || 1)));
    }
  }, [purchasePage, activePurchasesPagination?.totalPages]);

  useEffect(() => {
    if (paymentPage > Number(activePaymentsPagination?.totalPages || 1)) {
      setPaymentPage(Math.max(1, Number(activePaymentsPagination?.totalPages || 1)));
    }
  }, [paymentPage, activePaymentsPagination?.totalPages]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [purchasePage, paymentPage, activeTab, activeSupplierId]);

  // Default Add Entry date to now when modal opens
  useEffect(() => {
    if (isAddEntryOpen) {
      setNewEntry((prev) => ({ ...prev, date: getNowLocalDateTime() }));
    }
  }, [isAddEntryOpen]);

  useEffect(() => {
    if (isPaymentModalOpen) {
      setPaymentForm((prev) => ({ ...prev, date: getNowLocalDateTime() }));
    }
  }, [isPaymentModalOpen]);

  const getCategoryLabel = (category: string | null | undefined) =>
    category && PURCHASE_CATEGORY_VALUES.includes(category as any)
      ? t(CATEGORY_I18N_KEYS[category as (typeof PURCHASE_CATEGORY_VALUES)[number]])
      : "—";

  // Purchases columns
  const purchaseColumns: Column[] = [
    createColumn("purchaseCategory", t("farmer.supplierLedger.table.category"), {
      render: (_, row) => (
        <Badge className={`${getCategoryBadgeColor(row.purchaseCategory)} text-[10px] md:text-xs`}>
          {getCategoryLabel(row.purchaseCategory)}
        </Badge>
      ),
    }),
    createColumn("itemName", t("farmer.supplierLedger.table.item"), {
      render: (value, row: any) => (
        <div>
          <div>{value || "-"}</div>
          {row.purchaseCategory === "MEDICINE" && row.expiryDate && (
            <div className="mt-1 text-xs text-muted-foreground">
              {t("farmer.supplierLedger.addEntry.expiryDateShort")}:{" "}
              <DateDisplay date={row.expiryDate} format="short" />
            </div>
          )}
        </div>
      ),
    }),
    createColumn("quantity", t("farmer.supplierLedger.table.qty"), {
      type: "number",
      align: "right",
      render: (_, row) => {
        const quantities = row.quantities;
        if (Array.isArray(quantities) && quantities.length > 0) {
          return <span>{quantities.join(", ")}</span>;
        }
        const qty = row.quantity || 0;
        const free = row.freeQuantity || 0;
        const unit = row.unit || "";
        return free > 0 ? (
          <span>
            {qty}{unit ? ` ${unit}` : ""} <span className="text-green-600 text-xs">+{free} free</span>
          </span>
        ) : (
          <span>{qty}{unit ? ` ${unit}` : ""}</span>
        );
      },
    }),
    createColumn("unitPrice", t("farmer.supplierLedger.table.rate"), {
      align: "right",
      render: (_, row) => {
        const unitPrices = row.unitPrices;
        const units = row.units;
        if (Array.isArray(unitPrices) && unitPrices.length > 0) {
          const parts = unitPrices.map((p: number, i: number) => {
            const u = Array.isArray(units) && units[i] != null ? units[i] : "unit";
            return `रू ${Number(p).toFixed(2)}/${u}`;
          });
          return <span className="text-xs">{parts.join(", ")}</span>;
        }
        const price = row.unitPrice || row.amount / (row.quantity || 1);
        const unit = row.unit || "unit";
        return (
          <span className="text-xs">
            रू {Number(price).toFixed(2)}/{unit}
          </span>
        );
      },
    }),
    createColumn("amount", t("farmer.supplierLedger.table.amount"), {
      type: "currency",
      align: "right",
    }),
    createColumn("date", t("farmer.supplierLedger.table.date"), {
      type: "date",
    }),
    createColumn("description", t("farmer.supplierLedger.table.note"), {
      render: (_, row) => (
        <span className="text-xs text-muted-foreground truncate max-w-[120px] block">
          {row.description || "—"}
        </span>
      ),
    }),
  ];

  // Payments columns
  const paymentColumns: Column[] = [
    createColumn("amount", t("farmer.supplierLedger.table.amount"), {
      type: "currency",
      align: "right",
    }),
    createColumn("date", t("farmer.supplierLedger.table.date"), {
      type: "date",
    }),
    createColumn("description", t("farmer.supplierLedger.table.note"), {
      render: (_, row) => (
        <span className="text-xs text-muted-foreground">
          {row.description || "—"}
        </span>
      ),
    }),
    createColumn("reference", t("farmer.supplierLedger.table.reference"), {
      render: (_, row) => (
        <span className="text-xs text-muted-foreground">
          {row.reference || "—"}
        </span>
      ),
    }),
    createColumn("imageUrl", t("farmer.supplierLedger.table.receipt"), {
      render: (_, row) =>
        row.imageUrl ? (
          <a
            href={row.imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Eye className="h-3.5 w-3.5" />
            {t("farmer.supplierLedger.table.view")}
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    }),
  ];

  function toggleAll() {
    if (currentLedgerRows.length === 0) return;
    if (selectedIds.size === currentLedgerRows.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(currentLedgerRows.map((r: any) => r.id)));
    }
  }

  function toggleOne(row: any) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(row.id)) next.delete(row.id);
      else next.add(row.id);
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
    if (!activeSupplierId || selectedIds.size === 0 || !passwordForm.password)
      return;

    const ids = Array.from(selectedIds);
    let failed = 0;
    let firstErrorMessage: string | null = null;

    try {
      for (const entryId of ids) {
        try {
          await deleteTxn.mutateAsync({
            dealerId: activeSupplierId,
            transactionId: entryId,
            password: passwordForm.password,
          });
        } catch (e: any) {
          failed += 1;
          const msg = e?.response?.data?.message;
          if (msg && !firstErrorMessage) firstErrorMessage = msg;
        }
      }

      exitDeleteMode();
      setIsPasswordModalOpen(false);
      setPasswordForm({ password: "" });

      if (failed === 0) {
        toast.success(t("farmer.supplierLedger.toast.entriesDeleted"));
      } else {
        setDeleteError({
          message: firstErrorMessage || t("farmer.supplierLedger.toast.failedDeleteEntries", { count: failed }),
        });
      }
    } catch {
      toast.error(t("farmer.supplierLedger.toast.passwordFailed"));
      setIsPasswordModalOpen(false);
      setPasswordForm({ password: "" });
    }
  }

  async function handleAddSupplier(e: React.FormEvent) {
    e.preventDefault();
    const name = newSupplier.name.trim();
    const contact = newSupplier.contact.trim();
    if (!name || !contact) return;

    try {
      const created = await createDealerMutation.mutateAsync({
        name,
        contact,
        address: newSupplier.address || undefined,
      });

      const dealerId = created?.data?.id;
      const openingAmt = Number(newSupplier.openingBalanceAmount || 0);
      if (dealerId && Number.isFinite(openingAmt) && openingAmt !== 0) {
        const signed =
          newSupplier.openingBalanceDirection === "OWED"
            ? Math.abs(openingAmt)
            : -Math.abs(openingAmt);
        await setOpeningBalanceMutation.mutateAsync({
          dealerId,
          openingBalance: signed,
          notes: "Opening balance",
        });
      }

      toast.success(t("farmer.supplierLedger.toast.supplierCreated"));
      setIsAddSupplierOpen(false);
      setNewSupplier({
        name: "",
        contact: "",
        address: "",
        openingBalanceAmount: "",
        openingBalanceDirection: "OWED",
      });
    } catch (error) {
      console.error("Failed to create supplier:", error);
    }
  }

  // Compute free quantity for CHICKS category
  function computeFreeQuantity(): number {
    if (newEntry.category !== "CHICKS" || !freeValue) return 0;
    const val = Number(freeValue);
    if (!val || val <= 0) return 0;
    if (freeMode === "count") return val;
    // percent mode: calculate from quantity
    const qty = Number(newEntry.quantity) || 0;
    return Math.floor((qty * val) / 100);
  }

  async function handleAddEntry(e: React.FormEvent) {
    e.preventDefault();
    const rate = Number(newEntry.rate);
    const quantity = Number(newEntry.quantity);
    const date = newEntry.date || new Date().toISOString();
    if (!newEntry.item || !rate || !quantity || !activeSupplierId) return;

    const freeQuantity = computeFreeQuantity();

    try {
      await addTransactionMutation.mutateAsync({
        dealerId: activeSupplierId,
        data: {
          type: "PURCHASE" as TransactionType,
          amount: rate * quantity,
          quantity,
          freeQuantity: freeQuantity > 0 ? freeQuantity : undefined,
          itemName: newEntry.item,
          purchaseCategory: newEntry.category,
          date,
          expiryDate:
            newEntry.category === "MEDICINE" && newEntry.expiryDate
              ? newEntry.expiryDate
              : undefined,
          description:
            newEntry.description || `Purchase of ${newEntry.item}`,
          unitPrice: rate,
          unit: newEntry.unit || undefined,
        },
      });

      toast.success(t("farmer.supplierLedger.toast.entryAdded"));
      setIsAddEntryOpen(false);
      setNewEntry({
        category: "FEED",
        item: "",
        rate: "",
        quantity: "",
        unit: "",
        date: "",
        expiryDate: "",
        description: "",
      });
      setFreeMode("count");
      setFreeValue("");
    } catch (error) {
      console.error("Failed to add entry:", error);
    }
  }

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!paymentForm.amount || !activeSupplierId) return;

    const paymentAmount = Number(paymentForm.amount);
    const paymentDate = paymentForm.date || new Date().toISOString();

    try {
      await addTransactionMutation.mutateAsync({
        dealerId: activeSupplierId,
        data: {
          type: "PAYMENT" as TransactionType,
          amount: paymentAmount,
          date: paymentDate,
          description: paymentForm.note || "Payment",
          imageUrl: paymentForm.receiptImageUrl || undefined,
        },
      });

      toast.success(t("farmer.supplierLedger.toast.paymentRecorded"));
      setIsPaymentModalOpen(false);
      setPaymentForm({ amount: "", date: "", note: "", receiptImageUrl: "" });
    } catch (error) {
      console.error("Failed to record payment:", error);
    }
  }

  const canDeleteSupplier = true;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-bold tracking-tight">
            {t("farmer.supplierLedger.title")}
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            {t("farmer.supplierLedger.subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <Button
            size="sm"
            className="text-xs md:text-sm h-9"
            onClick={() => setIsAddSupplierOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("farmer.supplierLedger.addSupplierButton")}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-2 md:gap-3 grid-cols-3">
        <Card
          onClick={() => setIsSummaryOpen(true)}
          className="cursor-pointer transition-colors hover:bg-[#10841E] hover:text-white"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-2.5 py-1.5 md:px-4 md:py-2">
            <CardTitle className="text-[9px] md:text-xs font-medium">
              {t("farmer.supplierLedger.stats.suppliers")}
            </CardTitle>
            <Users className="h-3 w-3 md:h-3.5 md:w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-2.5 pb-2 pt-0 md:px-4 md:pb-3 md:pt-0">
            {statisticsLoading ? (
              <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" />
            ) : (
              <div className="text-sm md:text-xl font-bold leading-none">
                {statistics.totalDealers || 0}
              </div>
            )}
            <p className="text-[8px] md:text-[10px] text-muted-foreground hidden sm:block mt-0.5">
              {t("farmer.supplierLedger.stats.activeSuppliers")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-2.5 py-1.5 md:px-4 md:py-2">
            <CardTitle className="text-[9px] md:text-xs font-medium">
              {t("farmer.supplierLedger.stats.outstanding")}
            </CardTitle>
            <TrendingUp className="h-3 w-3 md:h-3.5 md:w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-2.5 pb-2 pt-0 md:px-4 md:pb-3 md:pt-0">
            {statisticsLoading ? (
              <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" />
            ) : (
              <div className="text-sm md:text-xl font-bold leading-none">
                <span className="hidden md:inline">
                  ₹{(statistics.outstandingAmount || 0).toLocaleString()}
                </span>
                <span className="md:hidden">
                  ₹{Math.round(statistics.outstandingAmount || 0).toLocaleString()}
                </span>
              </div>
            )}
            <p className="text-[8px] md:text-[10px] text-muted-foreground hidden sm:block mt-0.5">
              {t("farmer.supplierLedger.stats.amountDue")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-2.5 py-1.5 md:px-4 md:py-2">
            <CardTitle className="text-[9px] md:text-xs font-medium">
              {t("farmer.supplierLedger.stats.thisMonth")}
            </CardTitle>
            <TrendingUp className="h-3 w-3 md:h-3.5 md:w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-2.5 pb-2 pt-0 md:px-4 md:pb-3 md:pt-0">
            {statisticsLoading ? (
              <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" />
            ) : (
              <div className="text-sm md:text-xl font-bold leading-none">
                <span className="hidden md:inline">
                  ₹{(statistics.thisMonthAmount || 0).toLocaleString()}
                </span>
                <span className="md:hidden">
                  ₹{Math.round(statistics.thisMonthAmount || 0).toLocaleString()}
                </span>
              </div>
            )}
            <p className="text-[8px] md:text-[10px] text-muted-foreground hidden sm:block mt-0.5">
              {t("farmer.supplierLedger.stats.purchases")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Summary Modal */}
      <Modal
        isOpen={isSummaryOpen}
        onClose={() => setIsSummaryOpen(false)}
        title={t("farmer.supplierLedger.summaryModal.title")}
      >
        <ModalContent>
          <div className="space-y-3">
            {dealersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">{t("farmer.supplierLedger.summaryModal.loading")}</span>
              </div>
            ) : suppliers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">{t("farmer.supplierLedger.summaryModal.noSuppliers")}</p>
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
                      {t("farmer.supplierLedger.summaryModal.contact")}: {supplier.contact}
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
            {t("farmer.supplierLedger.summaryModal.close")}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Supplier Confirmation Modal */}
      <Modal
        isOpen={isDeleteSupplierOpen}
        onClose={() => setIsDeleteSupplierOpen(false)}
        title={t("farmer.supplierLedger.deleteSupplier.title")}
      >
        <ModalContent>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-800">
                <strong>
                  {t("farmer.supplierLedger.deleteSupplier.confirmMessage", { name: activeSupplier?.name ?? "" })}
                </strong>
              </p>
              {(activeSupplier?.totalTransactions || 0) > 0 && (
                <p className="text-sm text-red-700 mt-2">
                  {t("farmer.supplierLedger.deleteSupplier.hasTransactions", { count: activeSupplier?.totalTransactions ?? 0 })}
                </p>
              )}
            </div>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setIsDeleteSupplierOpen(false)}
          >
            {t("farmer.supplierLedger.deleteSupplier.cancel")}
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={async () => {
              if (!activeSupplierId) return;
              const idToDelete = activeSupplierId;
              try {
                setActiveSupplierId("");
                await deleteDealerMutation.mutateAsync(idToDelete);
                queryClient.removeQueries({
                  queryKey: ["dealers", "detail", idToDelete],
                });
                queryClient.invalidateQueries({
                  queryKey: ["dealers", "list"],
                });
                toast.success(t("farmer.supplierLedger.toast.supplierDeleted"));
                setIsDeleteSupplierOpen(false);
              } catch {
                setActiveSupplierId(idToDelete);
              }
            }}
            disabled={
              !activeSupplierId ||
              deleteDealerMutation.isPending ||
              (activeSupplier?.totalTransactions || 0) > 0
            }
          >
            {deleteDealerMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("farmer.supplierLedger.deleteSupplier.deleting")}
              </>
            ) : (
              t("farmer.supplierLedger.deleteSupplier.delete")
            )}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Confirm Delete Entries Modal */}
      <Modal
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        title={t("farmer.supplierLedger.confirmDeleteEntries.title", { count: selectedIds.size })}
      >
        <ModalContent>
          <p className="text-sm text-muted-foreground">
            {t("farmer.supplierLedger.confirmDeleteEntries.warning")}
          </p>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setIsConfirmDeleteOpen(false)}
          >
            {t("farmer.supplierLedger.confirmDeleteEntries.cancel")}
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={confirmDeleteSelected}
            disabled={deleteTxn.isPending}
          >
            {deleteTxn.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("farmer.supplierLedger.confirmDeleteEntries.deleting")}
              </>
            ) : (
              t("farmer.supplierLedger.confirmDeleteEntries.delete")
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
        title={t("farmer.supplierLedger.confirmPassword.title")}
      >
        <ModalContent>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-800">
                <strong>
                  {t("farmer.supplierLedger.confirmPassword.warning", { count: selectedIds.size })}
                </strong>
              </p>
            </div>
            <div>
              <Label htmlFor="password">{t("farmer.supplierLedger.confirmPassword.passwordLabel")}</Label>
              <Input
                id="password"
                type="password"
                value={passwordForm.password}
                onChange={(e) => setPasswordForm({ password: e.target.value })}
                placeholder={t("farmer.supplierLedger.confirmPassword.passwordPlaceholder")}
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
            {t("farmer.supplierLedger.confirmPassword.cancel")}
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={handlePasswordConfirm}
            disabled={!passwordForm.password || deleteTxn.isPending}
          >
            {deleteTxn.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("farmer.supplierLedger.confirmPassword.deleting")}
              </>
            ) : (
              t("farmer.supplierLedger.confirmPassword.confirm")
            )}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete failed: item used in batches */}
      <Modal
        isOpen={!!deleteError}
        onClose={() => setDeleteError(null)}
        title={t("farmer.supplierLedger.deleteUsedInBatches.title")}
      >
        <ModalContent>
          <div className="space-y-4">
            <p className="text-sm font-medium text-foreground">
              {t("farmer.supplierLedger.deleteUsedInBatches.message")}
            </p>
            {deleteError?.message && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3">
                <p className="text-xs text-amber-800 dark:text-amber-200 whitespace-pre-wrap">
                  {deleteError.message}
                </p>
              </div>
            )}
          </div>
        </ModalContent>
        <ModalFooter>
          <Button onClick={() => setDeleteError(null)}>
            {t("farmer.supplierLedger.deleteUsedInBatches.close")}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Add Supplier Modal */}
      <Modal
        isOpen={isAddSupplierOpen}
        onClose={() => setIsAddSupplierOpen(false)}
        title={t("farmer.supplierLedger.addSupplier.title")}
      >
        <form onSubmit={handleAddSupplier}>
          <ModalContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="sname">{t("farmer.supplierLedger.addSupplier.nameLabel")}</Label>
                <Input
                  id="sname"
                  value={newSupplier.name}
                  onChange={(e) =>
                    setNewSupplier({ ...newSupplier, name: e.target.value })
                  }
                  placeholder={t("farmer.supplierLedger.addSupplier.namePlaceholder")}
                  required
                />
              </div>
              <div>
                <Label htmlFor="scontact">{t("farmer.supplierLedger.addSupplier.contactLabel")}</Label>
                <Input
                  id="scontact"
                  value={newSupplier.contact}
                  onChange={(e) =>
                    setNewSupplier({ ...newSupplier, contact: e.target.value })
                  }
                  placeholder={t("farmer.supplierLedger.addSupplier.contactPlaceholder")}
                  required
                />
              </div>
              <div>
                <Label htmlFor="saddress">{t("farmer.supplierLedger.addSupplier.addressLabel")}</Label>
                <Input
                  id="saddress"
                  value={newSupplier.address}
                  onChange={(e) =>
                    setNewSupplier({ ...newSupplier, address: e.target.value })
                  }
                  placeholder={t("farmer.supplierLedger.addSupplier.addressPlaceholder")}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Opening balance (optional)</Label>
                  <Input
                    value={newSupplier.openingBalanceAmount}
                    onChange={(e) =>
                      setNewSupplier({
                        ...newSupplier,
                        openingBalanceAmount: e.target.value,
                      })
                    }
                    inputMode="decimal"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>Direction</Label>
                  <Select
                    value={newSupplier.openingBalanceDirection}
                    onValueChange={(v) =>
                      setNewSupplier({
                        ...newSupplier,
                        openingBalanceDirection: v as "OWED" | "ADVANCE",
                      })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OWED">I owe supplier</SelectItem>
                      <SelectItem value="ADVANCE">Supplier owes me (advance paid)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </ModalContent>
          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddSupplierOpen(false)}
            >
              {t("farmer.supplierLedger.addSupplier.cancel")}
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90"
              disabled={createDealerMutation.isPending}
            >
              {createDealerMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("farmer.supplierLedger.addSupplier.adding")}
                </>
              ) : (
                t("farmer.supplierLedger.addSupplier.add")
              )}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Add Purchase Entry Modal */}
      <Modal
        isOpen={isAddEntryOpen}
        onClose={() => setIsAddEntryOpen(false)}
        title={t("farmer.supplierLedger.addEntry.title", { name: activeSupplier?.name ?? t("farmer.supplierLedger.addEntry.supplier") })}
      >
        <form onSubmit={handleAddEntry}>
          <ModalContent>
            <div className="space-y-4">
              {/* Category selector */}
              <div>
                <Label>{t("farmer.supplierLedger.addEntry.categoryLabel")}</Label>
                <Select
                  value={newEntry.category}
                  onValueChange={(value) => {
                    setNewEntry({
                      ...newEntry,
                      category: value,
                      expiryDate: value === "MEDICINE" ? newEntry.expiryDate : "",
                    });
                    // Reset free chicks state when switching away from CHICKS
                    if (value !== "CHICKS") {
                      setFreeMode("count");
                      setFreeValue("");
                    }
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={t("farmer.supplierLedger.addEntry.categoryPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {PURCHASE_CATEGORY_VALUES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {t(CATEGORY_I18N_KEYS[value])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Item Name */}
              <div>
                <Label htmlFor="item">{t("farmer.supplierLedger.addEntry.itemLabel")}</Label>
                <Input
                  id="item"
                  value={newEntry.item}
                  onChange={(e) =>
                    setNewEntry({ ...newEntry, item: e.target.value })
                  }
                  placeholder={
                    newEntry.category === "FEED"
                      ? t("farmer.supplierLedger.addEntry.itemPlaceholderFeed")
                      : newEntry.category === "MEDICINE"
                        ? t("farmer.supplierLedger.addEntry.itemPlaceholderMedicine")
                        : newEntry.category === "CHICKS"
                          ? t("farmer.supplierLedger.addEntry.itemPlaceholderChicks")
                          : t("farmer.supplierLedger.addEntry.itemPlaceholder")
                  }
                  required
                />
              </div>

              {/* Unit */}
              <div>
                <Label htmlFor="unit">{t("farmer.supplierLedger.addEntry.unitLabel")}</Label>
                <Select
                  value={newEntry.unit || ""}
                  onValueChange={(value) =>
                    setNewEntry({ ...newEntry, unit: value })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={t("farmer.supplierLedger.addEntry.unitPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {(newEntry.category === "FEED"
                      ? ["KG", "Sack", "Packet", "Bag", "Quintal"]
                      : newEntry.category === "MEDICINE"
                        ? ["Bottle", "Strip", "Vial", "Tablet", "ML", "PCS"]
                        : newEntry.category === "CHICKS"
                          ? ["Birds", "PCS", "Dozen", "Crate"]
                          : ["PCS", "KG", "Liters", "Box", "Packet"]
                    ).map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Rate + Quantity (common for all) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rate">{t("farmer.supplierLedger.addEntry.rateLabel", { unit: newEntry.unit || "unit" })}</Label>
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
                  <Label htmlFor="quantity">{t("farmer.supplierLedger.addEntry.quantityLabel")}{newEntry.unit ? ` (${newEntry.unit})` : ""}</Label>
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
              </div>

              {/* Free Chicks - ONLY for CHICKS category */}
              {newEntry.category === "CHICKS" && (
                <div className="space-y-2">
                  <Label>{t("farmer.supplierLedger.addEntry.freeChicksLabel")}</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant={freeMode === "count" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFreeMode("count")}
                      className="h-8 px-3"
                    >
                      {t("farmer.supplierLedger.addEntry.freeCount")}
                    </Button>
                    <Button
                      type="button"
                      variant={freeMode === "percent" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFreeMode("percent")}
                      className="h-8 px-3"
                    >
                      {t("farmer.supplierLedger.addEntry.freePercent")}
                    </Button>
                    <Input
                      type="number"
                      placeholder={freeMode === "count" ? t("farmer.supplierLedger.addEntry.freePlaceholderCount") : t("farmer.supplierLedger.addEntry.freePlaceholderPercent")}
                      value={freeValue}
                      onChange={(e) => setFreeValue(e.target.value)}
                      className="max-w-[180px]"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("farmer.supplierLedger.addEntry.freeHelp")}
                  </p>
                </div>
              )}

              {/* Total summary */}
              {Number(newEntry.rate) > 0 && Number(newEntry.quantity) > 0 && (
                <div className="p-3 bg-gray-50 rounded-lg border text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("farmer.supplierLedger.addEntry.total")}</span>
                    <span className="font-semibold">
                      ₹{(Number(newEntry.rate) * Number(newEntry.quantity)).toLocaleString()}
                    </span>
                  </div>
                  {newEntry.category === "CHICKS" && computeFreeQuantity() > 0 && (
                    <div className="flex justify-between mt-1">
                      <span className="text-muted-foreground">{t("farmer.supplierLedger.addEntry.free")}</span>
                      <span className="text-green-600 font-medium">
                        +{computeFreeQuantity()} {t("farmer.supplierLedger.addEntry.chicks")}
                      </span>
                    </div>
                  )}
                  {newEntry.category === "CHICKS" && (
                    <div className="flex justify-between mt-1">
                      <span className="text-muted-foreground">{t("farmer.supplierLedger.addEntry.totalDelivered")}</span>
                      <span className="font-medium">
                        {Number(newEntry.quantity) + computeFreeQuantity()} {t("farmer.supplierLedger.addEntry.chicks")}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Date */}
              <div>
                <DateInput
                  label={t("farmer.supplierLedger.addEntry.dateLabel")}
                  value={newEntry.date}
                  onChange={(value) =>
                    setNewEntry({ ...newEntry, date: value })
                  }
                />
              </div>

              {newEntry.category === "MEDICINE" && (
                <div>
                  <DateInput
                    label={t("farmer.supplierLedger.addEntry.expiryDateLabel")}
                    value={newEntry.expiryDate}
                    onChange={(value) =>
                      setNewEntry({ ...newEntry, expiryDate: value })
                    }
                    preferNativeInput
                  />
                </div>
              )}

              {/* Note */}
              <div>
                <Label htmlFor="description">{t("farmer.supplierLedger.addEntry.noteLabel")}</Label>
                <Input
                  id="description"
                  value={newEntry.description}
                  onChange={(e) =>
                    setNewEntry({ ...newEntry, description: e.target.value })
                  }
                  placeholder={t("farmer.supplierLedger.addEntry.notePlaceholder")}
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
              {t("farmer.supplierLedger.addEntry.cancel")}
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90"
              disabled={addTransactionMutation.isPending}
            >
              {addTransactionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("farmer.supplierLedger.addEntry.saving")}
                </>
              ) : (
                t("farmer.supplierLedger.addEntry.save")
              )}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Payment Modal (Khata-style) */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setPaymentForm({ amount: "", date: "", note: "", receiptImageUrl: "" });
        }}
        title={t("farmer.supplierLedger.recordPayment.title")}
      >
        <form onSubmit={handleAddPayment}>
          <ModalContent>
            <div className="space-y-4">
              {activeSupplier && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>{t("farmer.supplierLedger.recordPayment.supplier")}</strong> {activeSupplier.name}
                  </p>
                  <p className="text-sm text-blue-800">
                    <strong>{t("farmer.supplierLedger.recordPayment.balanceDue")}</strong> ₹
                    {(activeSupplier.balance || 0).toLocaleString()}
                  </p>
                </div>
              )}
              <div>
                <Label htmlFor="paymentAmount">{t("farmer.supplierLedger.recordPayment.amountLabel")}</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, amount: e.target.value })
                  }
                  placeholder={t("farmer.supplierLedger.recordPayment.amountPlaceholder")}
                  required
                />
              </div>
              <div>
                <DateInput
                  label={t("farmer.supplierLedger.recordPayment.dateLabel")}
                  value={paymentForm.date}
                  onChange={(value) =>
                    setPaymentForm({ ...paymentForm, date: value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="paymentNote">{t("farmer.supplierLedger.recordPayment.noteLabel")}</Label>
                <Input
                  id="paymentNote"
                  value={paymentForm.note}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, note: e.target.value })
                  }
                  placeholder={t("farmer.supplierLedger.recordPayment.notePlaceholder")}
                />
              </div>
              <div>
                <Label>{t("farmer.supplierLedger.recordPayment.receiptLabel")}</Label>
                <ImageUpload
                  value={paymentForm.receiptImageUrl}
                  onChange={(url) =>
                    setPaymentForm({ ...paymentForm, receiptImageUrl: url })
                  }
                  folder="payment-receipts"
                  placeholder={t("farmer.supplierLedger.recordPayment.receiptPlaceholder")}
                />
              </div>
            </div>
          </ModalContent>
          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsPaymentModalOpen(false);
                setPaymentForm({ amount: "", date: "", note: "", receiptImageUrl: "" });
              }}
            >
              {t("farmer.supplierLedger.recordPayment.cancel")}
            </Button>
            <Button
              type="submit"
              className="bg-green-600 hover:bg-green-700"
              disabled={addTransactionMutation.isPending}
            >
              {addTransactionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("farmer.supplierLedger.recordPayment.recording")}
                </>
              ) : (
                t("farmer.supplierLedger.recordPayment.record")
              )}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Loading State */}
      {dealersLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">{t("farmer.supplierLedger.loadingSuppliers")}</span>
        </div>
      )}

      {/* Error State */}
      {dealersError && (
        <div className="text-center py-8">
          <p className="text-red-600">
            {t("farmer.supplierLedger.failedToLoad")}
          </p>
        </div>
      )}

      {/* Supplier Tabs + Detail */}
      {!dealersLoading && !dealersError && (
        <div className="space-y-3">
          {/* Supplier tab selector */}
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-2 min-w-max">
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
                  onClick={() => {
                    setActiveSupplierId(supplier.id);
                    exitDeleteMode();
                  }}
                >
                  <span>{supplier.name}</span>
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="text-xs md:text-sm whitespace-nowrap"
                onClick={() => setIsAddSupplierOpen(true)}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t("farmer.supplierLedger.addSupplierButton")}</span>
                <span className="sm:hidden">{t("farmer.supplierLedger.addShort")}</span>
              </Button>
            </div>
          </div>

          {suppliers.length === 0 ? (
            <Card>
              <CardContent className="text-center py-6">
                <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <h3 className="text-base font-semibold mb-2">
                  {t("farmer.supplierLedger.noSuppliersTitle")}
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {t("farmer.supplierLedger.noSuppliersHelp")}
                </p>
                <Button
                  size="sm"
                  onClick={() => setIsAddSupplierOpen(true)}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  {t("farmer.supplierLedger.addSupplierButton")}
                </Button>
              </CardContent>
            </Card>
          ) : activeSupplierId ? (
            <Card>
              <CardHeader className="p-3 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <CardTitle className="text-base md:text-lg">
                      {activeSupplier?.name || t("farmer.supplierLedger.selectSupplier")}
                    </CardTitle>
                      {activeSupplier && (
                        <CardDescription className="text-[10px] md:text-sm mt-1">
                          {t("farmer.supplierLedger.balance")} ₹
                          {(activeSupplier.balance || 0).toLocaleString()} |{" "}
                          {t("farmer.supplierLedger.purchased")} ₹
                          {Number(activeSummary.totalPurchasedAmount || 0).toLocaleString()}{" "}
                          | {t("farmer.supplierLedger.paid")} ₹
                          {Number(activeSummary.totalPaidAmount || 0).toLocaleString()}
                        </CardDescription>
                      )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {activeSupplierId && !isDeleteMode && canDeleteSupplier && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50 h-7 text-xs"
                        onClick={() => setIsDeleteSupplierOpen(true)}
                      >
                        <Trash2 className="h-3 w-3 mr-1 sm:mr-0" />
                        <span className="hidden sm:inline sm:ml-1">
                          {t("farmer.supplierLedger.delete")}
                        </span>
                      </Button>
                    )}
                    {isDeleteMode ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={exitDeleteMode}
                        >
                          <X className="h-3 w-3 mr-1" /> {t("farmer.supplierLedger.confirmDeleteEntries.cancel")}
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
                          onClick={() =>
                            router.push(
                              `/farmer/dashboard/supplier-ledger/${activeSupplierId}`
                            )
                          }
                          disabled={!activeSupplierId}
                        >
                          <Eye className="h-3 w-3 mr-1 sm:mr-0" />
                          <span className="hidden sm:inline sm:ml-1">
                            {t("farmer.supplierLedger.details")}
                          </span>
                        </Button>
                        {canDeleteSupplier && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setIsDeleteMode(true)}
                            disabled={!activeSupplierId}
                          >
                            <Trash2 className="h-3 w-3 mr-1 sm:mr-0" />
                            <span className="hidden sm:inline sm:ml-1">
                              {t("farmer.supplierLedger.entries")}
                            </span>
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs border-green-200 text-green-700 hover:bg-green-50"
                          onClick={() => setIsPaymentModalOpen(true)}
                          disabled={!activeSupplierId}
                        >
                          <DollarSign className="h-3 w-3 mr-1" />
                          <span className="hidden sm:inline">{t("farmer.supplierLedger.pay")}</span>
                        </Button>
                        <Button
                          className="bg-primary hover:bg-primary/90 h-7 text-xs"
                          size="sm"
                          onClick={() => setIsAddEntryOpen(true)}
                          disabled={!activeSupplierId}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          <span className="hidden sm:inline">{t("farmer.supplierLedger.addEntryButton")}</span>
                          <span className="sm:hidden">{t("farmer.supplierLedger.addShort")}</span>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {activeSupplierLoading ? (
                  <div className="flex items-center justify-center py-6 text-sm">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="ml-2">{t("farmer.supplierLedger.summaryModal.loading")}</span>
                  </div>
                ) : (
                  <Tabs
                    value={activeTab}
                    onValueChange={(v) => {
                      setActiveTab(v as "purchases" | "payments");
                      exitDeleteMode();
                    }}
                    >
                      <div className="px-3 md:px-6">
                        <TabsList>
                          <TabsTrigger value="purchases">
                          {t("farmer.supplierLedger.stats.purchases")} ({Number(activeSummary.totalPurchases || 0)})
                          </TabsTrigger>
                          <TabsTrigger value="payments">
                          {t("farmer.supplierLedger.paymentsTab")} ({Number(activeSummary.totalPayments || 0)})
                          </TabsTrigger>
                        </TabsList>
                      </div>

                      <TabsContent value="purchases" className="overflow-x-auto">
                        <DataTable
                        data={activePurchases}
                        columns={purchaseColumns}
                        selectable={isDeleteMode}
                        isAllSelected={
                          currentLedgerRows.length > 0 &&
                          selectedIds.size > 0 &&
                          selectedIds.size === currentLedgerRows.length
                        }
                        onToggleAll={toggleAll}
                        isRowSelected={(row: any) => selectedIds.has(row.id)}
                        onToggleRow={toggleOne}
                        getRowKey={(row: any) => row.id}
                        showFooter={
                          (activePurchases.length || 0) > 0
                        }
                        footerContent={
                          <div className="flex justify-between text-sm px-2">
                            <span className="font-semibold">{t("farmer.supplierLedger.total")}</span>
                            <span className="font-semibold">
                              ₹
                              {Number(activeSummary.totalPurchasedAmount || 0).toLocaleString()}
                            </span>
                          </div>
                        }
                        emptyMessage={t("farmer.supplierLedger.noPurchases")}
                      />
                      <LedgerPagination
                        page={purchasePage}
                        totalPages={Number(activePurchasesPagination?.totalPages || 1)}
                        totalRows={Number(activePurchasesPagination?.total || 0)}
                        pageLimit={LEDGER_PAGE_LIMIT}
                        onPageChange={setPurchasePage}
                        loading={activePurchasesLoading}
                      />
                      </TabsContent>

                      <TabsContent value="payments" className="overflow-x-auto">
                        <DataTable
                        data={activePayments}
                        columns={paymentColumns}
                        selectable={isDeleteMode}
                        isAllSelected={
                          currentLedgerRows.length > 0 &&
                          selectedIds.size > 0 &&
                          selectedIds.size === currentLedgerRows.length
                        }
                        onToggleAll={toggleAll}
                        isRowSelected={(row: any) => selectedIds.has(row.id)}
                        onToggleRow={toggleOne}
                        getRowKey={(row: any) => row.id}
                        showFooter={
                          (activePayments.length || 0) > 0
                        }
                        footerContent={
                          <div className="flex justify-between text-sm px-2">
                            <span className="font-semibold">{t("farmer.supplierLedger.totalPaid")}</span>
                            <span className="font-semibold text-green-600">
                              ₹
                              {Number(activeSummary.totalPaidAmount || 0).toLocaleString()}
                            </span>
                          </div>
                        }
                        emptyMessage={t("farmer.supplierLedger.noPayments")}
                      />
                      <LedgerPagination
                        page={paymentPage}
                        totalPages={Number(activePaymentsPagination?.totalPages || 1)}
                        totalRows={Number(activePaymentsPagination?.total || 0)}
                        pageLimit={LEDGER_PAGE_LIMIT}
                        onPageChange={setPaymentPage}
                        loading={activePaymentsLoading}
                      />
                      </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-6">
                <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <h3 className="text-base font-semibold mb-2">
                  {t("farmer.supplierLedger.noSupplierSelected")}
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {t("farmer.supplierLedger.createSupplierToStart")}
                </p>
                <Button
                  size="sm"
                  onClick={() => setIsAddSupplierOpen(true)}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  {t("farmer.supplierLedger.addSupplierButton")}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
