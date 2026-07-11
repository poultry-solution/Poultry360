"use client";

import { useState, useEffect } from "react";
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
  DollarSign,
  TrendingUp,
  Trash2,
  Eye,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import { DateInput } from "@/common/components/ui/date-input";
import { DateDisplay } from "@/common/components/ui/date-display";
import { ImageUpload } from "@/common/components/ui/image-upload";
import { getNowLocalDateTime } from "@/common/lib/utils";
import {
  useGetHatcherySuppliers,
  useGetHatcherySupplierStatistics,
  useGetHatcherySupplierById,
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

// ==================== HELPERS ====================

const CATEGORIES: HatcheryPurchaseCategory[] = [
  "FEED",
  "MEDICINE",
  "CHICKS",
  "OTHER",
];
const CATEGORY_LABELS: Record<HatcheryPurchaseCategory, string> = {
  FEED: "Feed",
  MEDICINE: "Medicine",
  CHICKS: "Chicks",
  OTHER: "Other",
};
const CATEGORY_COLORS: Record<HatcheryPurchaseCategory, string> = {
  FEED: "bg-amber-100 text-amber-800",
  MEDICINE: "bg-blue-100 text-blue-800",
  CHICKS: "bg-yellow-100 text-yellow-800",
  OTHER: "bg-purple-100 text-purple-800",
};
const DEFAULT_UNITS: Record<HatcheryPurchaseCategory, string> = {
  FEED: "kg",
  MEDICINE: "ml",
  CHICKS: "birds",
  OTHER: "pcs",
};

const fmtNPR = (n: number | string | undefined | null) =>
  `Rs. ${Number(n || 0).toLocaleString("en-NP", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
  freeMode: "count",
  freeValue: "",
});

// ==================== PAGE ====================

export default function HatcherySupplierLedgerPage() {
  const [activeSupplierId, setActiveSupplierId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"purchases" | "payments">(
    "purchases"
  );

  // Modals
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [isAddPurchaseOpen, setIsAddPurchaseOpen] = useState(false);
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [isOpeningBalanceOpen, setIsOpeningBalanceOpen] = useState(false);
  const [isDeleteSupplierOpen, setIsDeleteSupplierOpen] = useState(false);
  const [isDeleteTxnOpen, setIsDeleteTxnOpen] = useState(false);
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

  // Queries
  const { data: suppliersRes, isLoading: suppliersLoading } =
    useGetHatcherySuppliers();
  const { data: statsRes } = useGetHatcherySupplierStatistics();
  const { data: supplierDetailRes, isLoading: detailLoading } =
    useGetHatcherySupplierById(activeSupplierId || null);

  // Mutations
  const createSupplier = useCreateHatcherySupplier();
  const deleteSupplier = useDeleteHatcherySupplier();
  const setOpeningBalance = useSetHatcherySupplierOpeningBalance();
  const addPurchase = useAddHatcherySupplierPurchase();
  const addPayment = useAddHatcherySupplierPayment();
  const deleteTxn = useDeleteHatcherySupplierTransaction();

  const suppliers = suppliersRes?.data || [];
  const stats = statsRes?.data || {};
  const activeSupplier = supplierDetailRes?.data;
  const transactions = activeSupplier?.transactions || [];

  // Auto-select first supplier
  useEffect(() => {
    if (suppliers.length > 0 && !activeSupplierId) {
      setActiveSupplierId(suppliers[0].id);
    }
  }, [suppliers, activeSupplierId]);

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
    if (!purchaseForm.date) { toast.error("Date is required"); return; }
    for (const li of purchaseForm.lineItems) {
      if (!li.itemName.trim()) { toast.error("Item name is required for all line items"); return; }
      if (Number(li.quantity) <= 0) { toast.error("Quantity must be > 0 for all items"); return; }
      if (Number(li.unitPrice) < 0) { toast.error("Unit price cannot be negative"); return; }
      if (Number(li.totalAmount) <= 0) { toast.error("Total amount must be > 0 for all items"); return; }
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
        })),
        date: purchaseForm.date,
        note: purchaseForm.note || undefined,
      });
      toast.success("Purchase recorded and inventory updated");
      setIsAddPurchaseOpen(false);
      setPurchaseForm({ category: "FEED", date: "", note: "", lineItems: [emptyLineItem("FEED")] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to record purchase");
    }
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

  // ==================== RENDER ====================

  const purchaseTxns = transactions.filter((t: any) => t.type === "PURCHASE" || t.type === "OPENING_BALANCE" || t.type === "ADJUSTMENT");
  const paymentTxns = transactions.filter((t: any) => t.type === "PAYMENT");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Truck className="w-6 h-6 text-orange-500" />
          <div>
            <h1 className="text-2xl font-bold">Supplier Ledger</h1>
            <p className="text-sm text-muted-foreground">
              Manage your feed, medicine, chick and equipment suppliers
            </p>
          </div>
        </div>
        <Button
          onClick={() => setIsAddSupplierOpen(true)}
          className="bg-orange-500 hover:bg-orange-600"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Supplier
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Suppliers</p>
                <p className="text-2xl font-bold">{stats.totalSuppliers ?? 0}</p>
              </div>
              <Users className="w-8 h-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Outstanding</p>
                <p className="text-2xl font-bold text-red-600">
                  {fmtNPR(stats.outstandingAmount)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold text-green-600">
                  {fmtNPR(stats.thisMonthAmount)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Supplier list */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Suppliers</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {suppliersLoading ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                Loading...
              </div>
            ) : suppliers.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                No suppliers yet.{" "}
                <button
                  className="text-orange-500 underline"
                  onClick={() => setIsAddSupplierOpen(true)}
                >
                  Add one
                </button>
              </div>
            ) : (
              <div className="divide-y">
                {suppliers.map((sup: any) => (
                  <button
                    key={sup.id}
                    className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${
                      activeSupplierId === sup.id ? "bg-orange-50 border-l-4 border-orange-500" : ""
                    }`}
                    onClick={() => setActiveSupplierId(sup.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{sup.name}</p>
                        {sup.contact && (
                          <p className="text-xs text-muted-foreground">
                            {sup.contact}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-sm font-semibold ${
                            Number(sup.balance) > 0
                              ? "text-red-600"
                              : "text-green-600"
                          }`}
                        >
                          {fmtNPR(sup.balance)}
                        </p>
                        <p className="text-xs text-muted-foreground">balance</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Supplier detail */}
        <Card className="lg:col-span-2">
          {!activeSupplierId ? (
            <CardContent className="pt-8 text-center text-muted-foreground">
              Select a supplier to view details
            </CardContent>
          ) : detailLoading ? (
            <CardContent className="pt-8 text-center text-muted-foreground">
              Loading...
            </CardContent>
          ) : (
            <>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <CardTitle>{activeSupplier?.name}</CardTitle>
                    {activeSupplier?.contact && (
                      <CardDescription>{activeSupplier.contact}</CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsOpeningBalanceOpen(true)}
                    >
                      Opening Balance
                    </Button>
                    <Button
                      onClick={() => setIsAddPurchaseOpen(true)}
                      size="sm"
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Purchase
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAddPaymentOpen(true)}
                    >
                      <DollarSign className="w-4 h-4 mr-1" />
                      Payment
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => setIsDeleteSupplierOpen(true)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Balance summary row */}
                <div className="flex items-center gap-6 mt-2 text-sm">
                  <span className="text-muted-foreground">
                    Opening:{" "}
                    <span className="font-semibold text-foreground">
                      {fmtNPR(activeSupplier?.openingBalance)}
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    Current Balance:{" "}
                    <span
                      className={`font-semibold ${
                        Number(activeSupplier?.balance) > 0
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {fmtNPR(activeSupplier?.balance)}
                    </span>
                  </span>
                </div>
              </CardHeader>

              {/* Tabs */}
              <CardContent>
                <div className="flex border-b mb-4">
                  {(["purchases", "payments"] as const).map((tab) => (
                    <button
                      key={tab}
                      className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
                        activeTab === tab
                          ? "border-orange-500 text-orange-600"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {activeTab === "purchases" && (
                  <div className="space-y-2">
                    {purchaseTxns.length === 0 ? (
                      <p className="text-center text-muted-foreground text-sm py-4">
                        No purchase entries yet
                      </p>
                    ) : (
                      purchaseTxns.map((txn: any) => (
                        <PurchaseRow
                          key={txn.id}
                          txn={txn}
                          onDelete={(id) => {
                            setTxnToDelete(id);
                            setIsDeleteTxnOpen(true);
                          }}
                        />
                      ))
                    )}
                  </div>
                )}

                {activeTab === "payments" && (
                  <div className="space-y-2">
                    {paymentTxns.length === 0 ? (
                      <p className="text-center text-muted-foreground text-sm py-4">
                        No payment entries yet
                      </p>
                    ) : (
                      paymentTxns.map((txn: any) => (
                        <PaymentRow
                          key={txn.id}
                          txn={txn}
                          onDelete={(id) => {
                            setTxnToDelete(id);
                            setIsDeleteTxnOpen(true);
                          }}
                        />
                      ))
                    )}
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
        title="Add Supplier"
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
            className="bg-orange-500 hover:bg-orange-600"
            onClick={handleCreateSupplier}
            disabled={createSupplier.isPending}
          >
            {createSupplier.isPending ? "Creating..." : "Add Supplier"}
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
            className="bg-orange-500 hover:bg-orange-600"
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
        onClose={() => setIsAddPurchaseOpen(false)}
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
                  {CATEGORIES.map((cat) => (
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
                      placeholder="Item name *"
                      value={li.itemName}
                      onChange={(e) =>
                        updateLineItem(idx, "itemName", e.target.value)
                      }
                    />

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
              <span className="font-bold text-orange-600">
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
          </div>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setIsAddPurchaseOpen(false)}
          >
            Cancel
          </Button>
          <Button
            className="bg-orange-500 hover:bg-orange-600"
            onClick={handleAddPurchase}
            disabled={addPurchase.isPending}
          >
            {addPurchase.isPending ? "Saving..." : "Record Purchase"}
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
            className="bg-orange-500 hover:bg-orange-600"
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

function PurchaseRow({
  txn,
  onDelete,
}: {
  txn: any;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isOpeningBalance = txn.type === "OPENING_BALANCE";

  return (
    <div className="border rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {isOpeningBalance ? (
                <Badge variant="outline" className="text-xs">
                  Opening Balance
                </Badge>
              ) : txn.purchaseCategory ? (
                <Badge
                  className={`text-xs ${
                    CATEGORY_COLORS[
                      txn.purchaseCategory as HatcheryPurchaseCategory
                    ] ?? "bg-gray-100 text-gray-600"
                  }`}
                >
                  {
                    CATEGORY_LABELS[
                      txn.purchaseCategory as HatcheryPurchaseCategory
                    ] ?? txn.purchaseCategory
                  }
                </Badge>
              ) : null}
              <span className="text-sm font-semibold text-foreground">
                {fmtNPR(txn.amount)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              <DateDisplay date={txn.date} />
              {txn.note && ` · ${txn.note}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {txn.items && txn.items.length > 0 && (
            <button
              className="p-1 text-muted-foreground hover:text-foreground"
              onClick={() => setExpanded((x) => !x)}
            >
              {expanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          )}
          <button
            className="p-1 text-red-400 hover:text-red-600"
            onClick={() => onDelete(txn.id)}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Line items */}
      {expanded && txn.items && txn.items.length > 0 && (
        <div className="mt-2 border-t pt-2 space-y-1">
          {txn.items.map((item: any) => (
            <div
              key={item.id}
              className="flex items-center justify-between text-xs text-muted-foreground"
            >
              <span>
                {item.itemName} — {Number(item.quantity)} {item.unit}
                {Number(item.freeQuantity ?? 0) > 0 &&
                  ` + ${Number(item.freeQuantity ?? 0)} free`}{" "}
                @ {fmtNPR(item.unitPrice)}
              </span>
              <span>{fmtNPR(item.totalAmount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PaymentRow({
  txn,
  onDelete,
}: {
  txn: any;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="border rounded-lg p-3 flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2">
          <Badge className="bg-green-100 text-green-800 text-xs">Payment</Badge>
          <span className="text-sm font-semibold text-green-600">
            {fmtNPR(txn.amount)}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          <DateDisplay date={txn.date} />
          {txn.reference && ` · Ref: ${txn.reference}`}
          {txn.note && ` · ${txn.note}`}
        </p>
        {txn.receiptImageUrl && (
          <a
            href={txn.receiptImageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-500 underline"
          >
            View receipt
          </a>
        )}
      </div>
      <button
        className="p-1 text-red-400 hover:text-red-600"
        onClick={() => onDelete(txn.id)}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
