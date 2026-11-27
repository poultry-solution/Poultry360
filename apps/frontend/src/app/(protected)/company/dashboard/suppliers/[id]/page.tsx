"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Plus, ArrowLeft, DollarSign, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/common/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog";
import { Label } from "@/common/components/ui/label";
import { Input } from "@/common/components/ui/input";
import {
  useDeleteSupplierPayment,
  useGetSupplierLedger,
  useRecordSupplierPayment,
} from "@/fetchers/company/companySupplierQueries";
import { CompanyCashAccountField } from "@/components/company/CompanyCashAccountField";
import { CashflowDeleteConfirmDialog } from "@/components/cashflow/CashflowDeleteConfirmDialog";
import { DeleteCompanyPurchaseDialog } from "@/components/company/DeleteCompanyPurchaseDialog";
import { DateInput } from "@/common/components/ui/date-input";
import { formatPaymentMethod } from "@/common/lib/paymentMethod";
import { DateDisplay } from "@/common/components/ui/date-display";
import { DataTable, Column } from "@/common/components/ui/data-table";
import { toast } from "sonner";
import { BusinessDownloadDialog, filterRowsByDate } from "@/components/downloads/BusinessDownloadDialog";
import { getNepalTodayAd, toNepalDayAd } from "@/common/lib/nepali-date";
import {
  ACCOUNT_FEATURE_KEYS,
  useAccountFeature,
} from "@/fetchers/accountFeatureQueries";

