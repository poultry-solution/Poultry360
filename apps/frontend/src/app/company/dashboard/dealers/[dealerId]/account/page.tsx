"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Wallet,
  TrendingUp,
  TrendingDown,
  Calendar,
  Plus,
  Receipt,
  Image,
  FileText,
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
import { Textarea } from "@/common/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import { ImageUpload } from "@/common/components/ui/image-upload";
import { toast } from "sonner";
import { DateDisplay } from "@/common/components/ui/date-display";
import { DateInput } from "@/common/components/ui/date-input";
import { getNowLocalDateTime } from "@/common/lib/utils";
import {
  useGetDealerAccount,
  useGetDealerAccountStatement,
  useRecordDealerPayment,
  useSetDealerBalanceLimit,
  useProposeDealerOpeningBalance,
} from "@/fetchers/company/companyDealerAccountQueries";

export default function DealerAccountPage() {
  const params = useParams();
  const router = useRouter();
  const dealerId = params.dealerId as string;

  const [activeTab, setActiveTab] = useState("sales");
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isEditingLimit, setIsEditingLimit] = useState(false);
  const [newBalanceLimit, setNewBalanceLimit] = useState<string>("");
  const [isEditOpeningOpen, setIsEditOpeningOpen] = useState(false);
  const [openingAmount, setOpeningAmount] = useState<string>("");
  const [openingDirection, setOpeningDirection] = useState<"OWED" | "ADVANCE">("OWED");
  const [openingNotes, setOpeningNotes] = useState<string>("");
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    paymentMethod: "CASH",
    paymentDate: getNowLocalDateTime(),
    notes: "",
    reference: "",
    receiptImageUrl: "",
  });

  // Queries
  const { data: account, isLoading: accountLoading } =
    useGetDealerAccount(dealerId);
  const { data: statement, isLoading: statementLoading } =
    useGetDealerAccountStatement(dealerId);

  // Mutations
  const recordPaymentMutation = useRecordDealerPayment();
  const setBalanceLimitMutation = useSetDealerBalanceLimit();
  const proposeOpeningMutation = useProposeDealerOpeningBalance();

  const handleUpdateBalanceLimit = async () => {
    try {
      await setBalanceLimitMutation.mutateAsync({
        dealerId,
        balanceLimit: newBalanceLimit ? parseFloat(newBalanceLimit) : null,
      });
      toast.success("Balance limit updated successfully");
      setIsEditingLimit(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update balance limit");
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (paymentData.amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    try {
      await recordPaymentMutation.mutateAsync({
        dealerId,
        amount: paymentData.amount,
        paymentMethod: paymentData.paymentMethod,
        paymentDate: new Date(paymentData.paymentDate),
        notes: paymentData.notes,
        reference: paymentData.reference,
        receiptImageUrl: paymentData.receiptImageUrl || undefined,
      });
      toast.success("Payment recorded successfully");
      setIsPaymentDialogOpen(false);
      setPaymentData({
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

  const formatCurrency = (amount: number) => {
    return `रू ${amount.toFixed(2)}`;
  };

  const openEditOpening = () => {
    const proposed = Number((account as any)?.openingBalanceProposed ?? 0);
    const current = Number((account as any)?.openingBalanceCurrent ?? 0);
    const amt = proposed !== 0 ? proposed : current;
    setOpeningDirection(amt < 0 ? "ADVANCE" : "OWED");
    setOpeningAmount(String(Math.abs(amt || 0)));
    setOpeningNotes("");
    setIsEditOpeningOpen(true);
  };

  const saveOpening = async () => {
    const amt = Number(openingAmount || 0);
    if (!Number.isFinite(amt) || amt < 0) {
      toast.error("Opening balance must be a non-negative number");
      return;
    }
    const signed = amt === 0 ? 0 : openingDirection === "ADVANCE" ? -amt : amt;
    if (signed === 0) {
      toast.error("Opening balance cannot be 0");
      return;
    }
    try {
      await proposeOpeningMutation.mutateAsync({
        dealerId,
        openingBalance: signed,
        notes: openingNotes.trim() || undefined,
      });
      toast.success("Opening balance proposed. Waiting for dealer approval.");
      setIsEditOpeningOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to propose opening balance");
    }
  };

  if (accountLoading || statementLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">Loading account details...</div>
      </div>
    );
  }

  const balanceAfterPayment = account
    ? account.balance - paymentData.amount
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/company/dashboard/dealers")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dealers
            </Button>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            {account?.dealer.name} - Account
          </h1>
          <p className="text-muted-foreground">
            {account?.dealer.contact} • {account?.dealer.address}
          </p>
        </div>
        <Button onClick={() => setIsPaymentDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Record Payment
        </Button>
      </div>

      {/* Account Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Current Balance
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${(account?.balance || 0) > 0
                ? "text-red-600"
                : (account?.balance || 0) < 0
                  ? "text-green-600"
                  : ""
                }`}
            >
              {formatCurrency(account?.balance || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {(account?.balance || 0) > 0
                ? "Outstanding"
                : (account?.balance || 0) < 0
                  ? "Advance/Credit"
                  : "Settled"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(account?.totalSales || 0)}
            </div>
            {account?.lastSaleDate && (
              <p className="text-xs text-muted-foreground mt-1">
                Last: <DateDisplay date={account.lastSaleDate} />
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Payments
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(account?.totalPayments || 0)}
            </div>
            {account?.lastPaymentDate && (
              <p className="text-xs text-muted-foreground mt-1">
                Last: <DateDisplay date={account.lastPaymentDate} />
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Payment Rate
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {account?.totalSales
                ? Math.round(
                  ((account?.totalPayments || 0) / account.totalSales) * 100
                )
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground mt-1">Paid vs Sold</p>
          </CardContent>
        </Card>
      </div>

      {/* Balance Limit Card */}
      <Card>
        <CardHeader>
          <CardTitle>Balance Limit</CardTitle>
          <CardDescription>
            Set a maximum balance limit for this dealer
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isEditingLimit ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="balanceLimit">Balance Limit</Label>
                <Input
                  id="balanceLimit"
                  type="number"
                  min="0"
                  step="0.01"
                  value={newBalanceLimit}
                  onChange={(e) => setNewBalanceLimit(e.target.value)}
                  placeholder="Enter limit (leave empty for no limit)"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleUpdateBalanceLimit}
                  disabled={setBalanceLimitMutation.isPending}
                >
                  {setBalanceLimitMutation.isPending ? "Saving..." : "Save"}
                </Button>
                <Button variant="outline" onClick={() => setIsEditingLimit(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  {account?.balanceLimit != null
                    ? `रू ${Number(account.balanceLimit).toFixed(2)}`
                    : "No Limit"}
                </p>
                {account?.balanceLimitSetAt && (
                  <p className="text-xs text-muted-foreground">
                    Last updated:{" "}
                    <DateDisplay date={account.balanceLimitSetAt} />
                  </p>
                )}
              </div>
              <Button
                onClick={() => {
                  setNewBalanceLimit(
                    account?.balanceLimit?.toString() ?? ""
                  );
                  setIsEditingLimit(true);
                }}
              >
                Edit Limit
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Opening Balance Card (requires dealer approval) */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle>Opening balance</CardTitle>
            <CardDescription>
              Propose an opening balance for this dealer connection (dealer must approve).
            </CardDescription>
          </div>
          <Button onClick={openEditOpening}>
            Edit
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-2xl font-bold">
              {formatCurrency(
                Math.abs(
                  Number((account as any)?.openingBalanceCurrent ?? 0)
                )
              )}
            </p>
            {(account as any)?.openingBalanceStatus && (
              <Badge variant="secondary">
                {(account as any).openingBalanceStatus === "PENDING_ACK"
                  ? "Pending dealer approval"
                  : (account as any).openingBalanceStatus === "ACKNOWLEDGED"
                    ? "Approved"
                    : (account as any).openingBalanceStatus === "DISPUTED"
                      ? "Rejected"
                      : (account as any).openingBalanceStatus}
              </Badge>
            )}
          </div>
          {(account as any)?.openingBalanceProposed != null && Number((account as any).openingBalanceProposed) !== 0 && (
            <p className="text-sm text-muted-foreground">
              Proposed: {formatCurrency(Math.abs(Number((account as any).openingBalanceProposed)))} (waiting for approval)
            </p>
          )}

          {Array.isArray((account as any)?.openingBalanceHistory) &&
          (account as any).openingBalanceHistory.length > 0 ? (
            <div className="pt-2 border-t">
              <p className="text-sm font-medium mb-2">History</p>
              <div className="space-y-2">
                {(account as any).openingBalanceHistory.slice(0, 8).map((h: any) => (
                  <div key={h.id} className="flex items-start justify-between gap-3 text-sm border rounded-md p-2">
                    <div className="text-xs text-muted-foreground">
                      <div><DateDisplay date={h.createdAt} /></div>
                      {h.notes ? <div className="mt-0.5">{h.notes}</div> : null}
                    </div>
                    <div className={Number(h.amount) >= 0 ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
                      {Number(h.amount) >= 0 ? "+" : "-"}{formatCurrency(Math.abs(Number(h.amount)))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Edit opening balance dialog */}
      <Dialog open={isEditOpeningOpen} onOpenChange={setIsEditOpeningOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Propose opening balance</DialogTitle>
            <DialogDescription>
              Dealer must approve this before it affects the account balance.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Direction</Label>
                <Select value={openingDirection} onValueChange={(v) => setOpeningDirection(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="OWED">Dealer owes company</SelectItem>
                    <SelectItem value="ADVANCE">Company owes dealer (advance/credit)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input
                value={openingNotes}
                onChange={(e) => setOpeningNotes(e.target.value)}
                placeholder="Reason / context"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpeningOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveOpening} disabled={proposeOpeningMutation.isPending}>
              {proposeOpeningMutation.isPending ? "Saving..." : "Submit for approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Account Statement with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Account Statement</CardTitle>
          <CardDescription>
            Sales and payment transaction history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sales">
                Sales ({statement?.sales?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="payments">
                Payments ({statement?.payments?.length || 0})
              </TabsTrigger>
            </TabsList>

            {/* Sales Tab */}
            <TabsContent value="sales" className="mt-4">
              {!statement || !statement.sales || statement.sales.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No sales yet</h3>
                  <p className="text-muted-foreground">
                    Sales will appear here once recorded
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {statement.sales.map((sale) => {
                    const hasDiscount =
                      sale.subtotalAmount != null &&
                      sale.discountType &&
                      Number(sale.subtotalAmount) > Number(sale.amount);
                    return (
                      <div
                        key={sale.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-blue-100">
                            <Receipt className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">Sale</p>
                              {sale.invoiceNumber && (
                                <Badge variant="outline" className="text-xs">
                                  {sale.invoiceNumber}
                                </Badge>
                              )}
                              {hasDiscount && (
                                <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 border-green-200">
                                  Discount applied
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              <DateDisplay date={sale.date} />
                            </p>
                            {hasDiscount && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Original {formatCurrency(sale.subtotalAmount!)}
                                {sale.discountType === "PERCENT"
                                  ? ` → ${sale.discountValue}% off`
                                  : ` → रू ${Number(sale.discountValue ?? 0).toFixed(2)} off`}
                                {" "}· Amount: {formatCurrency(sale.amount)}
                              </p>
                            )}
                            {sale.notes && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {sale.notes}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-red-600">
                            +{formatCurrency(sale.amount)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Payments Tab */}
            <TabsContent value="payments" className="mt-4">
              {!statement || !statement.payments || statement.payments.length === 0 ? (
                <div className="text-center py-8">
                  <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No payments yet</h3>
                  <p className="text-muted-foreground">
                    Payments will appear here once recorded
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {statement.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-green-100">
                          <Wallet className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">Payment</p>
                            {payment.reference && (
                              <Badge variant="outline" className="text-xs">
                                {payment.reference}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {payment.paymentMethod}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            <DateDisplay date={payment.paymentDate} />
                          </p>
                          {payment.notes && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {payment.notes}
                            </p>
                          )}
                          {(payment.receiptImageUrl || payment.proofImageUrl) && (
                            <a
                              href={payment.receiptImageUrl || payment.proofImageUrl || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1"
                            >
                              <Badge variant="secondary" className="text-xs mt-1 cursor-pointer hover:bg-green-100">
                                <Image className="h-3 w-3 mr-1" />
                                View Receipt
                              </Badge>
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">
                          -{formatCurrency(payment.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Balance: {formatCurrency(payment.balanceAfter)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Record Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleRecordPayment}>
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
              <DialogDescription>
                Record a payment received from {account?.dealer.name}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Current Balance */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Current Balance</span>
                  <span
                    className={`text-xl font-bold ${(account?.balance || 0) > 0 ? "text-red-600" : "text-green-600"
                      }`}
                  >
                    {formatCurrency(account?.balance || 0)}
                  </span>
                </div>
                {paymentData.amount > 0 && (
                  <>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">
                        After Payment
                      </span>
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

              <div className="space-y-2 ">
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
                onClick={() => setIsPaymentDialogOpen(false)}
                disabled={recordPaymentMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={recordPaymentMutation.isPending}>
                {recordPaymentMutation.isPending
                  ? "Recording..."
                  : "Record Payment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
