"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, FileText, Plus, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Badge } from "@/common/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/common/components/ui/dialog";
import { DataTable, type Column } from "@/common/components/ui/data-table";
import { DateDisplay } from "@/common/components/ui/date-display";
import {
  useHatcheryParty,
  useHatcheryPartyTxns,
  useHatcheryPartyPayments,
  useAddHatcheryPartyPayment,
  useDeleteHatcheryPartyPayment,
  type HatcheryPartyTxn,
  type HatcheryPartyPayment,
} from "@/fetchers/hatchery/hatcheryPartyQueries";
import axiosInstance from "@/common/lib/axios";
import { BusinessDownloadDialog, fetchAllPages, filterRowsByDate } from "@/components/downloads/BusinessDownloadDialog";
import { HatcherySaleBill } from "../../sales/_components/HatcherySaleBill";
import type { HatcherySaleType } from "@/fetchers/hatchery/hatcherySaleQueries";
import { formatRupeesExact } from "@/common/lib/utils";
import { toNepalDayAd } from "@/common/lib/nepali-date";
import { DateInput } from "@/common/components/ui/date-input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/common/components/ui/alert-dialog";

const BILLABLE_SALE_SOURCES: HatcherySaleType[] = [
  "egg_sale",
  "parent_sale",
  "chick_sale",
];

const TXN_TYPE_LABEL: Record<string, { label: string; color: string }> = {
  SALE: { label: "Sale", color: "bg-red-100 text-red-800" },
  PAYMENT: { label: "Payment", color: "bg-green-100 text-green-800" },
  ADJUSTMENT: { label: "Adjustment", color: "bg-blue-100 text-blue-800" },
  OPENING_BALANCE: { label: "Opening Balance", color: "bg-purple-100 text-purple-800" },
};

