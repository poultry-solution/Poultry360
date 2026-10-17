"use client";

import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Badge } from "@/common/components/ui/badge";
import { Modal, ModalContent, ModalFooter } from "@/common/components/ui/modal";
import { toast } from "sonner";
import {
  Truck,
  Plus,
  Users,
  Wallet,
  ShoppingCart,
  Search,
  Trash2,
  Eye,
  X,
  MoreHorizontal,
  Pencil,
  Phone,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import { DateInput } from "@/common/components/ui/date-input";
import { DataTable, type Column } from "@/common/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/common/components/ui/dropdown-menu";
import { DateDisplay } from "@/common/components/ui/date-display";
import { ImageUpload } from "@/common/components/ui/image-upload";
import { LedgerPagination } from "@/common/components/ui/ledger-pagination";
import { formatRupeesExact, getNowLocalDateTime } from "@/common/lib/utils";
import {
  useGetHatcherySuppliers,
  useGetHatcherySupplierStatistics,
  useGetHatcherySupplierTransactions,
  useCreateHatcherySupplier,
  useUpdateHatcherySupplier,
  useDeleteHatcherySupplier,
  useSetHatcherySupplierOpeningBalance,
  useAddHatcherySupplierPurchase,
  useAddHatcherySupplierPayment,
  useDeleteHatcherySupplierTransaction,
  type HatcheryPurchaseCategory,
  type AddPurchaseItem,
} from "@/fetchers/hatchery/hatcherySupplierQueries";
import {
  ACCOUNT_FEATURE_KEYS,
  useAccountFeature,
} from "@/fetchers/accountFeatureQueries";
import axiosInstance from "@/common/lib/axios";
import { BusinessDownloadDialog, fetchAllPages } from "@/components/downloads/BusinessDownloadDialog";

// ==================== HELPERS ====================

const CATEGORIES: HatcheryPurchaseCategory[] = [
  "FEED",
  "MEDICINE",
  "CHICKS",
  "RAW_MATERIAL",
  "OTHER",
];
const CATEGORY_LABELS: Record<HatcheryPurchaseCategory, string> = {
  FEED: "Feed",
  MEDICINE: "Medicine",
  CHICKS: "Chicks",
  RAW_MATERIAL: "Raw Material",
  OTHER: "Other",
};
const CATEGORY_COLORS: Record<HatcheryPurchaseCategory, string> = {
  FEED: "bg-amber-100 text-amber-800",
  MEDICINE: "bg-blue-100 text-blue-800",
  CHICKS: "bg-yellow-100 text-yellow-800",
  RAW_MATERIAL: "bg-teal-100 text-teal-800",
  OTHER: "bg-purple-100 text-purple-800",
};
const DEFAULT_UNITS: Record<HatcheryPurchaseCategory, string> = {
  FEED: "kg",
  MEDICINE: "ml",
  CHICKS: "birds",
  RAW_MATERIAL: "kg",
  OTHER: "pcs",
};

const fmtNPR = (n: number | string | undefined | null) => formatRupeesExact(Number(n || 0));
/** Whole rupees for the summary cards. */
const fmtWholeRupees = (n: number | string | undefined | null) => formatRupeesExact(Math.round(Number(n || 0)));

/** Supplier balance words: plus = you owe them, minus = you paid in advance. */
function supplierBalanceView(balance: number | string | undefined | null) {
  const value = Number(balance || 0);
  if (value > 0) return { label: "You owe", amount: fmtNPR(value), className: "text-red-600" };
  if (value < 0) return { label: "Advance", amount: fmtNPR(-value), className: "text-green-600" };
  return { label: "Settled", amount: fmtNPR(0), className: "text-muted-foreground" };
}

// ==================== EMPTY LINE ITEM ====================

const emptyLineItem = (category: HatcheryPurchaseCategory): AddPurchaseItem & {
  freeQuantity: number;
  freeMode: "count" | "percent";
  freeValue: string;
} => ({
  itemName: "",
  quantity: 0,
  freeQuantity: 0,
  unit: DEFAULT_UNITS[category],
  unitPrice: 0,
  totalAmount: 0,
  // Only read for CHICKS; other categories are stored as NA server-side.
  sex: "FEMALE",
  freeMode: "count",
  freeValue: "",
});

// ==================== PAGE ====================

export default function HatcherySupplierLedgerPage() {
  const SUPPLIER_PAGE_LIMIT = 10;
  const TRANSACTION_PAGE_LIMIT = 10;
  const { isEnabled: isSelfFeedEnabled } = useAccountFeature(
    ACCOUNT_FEATURE_KEYS.SELF_FEED_PRODUCTION
  );
  const { isEnabled: isPurchaseBillEnabled } = useAccountFeature(
    ACCOUNT_FEATURE_KEYS.HATCHERY_PURCHASE_BILL_UPLOAD
  );

  const [activeSupplierId, setActiveSupplierId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"purchases" | "payments">(
    "purchases"
  );
  const [supplierPage, setSupplierPage] = useState(1);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const detailRef = useRef<HTMLDivElement>(null);
  const [purchasePage, setPurchasePage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);

  // Modals
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [supplierModalMode, setSupplierModalMode] = useState<"add" | "edit">("add");
  const [purchaseDetails, setPurchaseDetails] = useState<any>(null);
  const [isAddPurchaseOpen, setIsAddPurchaseOpen] = useState(false);
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [isOpeningBalanceOpen, setIsOpeningBalanceOpen] = useState(false);
  const [isDeleteSupplierOpen, setIsDeleteSupplierOpen] = useState(false);
  const [isDeleteTxnOpen, setIsDeleteTxnOpen] = useState(false);
  const [isPurchaseBillUploading, setIsPurchaseBillUploading] = useState(false);
  const [txnToDelete, setTxnToDelete] = useState<string | null>(null);

  // Forms
  const [supplierForm, setSupplierForm] = useState({
    name: "",
    contact: "",
    address: "",
  });
  const [openingBalanceForm, setOpeningBalanceForm] = useState({
    amount: "",
    date: "",
  });
  const [purchaseForm, setPurchaseForm] = useState<{
    category: HatcheryPurchaseCategory;
    date: string;
    note: string;
    receiptImageUrl: string;
    lineItems: Array<
      AddPurchaseItem & {
        freeMode: "count" | "percent";
        freeValue: string;
      }
    >;
  }>({
    category: "FEED",
    date: "",
    note: "",
    receiptImageUrl: "",
    lineItems: [emptyLineItem("FEED")],
  });
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    date: "",
    note: "",
    reference: "",
    receiptImageUrl: "",
  });
  const [deleteTxnPassword, setDeleteTxnPassword] = useState("");
  const [deleteSupplierPassword, setDeleteSupplierPassword] = useState("");

  useEffect(() => {
    if (!isSelfFeedEnabled && purchaseForm.category === "RAW_MATERIAL") {
      setPurchaseForm((current) => ({
        ...current,
        category: "FEED",
        lineItems: [emptyLineItem("FEED")],
      }));
    }
  }, [isSelfFeedEnabled, purchaseForm.category]);

  useEffect(() => {
    if (!isPurchaseBillEnabled && purchaseForm.receiptImageUrl) {
      setPurchaseForm((current) => ({ ...current, receiptImageUrl: "" }));
    }
  }, [isPurchaseBillEnabled, purchaseForm.receiptImageUrl]);
  // Queries
  const { data: suppliersRes, isLoading: suppliersLoading } =
    useGetHatcherySuppliers({
      page: supplierPage,
      limit: SUPPLIER_PAGE_LIMIT,
      search: debouncedSearch || undefined,
    });
  const { data: statsRes } = useGetHatcherySupplierStatistics();
  const { data: purchaseTxnRes, isLoading: purchaseLoading } =
    useGetHatcherySupplierTransactions(
      activeSupplierId || null,
      {
        page: purchasePage,
        limit: TRANSACTION_PAGE_LIMIT,
        types: ["PURCHASE", "OPENING_BALANCE", "ADJUSTMENT"],
      }
    );
  const { data: paymentTxnRes, isLoading: paymentLoading } =
    useGetHatcherySupplierTransactions(
      activeSupplierId || null,
      {
        page: paymentPage,
        limit: TRANSACTION_PAGE_LIMIT,
        type: "PAYMENT",
      }
    );

  // Mutations
  const createSupplier = useCreateHatcherySupplier();
  const updateSupplier = useUpdateHatcherySupplier();
  const deleteSupplier = useDeleteHatcherySupplier();
  const setOpeningBalance = useSetHatcherySupplierOpeningBalance();
  const addPurchase = useAddHatcherySupplierPurchase();
  const addPayment = useAddHatcherySupplierPayment();
  const deleteTxn = useDeleteHatcherySupplierTransaction();

  const suppliers = suppliersRes?.data || [];
  const suppliersPagination = suppliersRes?.pagination;
  const stats = statsRes?.data || {};

  const downloadSuppliers = async () => {
    const rows = await fetchAllPages(async (downloadPage, limit) => {
      const { data } = await axiosInstance.get("/hatchery/suppliers", { params: { page: downloadPage, limit } });
      return { rows: data.data || [], total: data.pagination?.total };
    });
    return {
      columns: [
        { label: "Supplier", value: (row: any) => row.name },
        { label: "Phone", value: (row: any) => row.contact || "" },
        { label: "Address", value: (row: any) => row.address || "" },
        { label: "Balance", value: (row: any) => Number(row.balance || 0).toFixed(2) },
      ],
      rows,
      summary: [{ label: "Total suppliers", value: rows.length }],
    };
  };

  const downloadSupplierStatement = async (range: { startDate?: string; endDate?: string }) => {
    const allRows = await fetchAllPages(async (page, limit) => {
      const { data } = await axiosInstance.get(`/hatchery/suppliers/${activeSupplierId}/transactions`, { params: { page, limit } });
      return { rows: data.data || [], total: data.pagination?.total };
    });
    const start = range.startDate ? new Date(`${range.startDate}T00:00:00`) : null;
    const end = range.endDate ? new Date(`${range.endDate}T23:59:59.999`) : null;
    const rows = allRows.filter((row: any) => {
      const date = new Date(row.date);
      return (!start || date >= start) && (!end || date <= end);
    });
    const columns = [
        { label: "Date", value: (row: any) => new Date(row.date).toLocaleDateString() },
        { label: "Type", value: (row: any) => row.type || "" },
        { label: "Category", value: (row: any) => row.purchaseCategory || "" },
        { label: "Amount", value: (row: any) => Number(row.amount || 0).toFixed(2) },
        { label: "Balance", value: (row: any) => Number(row.balanceAfter || 0).toFixed(2) },
        { label: "Note", value: (row: any) => row.note || "" },
      ];
    return {
      sections: [
        { title: "Purchases", columns, rows: rows.filter((row: any) => !String(row.type || "").toUpperCase().includes("PAYMENT")) },
        { title: "Payments", columns, rows: rows.filter((row: any) => String(row.type || "").toUpperCase().includes("PAYMENT")) },
      ],
      summary: [{ label: "Current balance", value: `Rs ${Number(activeSupplier?.balance || 0).toFixed(2)}` }, { label: "Records", value: rows.length }],
    };
  };
  const activeSupplier =
    suppliers.find((sup: any) => sup.id === activeSupplierId) || null;
  const supplierTotalPages = Math.max(
    1,
    Math.ceil(
      Number(suppliersPagination?.total ?? suppliers.length) /
        Number(suppliersPagination?.limit ?? SUPPLIER_PAGE_LIMIT)
    )
  );
  const purchaseTxns = purchaseTxnRes?.data || [];
  const purchasePagination = purchaseTxnRes?.pagination;
  const purchaseTotalPages = Math.max(
    1,
    Math.ceil(
      Number(purchasePagination?.total ?? 0) /
        Number(purchasePagination?.limit ?? TRANSACTION_PAGE_LIMIT)
    )
  );
  const paymentTxns = paymentTxnRes?.data || [];
  const paymentPagination = paymentTxnRes?.pagination;
  const paymentTotalPages = Math.max(
    1,
    Math.ceil(
      Number(paymentPagination?.total ?? 0) /
        Number(paymentPagination?.limit ?? TRANSACTION_PAGE_LIMIT)
    )
  );

  // Search after the user stops typing, from page 1.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(supplierSearch.trim());
      setSupplierPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [supplierSearch]);

  const selectSupplier = (id: string) => {
    setActiveSupplierId(id);
    // On phones the details sit below the list, so bring them into view.
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  };

  // Auto-select first supplier
  useEffect(() => {
    if (
      suppliers.length > 0 &&
      (!activeSupplierId || !suppliers.some((sup: any) => sup.id === activeSupplierId))
    ) {
      setActiveSupplierId(suppliers[0].id);
    } else if (suppliers.length === 0) {
      setActiveSupplierId("");
    }
  }, [suppliers, activeSupplierId]);

  useEffect(() => {
    setPurchasePage(1);
    setPaymentPage(1);
  }, [activeSupplierId]);

  useEffect(() => {
    if (supplierPage > supplierTotalPages) {
      setSupplierPage(supplierTotalPages);
    }
  }, [supplierPage, supplierTotalPages]);

  useEffect(() => {
    if (purchasePage > purchaseTotalPages) {
      setPurchasePage(purchaseTotalPages);
    }
  }, [purchasePage, purchaseTotalPages]);

  useEffect(() => {
    if (paymentPage > paymentTotalPages) {
      setPaymentPage(paymentTotalPages);
    }
  }, [paymentPage, paymentTotalPages]);

  // Reset default dates on modal open
  useEffect(() => {
    if (isAddPurchaseOpen) {
      setPurchaseForm((p) => ({ ...p, date: getNowLocalDateTime() }));
    }
  }, [isAddPurchaseOpen]);
  useEffect(() => {
    if (isAddPaymentOpen) {
      setPaymentForm((p) => ({ ...p, date: getNowLocalDateTime() }));
    }
  }, [isAddPaymentOpen]);
  useEffect(() => {
    if (isOpeningBalanceOpen) {
      setOpeningBalanceForm((p) => ({ ...p, date: getNowLocalDateTime() }));
    }
  }, [isOpeningBalanceOpen]);

  // ==================== LINE ITEM HELPERS ====================

  const updateLineItem = (
    idx: number,
    field: string,
    value: string | number
  ) => {
    setPurchaseForm((prev) => {
      const items = [...prev.lineItems];
      const item = { ...items[idx], [field]: value };

      // Recalculate total when qty or price change
      if (field === "quantity" || field === "unitPrice") {
        item.totalAmount =
          Number(item.quantity || 0) * Number(item.unitPrice || 0);
      }
      // Recalculate freeQuantity from freeValue (percent mode)
      if (
        (field === "freeValue" || field === "quantity") &&
        item.freeMode === "percent"
      ) {
        const pct = parseFloat(String(item.freeValue) || "0");
        item.freeQuantity = Math.floor(Number(item.quantity || 0) * pct / 100);
      }
      if (field === "freeValue" && item.freeMode === "count") {
        item.freeQuantity = parseFloat(String(value) || "0") || 0;
      }

      items[idx] = item as any;
      return { ...prev, lineItems: items };
    });
  };

  const toggleFreeMode = (idx: number) => {
    setPurchaseForm((prev) => {
      const items = [...prev.lineItems];
      const item = { ...items[idx] };
      item.freeMode = item.freeMode === "count" ? "percent" : "count";
      item.freeValue = "";
      item.freeQuantity = 0;
      items[idx] = item as any;
      return { ...prev, lineItems: items };
    });
  };

  const addLineItem = () => {
    setPurchaseForm((prev) => ({
      ...prev,
      lineItems: [...prev.lineItems, emptyLineItem(prev.category)],
    }));
  };

  const removeLineItem = (idx: number) => {
    setPurchaseForm((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== idx),
    }));
  };

  const changePurchaseCategory = (cat: HatcheryPurchaseCategory) => {
    setPurchaseForm((prev) => ({
      ...prev,
      category: cat,
      lineItems: prev.lineItems.map((li) => ({
        ...li,
        unit: DEFAULT_UNITS[cat],
      })),
    }));
  };

  const purchaseTotalAmount = purchaseForm.lineItems.reduce(
    (s, li) => s + Number(li.totalAmount || 0),
    0
  );

  // ==================== SUBMIT HANDLERS ====================

  const openAddSupplier = () => {
    setSupplierModalMode("add");
    setSupplierForm({ name: "", contact: "", address: "" });
    setIsAddSupplierOpen(true);
  };

  const openEditSupplier = () => {
    if (!activeSupplier) return;
    setSupplierModalMode("edit");
    setSupplierForm({
      name: activeSupplier.name ?? "",
      contact: activeSupplier.contact ?? "",
      address: activeSupplier.address ?? "",
    });
    setIsAddSupplierOpen(true);
  };

  const handleSaveSupplier = async () => {
    if (supplierModalMode === "add") return handleCreateSupplier();
    if (!supplierForm.name.trim()) {
      toast.error("Supplier name is required");
      return;
    }
    try {
      await updateSupplier.mutateAsync({
        id: activeSupplierId,
        data: {
          name: supplierForm.name.trim(),
          contact: supplierForm.contact.trim(),
          address: supplierForm.address.trim(),
        },
      });
      toast.success("Supplier saved");
      setIsAddSupplierOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save supplier");
    }
  };

  const handleCreateSupplier = async () => {
    if (!supplierForm.name.trim()) {
      toast.error("Supplier name is required");
      return;
    }
    try {
      await createSupplier.mutateAsync({
        name: supplierForm.name.trim(),
        contact: supplierForm.contact.trim() || undefined,
        address: supplierForm.address.trim() || undefined,
      });
      toast.success("Supplier created");
      setIsAddSupplierOpen(false);
      setSupplierForm({ name: "", contact: "", address: "" });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to create supplier");
    }
  };

  const handleSetOpeningBalance = async () => {
    if (!openingBalanceForm.amount) {
      toast.error("Amount is required");
      return;
    }
    try {
      await setOpeningBalance.mutateAsync({
        supplierId: activeSupplierId,
        amount: Number(openingBalanceForm.amount),
        date: openingBalanceForm.date,
      });
      toast.success("Opening balance set");
      setIsOpeningBalanceOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to set opening balance");
    }
  };

  const handleAddPurchase = async () => {
    if (isPurchaseBillUploading) {
      toast.error("Please wait for the bill image to finish uploading");
      return;
    }
    if (!purchaseForm.date) { toast.error("Date is required"); return; }
    for (const li of purchaseForm.lineItems) {
      const qty = Number(li.quantity);
      const free = Number(li.freeQuantity || 0);
      if (!li.itemName.trim()) { toast.error("Item name is required for all line items"); return; }
      if (!Number.isFinite(qty) || qty < 0) { toast.error("Quantity cannot be negative"); return; }
      if (Number(li.unitPrice) < 0) { toast.error("Unit price cannot be negative"); return; }
      if (Number(li.totalAmount) < 0) { toast.error("Total amount cannot be negative"); return; }
      // Quantity may be 0 on a free-only chick line, but something must arrive.
      if (qty + free <= 0) { toast.error("Each item needs a quantity or a free quantity"); return; }
      if (purchaseForm.category === "CHICKS" && li.sex !== "MALE" && li.sex !== "FEMALE") {
        toast.error("Choose male or female for each chick item");
        return;
      }
    }
    try {
      await addPurchase.mutateAsync({
        supplierId: activeSupplierId,
        category: purchaseForm.category,
        items: purchaseForm.lineItems.map((li) => ({
          itemName: li.itemName.trim(),
          quantity: Number(li.quantity),
          freeQuantity: Number(li.freeQuantity || 0),
          unit: li.unit,
          unitPrice: Number(li.unitPrice),
          totalAmount: Number(li.totalAmount),
          sex: purchaseForm.category === "CHICKS" ? li.sex : undefined,
        })),
        date: purchaseForm.date,
        note: purchaseForm.note || undefined,
        receiptImageUrl:
          isPurchaseBillEnabled && purchaseForm.receiptImageUrl
            ? purchaseForm.receiptImageUrl
            : undefined,
      });
      toast.success("Purchase recorded and inventory updated");
      setIsAddPurchaseOpen(false);
      setPurchaseForm({
        category: "FEED",
        date: "",
        note: "",
        receiptImageUrl: "",
        lineItems: [emptyLineItem("FEED")],
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to record purchase");
    }
  };

  const closePurchaseModal = () => {
    if (isPurchaseBillUploading) return;
    setIsAddPurchaseOpen(false);
    setPurchaseForm((current) => ({ ...current, receiptImageUrl: "" }));
  };

  const handleAddPayment = async () => {
    if (!paymentForm.amount || Number(paymentForm.amount) <= 0) {
      toast.error("Payment amount must be > 0");
      return;
    }
    if (!paymentForm.date) { toast.error("Date is required"); return; }
    try {
      await addPayment.mutateAsync({
        supplierId: activeSupplierId,
        amount: Number(paymentForm.amount),
        date: paymentForm.date,
        note: paymentForm.note || undefined,
        reference: paymentForm.reference || undefined,
        receiptImageUrl: paymentForm.receiptImageUrl || undefined,
      });
      toast.success("Payment recorded");
      setIsAddPaymentOpen(false);
      setPaymentForm({ amount: "", date: "", note: "", reference: "", receiptImageUrl: "" });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to record payment");
    }
  };

  const handleDeleteTxn = async () => {
    if (!deleteTxnPassword) { toast.error("Password required"); return; }
    if (!txnToDelete) return;
    try {
      await deleteTxn.mutateAsync({
        supplierId: activeSupplierId,
        txnId: txnToDelete,
        password: deleteTxnPassword,
      });
      toast.success("Transaction deleted");
      setIsDeleteTxnOpen(false);
      setTxnToDelete(null);
      setDeleteTxnPassword("");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete transaction");
    }
  };

  const handleDeleteSupplier = async () => {
    try {
      await deleteSupplier.mutateAsync(activeSupplierId);
      toast.success("Supplier deleted");
      setIsDeleteSupplierOpen(false);
      setActiveSupplierId("");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete supplier");
    }
  };

  // ==================== TABLE COLUMNS ====================

  const askDeleteTxn = (id: string) => {
    setTxnToDelete(id);
    setIsDeleteTxnOpen(true);
  };

  const purchaseColumns: Column<any>[] = [
    { key: "date", label: "Date", width: "100px", render: (value) => <DateDisplay date={value} /> },
    {
      key: "amount",
      label: "Amount",
      align: "right",
      width: "110px",
      render: (value) => <span className="font-semibold">{fmtNPR(value)}</span>,
    },
    { key: "type", label: "Type", width: "110px", render: (_v, row) => <TxnTypeBadge txn={row} /> },
    {
      key: "items",
      label: "Details",
      render: (_v, row) => {
        // The badge already says "Opening balance"; don't repeat it as a note.
        const note = row.type === "OPENING_BALANCE" && /^opening balance$/i.test(String(row.note ?? "").trim()) ? "" : row.note;
        const items = itemsSummary(row);
        return (
          <div className="min-w-[180px] max-w-[260px] whitespace-normal">
            {items !== "—" && <p className="text-sm">{items}</p>}
            {note ? (
              <p className="truncate text-xs text-muted-foreground" title={note}>{note}</p>
            ) : items === "—" ? (
              <span className="text-muted-foreground">—</span>
            ) : null}
          </div>
        );
      },
    },
    ...(isPurchaseBillEnabled
      ? [{
          key: "receiptImageUrl",
          label: "Bill",
          width: "70px",
          render: (value: any, row: any) =>
            row.type === "PURCHASE" && value ? <FileLink href={value} /> : <span className="text-muted-foreground">—</span>,
        } as Column<any>]
      : []),
    {
      key: "actions",
      label: "",
      align: "right",
      width: "80px",
      render: (_v, row) => (
        <div className="flex justify-end gap-1">
          {row.type === "PURCHASE" &&
            iconButton("View purchase", () => setPurchaseDetails(row), <Eye className="h-4 w-4" />)}
          {/* The opening balance is changed from More → Opening balance, not deleted here. */}
          {row.type !== "OPENING_BALANCE" &&
            iconButton("Delete", () => askDeleteTxn(row.id), <Trash2 className="h-4 w-4" />, true)}
        </div>
      ),
    },
  ];

  const paymentColumns: Column<any>[] = [
    { key: "date", label: "Date", width: "100px", render: (value) => <DateDisplay date={value} /> },
    {
      key: "amount",
      label: "Amount",
      align: "right",
      width: "120px",
      render: (value) => <span className="font-semibold text-green-700">{fmtNPR(value)}</span>,
    },
    {
      key: "reference",
      label: "Reference",
      render: (value) => (value ? value : <span className="text-muted-foreground">—</span>),
    },
    {
      key: "note",
      label: "Note",
      render: (value) =>
        value ? (
          <span className="block max-w-[220px] truncate text-muted-foreground" title={value}>{value}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "receiptImageUrl",
      label: "Receipt",
      width: "80px",
      render: (value) => (value ? <FileLink href={value} /> : <span className="text-muted-foreground">—</span>),
    },
    {
      key: "actions",
      label: "",
      align: "right",
      width: "50px",
      render: (_v, row) => (
        <div className="flex justify-end">
          {iconButton("Delete", () => askDeleteTxn(row.id), <Trash2 className="h-4 w-4" />, true)}
        </div>
      ),
    },
  ];

  const activeBalance = supplierBalanceView(activeSupplier?.balance);
  const purchaseCount = Number(purchasePagination?.total ?? 0);
  const paymentCount = Number(paymentPagination?.total ?? 0);

  // ==================== RENDER ====================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Truck className="h-6 w-6 shrink-0 text-primary" />
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">Supplier Ledger</h1>
            <p className="text-sm text-muted-foreground">
              Buy from suppliers and track what you owe
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <BusinessDownloadDialog title="suppliers" fileName="hatchery-suppliers" getData={downloadSuppliers} hasDateFilter={false} />
          <Button onClick={openAddSupplier}>
            <Plus className="mr-2 h-4 w-4" />
            Add Supplier
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <SummaryCard
          className="col-span-2 lg:col-span-1"
          label="You owe suppliers"
          value={fmtWholeRupees(stats.outstandingAmount)}
          valueClassName={Number(stats.outstandingAmount || 0) > 0 ? "text-red-600" : "text-foreground"}
          icon={Wallet}
        />
        <SummaryCard label="Bought this month" value={fmtWholeRupees(stats.thisMonthAmount)} icon={ShoppingCart} />
        <SummaryCard label="Suppliers" value={String(stats.totalSuppliers ?? 0)} icon={Users} />
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Supplier list */}
        <Card className="lg:col-span-1">
          <CardHeader className="space-y-3">
            <CardTitle className="text-base">Suppliers</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name or phone"
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {suppliersLoading ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                Loading...
              </div>
            ) : suppliers.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                {debouncedSearch ? (
                  "No supplier found."
                ) : (
                  <>
                    No suppliers yet.{" "}
                    <button
                      className="text-primary underline"
                      onClick={openAddSupplier}
                    >
                      Add one
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="divide-y">
                {suppliers.map((sup: any) => {
                  const balance = supplierBalanceView(sup.balance);
                  return (
                    <button
                      key={sup.id}
                      className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${
                        activeSupplierId === sup.id ? "bg-primary/5 border-l-4 border-primary" : ""
                      }`}
                      onClick={() => selectSupplier(sup.id)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-sm">{sup.name}</p>
                          {sup.contact && (
                            <p className="text-xs text-muted-foreground">
                              {sup.contact}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className={`text-sm font-semibold ${balance.className}`}>
                            {balance.amount}
                          </p>
                          <p className="text-xs text-muted-foreground">{balance.label}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
          <LedgerPagination
            page={supplierPage}
            totalPages={supplierTotalPages}
            totalRows={Number(suppliersPagination?.total ?? suppliers.length)}
            pageLimit={SUPPLIER_PAGE_LIMIT}
            onPageChange={setSupplierPage}
            loading={suppliersLoading}
            className="pb-2"
          />
        </Card>

        {/* Supplier detail */}
        <Card ref={detailRef} className="scroll-mt-4 lg:col-span-2">
          {!activeSupplierId ? (
            <CardContent className="pt-8 text-center text-muted-foreground">
              Select a supplier to view details
            </CardContent>
          ) : (
            <>
              <CardHeader className="space-y-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <CardTitle className="text-lg">{activeSupplier?.name}</CardTitle>
                    <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                      {activeSupplier?.contact && (
                        <a
                          href={`tel:${activeSupplier.contact}`}
                          className="inline-flex items-center gap-1 hover:text-foreground"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          {activeSupplier.contact}
                        </a>
                      )}
                      {activeSupplier?.address && <p>{activeSupplier.address}</p>}
                    </div>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-xs text-muted-foreground">{activeBalance.label}</p>
                    <p className={`text-2xl font-bold ${activeBalance.className}`}>{activeBalance.amount}</p>
                    <p className="text-xs text-muted-foreground">
                      Opening: {fmtNPR(activeSupplier?.openingBalance)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={() => setIsAddPurchaseOpen(true)} className="flex-1 sm:flex-none">
                    <Plus className="mr-1 h-4 w-4" />
                    Purchase
                  </Button>
                  <Button variant="outline" onClick={() => setIsAddPaymentOpen(true)} className="flex-1 sm:flex-none">
                    <Wallet className="mr-1 h-4 w-4" />
                    Pay
                  </Button>
                  {activeSupplier ? (
                    <BusinessDownloadDialog
                      title={`${activeSupplier.name} statement`}
                      fileName={`${activeSupplier.name}-statement`}
                      getData={downloadSupplierStatement}
                      className="h-9"
                    />
                  ) : null}
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <Button variant="outline" size="sm" className="h-9 w-9 p-0" aria-label="More">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 bg-white border shadow-lg">
                      <DropdownMenuItem onClick={openEditSupplier}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setIsOpeningBalanceOpen(true)}>
                        <Wallet className="mr-2 h-4 w-4" />
                        Opening balance
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setIsDeleteSupplierOpen(true)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete supplier
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              {/* Tabs */}
              <CardContent>
                <div className="flex border-b mb-4">
                  {([
                    ["purchases", `Purchases (${purchaseCount})`],
                    ["payments", `Payments (${paymentCount})`],
                  ] as const).map(([tab, label]) => (
                    <button
                      key={tab}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === tab
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => setActiveTab(tab)}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {activeTab === "purchases" && (
                  <div className="space-y-2">
                    <DataTable
                      data={purchaseTxns}
                      columns={purchaseColumns}
                      loading={purchaseLoading}
                      emptyMessage="No purchases yet"
                      getRowKey={(row: any) => row.id}
                      onRowClick={(row: any) => row.type === "PURCHASE" && setPurchaseDetails(row)}
                    />
                    <LedgerPagination
                      page={purchasePage}
                      totalPages={purchaseTotalPages}
                      totalRows={purchaseCount}
                      pageLimit={TRANSACTION_PAGE_LIMIT}
                      onPageChange={setPurchasePage}
                      loading={purchaseLoading}
                      className="pt-2"
                    />
                  </div>
                )}

                {activeTab === "payments" && (
                  <div className="space-y-2">
                    <DataTable
                      data={paymentTxns}
                      columns={paymentColumns}
                      loading={paymentLoading}
                      emptyMessage="No payments yet"
                      getRowKey={(row: any) => row.id}
                    />
                    <LedgerPagination
                      page={paymentPage}
                      totalPages={paymentTotalPages}
                      totalRows={paymentCount}
                      pageLimit={TRANSACTION_PAGE_LIMIT}
                      onPageChange={setPaymentPage}
                      loading={paymentLoading}
                      className="pt-2"
                    />
                  </div>
                )}
              </CardContent>
            </>
          )}
        </Card>
      </div>

      {/* ==================== MODALS ==================== */}

      {/* Add Supplier */}
      <Modal
        isOpen={isAddSupplierOpen}
        onClose={() => setIsAddSupplierOpen(false)}
        title={supplierModalMode === "edit" ? "Edit supplier" : "Add Supplier"}
      >
        <ModalContent>
          <div className="space-y-4">
            <div>
              <Label>Supplier Name *</Label>
              <Input
                placeholder="e.g. Krishna Feeds"
                value={supplierForm.name}
                onChange={(e) =>
                  setSupplierForm((p) => ({ ...p, name: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Contact</Label>
              <Input
                placeholder="Phone number"
                value={supplierForm.contact}
                onChange={(e) =>
                  setSupplierForm((p) => ({ ...p, contact: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Address</Label>
              <Input
                placeholder="Optional"
                value={supplierForm.address}
                onChange={(e) =>
                  setSupplierForm((p) => ({ ...p, address: e.target.value }))
                }
              />
            </div>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsAddSupplierOpen(false)}>
            Cancel
          </Button>
          <Button
           
            onClick={handleSaveSupplier}
            disabled={createSupplier.isPending || updateSupplier.isPending}
          >
            {supplierModalMode === "edit"
              ? updateSupplier.isPending ? "Saving..." : "Save"
              : createSupplier.isPending ? "Creating..." : "Add Supplier"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Purchase details */}
      <Modal
        isOpen={!!purchaseDetails}
        onClose={() => setPurchaseDetails(null)}
        title="Purchase details"
        className="max-w-lg"
      >
        {purchaseDetails && (
          <ModalContent>
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <TxnTypeBadge txn={purchaseDetails} />
                <DateDisplay date={purchaseDetails.date} />
                <span className="text-muted-foreground">· {activeSupplier?.name}</span>
              </div>
              <div className="divide-y rounded-lg border">
                {(purchaseDetails.items ?? []).map((item: any) => (
                  <div key={item.id} className="flex items-start justify-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{item.itemName}</p>
                      <p className="text-xs text-muted-foreground">{purchaseItemLine(item)}</p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold">{fmtNPR(item.totalAmount)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-medium">Purchase total</span>
                <span className="font-bold">{fmtNPR(purchaseDetails.amount)}</span>
              </div>
              {purchaseDetails.note && (
                <p className="text-sm text-muted-foreground">Note: {purchaseDetails.note}</p>
              )}
              {isPurchaseBillEnabled && purchaseDetails.receiptImageUrl && (
                <FileLink href={purchaseDetails.receiptImageUrl} label="View bill" />
              )}
            </div>
          </ModalContent>
        )}
        <ModalFooter>
          <Button variant="outline" onClick={() => setPurchaseDetails(null)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* Opening Balance */}
      <Modal
        isOpen={isOpeningBalanceOpen}
        onClose={() => setIsOpeningBalanceOpen(false)}
        title="Set Opening Balance"
      >
        <ModalContent>
          <p className="text-sm text-muted-foreground mb-4">
            Enter the outstanding balance owed to this supplier at the start.
            Positive = hatchery owes supplier.
          </p>
          <div className="space-y-4">
            <div>
              <Label>Amount (NPR)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={openingBalanceForm.amount}
                onChange={(e) =>
                  setOpeningBalanceForm((p) => ({
                    ...p,
                    amount: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <Label>Date</Label>
              <DateInput
                value={openingBalanceForm.date}
                onChange={(v) =>
                  setOpeningBalanceForm((p) => ({ ...p, date: v }))
                }
              />
            </div>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpeningBalanceOpen(false)}
          >
            Cancel
          </Button>
          <Button
           
            onClick={handleSetOpeningBalance}
            disabled={setOpeningBalance.isPending}
          >
            {setOpeningBalance.isPending ? "Saving..." : "Set Balance"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Add Purchase */}
      <Modal
        isOpen={isAddPurchaseOpen}
        onClose={closePurchaseModal}
        title="Add Purchase Entry"
      >
        <ModalContent>
          <div className="space-y-4">
            {/* Category */}
            <div>
              <Label>Category</Label>
              <Select
                value={purchaseForm.category}
                onValueChange={(v) =>
                  changePurchaseCategory(v as HatcheryPurchaseCategory)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.filter(
                    (cat) => isSelfFeedEnabled || cat !== "RAW_MATERIAL"
                  ).map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div>
              <Label>Date</Label>
              <DateInput
                value={purchaseForm.date}
                onChange={(v) =>
                  setPurchaseForm((p) => ({ ...p, date: v }))
                }
              />
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Items</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addLineItem}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Item
                </Button>
              </div>
              <div className="space-y-3">
                {purchaseForm.lineItems.map((li, idx) => (
                  <div key={idx} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        Item {idx + 1}
                      </span>
                      {purchaseForm.lineItems.length > 1 && (
                        <button
                          onClick={() => removeLineItem(idx)}
                          className="text-red-400 hover:text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <Input
                      placeholder={
                        purchaseForm.category === "RAW_MATERIAL"
                          ? "Raw material name *"
                          : "Item name *"
                      }
                      value={li.itemName}
                      onChange={(e) =>
                        updateLineItem(idx, "itemName", e.target.value)
                      }
                    />

                    {/* Sex applies to chicks only. Male and female are tracked as
                        separate inventory lots, so this picks which lot the
                        birds land in. */}
                    {purchaseForm.category === "CHICKS" && (
                      <div>
                        <Label className="text-xs">Sex *</Label>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          {(["FEMALE", "MALE"] as const).map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => updateLineItem(idx, "sex", option)}
                              className={
                                "rounded-md border px-3 py-2 text-sm font-medium transition-colors " +
                                (li.sex === option
                                  ? option === "FEMALE"
                                    ? "border-pink-400 bg-pink-50 text-pink-800"
                                    : "border-sky-400 bg-sky-50 text-sky-800"
                                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50")
                              }
                            >
                              {option === "FEMALE" ? "Female" : "Male"}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs">Qty</Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={li.quantity || ""}
                          onChange={(e) =>
                            updateLineItem(idx, "quantity", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Unit Price</Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0.00"
                          value={li.unitPrice || ""}
                          onChange={(e) =>
                            updateLineItem(idx, "unitPrice", e.target.value)
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Unit</Label>
                        <Input
                          placeholder="kg"
                          value={li.unit}
                          onChange={(e) =>
                            updateLineItem(idx, "unit", e.target.value)
                          }
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total:</span>
                      <span className="font-semibold">
                        {fmtNPR(li.totalAmount)}
                      </span>
                    </div>

                    {/* Free chicks row (only for CHICKS category) */}
                    {purchaseForm.category === "CHICKS" && (
                      <div className="bg-yellow-50 rounded p-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-yellow-700">
                            Free Chicks
                          </Label>
                          <button
                            className="text-xs text-yellow-600 underline"
                            onClick={() => toggleFreeMode(idx)}
                          >
                            Switch to{" "}
                            {li.freeMode === "count" ? "percent" : "count"}
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="0"
                            placeholder={
                              li.freeMode === "count" ? "0 birds" : "0 %"
                            }
                            value={li.freeValue}
                            className="h-7 text-sm"
                            onChange={(e) =>
                              updateLineItem(idx, "freeValue", e.target.value)
                            }
                          />
                          <span className="text-xs text-yellow-700">
                            {li.freeMode === "percent" ? "%" : "birds"}
                            {(li.freeQuantity ?? 0) > 0 &&
                              ` = ${li.freeQuantity ?? 0} birds`}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="flex justify-between border-t pt-2">
              <span className="font-medium">Purchase Total</span>
              <span className="font-bold text-primary">
                {fmtNPR(purchaseTotalAmount)}
              </span>
            </div>

            {/* Note */}
            <div>
              <Label>Note (optional)</Label>
              <Input
                placeholder="Any remark..."
                value={purchaseForm.note}
                onChange={(e) =>
                  setPurchaseForm((p) => ({ ...p, note: e.target.value }))
                }
              />
            </div>

            {isPurchaseBillEnabled && (
              <div>
                <Label>Bill Image (optional)</Label>
                <ImageUpload
                  value={purchaseForm.receiptImageUrl}
                  folder="poultry360/purchase-bills"
                  onChange={(url) =>
                    setPurchaseForm((current) => ({
                      ...current,
                      receiptImageUrl: url ?? "",
                    }))
                  }
                  onUploadingChange={setIsPurchaseBillUploading}
                  placeholder="Upload purchase bill"
                />
              </div>
            )}
          </div>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={closePurchaseModal}
            disabled={isPurchaseBillUploading}
          >
            Cancel
          </Button>
          <Button
           
            onClick={handleAddPurchase}
            disabled={addPurchase.isPending || isPurchaseBillUploading}
          >
            {isPurchaseBillUploading
              ? "Uploading bill..."
              : addPurchase.isPending
                ? "Saving..."
                : "Record Purchase"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Add Payment */}
      <Modal
        isOpen={isAddPaymentOpen}
        onClose={() => setIsAddPaymentOpen(false)}
        title="Record Payment"
      >
        <ModalContent>
          <div className="space-y-4">
            <div>
              <Label>Amount (NPR) *</Label>
              <Input
                type="number"
                min="0"
                placeholder="0.00"
                value={paymentForm.amount}
                onChange={(e) =>
                  setPaymentForm((p) => ({ ...p, amount: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Date *</Label>
              <DateInput
                value={paymentForm.date}
                onChange={(v) =>
                  setPaymentForm((p) => ({ ...p, date: v }))
                }
              />
            </div>
            <div>
              <Label>Reference / Cheque No.</Label>
              <Input
                placeholder="Optional"
                value={paymentForm.reference}
                onChange={(e) =>
                  setPaymentForm((p) => ({ ...p, reference: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Note</Label>
              <Input
                placeholder="Optional"
                value={paymentForm.note}
                onChange={(e) =>
                  setPaymentForm((p) => ({ ...p, note: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Receipt Image</Label>
              <ImageUpload
                value={paymentForm.receiptImageUrl}
                onChange={(url) =>
                  setPaymentForm((p) => ({ ...p, receiptImageUrl: url ?? "" }))
                }
              />
            </div>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setIsAddPaymentOpen(false)}
          >
            Cancel
          </Button>
          <Button
           
            onClick={handleAddPayment}
            disabled={addPayment.isPending}
          >
            {addPayment.isPending ? "Saving..." : "Record Payment"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Transaction */}
      <Modal
        isOpen={isDeleteTxnOpen}
        onClose={() => {
          setIsDeleteTxnOpen(false);
          setTxnToDelete(null);
          setDeleteTxnPassword("");
        }}
        title="Delete Transaction"
      >
        <ModalContent>
          <p className="text-sm text-muted-foreground mb-4">
            This will permanently delete the transaction. Enter your password to
            confirm.
          </p>
          <div>
            <Label>Password</Label>
            <Input
              type="password"
              placeholder="Enter your password"
              value={deleteTxnPassword}
              onChange={(e) => setDeleteTxnPassword(e.target.value)}
            />
          </div>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => {
              setIsDeleteTxnOpen(false);
              setTxnToDelete(null);
              setDeleteTxnPassword("");
            }}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteTxn}
            disabled={deleteTxn.isPending}
          >
            {deleteTxn.isPending ? "Deleting..." : "Delete"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Supplier */}
      <Modal
        isOpen={isDeleteSupplierOpen}
        onClose={() => setIsDeleteSupplierOpen(false)}
        title="Delete Supplier"
      >
        <ModalContent>
          <p className="text-sm text-muted-foreground">
            This will permanently delete{" "}
            <strong>{activeSupplier?.name}</strong>. All transactions must be
            removed first.
          </p>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setIsDeleteSupplierOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteSupplier}
            disabled={deleteSupplier.isPending}
          >
            {deleteSupplier.isPending ? "Deleting..." : "Delete Supplier"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

// ==================== SUB-COMPONENTS ====================

function SummaryCard({
  label,
  value,
  icon: Icon,
  valueClassName = "text-foreground",
  className = "",
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  valueClassName?: string;
  className?: string;
}) {
  return (
    <Card className={`gap-0 py-0 ${className}`}>
      <CardContent className="flex items-center justify-between gap-2 p-3 sm:p-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground sm:text-sm">{label}</p>
          <p className={`truncate text-lg font-bold sm:text-xl ${valueClassName}`}>{value}</p>
        </div>
        <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

/** Small icon button for table rows: grey, red on hover when `danger`. */
function iconButton(label: string, onClick: () => void, icon: React.ReactNode, danger = false) {
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label={label}
      title={label}
      className={`h-8 w-8 p-0 text-muted-foreground ${danger ? "hover:text-red-600" : "hover:text-foreground"}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {icon}
    </Button>
  );
}

function FileLink({ href, label = "View" }: { href: string; label?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-primary underline"
      onClick={(e) => e.stopPropagation()}
    >
      {label}
    </a>
  );
}

function TxnTypeBadge({ txn }: { txn: any }) {
  if (txn.type === "OPENING_BALANCE") {
    return <Badge variant="outline" className="text-xs">Opening balance</Badge>;
  }
  if (txn.type === "ADJUSTMENT") {
    return <Badge className="bg-gray-100 text-gray-700 text-xs">Adjustment</Badge>;
  }
  const category = txn.purchaseCategory as HatcheryPurchaseCategory | undefined;
  if (!category) return null;
  return (
    <Badge className={`text-xs ${CATEGORY_COLORS[category] ?? "bg-gray-100 text-gray-600"}`}>
      {CATEGORY_LABELS[category] ?? category}
    </Badge>
  );
}

const fmtQty = (n: number | string | undefined | null) =>
  Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

/** "Breeder Layer Feed · 3,000 kg × रू 70 +20 free +1 more" */
function itemsSummary(txn: any): string {
  const items: any[] = txn.items ?? [];
  if (txn.type !== "PURCHASE" || items.length === 0) return "—";
  const first = items[0];
  const free = Number(first.freeQuantity ?? 0);
  let text = `${first.itemName} · ${fmtQty(first.quantity)} ${first.unit} × ${fmtNPR(first.unitPrice)}`;
  if (free > 0) text += ` +${fmtQty(free)} free`;
  if (items.length > 1) text += ` +${items.length - 1} more`;
  return text;
}

/** "Female · 600 birds × रू 700 · +20 free" */
function purchaseItemLine(item: any): string {
  const parts: string[] = [];
  if (item.sex === "MALE") parts.push("Male");
  if (item.sex === "FEMALE") parts.push("Female");
  parts.push(`${fmtQty(item.quantity)} ${item.unit} × ${fmtNPR(item.unitPrice)}`);
  if (Number(item.freeQuantity ?? 0) > 0) parts.push(`+${fmtQty(item.freeQuantity)} free`);
  return parts.join(" · ");
}
