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
  Link2,
  DollarSign,
  FileCheck,
  ShoppingCart,
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
import { useCreateFarmerPaymentRequest } from "@/fetchers/farmer/farmerPaymentRequestQueries";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/common/components/ui/tabs";

const PURCHASE_CATEGORIES = [
  { value: "FEED", label: "Feed" },
  { value: "MEDICINE", label: "Medicine" },
  { value: "CHICKS", label: "Chicks" },
  { value: "EQUIPMENT", label: "Equipment" },
  { value: "OTHER", label: "Other" },
];

function getCategoryBadgeColor(category: string | null | undefined) {
  switch (category) {
    case "FEED":
      return "bg-amber-100 text-amber-800";
    case "MEDICINE":
      return "bg-blue-100 text-blue-800";
    case "CHICKS":
      return "bg-yellow-100 text-yellow-800";
    case "EQUIPMENT":
      return "bg-gray-100 text-gray-800";
    case "OTHER":
      return "bg-purple-100 text-purple-800";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

export default function SupplierLedgerPage() {
  const router = useRouter();
  const [activeSupplierId, setActiveSupplierId] = useState<string>("");
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPaymentRequestOpen, setIsPaymentRequestOpen] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ password: "" });
  const [isDeleteSupplierOpen, setIsDeleteSupplierOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"purchases" | "payments">("purchases");

  const [newSupplier, setNewSupplier] = useState({
    name: "",
    contact: "",
    address: "",
  });
  const [newEntry, setNewEntry] = useState({
    category: "FEED",
    item: "",
    rate: "",
    quantity: "",
    paid: "",
    date: "",
    description: "",
  });
  // Free chicks state (only relevant when category is CHICKS)
  const [freeMode, setFreeMode] = useState<"count" | "percent">("count");
  const [freeValue, setFreeValue] = useState<string>("");
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    date: "",
    note: "",
  });
  const [paymentRequestForm, setPaymentRequestForm] = useState({
    amount: "",
    paymentMethod: "",
    paymentReference: "",
    paymentDate: "",
    description: "",
  });

  // API Queries
  const {
    data: dealersResponse,
    isLoading: dealersLoading,
    error: dealersError,
  } = useGetAllDealers();

  const { data: statisticsResponse, isLoading: statisticsLoading } =
    useGetDealerStatistics();

  const {
    data: activeSupplierResponse,
    isLoading: activeSupplierLoading,
  } = useGetDealerById(activeSupplierId, {
    enabled: !!activeSupplierId && activeSupplierId.trim() !== "",
  });

  // Mutations
  const createDealerMutation = useCreateDealer();
  const addTransactionMutation = useAddDealerTransaction();
  const deleteTxn = useDeleteDealerTransaction();
  const deleteDealerMutation = useDeleteDealer();
  const createPaymentRequestMutation = useCreateFarmerPaymentRequest();
  const queryClient = useQueryClient();

  // Extract data
  const suppliers = dealersResponse?.data || [];
  const statistics = statisticsResponse?.data || {};
  const activeSupplier = activeSupplierResponse?.data;

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

  useEffect(() => {
    if (isPaymentRequestOpen) {
      setPaymentRequestForm((prev) => ({
        ...prev,
        paymentDate: getNowLocalDateTime(),
      }));
    }
  }, [isPaymentRequestOpen]);

  // Purchases columns
  const purchaseColumns: Column[] = [
    createColumn("purchaseCategory", "Category", {
      render: (_, row) => (
        <Badge className={`${getCategoryBadgeColor(row.purchaseCategory)} text-[10px] md:text-xs`}>
          {row.purchaseCategory || "—"}
        </Badge>
      ),
    }),
    createColumn("itemName", "Item"),
    createColumn("quantity", "Qty", {
      type: "number",
      align: "right",
      render: (_, row) => {
        const qty = row.quantity || 0;
        const free = row.freeQuantity || 0;
        return free > 0 ? (
          <span>
            {qty} <span className="text-green-600 text-xs">+{free} free</span>
          </span>
        ) : (
          <span>{qty}</span>
        );
      },
    }),
    createColumn("amount", "Amount", {
      type: "currency",
      align: "right",
    }),
    createColumn("date", "Date", {
      type: "date",
    }),
    createColumn("description", "Note", {
      render: (_, row) => (
        <span className="text-xs text-muted-foreground truncate max-w-[120px] block">
          {row.description || "—"}
        </span>
      ),
    }),
  ];

  // Payments columns
  const paymentColumns: Column[] = [
    createColumn("amount", "Amount", {
      type: "currency",
      align: "right",
    }),
    createColumn("date", "Date", {
      type: "date",
    }),
    createColumn("description", "Note", {
      render: (_, row) => (
        <span className="text-xs text-muted-foreground">
          {row.description || "—"}
        </span>
      ),
    }),
    createColumn("reference", "Reference", {
      render: (_, row) => (
        <span className="text-xs text-muted-foreground">
          {row.reference || "—"}
        </span>
      ),
    }),
  ];

  function toggleAll() {
    const data =
      activeTab === "purchases"
        ? activeSupplier?.purchases
        : activeSupplier?.payments;
    if (!data) return;
    if (selectedIds.size === data.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.map((r: any) => r.id)));
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

    try {
      await Promise.all(
        ids.map(async (entryId) => {
          try {
            await deleteTxn.mutateAsync({
              dealerId: activeSupplierId,
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

  async function handleAddSupplier(e: React.FormEvent) {
    e.preventDefault();
    const name = newSupplier.name.trim();
    const contact = newSupplier.contact.trim();
    if (!name || !contact) return;

    try {
      await createDealerMutation.mutateAsync({
        name,
        contact,
        address: newSupplier.address || undefined,
      });

      toast.success("Supplier created successfully!");
      setIsAddSupplierOpen(false);
      setNewSupplier({ name: "", contact: "", address: "" });
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
    const paid = Number(newEntry.paid);
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
          description:
            newEntry.description || `Purchase of ${newEntry.item}`,
          unitPrice: rate,
          paymentAmount: paid > 0 ? paid : undefined,
          paymentDescription:
            paid > 0
              ? `Initial payment for ${newEntry.item}`
              : undefined,
        },
      });

      toast.success("Purchase entry added!");
      setIsAddEntryOpen(false);
      setNewEntry({
        category: "FEED",
        item: "",
        rate: "",
        quantity: "",
        paid: "",
        date: "",
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
        },
      });

      toast.success("Payment recorded!");
      setIsPaymentModalOpen(false);
      setPaymentForm({ amount: "", date: "", note: "" });
    } catch (error) {
      console.error("Failed to record payment:", error);
    }
  }

  async function handleCreatePaymentRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!paymentRequestForm.amount || !activeSupplierId) return;

    try {
      await createPaymentRequestMutation.mutateAsync({
        dealerId: activeSupplierId,
        amount: Number(paymentRequestForm.amount),
        paymentMethod: paymentRequestForm.paymentMethod || undefined,
        paymentReference: paymentRequestForm.paymentReference || undefined,
        paymentDate: paymentRequestForm.paymentDate || undefined,
        description: paymentRequestForm.description || undefined,
      });

      toast.success("Payment request sent! Dealer will review it.");
      setIsPaymentRequestOpen(false);
      setPaymentRequestForm({
        amount: "",
        paymentMethod: "",
        paymentReference: "",
        paymentDate: "",
        description: "",
      });
    } catch (error) {
      console.error("Failed to create payment request:", error);
    }
  }

  // Determine if active supplier is connected (payment request flow) or manual (direct payment)
  const isConnectedSupplier = activeSupplier?.connectionType === "CONNECTED";

  function handlePayClick() {
    if (isConnectedSupplier) {
      setIsPaymentRequestOpen(true);
    } else {
      setIsPaymentModalOpen(true);
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-bold tracking-tight">
            Supplier Ledger
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Track all supplier purchases and payments in one place
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
            Connected Dealers
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="hover:bg-green-50 hover:text-green-700 border-green-200 text-xs md:text-sm h-9"
            onClick={() => router.push("/farmer/dashboard/sale-requests")}
          >
            <FileCheck className="mr-2 h-4 w-4" />
            Sale Requests
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="hover:bg-green-50 hover:text-green-700 border-green-200 text-xs md:text-sm h-9"
            onClick={() => router.push("/farmer/dashboard/purchase-requests")}
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            Purchase Requests
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="hover:bg-green-50 hover:text-green-700 border-green-200 text-xs md:text-sm h-9"
            onClick={() => router.push("/farmer/dashboard/payment-requests")}
          >
            <DollarSign className="mr-2 h-4 w-4" />
            Payment Requests
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-2 md:gap-4 grid-cols-3">
        <Card
          onClick={() => setIsSummaryOpen(true)}
          className="cursor-pointer transition-colors hover:bg-[#10841E] hover:text-white"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[10px] md:text-sm font-medium">
              Suppliers
            </CardTitle>
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
            <p className="text-[9px] md:text-xs text-muted-foreground hidden sm:block">
              Active suppliers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[10px] md:text-sm font-medium">
              Outstanding
            </CardTitle>
            <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            {statisticsLoading ? (
              <Loader2 className="h-4 w-4 md:h-6 md:w-6 animate-spin" />
            ) : (
              <div className="text-base md:text-2xl font-bold">
                <span className="hidden md:inline">
                  ₹{(statistics.outstandingAmount || 0).toLocaleString()}
                </span>
                <span className="md:hidden">
                  ₹{Math.round(statistics.outstandingAmount || 0).toLocaleString()}
                </span>
              </div>
            )}
            <p className="text-[9px] md:text-xs text-muted-foreground hidden sm:block">
              Amount due to suppliers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[10px] md:text-sm font-medium">
              This Month
            </CardTitle>
            <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            {statisticsLoading ? (
              <Loader2 className="h-4 w-4 md:h-6 md:w-6 animate-spin" />
            ) : (
              <div className="text-base md:text-2xl font-bold">
                <span className="hidden md:inline">
                  ₹{(statistics.thisMonthAmount || 0).toLocaleString()}
                </span>
                <span className="md:hidden">
                  ₹{Math.round(statistics.thisMonthAmount || 0).toLocaleString()}
                </span>
              </div>
            )}
            <p className="text-[9px] md:text-xs text-muted-foreground hidden sm:block">
              Purchases
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Summary Modal */}
      <Modal
        isOpen={isSummaryOpen}
        onClose={() => setIsSummaryOpen(false)}
        title="Supplier Balances"
      >
        <ModalContent>
          <div className="space-y-3">
            {dealersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading...</span>
              </div>
            ) : suppliers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No suppliers found</p>
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
                      Contact: {supplier.contact}
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
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Supplier Confirmation Modal */}
      <Modal
        isOpen={isDeleteSupplierOpen}
        onClose={() => setIsDeleteSupplierOpen(false)}
        title="Delete Supplier"
      >
        <ModalContent>
          <div className="space-y-4">
            {activeSupplier?.connectionType === "CONNECTED" ? (
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  <strong>This is a connected supplier.</strong>
                </p>
                <p className="text-sm text-yellow-700 mt-2">
                  Go to Connected Dealers page to manage this connection.
                </p>
              </div>
            ) : (
              <>
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm text-red-800">
                    <strong>
                      Are you sure you want to delete {activeSupplier?.name}?
                    </strong>
                  </p>
                  {(activeSupplier?.totalTransactions || 0) > 0 && (
                    <p className="text-sm text-red-700 mt-2">
                      This supplier has {activeSupplier?.totalTransactions}{" "}
                      transactions. Delete all transactions first.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setIsDeleteSupplierOpen(false)}
          >
            {activeSupplier?.connectionType === "CONNECTED"
              ? "Close"
              : "Cancel"}
          </Button>
          {activeSupplier?.connectionType !== "CONNECTED" && (
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
                  toast.success("Supplier deleted successfully");
                  setIsDeleteSupplierOpen(false);
                } catch (e) {
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
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          )}
        </ModalFooter>
      </Modal>

      {/* Confirm Delete Entries Modal */}
      <Modal
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        title={`Delete ${selectedIds.size} entries?`}
      >
        <ModalContent>
          <p className="text-sm text-muted-foreground">
            This action cannot be undone. Selected entries will be permanently
            removed.
          </p>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setIsConfirmDeleteOpen(false)}
          >
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
                <strong>
                  You are about to delete {selectedIds.size} entries.
                </strong>
              </p>
            </div>
            <div>
              <Label htmlFor="password">Enter your password to confirm</Label>
              <Input
                id="password"
                type="password"
                value={passwordForm.password}
                onChange={(e) => setPasswordForm({ password: e.target.value })}
                placeholder="Password"
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
              "Confirm"
            )}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Add Supplier Modal */}
      <Modal
        isOpen={isAddSupplierOpen}
        onClose={() => setIsAddSupplierOpen(false)}
        title="Add New Supplier"
      >
        <form onSubmit={handleAddSupplier}>
          <ModalContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="sname">Supplier Name</Label>
                <Input
                  id="sname"
                  value={newSupplier.name}
                  onChange={(e) =>
                    setNewSupplier({ ...newSupplier, name: e.target.value })
                  }
                  placeholder="e.g. Ram Feed Store"
                  required
                />
              </div>
              <div>
                <Label htmlFor="scontact">Contact</Label>
                <Input
                  id="scontact"
                  value={newSupplier.contact}
                  onChange={(e) =>
                    setNewSupplier({ ...newSupplier, contact: e.target.value })
                  }
                  placeholder="Phone number"
                  required
                />
              </div>
              <div>
                <Label htmlFor="saddress">Address (optional)</Label>
                <Input
                  id="saddress"
                  value={newSupplier.address}
                  onChange={(e) =>
                    setNewSupplier({ ...newSupplier, address: e.target.value })
                  }
                  placeholder="Address"
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
                "Add Supplier"
              )}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Add Purchase Entry Modal */}
      <Modal
        isOpen={isAddEntryOpen}
        onClose={() => setIsAddEntryOpen(false)}
        title={`Add Purchase — ${activeSupplier?.name || "Supplier"}`}
      >
        <form onSubmit={handleAddEntry}>
          <ModalContent>
            <div className="space-y-4">
              {/* Category selector */}
              <div>
                <Label>Category</Label>
                <Select
                  value={newEntry.category}
                  onValueChange={(value) => {
                    setNewEntry({ ...newEntry, category: value });
                    // Reset free chicks state when switching away from CHICKS
                    if (value !== "CHICKS") {
                      setFreeMode("count");
                      setFreeValue("");
                    }
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {PURCHASE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Item Name */}
              <div>
                <Label htmlFor="item">Item Name</Label>
                <Input
                  id="item"
                  value={newEntry.item}
                  onChange={(e) =>
                    setNewEntry({ ...newEntry, item: e.target.value })
                  }
                  placeholder={
                    newEntry.category === "FEED"
                      ? "e.g. Broiler Feed, Layer Feed"
                      : newEntry.category === "MEDICINE"
                        ? "e.g. Vitamin Mix, Antibiotics"
                        : newEntry.category === "CHICKS"
                          ? "e.g. Day-old Chicks, Broiler Chicks"
                          : "Item name"
                  }
                  required
                />
              </div>

              {/* Rate + Quantity + Paid (common for all) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="rate">Rate (per unit)</Label>
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
                  <Label htmlFor="paid">Paid Amount</Label>
                  <Input
                    id="paid"
                    type="number"
                    value={newEntry.paid}
                    onChange={(e) =>
                      setNewEntry({ ...newEntry, paid: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Free Chicks - ONLY for CHICKS category */}
              {newEntry.category === "CHICKS" && (
                <div className="space-y-2">
                  <Label>Free Chicks (optional)</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant={freeMode === "count" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFreeMode("count")}
                      className="h-8 px-3"
                    >
                      Count
                    </Button>
                    <Button
                      type="button"
                      variant={freeMode === "percent" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFreeMode("percent")}
                      className="h-8 px-3"
                    >
                      Percent
                    </Button>
                    <Input
                      type="number"
                      placeholder={freeMode === "count" ? "e.g. 50" : "e.g. 5%"}
                      value={freeValue}
                      onChange={(e) => setFreeValue(e.target.value)}
                      className="max-w-[180px]"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Extra chicks given free with the purchase
                  </p>
                </div>
              )}

              {/* Total summary */}
              {Number(newEntry.rate) > 0 && Number(newEntry.quantity) > 0 && (
                <div className="p-3 bg-gray-50 rounded-lg border text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="font-semibold">
                      ₹{(Number(newEntry.rate) * Number(newEntry.quantity)).toLocaleString()}
                    </span>
                  </div>
                  {newEntry.category === "CHICKS" && computeFreeQuantity() > 0 && (
                    <div className="flex justify-between mt-1">
                      <span className="text-muted-foreground">Free:</span>
                      <span className="text-green-600 font-medium">
                        +{computeFreeQuantity()} chicks
                      </span>
                    </div>
                  )}
                  {newEntry.category === "CHICKS" && (
                    <div className="flex justify-between mt-1">
                      <span className="text-muted-foreground">Total delivered:</span>
                      <span className="font-medium">
                        {Number(newEntry.quantity) + computeFreeQuantity()} chicks
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Date */}
              <div>
                <DateInput
                  label="Date"
                  value={newEntry.date}
                  onChange={(value) =>
                    setNewEntry({ ...newEntry, date: value })
                  }
                />
              </div>

              {/* Note */}
              <div>
                <Label htmlFor="description">Note (optional)</Label>
                <Input
                  id="description"
                  value={newEntry.description}
                  onChange={(e) =>
                    setNewEntry({ ...newEntry, description: e.target.value })
                  }
                  placeholder="Additional notes"
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

      {/* Payment Modal (Khata-style) */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Record Payment"
      >
        <form onSubmit={handleAddPayment}>
          <ModalContent>
            <div className="space-y-4">
              {activeSupplier && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>Supplier:</strong> {activeSupplier.name}
                  </p>
                  <p className="text-sm text-blue-800">
                    <strong>Balance Due:</strong> ₹
                    {(activeSupplier.balance || 0).toLocaleString()}
                  </p>
                </div>
              )}
              <div>
                <Label htmlFor="paymentAmount">Amount</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, amount: e.target.value })
                  }
                  placeholder="Payment amount"
                  required
                />
              </div>
              <div>
                <DateInput
                  label="Date"
                  value={paymentForm.date}
                  onChange={(value) =>
                    setPaymentForm({ ...paymentForm, date: value })
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
                  placeholder="e.g. Cash, Bank transfer, Cheque"
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

      {/* Payment Request Modal (for connected dealers) */}
      <Modal
        isOpen={isPaymentRequestOpen}
        onClose={() => setIsPaymentRequestOpen(false)}
        title="Send Payment Request"
      >
        <form onSubmit={handleCreatePaymentRequest}>
          <ModalContent>
            <div className="space-y-4">
              {activeSupplier && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>Supplier:</strong> {activeSupplier.name}
                  </p>
                  <p className="text-sm text-blue-800">
                    <strong>Balance Due:</strong> ₹
                    {(activeSupplier.balance || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    This request will be sent to the dealer for approval.
                  </p>
                </div>
              )}
              <div>
                <Label htmlFor="prAmount">Amount</Label>
                <Input
                  id="prAmount"
                  type="number"
                  value={paymentRequestForm.amount}
                  onChange={(e) =>
                    setPaymentRequestForm({
                      ...paymentRequestForm,
                      amount: e.target.value,
                    })
                  }
                  placeholder="Payment amount"
                  required
                />
              </div>
              <div>
                <Label htmlFor="prMethod">Payment Method</Label>
                <Select
                  value={paymentRequestForm.paymentMethod}
                  onValueChange={(value) =>
                    setPaymentRequestForm({
                      ...paymentRequestForm,
                      paymentMethod: value,
                    })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="prReference">Reference (optional)</Label>
                <Input
                  id="prReference"
                  value={paymentRequestForm.paymentReference}
                  onChange={(e) =>
                    setPaymentRequestForm({
                      ...paymentRequestForm,
                      paymentReference: e.target.value,
                    })
                  }
                  placeholder="e.g. Cheque no., Transaction ID"
                />
              </div>
              <div>
                <DateInput
                  label="Payment Date"
                  value={paymentRequestForm.paymentDate}
                  onChange={(value) =>
                    setPaymentRequestForm({
                      ...paymentRequestForm,
                      paymentDate: value,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="prDescription">Description (optional)</Label>
                <Input
                  id="prDescription"
                  value={paymentRequestForm.description}
                  onChange={(e) =>
                    setPaymentRequestForm({
                      ...paymentRequestForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="e.g. Monthly payment"
                />
              </div>
            </div>
          </ModalContent>
          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPaymentRequestOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-green-600 hover:bg-green-700"
              disabled={createPaymentRequestMutation.isPending}
            >
              {createPaymentRequestMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Request"
              )}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Loading State */}
      {dealersLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading suppliers...</span>
        </div>
      )}

      {/* Error State */}
      {dealersError && (
        <div className="text-center py-8">
          <p className="text-red-600">
            Failed to load suppliers. Please try again.
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
                  className={`text-xs md:text-sm whitespace-nowrap ${
                    activeSupplierId === supplier.id
                      ? "bg-primary hover:bg-primary/90"
                      : ""
                  }`}
                  onClick={() => {
                    setActiveSupplierId(supplier.id);
                    exitDeleteMode();
                  }}
                >
                  <span className="flex items-center gap-1">
                    {supplier.name}
                    {supplier.connectionType === "CONNECTED" && (
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
              <Button
                variant="outline"
                size="sm"
                className="text-xs md:text-sm whitespace-nowrap"
                onClick={() => setIsAddSupplierOpen(true)}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                <span className="hidden sm:inline">Add Supplier</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </div>
          </div>

          {suppliers.length === 0 ? (
            <Card>
              <CardContent className="text-center py-6">
                <Users className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <h3 className="text-base font-semibold mb-2">
                  No suppliers found
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Create your first supplier to start tracking purchases.
                </p>
                <Button
                  size="sm"
                  onClick={() => setIsAddSupplierOpen(true)}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add Supplier
                </Button>
              </CardContent>
            </Card>
          ) : activeSupplierId ? (
            <Card>
              <CardHeader className="p-3 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <CardTitle className="text-base md:text-lg">
                      {activeSupplier?.name || "Select a supplier"}
                    </CardTitle>
                    {activeSupplier && (
                      <CardDescription className="text-[10px] md:text-sm mt-1">
                        Balance: ₹
                        {(activeSupplier.balance || 0).toLocaleString()} |{" "}
                        Purchased: ₹
                        {(
                          activeSupplier.purchases?.reduce(
                            (sum: number, p: any) => sum + p.amount,
                            0
                          ) || 0
                        ).toLocaleString()}{" "}
                        | Paid: ₹
                        {(
                          activeSupplier.payments?.reduce(
                            (sum: number, p: any) => sum + p.amount,
                            0
                          ) || 0
                        ).toLocaleString()}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {activeSupplierId && !isDeleteMode && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50 h-7 text-xs"
                        onClick={() => setIsDeleteSupplierOpen(true)}
                      >
                        <Trash2 className="h-3 w-3 mr-1 sm:mr-0" />
                        <span className="hidden sm:inline sm:ml-1">
                          Delete
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
                          <X className="h-3 w-3 mr-1" /> Cancel
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
                            Details
                          </span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setIsDeleteMode(true)}
                          disabled={!activeSupplierId}
                        >
                          <Trash2 className="h-3 w-3 mr-1 sm:mr-0" />
                          <span className="hidden sm:inline sm:ml-1">
                            Entries
                          </span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs border-green-200 text-green-700 hover:bg-green-50"
                          onClick={handlePayClick}
                          disabled={!activeSupplierId}
                        >
                          <DollarSign className="h-3 w-3 mr-1" />
                          <span className="hidden sm:inline">Pay</span>
                        </Button>
                        {isConnectedSupplier ? (
                          <Button
                            className="bg-primary hover:bg-primary/90 h-7 text-xs"
                            size="sm"
                            onClick={() =>
                              router.push(
                                `/farmer/dashboard/supplier-ledger/${activeSupplierId}/catalog`
                              )
                            }
                            disabled={!activeSupplierId}
                          >
                            <ShoppingCart className="h-3 w-3 mr-1" />
                            <span className="hidden sm:inline">Order</span>
                            <span className="sm:hidden">Order</span>
                          </Button>
                        ) : (
                          <Button
                            className="bg-primary hover:bg-primary/90 h-7 text-xs"
                            size="sm"
                            onClick={() => setIsAddEntryOpen(true)}
                            disabled={!activeSupplierId}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            <span className="hidden sm:inline">Add Entry</span>
                            <span className="sm:hidden">Add</span>
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {activeSupplierLoading ? (
                  <div className="flex items-center justify-center py-6 text-sm">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="ml-2">Loading...</span>
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
                          Purchases ({activeSupplier?.purchases?.length || 0})
                        </TabsTrigger>
                        <TabsTrigger value="payments">
                          Payments ({activeSupplier?.payments?.length || 0})
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    <TabsContent value="purchases" className="overflow-x-auto">
                      <DataTable
                        data={activeSupplier?.purchases || []}
                        columns={purchaseColumns}
                        selectable={isDeleteMode}
                        isAllSelected={
                          !!activeSupplier?.purchases &&
                          selectedIds.size > 0 &&
                          selectedIds.size ===
                            activeSupplier.purchases.length
                        }
                        onToggleAll={toggleAll}
                        isRowSelected={(row: any) => selectedIds.has(row.id)}
                        onToggleRow={toggleOne}
                        getRowKey={(row: any) => row.id}
                        showFooter={
                          (activeSupplier?.purchases?.length || 0) > 0
                        }
                        footerContent={
                          <div className="flex justify-between text-sm px-2">
                            <span className="font-semibold">Total</span>
                            <span className="font-semibold">
                              ₹
                              {(
                                activeSupplier?.purchases?.reduce(
                                  (sum: number, r: any) => sum + r.amount,
                                  0
                                ) || 0
                              ).toLocaleString()}
                            </span>
                          </div>
                        }
                        emptyMessage="No purchases for this supplier"
                      />
                    </TabsContent>

                    <TabsContent value="payments" className="overflow-x-auto">
                      <DataTable
                        data={activeSupplier?.payments || []}
                        columns={paymentColumns}
                        selectable={isDeleteMode}
                        isAllSelected={
                          !!activeSupplier?.payments &&
                          selectedIds.size > 0 &&
                          selectedIds.size ===
                            activeSupplier.payments.length
                        }
                        onToggleAll={toggleAll}
                        isRowSelected={(row: any) => selectedIds.has(row.id)}
                        onToggleRow={toggleOne}
                        getRowKey={(row: any) => row.id}
                        showFooter={
                          (activeSupplier?.payments?.length || 0) > 0
                        }
                        footerContent={
                          <div className="flex justify-between text-sm px-2">
                            <span className="font-semibold">Total Paid</span>
                            <span className="font-semibold text-green-600">
                              ₹
                              {(
                                activeSupplier?.payments?.reduce(
                                  (sum: number, r: any) => sum + r.amount,
                                  0
                                ) || 0
                              ).toLocaleString()}
                            </span>
                          </div>
                        }
                        emptyMessage="No payments for this supplier"
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
                  No supplier selected
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Create a new supplier to get started.
                </p>
                <Button
                  size="sm"
                  onClick={() => setIsAddSupplierOpen(true)}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add Supplier
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
