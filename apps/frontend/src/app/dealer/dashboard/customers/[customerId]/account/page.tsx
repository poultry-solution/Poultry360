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
  Loader2,
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
import { useGetDealerSales } from "@/fetchers/dealer/dealerSaleQueries";
import { useGetPartyLedger, useAddDealerPayment } from "@/fetchers/dealer/dealerLedgerQueries";
import {
  useGetFarmerAccount,
  useGetFarmerAccountStatement,
  useRecordFarmerPayment,
} from "@/fetchers/dealer/dealerFarmerQueries";
import axiosInstance from "@/common/lib/axios";
import { useQuery } from "@tanstack/react-query";

export default function CustomerAccountPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.customerId as string;

  const [activeTab, setActiveTab] = useState("sales");
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    paymentMethod: "CASH",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  // Get customer details (prefer direct customer lookup, then fall back to ledger parties)
  const { data: customerData, isLoading: customerLoading } = useQuery({
    queryKey: ["dealer-customer", customerId],
    queryFn: async () => {
      try {
        const { data: customerRes } = await axiosInstance.get(`/sales/customers/${customerId}`);
        return customerRes;
      } catch (error) {
        // If direct customer lookup fails, fall back to ledger parties
        const { data } = await axiosInstance.get("/dealer/ledger/parties");
        const party = data?.data?.find((p: any) => p.id === customerId);

        if (party) {
          return {
            success: true,
            data: {
              id: party.id,
              name: party.name,
              phone: party.contact || "",
              address: party.address,
              balance: party.balance || 0,
              source: party.partyType === "FARMER" ? "CONNECTED" : "MANUAL",
              farmerId: party.partyType === "FARMER" ? party.id : undefined,
            },
          };
        }

        throw new Error("Customer not found");
      }
    },
    enabled: !!customerId,
  });

  // Determine if this is a connected farmer (use account API) or manual customer (use ledger)
  const customer = customerData?.data;
  const isFarmer = customer?.source === "CONNECTED" && customer?.farmerId;
  const farmerId = customer?.farmerId;
  const partyId = customerId;

  // Farmer: use account API
  const { data: accountData, isLoading: accountLoading } = useGetFarmerAccount(
    farmerId ?? ""
  );
  const { data: statementData, isLoading: statementLoading } =
    useGetFarmerAccountStatement(farmerId ?? "", { limit: 100 });
  const recordFarmerPaymentMutation = useRecordFarmerPayment();

  // Sales (for both: list by customerId)
  const { data: salesData, isLoading: salesLoading } = useGetDealerSales({
    customerId,
    limit: 100,
  });

  // Ledger (manual customers only)
  const { data: ledgerData, isLoading: ledgerLoading } = useGetPartyLedger(
    partyId,
    { limit: 100 }
  );
  const addPaymentMutation = useAddDealerPayment();

  const sales = salesData?.data || [];
  const ledgerEntries = ledgerData?.data || [];
  const account = accountData;
  const statement = statementData;
  const transactions = statement?.transactions ?? [];

  // Totals: from account for farmer, from sales/ledger for manual
  const totalSales = isFarmer && account
    ? Number(account.totalSales)
    : sales.reduce((sum: number, sale: any) => sum + Number(sale.totalAmount), 0);
  const totalPaid = isFarmer && account
    ? Number(account.totalPayments)
    : sales.reduce((sum: number, sale: any) => sum + Number(sale.paidAmount), 0);
  const currentBalance = isFarmer && account
    ? Number(account.balance)
    : (customer?.balance ?? sales.reduce((sum: number, sale: any) => sum + Number(sale.dueAmount || 0), 0));

  const payments = isFarmer
    ? transactions.filter((t: any) => t.type === "PAYMENT")
    : ledgerEntries.filter((entry: any) =>
        entry.type === "PAYMENT_RECEIVED" || entry.type === "PAYMENT"
      );

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentData.amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }
    try {
      if (isFarmer && farmerId) {
        await recordFarmerPaymentMutation.mutateAsync({
          farmerId,
          amount: paymentData.amount,
          paymentMethod: paymentData.paymentMethod,
          paymentDate: paymentData.date,
          notes: paymentData.notes || undefined,
        });
      } else {
        await addPaymentMutation.mutateAsync({
          customerId,
          amount: paymentData.amount,
          paymentMethod: paymentData.paymentMethod,
          date: paymentData.date,
          notes: paymentData.notes,
        });
      }
      toast.success("Payment recorded successfully");
      setIsPaymentDialogOpen(false);
      setPaymentData({
        amount: 0,
        paymentMethod: "CASH",
        date: new Date().toISOString().split("T")[0],
        notes: "",
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to record payment");
    }
  };

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

  const dataLoading = isFarmer
    ? accountLoading || statementLoading || salesLoading
    : salesLoading || ledgerLoading;
  if (customerLoading || dataLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading account details...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Customer not found</p>
          <Button
            variant="outline"
            onClick={() => router.push("/dealer/dashboard/customers")}
            className="mt-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customers
          </Button>
        </div>
      </div>
    );
  }

  const balanceAfterPayment = currentBalance - paymentData.amount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dealer/dashboard/customers")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Customers
            </Button>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            {customer.name} - Account
          </h1>
          <p className="text-muted-foreground">
            {customer.phone} {customer.address && `• ${customer.address}`}
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
                currentBalance > 0
                  ? "text-red-600"
                  : currentBalance < 0
                  ? "text-green-600"
                  : ""
              }`}
            >
              {formatCurrency(Math.abs(currentBalance))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {currentBalance > 0
                ? "Outstanding"
                : currentBalance < 0
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
              {formatCurrency(totalSales)}
            </div>
            {sales.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {sales.length} transaction(s)
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
              {formatCurrency(totalPaid)}
            </div>
            {payments.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {payments.length} payment(s)
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
              {totalSales
                ? Math.round((totalPaid / totalSales) * 100)
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
                Sales ({sales.length})
              </TabsTrigger>
              <TabsTrigger value="payments">
                Payments ({payments.length})
              </TabsTrigger>
            </TabsList>

            {/* Sales Tab */}
            <TabsContent value="sales" className="mt-4">
              {sales.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No sales yet</h3>
                  <p className="text-muted-foreground">
                    Sales will appear here once recorded
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sales.map((sale: any) => (
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
                          {sale.items && sale.items.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {sale.items.length} item(s)
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-red-600">
                          +{formatCurrency(Number(sale.totalAmount))}
                        </p>
                        {sale.dueAmount && Number(sale.dueAmount) > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Due: {formatCurrency(Number(sale.dueAmount))}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Payments Tab */}
            <TabsContent value="payments" className="mt-4">
              {payments.length === 0 ? (
                <div className="text-center py-8">
                  <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No payments yet</h3>
                  <p className="text-muted-foreground">
                    Payments will appear here once recorded
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((payment: any) => (
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
                            {payment.paymentMethod && (
                              <Badge variant="outline" className="text-xs">
                                {payment.paymentMethod}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(payment.date || payment.paymentDate)}
                          </p>
                          {(payment.description ?? payment.notes) && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {payment.description ?? payment.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">
                          -{formatCurrency(Number(payment.amount))}
                        </p>
                        {(payment.balance !== undefined || payment.balanceAfter !== undefined) && (
                          <p className="text-xs text-muted-foreground">
                            Balance: {formatCurrency(Number(payment.balanceAfter ?? payment.balance))}
                          </p>
                        )}
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
                Record a payment received from {customer.name}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Current Balance */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Current Balance</span>
                  <span
                    className={`text-xl font-bold ${
                      currentBalance > 0 ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {formatCurrency(Math.abs(currentBalance))}
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
                        {formatCurrency(Math.abs(balanceAfterPayment))}
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
                  value={paymentData.date}
                  onChange={(e) =>
                    setPaymentData({ ...paymentData, date: e.target.value })
                  }
                  required
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
                disabled={
                  isFarmer
                    ? recordFarmerPaymentMutation.isPending
                    : addPaymentMutation.isPending
                }
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isFarmer
                    ? recordFarmerPaymentMutation.isPending
                    : addPaymentMutation.isPending
                }
              >
                {isFarmer
                  ? recordFarmerPaymentMutation.isPending
                    ? "Recording..."
                    : "Record Payment"
                  : addPaymentMutation.isPending
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
