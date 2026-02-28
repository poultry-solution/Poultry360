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
  ShoppingCart,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/common/components/ui/tabs";
import { useGetDealerById } from "@/fetchers/dealers/dealerQueries";

function getCategoryBadgeColor(category: string | null | undefined) {
  switch (category) {
    case "FEED":
      return "bg-amber-100 text-amber-800";
    case "MEDICINE":
      return "bg-blue-100 text-blue-800";
    case "CHICKS":
      return "bg-yellow-100 text-yellow-800";
    case "EQUIPMENT":
      return "bg-gray-100 text-gray-800";
    case "OTHER":
      return "bg-purple-100 text-purple-800";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supplierId = params.id as string;

  const [activeTab, setActiveTab] = useState("purchases");

  const { data, isLoading, error, isError } = useGetDealerById(supplierId);

  const supplier = data?.data;
  const purchases: any[] = supplier?.purchases ?? [];
  const payments: any[] = supplier?.payments ?? [];

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

  // Use account-level totals when available (connected dealers), otherwise compute from transactions
  const totalPurchased = supplier?.summary?.totalPurchasedAmount
    ?? purchases.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalPaid = supplier?.summary?.totalPaidAmount
    ?? payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const currentBalance = supplier?.balance ?? 0;
  const paymentRate = totalPurchased
    ? Math.round((totalPaid / totalPurchased) * 100)
    : 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading supplier account...</p>
        </div>
      </div>
    );
  }

  if (isError || !supplier) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {error instanceof Error
              ? error.message
              : "Supplier not found."}
          </p>
          <Button
            variant="outline"
            onClick={() => router.push("/farmer/dashboard/supplier-ledger")}
            className="mt-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Supplier Ledger
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
          onClick={() => router.push("/farmer/dashboard/supplier-ledger")}
          className="mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Supplier Ledger
        </Button>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              {supplier.name}
            </h1>
            {supplier.connectionType === "CONNECTED" && (
              <Badge className="bg-blue-100 text-blue-800">Connected</Badge>
            )}
          </div>
          {supplier.connectionType === "CONNECTED" && (
            <Button
              onClick={() =>
                router.push(
                  `/farmer/dashboard/supplier-ledger/${supplierId}/catalog`
                )
              }
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Order Products
            </Button>
          )}
        </div>
        <p className="text-muted-foreground">
          {supplier.contact}
          {supplier.address && ` • ${supplier.address}`}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Outstanding Balance
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-xl md:text-2xl font-bold ${
                currentBalance > 0 ? "text-red-600" : "text-green-600"
              }`}
            >
              {formatCurrency(Math.abs(currentBalance))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {currentBalance > 0
                ? "You owe this supplier"
                : currentBalance < 0
                  ? "Advance payment"
                  : "Settled"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Purchased
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">
              {formatCurrency(totalPurchased)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {purchases.length} purchase(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
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
            <p className="text-xs text-muted-foreground mt-1">
              Paid vs purchased
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Statement tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Account Statement</CardTitle>
          <CardDescription>
            Purchases from and payments to this supplier
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="purchases">
                Purchases ({purchases.length})
              </TabsTrigger>
              <TabsTrigger value="payments">
                Payments ({payments.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="purchases" className="mt-4">
              {purchases.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No purchases yet
                  </h3>
                  <p className="text-muted-foreground">
                    Purchase entries for this supplier will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {purchases.map((purchase: any) => (
                    <div
                      key={purchase.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-blue-100">
                          <Receipt className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium">
                              {purchase.itemName || "Purchase"}
                            </p>
                            {purchase.purchaseCategory && (
                              <Badge
                                className={`text-xs ${getCategoryBadgeColor(purchase.purchaseCategory)}`}
                              >
                                {purchase.purchaseCategory}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(purchase.date)}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            {purchase.quantity && (
                              <span>
                                Qty: {purchase.quantity}
                                {purchase.freeQuantity > 0 && (
                                  <span className="text-green-600">
                                    {" "}
                                    +{purchase.freeQuantity} free
                                  </span>
                                )}
                              </span>
                            )}
                            {purchase.reference && (
                              <Badge variant="outline" className="text-xs">
                                {purchase.reference}
                              </Badge>
                            )}
                          </div>
                          {purchase.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {purchase.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {purchase.subtotalAmount != null && (
                          <p className="text-xs text-muted-foreground line-through">
                            {formatCurrency(Number(purchase.subtotalAmount))}
                          </p>
                        )}
                        <p className="text-lg font-bold text-red-600">
                          +{formatCurrency(Number(purchase.amount))}
                        </p>
                        {purchase.discountType && purchase.discountValue != null && (
                          <p className="text-xs text-green-600">
                            {purchase.discountType === "PERCENT"
                              ? `${Number(purchase.discountValue)}% off`
                              : `रू ${Number(purchase.discountValue)} off`}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="payments" className="mt-4">
              {payments.length === 0 ? (
                <div className="text-center py-8">
                  <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No payments yet
                  </h3>
                  <p className="text-muted-foreground">
                    Payments to this supplier will appear here
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
                            {formatDate(payment.date)}
                          </p>
                          {payment.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {payment.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">
                          -{formatCurrency(Number(payment.amount))}
                        </p>
                        {payment.balanceAfter != null && (
                          <p className="text-xs text-muted-foreground">
                            Balance: {formatCurrency(Number(payment.balanceAfter))}
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
    </div>
  );
}
