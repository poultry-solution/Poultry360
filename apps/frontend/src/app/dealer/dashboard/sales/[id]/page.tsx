"use client";

import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  User,
  Phone,
  CreditCard,
  Package,
  FileText,
  Check,
  X,
  Wallet,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import { Badge } from "@/common/components/ui/badge";
import { useGetDealerSaleById } from "@/fetchers/dealer/dealerSaleQueries";

export default function SaleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const saleId = params?.id as string;

  const { data: saleData, isLoading } = useGetDealerSaleById(saleId);
  const sale = saleData?.data;

  // Payments for connected farmers are managed at account level (no bill-level payment UI)
  const isFarmerAccountSale = Boolean(sale?.accountId ?? sale?.farmerId ?? sale?.customer?.farmerId);
  const farmerId = sale?.farmerId ?? sale?.customer?.farmerId;

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number) => {
    return `रू ${amount.toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        Loading sale details...
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <h3 className="text-lg font-semibold mb-2">Sale not found</h3>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const totalAmount = Number(sale.totalAmount);
  const paidAmount = Number(sale.paidAmount);
  const dueAmount = Number(sale.dueAmount) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Invoice #{sale.invoiceNumber || sale.id.slice(0, 8)}
            </h1>
            <p className="text-muted-foreground">
              Sale created on {formatDate(sale.date)}
            </p>
          </div>
        </div>
        {isFarmerAccountSale && farmerId && (
          <Button asChild variant="outline">
            <Link href={`/dealer/dashboard/customers/${sale.customerId ?? farmerId}/account`}>
              <Wallet className="mr-2 h-4 w-4" />
              View farmer account
            </Link>
          </Button>
        )}
      </div>

      {/* Sale Summary Cards: for farmer-linked sales only total (account-only model); for manual sales show Paid/Due */}
      <div className={`grid gap-4 ${isFarmerAccountSale ? "md:grid-cols-1" : "md:grid-cols-3"}`}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
            {isFarmerAccountSale && (
              <p className="text-xs text-muted-foreground mt-2">
                Payment tracking is managed in farmer account
              </p>
            )}
          </CardContent>
        </Card>
        {!isFarmerAccountSale && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Paid Amount</CardTitle>
                <Check className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(paidAmount)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Due Amount</CardTitle>
                <X className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(dueAmount)}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Sale Details */}
        <div className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {sale.customer
                    ? sale.customer.name
                    : sale.farmer
                    ? sale.farmer.name
                    : "N/A"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>
                  {sale.customer
                    ? sale.customer.phone
                    : sale.farmer
                    ? sale.farmer.phone
                    : "N/A"}
                </span>
              </div>
              {sale.customer?.address && (
                <div className="flex items-start gap-2">
                  <Package className="h-4 w-4 text-muted-foreground mt-1" />
                  <span className="text-sm">{sale.customer.address}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Status: for farmer-linked sales no bill-level status; for manual sales show Paid/Due */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Information</CardTitle>
            </CardHeader>
            <CardContent>
              {isFarmerAccountSale ? (
                <p className="text-sm text-muted-foreground">
                  Payment tracking is managed in farmer account. Record and view payments from the farmer&apos;s account page.
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Payment Type</span>
                    <Badge variant={sale.isCredit ? "destructive" : "default"}>
                      {sale.isCredit ? "Credit" : "Cash"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Payment Method</span>
                    <span className="font-medium text-sm">{sale.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge variant={dueAmount > 0 ? "destructive" : "secondary"}>
                      {dueAmount > 0 ? "Pending" : "Fully Paid"}
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {sale.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground mt-1" />
                  <p className="text-sm text-muted-foreground">{sale.notes}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Payment: for farmer-linked sales only account CTA; for manual sales show bill-level payments */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment</CardTitle>
              <CardDescription>
                {isFarmerAccountSale
                  ? "Payment tracking is managed in farmer account."
                  : sale.payments && sale.payments.length > 0
                    ? `${sale.payments.length} payment${sale.payments.length > 1 ? "s" : ""} recorded`
                    : "No payments recorded for this sale."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isFarmerAccountSale && farmerId ? (
                <div className="text-center py-6 text-muted-foreground space-y-3">
                  <Wallet className="h-12 w-12 mx-auto opacity-50" />
                  <p className="text-sm">
                    Record and view payments from the farmer&apos;s account.
                  </p>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/dealer/dashboard/customers/${sale.customerId ?? farmerId}/account`}>
                      Open farmer account
                    </Link>
                  </Button>
                </div>
              ) : (
                <>
                  {sale.payments && sale.payments.length > 0 ? (
                    <div className="space-y-3">
                      {sale.payments.map((payment: any) => (
                        <div
                          key={payment.id}
                          className="p-3 border rounded-lg space-y-2"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-semibold">
                                {formatCurrency(Number(payment.amount))}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatDate(payment.paymentDate ?? payment.date)}
                              </div>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {payment.method ?? payment.paymentMethod ?? "—"}
                            </Badge>
                          </div>
                          {payment.notes && (
                            <div className="text-xs text-muted-foreground pt-2 border-t">
                              {payment.notes}
                            </div>
                          )}
                        </div>
                      ))}
                      <div className="p-3 bg-muted rounded-lg space-y-2 mt-4">
                        <div className="flex justify-between text-sm">
                          <span>Total Amount:</span>
                          <span className="font-semibold">{formatCurrency(totalAmount)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Total Paid:</span>
                          <span className="font-semibold">{formatCurrency(paidAmount)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-red-600 pt-2 border-t border-border">
                          <span className="font-semibold">Remaining:</span>
                          <span className="font-bold">{formatCurrency(dueAmount)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm">No payments recorded for this sale.</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Items Table - Full Width */}
      <Card>
        <CardHeader>
          <CardTitle>Items Purchased</CardTitle>
          <CardDescription>
            {sale.items?.length || 0} item{sale.items?.length !== 1 ? "s" : ""} in this sale
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sale.items?.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.dealerProduct?.name || "Product"}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(Number(item.unitPrice))}
                  </TableCell>
                  <TableCell className="text-right">
                    {Number(item.quantity).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(Number(item.totalAmount))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-between items-center pt-4 border-t mt-4">
            <span className="font-semibold">Total Amount</span>
            <span className="text-xl font-bold">{formatCurrency(totalAmount)}</span>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
