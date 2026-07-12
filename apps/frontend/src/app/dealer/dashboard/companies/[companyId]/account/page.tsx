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
  useRecordCompanyPayment,
} from "@/fetchers/dealer/dealerCompanyAccountQueries";
import { DateDisplay } from "@/common/components/ui/date-display";

export default function CompanyAccountPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.companyId as string;

  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    paymentMethod: "CASH",
    reference: "",
    notes: "",
  });

  // Queries
  const { data: account, isLoading: accountLoading } =
    useGetCompanyAccount(companyId);
  const { data: statement, isLoading: statementLoading } =
    useGetCompanyAccountStatement(companyId);

  // Mutations
  const recordPaymentMutation = useRecordCompanyPayment();

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (paymentData.amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    try {
      await recordPaymentMutation.mutateAsync({
        companyId,
        amount: paymentData.amount,
        paymentMethod: paymentData.paymentMethod,
        reference: paymentData.reference || undefined,
        notes: paymentData.notes || undefined,
      });
      toast.success("Payment recorded successfully");
      setIsPaymentDialogOpen(false);
      setPaymentData({
        amount: 0,
        paymentMethod: "CASH",
        reference: "",
        notes: "",
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to record payment");
    }
  };

  const formatCurrency = (amount: number) => {
    return `रू ${amount.toFixed(2)}`;
  };

  const openingCurrent = Number((account as any)?.openingBalanceCurrent ?? 0);

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
          Record Payment
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

      {/* Opening balance */}
      <Card>
        <CardHeader>
          <CardTitle>Opening balance</CardTitle>
          <CardDescription>
            Current starting balance applied to this company account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{formatCurrency(Math.abs(openingCurrent))}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {openingCurrent > 0
              ? "You owe company"
              : openingCurrent < 0
                ? "Company owes you (advance/credit)"
                : "Not set"}
          </p>
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

      {/* Record Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleRecordPayment}>
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
              <DialogDescription>
                Record a direct payment to {account?.company.name}.
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
                  value={paymentData.reference}
                  onChange={(e) =>
                    setPaymentData({ ...paymentData, reference: e.target.value })
                  }
                  placeholder="Transaction ID, Receipt #, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Notes (optional)</Label>
                <Textarea
                  id="description"
                  value={paymentData.notes}
                  onChange={(e) =>
                    setPaymentData({ ...paymentData, notes: e.target.value })
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
                disabled={recordPaymentMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={recordPaymentMutation.isPending}>
                {recordPaymentMutation.isPending
                  ? "Saving..."
                  : "Record Payment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
