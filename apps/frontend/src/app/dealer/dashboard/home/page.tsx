"use client";

import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import { Package, Users, Receipt, Loader2, Clock, AlertCircle, Plus, Wallet } from "lucide-react";

import { useGetInventorySummary } from "@/fetchers/dealer/dealerProductQueries";
import { useGetSalesStatistics, useGetDealerSales, useGetDealerCustomers } from "@/fetchers/dealer/dealerSaleQueries";
import { useGetDealerProducts } from "@/fetchers/dealer/dealerProductQueries";
import { useGetLedgerSummary } from "@/fetchers/dealer/dealerLedgerQueries";
import { useI18n } from "@/i18n/useI18n";
import { DateDisplay } from "@/common/components/ui/date-display";

export default function DealerHomePage() {
  const { t } = useI18n();

  const formatCurrency = (amount: number) => `रू ${Number(amount || 0).toFixed(2)}`;

  // Fetch real data
  const { data: inventoryData, isLoading: inventoryLoading } = useGetInventorySummary();
  const { data: salesStatsData, isLoading: salesStatsLoading } = useGetSalesStatistics();
  const { data: recentSalesData, isLoading: recentSalesLoading } = useGetDealerSales({
    limit: 5,
  });
  const { data: dealerCustomersData, isLoading: dealerCustomersLoading } = useGetDealerCustomers({
    page: 1,
    limit: 1,
    archived: false,
  });
  const { data: lowStockData, isLoading: lowStockLoading } = useGetDealerProducts({
    lowStock: true,
    limit: 10,
  });
  const { data: ledgerSummaryData, isLoading: ledgerLoading } = useGetLedgerSummary();

  // Combine loading states
  const isLoading =
    inventoryLoading ||
    salesStatsLoading ||
    recentSalesLoading ||
    lowStockLoading ||
    ledgerLoading ||
    dealerCustomersLoading;

  // Extract data
  const inventory = inventoryData?.data;
  const salesStats = salesStatsData?.data;
  const recentSales = recentSalesData?.data || [];
  const lowStockProducts = lowStockData?.data || [];
  const ledgerSummary = ledgerSummaryData?.data;
  const totalCustomers = dealerCustomersData?.pagination?.total || 0;

  // Helper functions
  // Calculate stats
  const stats = {
    totalInventory: inventory?.totalProducts || 0,
    totalCustomers,
    totalSalesAmount: salesStats?.totalRevenue || 0,
    totalSalesTransactions: salesStats?.totalSales || 0,
  };

  // Net balances (can be negative due to advances)
  const netCustomerBalance = ledgerSummary?.netCustomerBalance ?? 0;
  const netCompanyBalance = ledgerSummary?.netCompanyBalance ?? 0;

  const fromCustomerDirection = netCustomerBalance >= 0 ? "receive" : "give";
  const toCompanyDirection = netCompanyBalance >= 0 ? "give" : "receive";

  // We reuse existing i18n keys from the farmer dashboard to avoid touching blocked dealer i18n JSON.
  const moneyToReceiveLabel = t("farmer.dashboard.moneyToReceive");
  const moneyToPayLabel = t("farmer.dashboard.moneyToPay");
  const moneyToGiveLabel = moneyToPayLabel; // "Money to give" ~= "Money to pay" in this context

  return (
    <div className="space-y-6">
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
              <div className="text-xl md:text-2xl font-bold">{formatCurrency(stats.totalSalesAmount)}</div>
            )}
            <p className="text-[10px] md:text-xs text-muted-foreground">Lifetime sales</p>
          </CardContent>
        </Card>

        {/* Money position - From Customer (net) */}
        <Card className="p-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:p-4 pb-1 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">
              {fromCustomerDirection === "receive"
                ? moneyToReceiveLabel
                : moneyToGiveLabel}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            {ledgerLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <div className="text-xl md:text-2xl font-bold text-green-600">
                {formatCurrency(netCustomerBalance)}
              </div>
            )}
            <p className="text-[10px] md:text-xs text-muted-foreground">
              From Customer
            </p>
          </CardContent>
        </Card>

        {/* Money position - To Company (net) */}
        <Card className="p-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:p-4 pb-1 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">
              {toCompanyDirection === "give"
                ? moneyToGiveLabel
                : moneyToReceiveLabel}
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            {ledgerLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <div className="text-xl md:text-2xl font-bold text-red-600">
                {formatCurrency(netCompanyBalance)}
              </div>
            )}
            <p className="text-[10px] md:text-xs text-muted-foreground">
              To Company
            </p>
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
