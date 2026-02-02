"use client";

import Link from "next/link";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/common/components/ui/alert";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import { Package, Users, Receipt, TrendingUp, Loader2, X, CheckCircle, Clock, XCircle, AlertCircle, Plus, Truck } from "lucide-react";
import {
  useGetDealerVerificationRequests,
  useAcknowledgeVerificationRequest,
} from "@/fetchers/dealer/dealerVerificationQueries";
import { type DealerVerificationRequest } from "@/fetchers/dealer/dealerVerificationQueries";
import { useGetInventorySummary } from "@/fetchers/dealer/dealerProductQueries";
import { useGetSalesStatistics, useGetDealerSales } from "@/fetchers/dealer/dealerSaleQueries";
import { useGetDealerProducts } from "@/fetchers/dealer/dealerProductQueries";
import { useGetLedgerSummary } from "@/fetchers/dealer/dealerLedgerQueries";

export default function DealerHomePage() {
  const [dismissedBanners, setDismissedBanners] = useState<Set<string>>(new Set());

  // Get verification requests to check for unacknowledged messages
  const { data: requestsData } = useGetDealerVerificationRequests();
  const acknowledgeMutation = useAcknowledgeVerificationRequest();

  const requests = requestsData?.data || [];

  // Find unacknowledged requests with status changes
  const unacknowledgedRequests = requests.filter(
    (request: DealerVerificationRequest) =>
      !request.acknowledgedAt &&
      !dismissedBanners.has(request.id) &&
      request.status !== "PENDING" // Only show approved/rejected status changes
  );

  // Get the most recent unacknowledged request
  const latestRequest = unacknowledgedRequests.length > 0
    ? unacknowledgedRequests.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )[0]
    : null;

  const handleDismiss = async (requestId: string) => {
    // Add to dismissed set immediately for UI responsiveness
    setDismissedBanners((prev) => new Set(prev).add(requestId));

    try {
      // Acknowledge on backend
      await acknowledgeMutation.mutateAsync(requestId);
    } catch (error) {
      // If acknowledgment fails, remove from dismissed set
      setDismissedBanners((prev) => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  const getStatusBanner = (request: DealerVerificationRequest) => {
    const companyName = request.company?.name || "Company";

    switch (request.status) {
      case "APPROVED":
        return {
          variant: "default" as const,
          title: "Connection Approved!",
          description: `Congratulations! You are now connected with ${companyName}. You can now interact with them through your Companies page.`,
          icon: CheckCircle,
          className: "bg-green-50 border-green-200 text-green-900",
          iconClassName: "text-green-600",
        };
      case "REJECTED":
        return {
          variant: "destructive" as const,
          title: "Request Rejected",
          description: `Your request to join ${companyName} was rejected. ${request.rejectedCount >= 3
              ? "You have reached the maximum rejection limit (3) and cannot apply again."
              : request.rejectedCount === 2
                ? "This is your 2nd rejection. One more rejection and you won't be able to apply again."
                : "You can retry after 1 hour from the Companies page."
            }`,
          icon: XCircle,
          className: "bg-red-50 border-red-200 text-red-900",
          iconClassName: "text-red-600",
        };
      case "PENDING":
        return {
          variant: "default" as const,
          title: "Request Pending",
          description: `Your request to join ${companyName} is pending approval. We'll notify you once the company responds.`,
          icon: Clock,
          className: "bg-yellow-50 border-yellow-200 text-yellow-900",
          iconClassName: "text-yellow-600",
        };
      default:
        return null;
    }
  };

  // Calculate current month date range
  const currentDate = new Date();
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
  const startDate = startOfMonth.toISOString().split('T')[0];
  const endDate = endOfMonth.toISOString().split('T')[0];

  // Fetch real data
  const { data: inventoryData, isLoading: inventoryLoading } = useGetInventorySummary();
  const { data: salesStatsData, isLoading: salesStatsLoading } = useGetSalesStatistics({
    startDate,
    endDate,
  });
  const { data: recentSalesData, isLoading: recentSalesLoading } = useGetDealerSales({
    limit: 5,
  });
  const { data: lowStockData, isLoading: lowStockLoading } = useGetDealerProducts({
    lowStock: true,
    limit: 10,
  });
  const { data: ledgerSummaryData, isLoading: ledgerLoading } = useGetLedgerSummary();

  // Combine loading states
  const isLoading = inventoryLoading || salesStatsLoading || recentSalesLoading || lowStockLoading || ledgerLoading;

  // Extract data
  const inventory = inventoryData?.data;
  const salesStats = salesStatsData?.data;
  const recentSales = recentSalesData?.data || [];
  const lowStockProducts = lowStockData?.data || [];
  const ledgerSummary = ledgerSummaryData?.data;

  // Helper functions
  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return "₹ 0";
    return `₹ ${amount.toLocaleString("en-IN")}`;
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Calculate stats
  const stats = {
    totalInventory: inventory?.totalProducts || 0,
    totalCustomers: ledgerSummary?.outstandingBalances || 0,
    totalSales: salesStats?.totalSales || 0,
    monthlyRevenue: salesStats?.totalRevenue || 0,
  };

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      {latestRequest && (() => {
        const bannerConfig = getStatusBanner(latestRequest);
        if (!bannerConfig) return null;

        const Icon = bannerConfig.icon;

        return (
          <Alert className={bannerConfig.className}>
            <Icon className={`h-4 w-4 ${bannerConfig.iconClassName}`} />
            <AlertTitle>{bannerConfig.title}</AlertTitle>
            <AlertDescription className="flex items-start justify-between">
              <span className="flex-1">{bannerConfig.description}</span>
              <Button
                variant="ghost"
                size="sm"
                className="ml-4 h-auto p-1 hover:bg-transparent"
                onClick={() => handleDismiss(latestRequest.id)}
                disabled={acknowledgeMutation.isPending}
              >
                <X className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        );
      })()}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dealer Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your inventory, customers, and sales.
          </p>
        </div>

        <div className="flex gap-4">
          <Link href="/dealer/dashboard/sales/new">
            <Button className="gap-2 bg-background text-foreground border border-input hover:bg-primary hover:text-primary-foreground">
              <Plus className="h-4 w-4" />
              Add Sale
            </Button>
          </Link>
          <Link href="/dealer/dashboard/consignments">
            <Button variant="outline" className="gap-2 hover:bg-primary hover:text-primary-foreground">
              <Truck className="h-4 w-4" />
              Consignments
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inventory</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold">{stats.totalInventory}</div>
            )}
            <p className="text-xs text-muted-foreground">Items in stock</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold">{stats.totalCustomers}</div>
            )}
            <p className="text-xs text-muted-foreground">Active customers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold">{stats.totalSales}</div>
            )}
            <p className="text-xs text-muted-foreground">Transactions this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(stats.monthlyRevenue)}</div>
            )}
            <p className="text-xs text-muted-foreground">Revenue this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Recent Sales
            </CardTitle>
            <CardDescription>Latest sales transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {recentSalesLoading ? (
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
                        {sale.customer?.name || sale.farmer?.name || "N/A"}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono">{sale.invoiceNumber}</span>
                        <span>•</span>
                        <Clock className="h-3 w-3" />
                        {formatDate(sale.date)}
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Low Stock Items
            </CardTitle>
            <CardDescription>Items that need restocking</CardDescription>
          </CardHeader>
          <CardContent>
            {lowStockLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : lowStockProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No low stock items
              </p>
            ) : (
              <div className="space-y-3">
                {lowStockProducts.map((product: any) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between border-b pb-2 last:border-0"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{product.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Stock: {product.currentStock} {product.unit}</span>
                        {product.minStock && (
                          <>
                            <span>•</span>
                            <span>Min: {product.minStock} {product.unit}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={
                          product.currentStock === 0
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {product.currentStock === 0 ? "Out of Stock" : "Low Stock"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

