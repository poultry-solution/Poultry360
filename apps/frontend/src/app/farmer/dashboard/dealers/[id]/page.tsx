"use client";

import { useState } from "react";
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
import { Input } from "@/common/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog";
import { toast } from "sonner";
import {
  useAcknowledgeConnectedOpeningBalance,
  useDisputeConnectedOpeningBalance,
  useGetDealerDetailsForFarmer,
} from "@/fetchers/farmer/farmerVerificationQueries";

export default function FarmerDealerAccountPage() {
  const params = useParams();
  const router = useRouter();
  const dealerId = params.id as string;

  const [activeTab, setActiveTab] = useState("sales");
  const [isDisputeOpen, setIsDisputeOpen] = useState(false);
  const [disputeNote, setDisputeNote] = useState("");

  const { data, isLoading, error, isError } = useGetDealerDetailsForFarmer(dealerId);
  const ackOpeningMutation = useAcknowledgeConnectedOpeningBalance();
  const disputeOpeningMutation = useDisputeConnectedOpeningBalance();

  const payload = data?.data;
  const dealer = payload?.dealer;
  const account = payload?.account;
  const sales = payload?.sales ?? [];
  const payments = payload?.payments ?? [];
  const connectionId = payload?.connection?.id;
  const opening = account?.openingBalance ?? null;
  const openingHistory = account?.openingBalanceHistory ?? [];
  const openingHistoryWithoutCurrent = opening
    ? openingHistory.filter((entry) => entry.id !== opening.id)
    : openingHistory;

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

  const totalSales = account?.totalSales ?? 0;
  const totalPaid = account?.totalPayments ?? 0;
  const currentBalance = account?.balance ?? 0;
  const paymentRate = totalSales ? Math.round((totalPaid / totalSales) * 100) : 0;

  const openingStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING_ACK":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
      case "ACKNOWLEDGED":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Acknowledged</Badge>;
      case "DISPUTED":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Disputed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const describeSignedAmount = (amount: number) => {
    if (amount > 0) return "You owe dealer";
    if (amount < 0) return "Dealer owes you (advance/credit)";
    return "Settled";
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading dealer account...</p>
        </div>
      </div>
    );
  }

  if (isError || !payload || !dealer) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : "Dealer not found or you are not connected."}
          </p>
          <Button
            variant="outline"
            onClick={() => router.push("/farmer/dashboard/dealers")}
            className="mt-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dealers
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
          onClick={() => router.push("/farmer/dashboard/dealers")}
          className="mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dealers
        </Button>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          {dealer.name} – Account
        </h1>
        <p className="text-muted-foreground">
          {dealer.contact}
          {dealer.address && ` • ${dealer.address}`}
        </p>
        {dealer.owner && (
          <p className="text-sm text-muted-foreground mt-1">
            Owner: {dealer.owner.name} {dealer.owner.phone && `• ${dealer.owner.phone}`}
          </p>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-xl md:text-2xl font-bold ${
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
                ? "Dealer owes you"
                : currentBalance < 0
                  ? "Advance / credit"
                  : "Settled"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">
              {formatCurrency(totalSales)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {sales.length} sale(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <TrendingDown className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">
              {formatCurrency(totalPaid)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {payments.length} payment(s)
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
            <p className="text-xs text-muted-foreground mt-1">Paid vs purchased</p>
          </CardContent>
        </Card>
      </div>

      {/* Opening balance acknowledgement (connected) */}
      <Card>
        <CardHeader>
          <CardTitle>Opening balance</CardTitle>
          <CardDescription>
            Dealer can propose an opening balance; you must acknowledge (or dispute) each change.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!opening ? (
            <p className="text-sm text-muted-foreground">No opening balance has been set for this connection.</p>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium">{formatCurrency(Math.abs(opening.amount))}</p>
                    {openingStatusBadge(opening.status)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{describeSignedAmount(opening.amount)}</p>
                  {opening.notes && (
                    <p className="text-sm text-muted-foreground mt-1">{opening.notes}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Proposed on {formatDate(opening.createdAt)}
                  </p>
                  {opening.respondedAt && (
                    <p className="text-xs text-muted-foreground">
                      Responded on {formatDate(opening.respondedAt)}
                      {opening.farmerResponseNote ? ` • ${opening.farmerResponseNote}` : ""}
                    </p>
                  )}
                </div>

                {opening.status === "PENDING_ACK" && connectionId && (
                  <div className="flex gap-2">
                    <Button
                      onClick={async () => {
                        try {
                          await ackOpeningMutation.mutateAsync({
                            connectionId,
                            dealerId,
                          });
                          toast.success("Opening balance acknowledged");
                        } catch (e: any) {
                          toast.error(e?.response?.data?.message || "Failed to acknowledge opening balance");
                        }
                      }}
                      disabled={ackOpeningMutation.isPending}
                    >
                      {ackOpeningMutation.isPending ? "Saving..." : "Acknowledge"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDisputeNote("");
                        setIsDisputeOpen(true);
                      }}
                      disabled={disputeOpeningMutation.isPending}
                    >
                      Dispute
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {openingHistoryWithoutCurrent.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-sm font-medium mb-2">History</p>
              <div className="space-y-2">
                {openingHistoryWithoutCurrent.map((h) => (
                  <div key={h.id} className="flex items-start justify-between gap-3 text-sm">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{formatCurrency(Math.abs(h.amount))}</span>
                        {openingStatusBadge(h.status)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {describeSignedAmount(h.amount)} • {formatDate(h.createdAt)}
                      </div>
                      {h.notes && <div className="text-xs text-muted-foreground">{h.notes}</div>}
                      {h.respondedAt && (
                        <div className="text-xs text-muted-foreground">
                          Responded: {formatDate(h.respondedAt)}
                          {h.farmerResponseNote ? ` • ${h.farmerResponseNote}` : ""}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Statement tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Account Statement</CardTitle>
          <CardDescription>
            Purchases (sales to this dealer) and payments received
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sales">Purchases ({sales.length})</TabsTrigger>
              <TabsTrigger value="payments">Payments ({payments.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="sales" className="mt-4">
              {sales.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No purchases yet</h3>
                  <p className="text-muted-foreground">
                    Sales to this dealer will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sales.map((sale) => {
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
                            <div className="flex items-center gap-2 flex-wrap">
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
                              {formatDate(sale.date)}
                            </p>
                            {hasDiscount && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Original {formatCurrency(sale.subtotalAmount!)}
                                {sale.discountType === "PERCENT"
                                  ? ` → ${sale.discountValue}% off`
                                  : ` → रू ${Number(sale.discountValue || 0).toFixed(2)} off`}
                                {" "}· You paid {formatCurrency(sale.amount)}
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

            <TabsContent value="payments" className="mt-4">
              {payments.length === 0 ? (
                <div className="text-center py-8">
                  <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No payments yet</h3>
                  <p className="text-muted-foreground">
                    Payments from this dealer will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((payment) => (
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
                            {formatDate(payment.paymentDate)}
                          </p>
                          {payment.notes && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {payment.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">
                          -{formatCurrency(payment.amount)}
                        </p>
                        {payment.balanceAfter != null && (
                          <p className="text-xs text-muted-foreground">
                            Balance: {formatCurrency(payment.balanceAfter)}
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

      {/* Dispute dialog */}
      <Dialog open={isDisputeOpen} onOpenChange={setIsDisputeOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Dispute opening balance</DialogTitle>
            <DialogDescription>
              Add an optional note explaining why you disagree. Dealer will need to set it again.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Reason (optional)"
            value={disputeNote}
            onChange={(e) => setDisputeNote(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDisputeOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!connectionId) return;
                try {
                  await disputeOpeningMutation.mutateAsync({
                    connectionId,
                    dealerId,
                    note: disputeNote.trim() ? disputeNote.trim() : undefined,
                  });
                  toast.success("Opening balance disputed");
                  setIsDisputeOpen(false);
                } catch (e: any) {
                  toast.error(e?.response?.data?.message || "Failed to dispute opening balance");
                }
              }}
              disabled={disputeOpeningMutation.isPending || !connectionId}
            >
              {disputeOpeningMutation.isPending ? "Saving..." : "Submit dispute"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
