"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  Search,
  Clock,
  Plus,
  FileText,
  Calendar as CalendarIcon,
  Building2,
} from "lucide-react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { DataTable, Column } from "@/common/components/ui/data-table";
import { Badge } from "@/common/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Textarea } from "@/common/components/ui/textarea";
import { ImageUpload } from "@/common/components/ui/image-upload";
import { DateInput } from "@/common/components/ui/date-input";
import { DateDisplay } from "@/common/components/ui/date-display";
import { getNowLocalDateTime } from "@/common/lib/utils";
import { toast } from "sonner";
import {
  useGetAllCompanyPayments,
  useRecordDealerPayment,
  useGetDealerAccount,
} from "@/fetchers/company/companyDealerAccountQueries";
import { useGetCompanyDealers } from "@/fetchers/company/companyDealerQueries";

export default function CompanyPaymentsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [dealerFilter, setDealerFilter] = useState<string>("ALL");
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [viewReceiptUrl, setViewReceiptUrl] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState({
    dealerId: "",
    amount: 0,
    paymentMethod: "CASH",
    paymentDate: getNowLocalDateTime(),
    notes: "",
    reference: "",
    receiptImageUrl: "",
  });

  const { data: paymentsData, isLoading: paymentsLoading } =
    useGetAllCompanyPayments({
      page,
      limit: 50,
      dealerId: dealerFilter !== "ALL" ? dealerFilter : undefined,
    });
  const { data: dealersData } = useGetCompanyDealers({ limit: 100 });
  const { data: dealerAccount } = useGetDealerAccount(paymentData.dealerId);
  const recordPaymentMutation = useRecordDealerPayment();

  const payments = paymentsData?.data || [];
  const pagination = paymentsData?.pagination || {
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 1,
  };
  const dealers = dealersData?.data || [];

  const formatCurrency = (amount: number | string | undefined | null) => {
    if (amount === undefined || amount === null) return "रू 0.00";
    const numAmount = typeof amount === "string" ? Number(amount) : amount;
    if (!Number.isFinite(numAmount)) return "रू 0.00";
    return `रू ${numAmount.toFixed(2)}`;
  };

  const formatPaymentMethod = (method: string | undefined | null) => {
    if (!method) return "N/A";
    return method
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  const filteredPayments = payments.filter((payment: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      payment.dealerName?.toLowerCase().includes(q) ||
      payment.dealerContact?.toLowerCase().includes(q) ||
      payment.reference?.toLowerCase().includes(q) ||
      payment.notes?.toLowerCase().includes(q)
    );
  });

  const visibleAmount = filteredPayments.reduce(
    (sum: number, payment: any) => sum + Number(payment.amount || 0),
    0
  );
  const visibleDealers = new Set(
    filteredPayments.map((payment: any) => payment.dealerId).filter(Boolean)
  ).size;

  const balanceAfterPayment = dealerAccount
    ? Number(dealerAccount.balance || 0) - paymentData.amount
    : 0;

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!paymentData.dealerId) {
      toast.error("Please select a dealer");
      return;
    }

    if (paymentData.amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    try {
      await recordPaymentMutation.mutateAsync({
        dealerId: paymentData.dealerId,
        amount: paymentData.amount,
        paymentMethod: paymentData.paymentMethod,
        paymentDate: new Date(paymentData.paymentDate),
        notes: paymentData.notes || undefined,
        reference: paymentData.reference || undefined,
        receiptImageUrl: paymentData.receiptImageUrl || undefined,
      });

      toast.success("Payment recorded successfully");
      setIsRecordPaymentOpen(false);
      setPaymentData({
        dealerId: "",
        amount: 0,
        paymentMethod: "CASH",
        paymentDate: getNowLocalDateTime(),
        notes: "",
        reference: "",
        receiptImageUrl: "",
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to record payment");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Dealer Payments
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Record direct payments from dealers and review recent entries
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/company/dashboard/payments/history")}
          >
            <Clock className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">History</span>
          </Button>
          <Button onClick={() => setIsRecordPaymentOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Record Payment</span>
            <span className="sm:hidden">Record</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:p-6 pb-1 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Visible</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <div className="text-lg md:text-2xl font-bold">{filteredPayments.length}</div>
            <p className="text-[10px] md:text-xs text-muted-foreground">Payments in current view</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:p-6 pb-1 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <div className="text-lg md:text-2xl font-bold text-green-600">
              {formatCurrency(visibleAmount)}
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground">Current view total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:p-6 pb-1 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Dealers</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <div className="text-lg md:text-2xl font-bold">{visibleDealers}</div>
            <p className="text-[10px] md:text-xs text-muted-foreground">With visible payments</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 md:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search dealer, reference..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={dealerFilter} onValueChange={setDealerFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by Dealer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Dealers</SelectItem>
                  {dealers.map((dealer: any) => (
                    <SelectItem key={dealer.id} value={dealer.id}>
                      {dealer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              Total: <span className="font-medium text-foreground">{pagination.total}</span> payments
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={filteredPayments}
            loading={paymentsLoading}
            emptyMessage="No recorded payments found."
            columns={[
              {
                key: "paymentDate",
                label: "Date",
                width: "120px",
                render: (val) => (
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <DateDisplay date={val} />
                  </div>
                ),
              },
              {
                key: "dealerName",
                label: "Dealer",
                width: "180px",
                render: (val, row) => (
                  <div>
                    <div className="font-medium">{val}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.dealerContact}
                    </div>
                  </div>
                ),
              },
              {
                key: "amount",
                label: "Amount",
                align: "right",
                width: "120px",
                render: (val) => (
                  <span className="font-bold text-green-600">
                    {formatCurrency(val)}
                  </span>
                ),
              },
              {
                key: "paymentMethod",
                label: "Method",
                width: "120px",
                render: (val) => (
                  <Badge variant="outline">{formatPaymentMethod(val)}</Badge>
                ),
              },
              {
                key: "reference",
                label: "Reference",
                width: "150px",
                render: (val) => (
                  <div className="text-sm">
                    {val || <span className="text-muted-foreground">-</span>}
                  </div>
                ),
              },
              {
                key: "notes",
                label: "Notes",
                render: (val) => (
                  <div className="text-sm text-muted-foreground truncate max-w-[200px]" title={val}>
                    {val || "-"}
                  </div>
                ),
              },
              {
                key: "receiptImageUrl",
                label: "Receipt",
                align: "center",
                width: "80px",
                render: (val, row) =>
                  val || row.proofImageUrl ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewReceiptUrl(val || row.proofImageUrl)}
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  ) : (
                    <span className="text-muted-foreground text-xs">-</span>
                  ),
              },
            ] as Column[]}
          />

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isRecordPaymentOpen} onOpenChange={setIsRecordPaymentOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleRecordPayment}>
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
              <DialogDescription>
                Record a direct payment received from a dealer.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="dealerId">Select Dealer *</Label>
                <Select
                  value={paymentData.dealerId}
                  onValueChange={(value) =>
                    setPaymentData({ ...paymentData, dealerId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a dealer" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {dealers.map((dealer: any) => (
                      <SelectItem key={dealer.id} value={dealer.id}>
                        {dealer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {paymentData.dealerId && dealerAccount && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Current Balance</span>
                    <span
                      className={`text-xl font-bold ${Number(dealerAccount.balance || 0) > 0
                        ? "text-red-600"
                        : Number(dealerAccount.balance || 0) < 0
                          ? "text-green-600"
                          : ""
                        }`}
                    >
                      {formatCurrency(dealerAccount.balance)}
                    </span>
                  </div>
                  {paymentData.amount > 0 && (
                    <>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">After Payment</span>
                        <span
                          className={`font-bold ${balanceAfterPayment > 0
                            ? "text-red-600"
                            : balanceAfterPayment < 0
                              ? "text-green-600"
                              : ""
                            }`}
                        >
                          {formatCurrency(balanceAfterPayment)}
                        </span>
                      </div>
                      {balanceAfterPayment < 0 && (
                        <p className="text-xs text-green-600 mt-1">
                          This will create an advance/credit of{" "}
                          {formatCurrency(Math.abs(balanceAfterPayment))}
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={paymentData.amount || ""}
                  onChange={(e) =>
                    setPaymentData({
                      ...paymentData,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0.00"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method *</Label>
                <Select
                  value={paymentData.paymentMethod}
                  onValueChange={(value) =>
                    setPaymentData({ ...paymentData, paymentMethod: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentDate">Payment Date *</Label>
                <DateInput
                  label="Payment Date"
                  value={paymentData.paymentDate}
                  onChange={(val) =>
                    setPaymentData({ ...paymentData, paymentDate: val })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference">Reference Number</Label>
                <Input
                  id="reference"
                  value={paymentData.reference}
                  onChange={(e) =>
                    setPaymentData({ ...paymentData, reference: e.target.value })
                  }
                  placeholder="Transaction ID, Receipt #, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={paymentData.notes}
                  onChange={(e) =>
                    setPaymentData({ ...paymentData, notes: e.target.value })
                  }
                  placeholder="Additional notes..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Payment Receipt (Optional)</Label>
                <ImageUpload
                  value={paymentData.receiptImageUrl}
                  onChange={(url) =>
                    setPaymentData({ ...paymentData, receiptImageUrl: url })
                  }
                  folder="payment-receipts"
                  placeholder="Upload payment receipt image"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRecordPaymentOpen(false)}
                disabled={recordPaymentMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={recordPaymentMutation.isPending}>
                {recordPaymentMutation.isPending ? "Recording..." : "Record Payment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!viewReceiptUrl}
        onOpenChange={(open) => !open && setViewReceiptUrl(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Payment Receipt</DialogTitle>
            <DialogDescription>
              View the uploaded receipt for this payment
            </DialogDescription>
          </DialogHeader>
          <div className="relative aspect-video w-full bg-muted rounded-lg overflow-hidden flex items-center justify-center">
            {viewReceiptUrl && (
              <Image
                src={viewReceiptUrl}
                alt="Payment Receipt"
                fill
                className="object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
