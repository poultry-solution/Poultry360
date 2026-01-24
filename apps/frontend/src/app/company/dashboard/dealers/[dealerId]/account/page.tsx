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
import { toast } from "sonner";
import {
  useGetDealerAccount,
  useGetDealerAccountStatement,
  useRecordDealerPayment,
} from "@/fetchers/company/companyDealerAccountQueries";

export default function DealerAccountPage() {
  const params = useParams();
  const router = useRouter();
  const dealerId = params.dealerId as string;

  const [activeTab, setActiveTab] = useState("sales");
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    paymentMethod: "CASH",
    paymentDate: new Date().toISOString().split("T")[0],
    notes: "",
    reference: "",
  });

  // Queries
  const { data: account, isLoading: accountLoading } =
    useGetDealerAccount(dealerId);
  const { data: statement, isLoading: statementLoading } =
    useGetDealerAccountStatement(dealerId);

  // Mutations
  const recordPaymentMutation = useRecordDealerPayment();

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
      });
      toast.success("Payment recorded successfully");
      setIsPaymentDialogOpen(false);
      setPaymentData({
        amount: 0,
        paymentMethod: "CASH",
        paymentDate: new Date().toISOString().split("T")[0],
        notes: "",
        reference: "",
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to record payment");
    }
  };

  const formatCurrency = (amount: number) => {
    return `रू ${amount.toFixed(2)}`;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
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
              className={`text-2xl font-bold ${
                (account?.balance || 0) > 0
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
                Last: {formatDate(account.lastSaleDate)}
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
                Last: {formatDate(account.lastPaymentDate)}
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
                  {statement.sales.map((sale) => (
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
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(sale.date)}
                          </p>
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
                  ))}
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
                            {formatDate(payment.paymentDate)}
                          </p>
                          {payment.notes && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {payment.notes}
                            </p>
                          )}
                          {(payment.receiptImageUrl || payment.proofImageUrl) && (
                            <Badge variant="secondary" className="text-xs mt-1">
                              Receipt Available
                            </Badge>
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
                    className={`text-xl font-bold ${
                      (account?.balance || 0) > 0 ? "text-red-600" : "text-green-600"
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
                        className={`font-bold ${
                          balanceAfterPayment > 0
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
                <Label htmlFor="paymentDate">Payment Date *</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={paymentData.paymentDate}
                  onChange={(e) =>
                    setPaymentData({ ...paymentData, paymentDate: e.target.value })
                  }
                  required
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
                  rows={3}
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