const formatCurrency = (n: number | string) =>
  `रू ${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

type PurchaseRow = {
  id: string;
  quantity: number | string;
  unitPrice: number | string;
  totalAmount: number | string;
  rawMaterial?: { name?: string; unit?: string };
  _purchaseDate: string;
  _purchaseNotes?: string | null;
  _billImageUrl?: string | null;
};

// One row per purchase (invoice-like). Items are rolled up into a summary
// cell so a single Delete button maps to a single purchase.
type PurchaseGroupRow = {
  id: string;
  date: string;
  notes?: string | null;
  billImageUrl?: string | null;
  totalAmount: number | string;
  items: Array<{ rawMaterial?: { name?: string; unit?: string }; quantity: number | string }>;
};

type PaymentRow = {
  id: string;
  paymentDate: string;
  amount: number | string;
  paymentMethod?: string;
  notes?: string | null;
};

const paymentColumns: Column<PaymentRow>[] = [
  {
    key: "paymentDate",
    label: "Date",
    render: (_, row) => <DateDisplay date={row.paymentDate} />,
  },
  {
    key: "amount",
    label: "Amount",
    align: "right",
    render: (_, row) => formatCurrency(row.amount),
  },
  { key: "paymentMethod", label: "Method", render: (_, row) => (row.paymentMethod ? formatPaymentMethod(row.paymentMethod) : "—") },
  { key: "notes", label: "Note", render: (_, row) => row.notes ?? "—" },
];

export default function SupplierLedgerPage() {
  const params = useParams();
  const id = params.id as string;
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payAccountId, setPayAccountId] = useState("");
  const [payDate, setPayDate] = useState(getNepalTodayAd());
  const [payNotes, setPayNotes] = useState("");
  const [paymentToDelete, setPaymentToDelete] = useState<PaymentRow | null>(null);
  const [deletePurchaseId, setDeletePurchaseId] = useState<string | null>(null);

  const { data: ledgerData, isLoading } = useGetSupplierLedger(id);
  const recordPaymentMutation = useRecordSupplierPayment(id);
  const deletePaymentMutation = useDeleteSupplierPayment(id);
  const { isEnabled: isPurchaseBillEnabled } = useAccountFeature(
    ACCOUNT_FEATURE_KEYS.COMPANY_PURCHASE_BILL_UPLOAD
  );

  const ledger = ledgerData?.data;
  const supplier = ledger?.supplier;
  const balance = ledger?.balance ?? 0;
  const purchased = ledger?.purchased ?? 0;
  const paid = ledger?.paid ?? 0;
  const purchases = ledger?.purchases ?? [];
  const payments = ledger?.payments ?? [];

  // Per-item rows kept only for the CSV/PDF export below; the on-screen
  // Purchases tab now renders `purchaseGroupRows` (one row per purchase).
  const purchaseRows: PurchaseRow[] = purchases.flatMap((p: { date: string; notes?: string | null; billImageUrl?: string | null; items?: any[] }) =>
    (p.items || []).map((item: any, index: number) => ({
      ...item,
      _purchaseDate: p.date,
      _purchaseNotes: p.notes,
      _billImageUrl: index === 0 ? p.billImageUrl : null,
    }))
  );

  // One row per purchase for the on-screen Purchases tab. Each purchase gets
  // a single Delete button; the download flow still uses the per-item
  // `purchaseRows` above so historic CSV/PDF exports stay unchanged.
  const purchaseGroupRows: PurchaseGroupRow[] = (purchases ?? []).map(
    (p: { id: string; date: string; notes?: string | null; billImageUrl?: string | null; totalAmount?: number | string; items?: any[] }) => ({
      id: p.id,
      date: p.date,
      notes: p.notes,
      billImageUrl: p.billImageUrl,
      totalAmount:
        p.totalAmount ??
        (p.items || []).reduce((sum: number, item: any) => sum + Number(item.totalAmount ?? 0), 0),
      items: (p.items || []).map((item: any) => ({
        rawMaterial: item.rawMaterial,
        quantity: item.quantity,
      })),
    }),
  );

  const purchaseGroupColumns: Column<PurchaseGroupRow>[] = [
    {
      key: "date",
      label: "Date",
      render: (_, row) => <DateDisplay date={row.date} />,
    },
    {
      key: "items",
      label: "Items",
      render: (_, row) =>
        row.items.length === 0
          ? "—"
          : row.items
              .map(
                (item) =>
                  `${item.rawMaterial?.name ?? "—"} (${Number(item.quantity)} ${item.rawMaterial?.unit ?? ""})`.trim(),
              )
              .join(", "),
    },
    {
      key: "totalAmount",
      label: "Amount",
      align: "right",
      render: (_, row) => formatCurrency(row.totalAmount),
    },
    {
      key: "notes",
      label: "Note",
      render: (_, row) => row.notes ?? "—",
    },
    ...(isPurchaseBillEnabled
      ? [
          {
            key: "bill",
            label: "Bill",
            render: (_: unknown, row: PurchaseGroupRow) =>
              row.billImageUrl ? (
                <a
                  href={row.billImageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  View
                </a>
              ) : (
                "—"
              ),
          } as Column<PurchaseGroupRow>,
        ]
      : []),
    {
      key: "id",
      label: "",
      align: "center",
      render: (_, row) => (
        <Button
          variant="ghost"
          size="sm"
          className="text-red-600 hover:text-red-700"
          aria-label="Delete purchase"
          onClick={() => setDeletePurchaseId(row.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const paymentRows: PaymentRow[] = payments.map((pmt: any) => ({
    id: pmt.id,
    paymentDate: pmt.paymentDate,
    amount: pmt.amount,
    paymentMethod: pmt.paymentMethod,
    notes: pmt.notes,
  }));

  const downloadStatement = async (range: { startDate?: string; endDate?: string }) => {
    const purchases = filterRowsByDate(purchaseRows.map((row) => ({ date: row._purchaseDate, type: "Purchase", item: row.rawMaterial?.name || "", amount: Number(row.totalAmount || 0), method: "", note: row._purchaseNotes || "" })), range, (row) => row.date);
    const payments = filterRowsByDate(paymentRows.map((row) => ({ date: row.paymentDate, type: "Payment", item: "", amount: Number(row.amount || 0), method: row.paymentMethod || "", note: row.notes || "" })), range, (row) => row.date);
    const columns = [
        { label: "Date", value: (row: any) => toNepalDayAd(row.date) },
        { label: "Type", value: (row: any) => row.type },
        { label: "Item", value: (row: any) => row.item },
        { label: "Amount", value: (row: any) => row.amount.toFixed(2) },
        { label: "Method", value: (row: any) => row.method },
        { label: "Note", value: (row: any) => row.note },
      ];
    return {
      sections: [
        { title: "Purchases", columns, rows: purchases },
        { title: "Payments", columns, rows: payments },
      ],
      summary: [{ label: "Current balance", value: `Rs ${Number(balance).toFixed(2)}` }, { label: "Purchased", value: `Rs ${Number(purchased).toFixed(2)}` }, { label: "Paid", value: `Rs ${Number(paid).toFixed(2)}` }],
    };
  };

  const handlePay = async () => {
    const amt = Number(payAmount);
    if (!(amt > 0)) {
      toast.error("Enter a valid amount");
      return;
    }
    try {
      await recordPaymentMutation.mutateAsync({
        amount: amt,
        accountId: payAccountId || undefined,
        paymentDate: payDate,
        notes: payNotes.trim() || undefined,
      });
      toast.success("Payment recorded");
      setPayOpen(false);
      setPayAmount("");
      setPayNotes("");
      setPayAccountId("");
      setPayDate(getNepalTodayAd());
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to record payment");
    }
  };

  const handleDeletePayment = async (password: string) => {
    if (!paymentToDelete) return;
    try {
      await deletePaymentMutation.mutateAsync({ paymentId: paymentToDelete.id, password });
      toast.success("Payment deleted");
      setPaymentToDelete(null);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Could not delete the payment");
    }
  };

  const paymentColumnsWithDelete: Column<PaymentRow>[] = [
    ...paymentColumns,
    {
      key: "id",
      label: "",
      align: "center",
      render: (_, row) => (
        <Button
          variant="ghost"
          size="sm"
          className="text-red-600 hover:text-red-700"
          aria-label="Delete payment"
          onClick={() => setPaymentToDelete(row)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  if (!id) return null;
  if (!isLoading && !supplier) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Supplier not found.</p>
        <Button variant="outline" asChild>
          <Link href="/company/dashboard/suppliers">Back to suppliers</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/company/dashboard/suppliers">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Link>
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {supplier?.name ?? "..."}
          </h1>
          <div className="flex flex-wrap gap-2">
            {supplier ? <BusinessDownloadDialog title={`${supplier.name} statement`} fileName={`${supplier.name}-statement`} getData={downloadStatement} /> : null}
            <Button variant="outline" size="sm" onClick={() => setPayOpen(true)}>
              <DollarSign className="h-4 w-4 mr-1" />
              Pay
            </Button>
            <Button asChild className="bg-primary">
              <Link href={`/company/dashboard/purchases/new?supplierId=${id}`}>
                <Plus className="h-4 w-4 mr-1" />
                Add Entry
              </Link>
            </Button>
          </div>
        </div>
        <p className="text-sm text-gray-700">
          Balance: {formatCurrency(balance)} | Purchased: {formatCurrency(purchased)} | Paid:{" "}
          {formatCurrency(paid)}
        </p>
      </div>

      <Tabs defaultValue="purchases">
        <TabsList>
          <TabsTrigger value="purchases">Purchases ({purchases.length})</TabsTrigger>
          <TabsTrigger value="payments">Payments ({payments.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="purchases" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <DataTable<PurchaseGroupRow>
                data={purchaseGroupRows}
                columns={purchaseGroupColumns}
                emptyMessage='No purchases yet. Use "Add Entry" to record a purchase.'
                getRowKey={(row) => row.id}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="payments" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <DataTable<PaymentRow>
                data={paymentRows}
                columns={paymentColumnsWithDelete}
                emptyMessage='No payments yet. Use "Pay" to record a payment.'
                getRowKey={(row) => row.id}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CashflowDeleteConfirmDialog
        open={paymentToDelete !== null}
        onOpenChange={(open) => !open && setPaymentToDelete(null)}
        title="Delete this payment?"
        description={
          paymentToDelete
            ? `रू ${Number(paymentToDelete.amount).toFixed(2)} will be removed. The amount you owe ${supplier?.name ?? "this supplier"} and Cash & Bank go back to how they were before this payment.`
            : ""
        }
        confirmLabel="Delete payment"
        submitting={deletePaymentMutation.isPending}
        onConfirm={handleDeletePayment}
      />

      <DeleteCompanyPurchaseDialog
        purchaseId={deletePurchaseId}
        onClose={() => setDeletePurchaseId(null)}
      />

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record a payment to {supplier?.name}. This will reduce the balance.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Amount *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="0.00"
                className="mt-1"
              />
            </div>
            <CompanyCashAccountField label="Paid from" value={payAccountId} onChange={setPayAccountId} />
            <div>
              <DateInput label="Payment date" value={payDate} onChange={setPayDate} max={getNepalTodayAd()} />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Input
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                placeholder="Note"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePay} disabled={recordPaymentMutation.isPending}>
              {recordPaymentMutation.isPending ? "Saving..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