export default function HatcheryPartyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<"ledger" | "payments">("ledger");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ date: "", amount: "", method: "", note: "" });
  const [billSale, setBillSale] = useState<{ type: HatcherySaleType; id: string } | null>(null);
  const [pendingDeletePayment, setPendingDeletePayment] = useState<string | null>(null);

  const { data: party, isLoading: partyLoading } = useHatcheryParty(id);
  const { data: txnsData, isLoading: txnsLoading } = useHatcheryPartyTxns(id);
  const { data: paymentsData, isLoading: paymentsLoading } = useHatcheryPartyPayments(id);
  const addPayment = useAddHatcheryPartyPayment(id);
  const deletePayment = useDeleteHatcheryPartyPayment(id);

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.date || !paymentForm.amount) return;
    await addPayment.mutateAsync({
      date: paymentForm.date,
      amount: parseFloat(paymentForm.amount),
      method: paymentForm.method || undefined,
      note: paymentForm.note || undefined,
    });
    setPaymentForm({ date: "", amount: "", method: "", note: "" });
    setShowPaymentModal(false);
  };

  const txnColumns: Column<HatcheryPartyTxn>[] = [
    {
      key: "date",
      label: "Date",
      render: (_, row) => <DateDisplay date={row.date} />,
    },
    {
      key: "type",
      label: "Type",
      render: (_, row) => {
        const meta = TXN_TYPE_LABEL[row.type] ?? { label: row.type, color: "bg-gray-100 text-gray-800" };
        return <span className={`px-2 py-0.5 rounded text-xs font-medium ${meta.color}`}>{meta.label}</span>;
      },
    },
    {
      key: "amount",
      label: "Amount",
      render: (_, row) => (
        <span className={Number(row.amount) > 0 ? "text-red-600" : "text-green-600"}>
          {Number(row.amount) > 0 ? "+" : ""}{formatRupeesExact(row.amount)}
        </span>
      ),
    },
    {
      key: "balanceAfter",
      label: "Balance After",
      render: (_, row) => <span>{formatRupeesExact(row.balanceAfter)}</span>,
    },
    { key: "note", label: "Note" },
    {
      key: "bill",
      label: "",
      render: (_, row) => {
        const sourceType = row.sourceType as HatcherySaleType | null;
        if (
          row.type !== "SALE" ||
          !row.sourceId ||
          !sourceType ||
          !BILLABLE_SALE_SOURCES.includes(sourceType)
        ) {
          return null;
        }
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setBillSale({ type: sourceType, id: row.sourceId! })}
          >
            <FileText className="h-4 w-4 mr-1" /> Bill
          </Button>
        );
      },
    },
  ];

  const paymentColumns: Column<HatcheryPartyPayment>[] = [
    {
      key: "date",
      label: "Date",
      render: (_, row) => <DateDisplay date={row.date} />,
    },
    {
      key: "amount",
      label: "Amount",
      render: (_, row) => (
        <span className="text-green-600 font-semibold">{formatRupeesExact(row.amount)}</span>
      ),
    },
    { key: "method", label: "Method" },
    { key: "note", label: "Note" },
    {
      key: "id",
      label: "",
      render: (_, row) => (
        <Button
          variant="ghost"
          size="icon"
          className="text-red-500 hover:text-red-700"
          onClick={() => {
            setPendingDeletePayment(row.id);
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const downloadStatement = async (range: { startDate?: string; endDate?: string }) => {
    const allRows = await fetchAllPages<HatcheryPartyTxn>(async (page, limit) => {
      const { data } = await axiosInstance.get(`/hatchery/parties/${id}/txns`, { params: { page, limit } });
      return { rows: data.txns || [], total: data.total };
    });
    const rows = filterRowsByDate(allRows, range, (row: HatcheryPartyTxn) => row.date);
    const columns = [
        { label: "Date", value: (row: HatcheryPartyTxn) => toNepalDayAd(row.date) },
        { label: "Type", value: (row: HatcheryPartyTxn) => TXN_TYPE_LABEL[row.type]?.label || row.type },
        { label: "Amount", value: (row: HatcheryPartyTxn) => Number(row.amount || 0).toFixed(2) },
        { label: "Balance", value: (row: HatcheryPartyTxn) => Number(row.balanceAfter || 0).toFixed(2) },
        { label: "Note", value: (row: HatcheryPartyTxn) => row.note || "" },
      ];
    return {
      sections: [
        { title: "Sales", columns, rows: rows.filter((row: HatcheryPartyTxn) => String(row.type).includes("SALE")) },
        { title: "Payments", columns, rows: rows.filter((row: HatcheryPartyTxn) => String(row.type).includes("PAYMENT")) },
        { title: "Other records", columns, rows: rows.filter((row: HatcheryPartyTxn) => !String(row.type).includes("SALE") && !String(row.type).includes("PAYMENT")) },
      ],
      summary: [{ label: "Current balance", value: formatRupeesExact(party?.balance || 0) }, { label: "Total sales", value: formatRupeesExact(party?.totalSales || 0) }, { label: "Total payments", value: formatRupeesExact(party?.totalPayments || 0) }],
    };
  };

  if (partyLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!party) {
    return <div className="p-6 text-muted-foreground">Party not found.</div>;
  }

  const balance = Number(party.balance);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/hatchery/dashboard/parties">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold">{party.name}</h1>
          <p className="text-sm text-muted-foreground">{party.phone}{party.address ? ` · ${party.address}` : ""}</p>
        </div>
        <BusinessDownloadDialog title={`${party.name} statement`} fileName={`${party.name}-statement`} getData={downloadStatement} />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Outstanding Balance</p>
          <p className={`text-xl font-bold ${balance > 0 ? "text-red-600" : "text-green-600"}`}>
            {formatRupeesExact(balance)}
          </p>
        </div>
        <div className="rounded-xl border p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Total Sales</p>
          <p className="text-xl font-bold">{formatRupeesExact(party.totalSales)}</p>
        </div>
        <div className="rounded-xl border p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Total Payments</p>
          <p className="text-xl font-bold text-green-600">{formatRupeesExact(party.totalPayments)}</p>
        </div>
        <div className="rounded-xl border p-4 space-y-1">
          <p className="text-xs text-muted-foreground">Opening Balance</p>
          <p className="text-xl font-bold">{formatRupeesExact(party.openingBalance)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {(["ledger", "payments"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 px-3 text-sm font-medium capitalize border-b-2 transition-colors ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "ledger" ? "Ledger" : "Payments"}
          </button>
        ))}
      </div>

      {/* Ledger tab */}
      {activeTab === "ledger" && (
        <DataTable
          columns={txnColumns}
          data={txnsData?.txns ?? []}
          loading={txnsLoading}
        />
      )}

      {/* Payments tab */}
      {activeTab === "payments" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowPaymentModal(true)}>
              <Plus className="h-4 w-4 mr-1" /> Record Payment
            </Button>
          </div>
          <DataTable
            columns={paymentColumns}
            data={paymentsData?.payments ?? []}
            loading={paymentsLoading}
          />
        </div>
      )}

      {/* Sale bill pop-up */}
      <HatcherySaleBill
        saleType={billSale?.type ?? null}
        saleId={billSale?.id ?? null}
        onClose={() => setBillSale(null)}
      />

      <AlertDialog
        open={!!pendingDeletePayment}
        onOpenChange={(open) => !open && setPendingDeletePayment(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the payment and adjusts the party balance. You can
              re-record it if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDeletePayment) {
                  deletePayment.mutate(pendingDeletePayment);
                }
                setPendingDeletePayment(null);
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Payment modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddPayment} className="space-y-3">
            <div>
              <label className="text-sm font-medium">Date *</label>
              <DateInput
                value={paymentForm.date}
                onChange={(v) => setPaymentForm((f) => ({ ...f, date: v }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Amount (रू) *</label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Method</label>
              <Input
                value={paymentForm.method}
                onChange={(e) => setPaymentForm((f) => ({ ...f, method: e.target.value }))}
                placeholder="Cash, Bank, etc."
              />
            </div>
            <div>
              <label className="text-sm font-medium">Note</label>
              <Input
                value={paymentForm.note}
                onChange={(e) => setPaymentForm((f) => ({ ...f, note: e.target.value }))}
                placeholder="Optional note"
              />
            </div>

            {addPayment.isError && (
              <p className="text-sm text-red-500">
                {(addPayment.error as any)?.response?.data?.error ?? "Failed to record payment"}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowPaymentModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addPayment.isPending}>
                {addPayment.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
