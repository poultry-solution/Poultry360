"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Wallet,
  TrendingUp,
  TrendingDown,
  Calendar,
  Receipt,
  Loader2,
  Store,
  Edit,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/common/components/ui/tabs";
import { DataTable, Column, createColumn } from "@/common/components/ui/data-table";
import { LedgerPagination } from "@/common/components/ui/ledger-pagination";
import {
  useGetDealerById,
  useGetDealerTransactions,
  useSetDealerOpeningBalance,
} from "@/fetchers/dealers/dealerQueries";
import { toast } from "sonner";

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

const LEDGER_PAGE_LIMIT = 10;

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supplierId = params.id as string;

  const [activeTab, setActiveTab] = useState("purchases");
  const [purchasePage, setPurchasePage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);
  const [isEditOpeningOpen, setIsEditOpeningOpen] = useState(false);
  const [openingAmount, setOpeningAmount] = useState("");
  const [openingDirection, setOpeningDirection] = useState<"OWED" | "ADVANCE">("OWED");
  const [openingNotes, setOpeningNotes] = useState("");

  const { data, isLoading, error, isError } = useGetDealerById(supplierId);
  const {
    data: purchasesResponse,
    isLoading: purchasesLoading,
  } = useGetDealerTransactions(
    supplierId,
    {
      page: purchasePage,
      limit: LEDGER_PAGE_LIMIT,
      type: "PURCHASE",
    },
    { enabled: !!supplierId && activeTab === "purchases" }
  );
  const {
    data: paymentsResponse,
    isLoading: paymentsLoading,
  } = useGetDealerTransactions(
    supplierId,
    {
      page: paymentPage,
      limit: LEDGER_PAGE_LIMIT,
      type: "PAYMENT",
    },
    { enabled: !!supplierId && activeTab === "payments" }
  );
  const setOpeningBalance = useSetDealerOpeningBalance();

  const supplier = data?.data;
  const purchases: any[] = purchasesResponse?.data ?? [];
  const payments: any[] = paymentsResponse?.data ?? [];
  const purchasesPagination = purchasesResponse?.pagination;
  const paymentsPagination = paymentsResponse?.pagination;
  const openingBalance = supplier?.openingBalance ?? null;
  const openingHistory: any[] = supplier?.openingBalanceHistory ?? [];
  const summary = supplier?.summary ?? {};

  const formatCurrency = (amount: number) => {
    return `रू ${amount.toFixed(2)}`;
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  useEffect(() => {
    setPurchasePage(1);
    setPaymentPage(1);
  }, [supplierId]);

  useEffect(() => {
    if (purchasePage > Number(purchasesPagination?.totalPages || 1)) {
      setPurchasePage(Math.max(1, Number(purchasesPagination?.totalPages || 1)));
    }
  }, [purchasePage, purchasesPagination?.totalPages]);

  useEffect(() => {
    if (paymentPage > Number(paymentsPagination?.totalPages || 1)) {
      setPaymentPage(Math.max(1, Number(paymentsPagination?.totalPages || 1)));
    }
  }, [paymentPage, paymentsPagination?.totalPages]);

  const totalPurchased = Number(summary.totalPurchasedAmount || 0);
  const totalPaid = Number(summary.totalPaidAmount || 0);
  const currentBalance = supplier?.balance ?? 0;
  const paymentRate = totalPurchased
    ? Math.round((totalPaid / totalPurchased) * 100)
    : 0;

  const canEditOpeningBalance = true;

  const purchaseColumns: Column[] = [
    createColumn("purchaseCategory", "Category", {
      render: (_, row) => (
        <Badge className={`text-xs ${getCategoryBadgeColor(row.purchaseCategory)}`}>
          {row.purchaseCategory || "—"}
        </Badge>
      ),
    }),
    createColumn("itemName", "Item", {
      render: (value, row: any) => (
        <div>
          <div className="font-medium">{value || "Purchase"}</div>
          {row.description && (
            <div className="text-xs text-muted-foreground">{row.description}</div>
          )}
        </div>
      ),
    }),
    createColumn("quantity", "Qty", {
      align: "right",
      render: (_, row: any) => {
        const qty = row.quantity ?? 0;
        const free = row.freeQuantity ?? 0;
        const unit = row.unit || "";
        return (
          <span>
            {qty}
            {unit ? ` ${unit}` : ""}
            {free > 0 ? <span className="text-green-600"> +{free} free</span> : null}
          </span>
        );
      },
    }),
    createColumn("unitPrice", "Rate", {
      align: "right",
      render: (_, row: any) => {
        const unitPrice = row.unitPrice ?? (row.quantity ? row.amount / row.quantity : 0);
        return <span>रू {Number(unitPrice || 0).toFixed(2)}</span>;
      },
    }),
    createColumn("amount", "Amount", {
      type: "currency",
      align: "right",
    }),
    createColumn("date", "Date", {
      type: "date",
    }),
    createColumn("reference", "Ref", {
      render: (_, row: any) => <span className="text-xs text-muted-foreground">{row.reference || "—"}</span>,
    }),
  ];

  const paymentColumns: Column[] = [
    createColumn("amount", "Amount", {
      type: "currency",
      align: "right",
    }),
    createColumn("date", "Date", {
      type: "date",
    }),
    createColumn("description", "Note", {
      render: (_, row: any) => <span className="text-xs text-muted-foreground">{row.description || "—"}</span>,
    }),
    createColumn("reference", "Ref", {
      render: (_, row: any) => <span className="text-xs text-muted-foreground">{row.reference || "—"}</span>,
    }),
    createColumn("imageUrl", "Receipt", {
      render: (_, row: any) =>
        row.imageUrl ? (
          <a
            href={row.imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            View
          </a>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    }),
  ];

  function openEditOpening() {
    const current = openingBalance?.amount != null ? Number(openingBalance.amount) : 0;
    setOpeningAmount(String(Math.abs(current || 0)));
    setOpeningDirection(current >= 0 ? "OWED" : "ADVANCE");
    setOpeningNotes(openingBalance?.notes || "");
    setIsEditOpeningOpen(true);
  }

  async function saveOpening() {
    const amt = Number(openingAmount || 0);
    if (!Number.isFinite(amt)) return;
    const signed = openingDirection === "OWED" ? Math.abs(amt) : -Math.abs(amt);

    try {
      await setOpeningBalance.mutateAsync({
        dealerId: supplierId,
        openingBalance: signed,
        notes: openingNotes || undefined,
      });
      toast.success("Opening balance updated");
      setIsEditOpeningOpen(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to update opening balance");
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading supplier account...</p>
        </div>
      </div>
    );
  }

  if (isError || !supplier) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {error instanceof Error
              ? error.message
              : "Supplier not found."}
          </p>
          <Button
            variant="outline"
            onClick={() => router.push("/farmer/dashboard/supplier-ledger")}
            className="mt-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Supplier Ledger
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/farmer/dashboard/supplier-ledger")}
          className="mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Supplier Ledger
        </Button>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              {supplier.name}
            </h1>
          </div>
        </div>
        <p className="text-muted-foreground">
          {supplier.contact}
          {supplier.address && ` • ${supplier.address}`}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Outstanding Balance
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-xl md:text-2xl font-bold ${
                currentBalance > 0 ? "text-red-600" : "text-green-600"
              }`}
            >
              {formatCurrency(Math.abs(currentBalance))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {currentBalance > 0
                ? "You owe this supplier"
                : currentBalance < 0
                  ? "Advance payment"
                  : "Settled"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Purchased
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">
              {formatCurrency(totalPurchased)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {Number(summary.totalPurchases || 0)} purchase(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <TrendingDown className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">
              {formatCurrency(totalPaid)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {Number(summary.totalPayments || 0)} payment(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Rate</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{paymentRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Paid vs purchased
            </p>
          </CardContent>
        </Card>
      </div>

      {canEditOpeningBalance && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Opening balance</CardTitle>
              <CardDescription>
                This affects the supplier’s running balance
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={openEditOpening}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="text-xl font-bold">
                {formatCurrency(Math.abs(Number(openingBalance?.amount ?? 0)))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {Number(openingBalance?.amount ?? 0) > 0
                  ? "You owe this supplier"
                  : Number(openingBalance?.amount ?? 0) < 0
                    ? "Advance payment"
                    : "Not set"}
                {openingBalance?.date ? ` • ${formatDate(openingBalance.date)}` : ""}
              </p>
              {openingBalance?.notes && (
                <p className="text-sm text-muted-foreground mt-1">
                  {openingBalance.notes}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statement tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Account Statement</CardTitle>
          <CardDescription>
            Purchases from and payments to this supplier
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className={`grid w-full ${canEditOpeningBalance ? "grid-cols-3" : "grid-cols-2"}`}>
              <TabsTrigger value="purchases">
                Purchases ({Number(summary.totalPurchases || 0)})
              </TabsTrigger>
              <TabsTrigger value="payments">
                Payments ({Number(summary.totalPayments || 0)})
              </TabsTrigger>
              {canEditOpeningBalance && (
                <TabsTrigger value="opening">
                  Opening balance ({openingHistory.length})
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="purchases" className="mt-4">
              <DataTable
                data={purchases}
                columns={purchaseColumns}
                loading={purchasesLoading}
                emptyMessage="No purchases yet"
                showFooter={(purchases.length || 0) > 0}
                footerContent={
                  <div className="flex items-center justify-between px-2 text-sm">
                    <span className="font-semibold">Total</span>
                    <span className="font-semibold text-red-600">
                      ₹{Number(summary.totalPurchasedAmount || 0).toLocaleString()}
                    </span>
                  </div>
                }
              />
              <LedgerPagination
                page={purchasePage}
                totalPages={Number(purchasesPagination?.totalPages || 1)}
                totalRows={Number(purchasesPagination?.total || 0)}
                pageLimit={LEDGER_PAGE_LIMIT}
                onPageChange={setPurchasePage}
                loading={purchasesLoading}
              />
            </TabsContent>

            <TabsContent value="payments" className="mt-4">
              <DataTable
                data={payments}
                columns={paymentColumns}
                loading={paymentsLoading}
                emptyMessage="No payments yet"
                showFooter={(payments.length || 0) > 0}
                footerContent={
                  <div className="flex items-center justify-between px-2 text-sm">
                    <span className="font-semibold">Total paid</span>
                    <span className="font-semibold text-green-600">
                      ₹{Number(summary.totalPaidAmount || 0).toLocaleString()}
                    </span>
                  </div>
                }
              />
              <LedgerPagination
                page={paymentPage}
                totalPages={Number(paymentsPagination?.totalPages || 1)}
                totalRows={Number(paymentsPagination?.total || 0)}
                pageLimit={LEDGER_PAGE_LIMIT}
                onPageChange={setPaymentPage}
                loading={paymentsLoading}
              />
            </TabsContent>

            {canEditOpeningBalance && (
              <TabsContent value="opening" className="mt-4">
                {openingHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No opening balance history
                    </h3>
                    <p className="text-muted-foreground">
                      Opening balance changes will appear here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {openingHistory.map((h: any) => (
                      <div
                        key={h.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50"
                      >
                        <div>
                          <p className="font-medium">Opening balance</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(h.date)}
                          </p>
                          {h.notes && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {h.notes}
                            </p>
                          )}
                        </div>
                        <div
                          className={`text-right text-lg font-bold ${
                            Number(h.amount) >= 0 ? "text-red-600" : "text-green-600"
                          }`}
                        >
                          {Number(h.amount) >= 0 ? "+" : "-"}
                          {formatCurrency(Math.abs(Number(h.amount)))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={isEditOpeningOpen} onOpenChange={setIsEditOpeningOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit opening balance</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Amount</Label>
                <Input
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value)}
                  inputMode="decimal"
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Direction</Label>
                <Select
                  value={openingDirection}
                  onValueChange={(v) => setOpeningDirection(v as "OWED" | "ADVANCE")}
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
            <div>
              <Label>Notes (optional)</Label>
              <Input
                value={openingNotes}
                onChange={(e) => setOpeningNotes(e.target.value)}
                placeholder="Reason / notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpeningOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveOpening} disabled={setOpeningBalance.isPending}>
              {setOpeningBalance.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
