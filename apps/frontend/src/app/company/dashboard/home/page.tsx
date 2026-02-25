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
  Truck,
  CreditCard,
  ArrowUpRight,
  Clock,
  Plus,
} from "lucide-react";
import { useGetCompanyLedgerSummary } from "@/fetchers/company/companyLedgerQueries";
import { useGetCompanyProductSummary } from "@/fetchers/company/companyProductQueries";
import { useGetCompanyConsignments } from "@/fetchers/company/consignmentQueries";
import { useGetCompanySales } from "@/fetchers/company/companySaleQueries";
import { DateDisplay } from "@/common/components/ui/date-display";

export default function CompanyHomePage() {
  // Fetch real data
  const { data: summaryData, isLoading: summaryLoading } = useGetCompanyLedgerSummary();
  const { data: productSummary, isLoading: productLoading } = useGetCompanyProductSummary();
  const { data: consignmentsData, isLoading: consignmentsLoading } = useGetCompanyConsignments({
    limit: 5,
    status: "DISPATCHED",
  });
  const { data: salesData, isLoading: salesLoading } = useGetCompanySales({
    limit: 5,
  });

  const isLoading = summaryLoading || productLoading;
  const summary = summaryData?.data;
  const products = productSummary?.data;
  const recentConsignments = consignmentsData?.data || [];
  const recentSales = salesData?.data || [];

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return "रू 0";
    return `रू ${amount.toLocaleString("en-IN")}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DISPATCHED":
        return <Badge variant="default" className="bg-purple-600">Dispatched</Badge>;
      case "RECEIVED":
        return <Badge variant="default" className="bg-green-600">Received</Badge>;
      case "CREATED":
        return <Badge variant="secondary">Pending</Badge>;
      case "ACCEPTED_PENDING_DISPATCH":
        return <Badge variant="default" className="bg-blue-600">Accepted</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Company Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your products, dealers, and distribution network.
          </p>
        </div>

        <div className="flex gap-4">
          <Link href="/company/dashboard/sales/new">
            <Button variant="outline" className="gap-2 hover:bg-green-50 hover:text-green-700 border-green-200">
              <Plus className="h-4 w-4" />
              Add Sale
            </Button>
          </Link>
          <Link href="/company/dashboard/consignments">
            <Button variant="outline" className="gap-2 hover:bg-green-50 hover:text-green-700 border-green-200">
              <Truck className="h-4 w-4" />
              Consignments
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
            <CardTitle className="text-sm font-medium">Active Dealers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold">{products?.dealersCount || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">Connected dealers</p>
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
            <CardTitle className="text-sm font-medium">Active Consignments</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold">{summary?.activeConsignments || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">In transit</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Recent Consignments
            </CardTitle>
            <CardDescription>Latest dispatched consignments</CardDescription>
          </CardHeader>
          <CardContent>
            {consignmentsLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : recentConsignments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No recent consignments
              </p>
            ) : (
              <div className="space-y-3">
                {recentConsignments.map((consignment) => (
                  <div
                    key={consignment.id}
                    className="flex items-center justify-between border-b pb-2 last:border-0"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {consignment.toDealer?.name || "N/A"}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <DateDisplay date={consignment.createdAt} />
                        <span>•</span>
                        <span>{consignment.items.length} items</span>
                      </div>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(consignment.status)}
                      <p className="text-sm font-medium mt-1">
                        {formatCurrency(Number(consignment.totalAmount))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recent Sales
            </CardTitle>
            <CardDescription>Latest sales transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {salesLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : recentSales.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No recent sales
              </p>
            ) : (
              <div className="space-y-3">
                {recentSales.map((sale: any) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between border-b pb-2 last:border-0"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {sale.dealer?.name || "N/A"}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono">{sale.invoiceNumber}</span>
                        <span>•</span>
                        <Clock className="h-3 w-3" />
                        <DateDisplay date={sale.date} />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">
                        {formatCurrency(Number(sale.totalAmount))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sale.items?.length || 0} items
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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

