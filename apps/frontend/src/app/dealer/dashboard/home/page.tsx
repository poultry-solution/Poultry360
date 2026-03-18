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
import { Package, Users, Receipt, Loader2, X, CheckCircle, Clock, XCircle, AlertCircle, Plus, Truck, ClipboardList } from "lucide-react";
import {
  useGetDealerVerificationRequests,
  useAcknowledgeVerificationRequest,
} from "@/fetchers/dealer/dealerVerificationQueries";
import { type DealerVerificationRequest } from "@/fetchers/dealer/dealerVerificationQueries";
import { useGetInventorySummary } from "@/fetchers/dealer/dealerProductQueries";
import { useGetSalesStatistics, useGetDealerSales } from "@/fetchers/dealer/dealerSaleQueries";
import { useGetDealerProducts } from "@/fetchers/dealer/dealerProductQueries";
import { useGetLedgerSummary } from "@/fetchers/dealer/dealerLedgerQueries";
import { useI18n } from "@/i18n/useI18n";
import { DateDisplay } from "@/common/components/ui/date-display";

export default function DealerHomePage() {
  const { t } = useI18n();
  const [dismissedBanners, setDismissedBanners] = useState<Set<string>>(new Set());

  const formatCurrency = (amount: number) => `रू ${Number(amount || 0).toFixed(2)}`;

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
          title: t("dealer.dashboard.banner.approved.title"),
          description: t("dealer.dashboard.banner.approved.description", { companyName }),
          icon: CheckCircle,
          className: "bg-green-50 border-green-200 text-green-900",
          iconClassName: "text-green-600",
        };
      case "REJECTED":
        return {
          variant: "destructive" as const,
          title: t("dealer.dashboard.banner.rejected.title"),
          description: `${t("dealer.dashboard.banner.rejected.description", { companyName })} ${request.rejectedCount >= 3
            ? t("dealer.dashboard.banner.rejected.limitReached")
            : request.rejectedCount === 2
              ? t("dealer.dashboard.banner.rejected.secondRejection")
              : t("dealer.dashboard.banner.rejected.retry")
            }`,
          icon: XCircle,
          className: "bg-red-50 border-red-200 text-red-900",
          iconClassName: "text-red-600",
        };
      case "PENDING":
        return {
          variant: "default" as const,
          title: t("dealer.dashboard.banner.pending.title"),
          description: t("dealer.dashboard.banner.pending.description", { companyName }),
          icon: Clock,
          className: "bg-yellow-50 border-yellow-200 text-yellow-900",
          iconClassName: "text-yellow-600",
        };
      default:
        return null;
    }
  };

  // Calculate current month date range (local dates to avoid UTC shift)
  const currentDate = new Date();
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  const startDate = `${startOfMonth.getFullYear()}-${pad(startOfMonth.getMonth() + 1)}-${pad(startOfMonth.getDate())}`;
  const endDate = `${endOfMonth.getFullYear()}-${pad(endOfMonth.getMonth() + 1)}-${pad(endOfMonth.getDate())}`;

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
  // Calculate stats
  const stats = {
    totalInventory: inventory?.totalProducts || 0,
    totalCustomers: ledgerSummary?.outstandingBalances || 0,
    totalSales: salesStats?.totalSales || 0,
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t("dealer.dashboard.title")}</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {t("dealer.dashboard.subtitle")}
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Link href="/dealer/dashboard/sales/new" className="flex-1 md:flex-none">
            <Button variant="outline" className="w-full md:w-auto gap-2 hover:bg-green-50 hover:text-green-700 border-green-200">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t("dealer.dashboard.buttons.addSale").split(" ")[0]}</span> {t("dealer.dashboard.buttons.addSale").split(" ").slice(1).join(" ")}
            </Button>
          </Link>
          <Link href="/dealer/dashboard/sale-requests" className="flex-1 md:flex-none">
            <Button variant="outline" className="w-full md:w-auto gap-2 hover:bg-green-50 hover:text-green-700 border-green-200">
              <ClipboardList className="h-4 w-4" />
              {t("dealer.dashboard.buttons.saleRequests")}
            </Button>
          </Link>
          <Link href="/dealer/dashboard/consignments" className="flex-1 md:flex-none">
            <Button variant="outline" className="w-full md:w-auto gap-2 hover:bg-green-50 hover:text-green-700 border-green-200">
              <Truck className="h-4 w-4" />
              {t("dealer.dashboard.buttons.consignments")}
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-3">
        <Card className="p-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:p-4 pb-1 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">{t("dealer.dashboard.stats.totalInventory")}</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <div className="text-xl md:text-2xl font-bold">{stats.totalInventory}</div>
            )}
            <p className="text-[10px] md:text-xs text-muted-foreground">{t("dealer.dashboard.stats.itemsInStock")}</p>
          </CardContent>
        </Card>

        <Card className="p-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:p-4 pb-1 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">{t("dealer.dashboard.stats.totalCustomers")}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <div className="text-xl md:text-2xl font-bold">{stats.totalCustomers}</div>
            )}
            <p className="text-[10px] md:text-xs text-muted-foreground">{t("dealer.dashboard.stats.activeCustomers")}</p>
          </CardContent>
        </Card>

        <Card className="p-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:p-4 pb-1 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">{t("dealer.dashboard.stats.totalSales")}</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <div className="text-xl md:text-2xl font-bold">{stats.totalSales}</div>
            )}
            <p className="text-[10px] md:text-xs text-muted-foreground">{t("dealer.dashboard.stats.thisMonth")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              {t("dealer.dashboard.recentSales.title")}
            </CardTitle>
            <CardDescription>{t("dealer.dashboard.recentSales.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            {recentSalesLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : recentSales.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("dealer.dashboard.recentSales.noSales")}
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
                        <DateDisplay date={sale.date} />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">
                        {formatCurrency(Number(sale.totalAmount))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("dealer.dashboard.recentSales.items", { count: sale.items?.length || 0 })}
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
              {t("dealer.dashboard.lowStock.title")}
            </CardTitle>
            <CardDescription>{t("dealer.dashboard.lowStock.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent>
            {lowStockLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : lowStockProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("dealer.dashboard.lowStock.noItems")}
              </p>
            ) : (
              <div className="space-y-3">
                {lowStockProducts.map((product: any) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between border-b pb-2 last:border-0"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {product.manualCompany?.name || product.supplierCompany?.name
                          ? `${product.name} (${product.manualCompany?.name || product.supplierCompany?.name})`
                          : product.name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{t("dealer.dashboard.lowStock.stock", { stock: product.currentStock, unit: product.unit })}</span>
                        {product.minStock && (
                          <>
                            <span>•</span>
                            <span>{t("dealer.dashboard.lowStock.min", { min: product.minStock, unit: product.unit })}</span>
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
                        {product.currentStock === 0 ? t("dealer.dashboard.lowStock.outOfStock") : t("dealer.dashboard.lowStock.lowStock")}
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

