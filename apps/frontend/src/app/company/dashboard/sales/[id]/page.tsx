"use client";

import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  User,
  Phone,
  Package,
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
import { DataTable, Column } from "@/common/components/ui/data-table";
import { Badge } from "@/common/components/ui/badge";
import { useGetCompanySaleById } from "@/fetchers/company/companySaleQueries";

export default function CompanySaleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const saleId = params?.id as string;

  const { data: saleData, isLoading } = useGetCompanySaleById(saleId);
  const sale = saleData?.data;

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
  const hasDiscount = sale.subtotalAmount != null && sale.discount;
  const subtotalAmount = sale.subtotalAmount != null ? Number(sale.subtotalAmount) : totalAmount;
  const discountLabel = sale.discount
    ? sale.discount.type === "PERCENT"
      ? `${Number(sale.discount.value)}%`
      : `रू ${Number(sale.discount.value).toFixed(2)}`
    : "";

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
        {sale.dealer && (
          <Button
            onClick={() => router.push(`/company/dashboard/dealers/${sale.dealerId}/account`)}
            variant="outline"
          >
            <User className="mr-2 h-4 w-4" />
            View Dealer Account
          </Button>
        )}
      </div>

      {/* Sale Summary Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {hasDiscount ? "Amount breakdown" : "Sale Amount"}
          </CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {hasDiscount ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotalAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Discount ({discountLabel})</span>
                <span className="font-medium text-green-600">
                  - {formatCurrency(subtotalAmount - totalAmount)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="font-medium">Total</span>
                <span className="text-2xl font-bold">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          ) : (
            <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            Payment tracking is managed in dealer&apos;s account
          </p>
        </CardContent>
      </Card>

      {/* Sale Information */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Dealer Information */}
        <Card>
          <CardHeader>
            <CardTitle>Dealer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {sale.dealer ? sale.dealer.name : "N/A"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{sale.dealer ? sale.dealer.contact : "N/A"}</span>
            </div>
            {sale.dealer?.address && (
              <div className="flex items-start gap-2">
                <Package className="h-4 w-4 text-muted-foreground mt-1" />
                <span className="text-sm">{sale.dealer.address}</span>
              </div>
            )}
            {sale.dealer && (
              <Button
                className="w-full mt-4"
                variant="outline"
                onClick={() => router.push(`/company/dashboard/dealers/${sale.dealerId}/account`)}
              >
                View Full Account
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Sale Information */}
        <Card>
          <CardHeader>
            <CardTitle>Sale Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Payment Type</span>
                <Badge variant={sale.isCredit ? "secondary" : "default"}>
                  {sale.isCredit ? "Credit" : "Cash"}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Payment Method</span>
                <span className="font-medium text-sm">{sale.paymentMethod}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Date</span>
                <span className="font-medium text-sm">{formatDate(sale.date)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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

      {/* Items Table - Full Width */}
      <Card>
        <CardHeader className="p-3 md:p-6">
          <CardTitle className="text-base md:text-lg">Items Sold</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            {sale.items?.length || 0} item{sale.items?.length !== 1 ? "s" : ""} in this sale
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={sale.items || []}
            loading={false}
            emptyMessage="No items in this sale"
            columns={[
              {
                key: 'product',
                label: 'Product',
                width: '150px',
                render: (val) => <span className="font-medium">{val?.name || "Product"}</span>
              },
              {
                key: 'unitPrice',
                label: 'Unit Price',
                align: 'right',
                width: '100px',
                render: (val) => formatCurrency(Number(val))
              },
              {
                key: 'quantity',
                label: 'Quantity',
                align: 'right',
                width: '80px',
                render: (val) => Number(val).toFixed(2)
              },
              {
                key: 'totalAmount',
                label: 'Total',
                align: 'right',
                width: '100px',
                render: (val) => <span className="font-medium">{formatCurrency(Number(val))}</span>
              }
            ] as Column[]}
          />
          <div className="px-3 md:px-4 py-3 border-t space-y-1">
            {hasDiscount && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(subtotalAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount ({discountLabel})</span>
                  <span className="text-green-600">- {formatCurrency(subtotalAmount - totalAmount)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between items-center pt-1">
              <span className="font-semibold text-sm">Total Amount</span>
              <span className="text-lg md:text-xl font-bold">{formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

