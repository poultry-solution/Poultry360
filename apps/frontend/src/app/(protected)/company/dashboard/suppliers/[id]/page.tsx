"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Plus, ArrowLeft, DollarSign } from "lucide-react";
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
import { useGetSupplierLedger, useRecordSupplierPayment } from "@/fetchers/company/companySupplierQueries";
import { DateDisplay } from "@/common/components/ui/date-display";
import { DataTable, Column } from "@/common/components/ui/data-table";
import { toast } from "sonner";

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
};

const purchaseColumns: Column<PurchaseRow>[] = [
  { key: "item", label: "Item", render: (_, row) => row.rawMaterial?.name ?? "—" },
  {
    key: "qty",
    label: "Qty",
    render: (_, row) =>
      `${Number(row.quantity)} ${row.rawMaterial?.unit ?? ""}`.trim() || "—",
  },
  {
    key: "rate",
    label: "Rate",
    render: (_, row) =>
      `रू ${Number(row.unitPrice).toFixed(2)}/${row.rawMaterial?.unit ?? ""}`,
  },
  {
    key: "amount",
    label: "Amount",
    align: "right",
    render: (_, row) => formatCurrency(row.totalAmount),
  },
  {
    key: "date",
    label: "Date",
    render: (_, row) => <DateDisplay date={row._purchaseDate} />,
  },
  {
    key: "note",
    label: "Note",
    render: (_, row) => row._purchaseNotes ?? "—",
  },
];

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
  { key: "paymentMethod", label: "Method", render: (_, row) => row.paymentMethod ?? "—" },
  { key: "notes", label: "Note", render: (_, row) => row.notes ?? "—" },
];

export default function SupplierLedgerPage() {
  const params = useParams();
  const id = params.id as string;
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("CASH");
  const [payNotes, setPayNotes] = useState("");

  const { data: ledgerData, isLoading } = useGetSupplierLedger(id);
  const recordPaymentMutation = useRecordSupplierPayment(id);

  const ledger = ledgerData?.data;
  const supplier = ledger?.supplier;
  const balance = ledger?.balance ?? 0;
  const purchased = ledger?.purchased ?? 0;
  const paid = ledger?.paid ?? 0;
  const purchases = ledger?.purchases ?? [];
  const payments = ledger?.payments ?? [];

  const purchaseRows: PurchaseRow[] = purchases.flatMap((p: { date: string; notes?: string | null; items?: any[] }) =>
    (p.items || []).map((item: any) => ({
      ...item,
      _purchaseDate: p.date,
      _purchaseNotes: p.notes,
    }))
  );

  const paymentRows: PaymentRow[] = payments.map((pmt: any) => ({
    id: pmt.id,
    paymentDate: pmt.paymentDate,
    amount: pmt.amount,
    paymentMethod: pmt.paymentMethod,
    notes: pmt.notes,
  }));

  const handlePay = async () => {
    const amt = Number(payAmount);
    if (!(amt > 0)) {
      toast.error("Enter a valid amount");
      return;
    }
    try {
      await recordPaymentMutation.mutateAsync({
        amount: amt,
        paymentMethod: payMethod,
        notes: payNotes.trim() || undefined,
      });
      toast.success("Payment recorded");
      setPayOpen(false);
      setPayAmount("");
      setPayNotes("");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to record payment");
    }
  };

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
        <p className="text-sm text-muted-foreground">
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
              <DataTable<PurchaseRow>
                data={purchaseRows}
                columns={purchaseColumns}
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
                columns={paymentColumns}
                emptyMessage='No payments yet. Use "Pay" to record a payment.'
                getRowKey={(row) => row.id}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
            <div>
              <Label>Payment method</Label>
              <Input
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                placeholder="CASH, BANK, etc."
                className="mt-1"
              />
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
