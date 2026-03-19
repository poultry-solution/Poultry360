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
import { toast } from "sonner";
import {
  useGetCompanyAccount,
  useGetCompanyAccountStatement,
  useAcknowledgeCompanyOpeningBalance,
  useDisputeCompanyOpeningBalance,
} from "@/fetchers/dealer/dealerCompanyAccountQueries";
import { DateDisplay } from "@/common/components/ui/date-display";
import { useCreateDealerPaymentRequest } from "@/fetchers/dealer/paymentRequestQueries";

export default function CompanyAccountPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.companyId as string;

  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isDisputeOpen, setIsDisputeOpen] = useState(false);
  const [disputeNote, setDisputeNote] = useState("");
  const [paymentRequestData, setPaymentRequestData] = useState({
    amount: 0,
    paymentMethod: "CASH",
    paymentReference: "",
    description: "",
  });

  // Queries
  const { data: account, isLoading: accountLoading } =
    useGetCompanyAccount(companyId);
  const { data: statement, isLoading: statementLoading } =
    useGetCompanyAccountStatement(companyId);

  // Mutations
  const createPaymentRequestMutation = useCreateDealerPaymentRequest();
  const ackOpeningMutation = useAcknowledgeCompanyOpeningBalance();
  const disputeOpeningMutation = useDisputeCompanyOpeningBalance();

  const handleSendPaymentRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (paymentRequestData.amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    try {
      await createPaymentRequestMutation.mutateAsync({
        companyId,
        amount: paymentRequestData.amount,
        paymentMethod: paymentRequestData.paymentMethod,
        paymentReference: paymentRequestData.paymentReference || undefined,
        description: paymentRequestData.description || undefined,
      });
      toast.success("Payment submitted successfully. Waiting for company verification.");
      setIsPaymentDialogOpen(false);
      setPaymentRequestData({
        amount: 0,
        paymentMethod: "CASH",
        paymentReference: "",
        description: "",
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to submit payment");
    }
  };

  const formatCurrency = (amount: number) => {
    return `रू ${amount.toFixed(2)}`;
  };

  const openingCurrent = Number((account as any)?.openingBalanceCurrent ?? 0);
  const openingProposed =
    (account as any)?.openingBalanceProposed != null
      ? Number((account as any).openingBalanceProposed)
      : null;
  const openingStatus = (account as any)?.openingBalanceStatus ?? null;
  const openingHistory = Array.isArray((account as any)?.openingBalanceHistory)
    ? (account as any).openingBalanceHistory
    : [];


  if (accountLoading || statementLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">Loading account details...</div>
      </div>
    );
  }

  const balanceAfterPayment = account
    ? account.balance - paymentRequestData.amount
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
              onClick={() => router.push("/dealer/dashboard/company")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Companies
            </Button>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            {account?.company.name} - Account
          </h1>
          <p className="text-muted-foreground">
            {account?.company.address || "Account details and payment history"}
          </p>
        </div>
        <Button onClick={() => setIsPaymentDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Submit Payment
        </Button>
      </div>

      {/* Account Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Amount Owed
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
            <CardTitle className="text-sm font-medium">
              Total Purchases
            </CardTitle>
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
            <p className="text-xs text-muted-foreground mt-1">
              Paid vs Purchased
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Opening balance proposal */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle>Opening balance</CardTitle>
            <CardDescription>
              Company proposes; dealer must accept/reject. Only accepted opening balance changes your total balance.
            </CardDescription>
          </div>
          {openingStatus && (
            <Badge variant="secondary">
              {openingStatus === "PENDING_ACK"
                ? "Pending your approval"
                : openingStatus === "ACKNOWLEDGED"
                  ? "Approved"
                  : openingStatus === "DISPUTED"
                    ? "Rejected"
                    : openingStatus}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs text-muted-foreground">Current (acknowledged)</p>
              <p className="text-2xl font-bold">{formatCurrency(Math.abs(openingCurrent))}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {openingCurrent > 0
                  ? "You owe company"
                  : openingCurrent < 0
                    ? "Company owes you (advance/credit)"
                    : "Not set"}
              </p>
            </div>

            {openingStatus === "PENDING_ACK" && openingProposed != null && (
              <div className="border rounded-md p-3 bg-muted/20 min-w-[240px]">
                <p className="text-xs text-muted-foreground">Proposed</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(Math.abs(openingProposed))}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {openingProposed > 0
                    ? "You owe company"
                    : "Company owes you (advance/credit)"}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    onClick={async () => {
                      try {
                        await ackOpeningMutation.mutateAsync({ companyId });
                        toast.success("Opening balance approved");
                      } catch (e: any) {
                        toast.error(
                          e?.response?.data?.message || "Failed to approve opening balance"
                        );
                      }
                    }}
                    disabled={ackOpeningMutation.isPending}
                  >
                    {ackOpeningMutation.isPending ? "Saving..." : "Accept"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDisputeNote("");
                      setIsDisputeOpen(true);
                    }}
                    disabled={disputeOpeningMutation.isPending}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            )}
          </div>

          {openingHistory.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-sm font-medium mb-2">History</p>
              <div className="space-y-2">
                {openingHistory.slice(0, 8).map((h: any) => (
                  <div
                    key={h.id}
                    className="flex items-start justify-between gap-3 border rounded-md p-2 text-sm"
                  >
                    <div className="text-xs text-muted-foreground">
                      <div>
                        <DateDisplay date={h.createdAt} />
                      </div>
                      {h.notes ? <div className="mt-0.5">{h.notes}</div> : null}
                      {h.dealerResponseNote ? (
                        <div className="mt-0.5">Dealer: {h.dealerResponseNote}</div>
                      ) : null}
                    </div>
                    <div
                      className={
                        Number(h.amount) >= 0
                          ? "text-red-600 font-medium"
                          : "text-green-600 font-medium"
                      }
                    >
                      {Number(h.amount) >= 0 ? "+" : "-"}
                      {formatCurrency(Math.abs(Number(h.amount)))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Statement */}
      <Card>
        <CardHeader>
          <CardTitle>Account Statement</CardTitle>
          <CardDescription>
            Purchase and payment transaction history
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!statement || statement.transactions.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No transactions yet
              </h3>
              <p className="text-muted-foreground">
                Transactions will appear here as purchases and payments are recorded
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {statement.transactions.map((transaction) => {
                const hasDiscount =
                  transaction.type === "SALE" &&
                  transaction.subtotalAmount != null &&
                  transaction.discountType &&
                  Number(transaction.subtotalAmount) > Number(transaction.amount);
                return (
                  <div
                    key={`${transaction.type}-${transaction.id}`}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-lg ${transaction.type === "SALE"
                            ? "bg-blue-100"
                            : "bg-green-100"
                          }`}
                      >
                        {transaction.type === "SALE" ? (
                          <Receipt className="h-5 w-5 text-blue-600" />
                        ) : (
                          <Wallet className="h-5 w-5 text-green-600" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {transaction.type === "SALE" ? "Purchase" : "Payment"}
                          </p>
                          {transaction.reference && (
                            <Badge variant="outline" className="text-xs">
                              {transaction.reference}
                            </Badge>
                          )}
                          {hasDiscount && (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 border-green-200">
                              Discount applied
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          <DateDisplay date={transaction.date} />
                        </p>
                        {hasDiscount && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Original {formatCurrency(transaction.subtotalAmount!)}
                            {transaction.discountType === "PERCENT"
                              ? ` → ${transaction.discountValue}% off`
                              : ` → रू ${Number(transaction.discountValue ?? 0).toFixed(2)} off`}
                            {" "}· Amount: {formatCurrency(transaction.amount)}
                          </p>
                        )}
                        {transaction.notes && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {transaction.notes}
                          </p>
                        )}
                        {transaction.paymentMethod && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {transaction.paymentMethod}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-lg font-bold ${transaction.type === "SALE"
                            ? "text-red-600"
                            : "text-green-600"
                          }`}
                      >
                        {transaction.type === "SALE" ? "+" : "-"}
                        {formatCurrency(transaction.amount)}
                      </p>
                      {transaction.balanceAfter !== undefined && (
                        <p className="text-xs text-muted-foreground">
                          Balance: {formatCurrency(transaction.balanceAfter)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Opening Balance Dialog */}
      <Dialog open={isDisputeOpen} onOpenChange={setIsDisputeOpen}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle>Reject opening balance</DialogTitle>
            <DialogDescription>
              Add an optional note. Company can propose again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Note (optional)</Label>
            <Textarea
              value={disputeNote}
              onChange={(e) => setDisputeNote(e.target.value)}
              placeholder="Reason"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDisputeOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                try {
                  await disputeOpeningMutation.mutateAsync({
                    companyId,
                    note: disputeNote.trim() ? disputeNote.trim() : undefined,
                  });
                  toast.success("Opening balance rejected");
                  setIsDisputeOpen(false);
                } catch (e: any) {
                  toast.error(e?.response?.data?.message || "Failed to reject opening balance");
                }
              }}
              disabled={disputeOpeningMutation.isPending}
            >
              {disputeOpeningMutation.isPending ? "Saving..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSendPaymentRequest}>
            <DialogHeader>
              <DialogTitle>Submit Payment</DialogTitle>
              <DialogDescription>
                Submit a payment to {account?.company.name}. The company will verify and approve it.
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
                {paymentRequestData.amount > 0 && (
                  <>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">
                        After Verification
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

              {/* Info Banner */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>How it works:</strong>
                </p>
                <ol className="text-xs text-blue-700 mt-1 list-decimal list-inside space-y-1">
                  <li>You submit payment details</li>
                  <li>Company reviews and verifies the payment</li>
                  <li>Balance updates on both your and company&apos;s account</li>
                </ol>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={paymentRequestData.amount || ""}
                  onChange={(e) =>
                    setPaymentRequestData({
                      ...paymentRequestData,
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
                  value={paymentRequestData.paymentMethod}
                  onValueChange={(value) =>
                    setPaymentRequestData({ ...paymentRequestData, paymentMethod: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
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

              <div className="space-y-2">
                <Label htmlFor="paymentReference">Reference Number (optional)</Label>
                <Input
                  id="paymentReference"
                  value={paymentRequestData.paymentReference}
                  onChange={(e) =>
                    setPaymentRequestData({ ...paymentRequestData, paymentReference: e.target.value })
                  }
                  placeholder="Transaction ID, Receipt #, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={paymentRequestData.description}
                  onChange={(e) =>
                    setPaymentRequestData({ ...paymentRequestData, description: e.target.value })
                  }
                  placeholder="Payment for purchases, advance payment, etc."
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPaymentDialogOpen(false)}
                disabled={createPaymentRequestMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createPaymentRequestMutation.isPending}>
                {createPaymentRequestMutation.isPending
                  ? "Submitting..."
                  : "Submit Payment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
