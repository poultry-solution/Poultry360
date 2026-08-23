"use client";

import Link from "next/link";
import { Button } from "@/common/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Badge } from "@/common/components/ui/badge";
import {
  Package,
  Users,
  TrendingUp,
  BarChart3,
  Loader2,
  IndianRupee,
  CreditCard,
  ArrowUpRight,
  Clock,
  Plus,
} from "lucide-react";
import { useGetCompanyLedgerSummary } from "@/fetchers/company/companyLedgerQueries";
import { useGetCompanyProductSummary } from "@/fetchers/company/companyProductQueries";
import { useGetCompanySales } from "@/fetchers/company/companySaleQueries";
import { DateDisplay } from "@/common/components/ui/date-display";

export default function CompanyHomePage() {
  // Fetch real data
  const { data: summaryData, isLoading: summaryLoading } = useGetCompanyLedgerSummary();
  const { data: productSummary, isLoading: productLoading } = useGetCompanyProductSummary();
 
  const { data: salesData, isLoading: salesLoading } = useGetCompanySales({
    limit: 5,
  });

  const isLoading = summaryLoading || productLoading;
  const summary = summaryData?.data;
  const products = productSummary?.data;
  const recentSales = salesData?.data || [];

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return "रू 0";
    return `रू ${amount.toLocaleString("en-IN")}`;
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Company Dashboard</h1>
          <p className="text-muted-foreground">
            Manage products, manual dealers, sales, and payments.
          </p>
        </div>

        <div className="flex gap-4">
          <Link href="/company/dashboard/sales/new">
            <Button variant="outline" className="gap-2 hover:bg-green-50 hover:text-green-700 border-green-200">
              <Plus className="h-4 w-4" />
              Add Sale
            </Button>
          </Link>
          <Link href="/company/dashboard/payments">
            <Button variant="outline" className="gap-2 hover:bg-green-50 hover:text-green-700 border-green-200">
              <CreditCard className="h-4 w-4" />
              Payments
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistics Cards - Row 1 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold">{products?.totalProducts || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">Products in catalog</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Manual Dealers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold">{products?.dealersCount || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">Dealers in current manual flow</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold">{summary?.totalSales || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">Total transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(summary?.totalRevenue)}</div>
            )}
            <p className="text-xs text-muted-foreground">Total sales revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Statistics Cards - Row 2 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(products?.totalInventoryValue)}</div>
            )}
            <p className="text-xs text-muted-foreground">Current stock value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(summary?.totalDue)}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Pending from dealers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payments Received</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(summary?.totalReceived)}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Total collected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Sales</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {salesLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold">{recentSales.length}</div>
            )}
            <p className="text-xs text-muted-foreground">Loaded on this dashboard</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recent Sales
          </CardTitle>
          <CardDescription>Latest manual sales recorded by the company</CardDescription>
        </CardHeader>
        <CardContent>
          {salesLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : recentSales.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No sales yet</h3>
              <p className="text-muted-foreground">
                Sales will appear here once they are recorded.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentSales.map((sale: any) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {sale.dealer?.name || "Unknown Dealer"}
                      </p>
                      {sale.invoiceNumber && (
                        <Badge variant="outline" className="text-xs">
                          {sale.invoiceNumber}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <DateDisplay date={sale.date} />
                    </p>
                    {sale.notes && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {sale.notes}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">
                      {formatCurrency(Number(sale.totalAmount))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product Types Summary */}
      {products?.productsByType && products.productsByType.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Inventory by Category
            </CardTitle>
            <CardDescription>Product distribution by type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {products.productsByType.map((type) => (
                <div
                  key={type.type}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium capitalize">{type.type.toLowerCase()}</p>
                    <p className="text-xs text-muted-foreground">
                      {type.count} products • {type.totalQuantity} units
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{formatCurrency(type.totalValue)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
