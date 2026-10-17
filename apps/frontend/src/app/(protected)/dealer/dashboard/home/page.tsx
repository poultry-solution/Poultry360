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
import { useAuthStore } from "@/common/store/store";
import { SalesVsCollectedChart } from "@/components/dealer/SalesVsCollectedChart";

function HomeStat({
  label,
  icon: Icon,
  value,
  sub,
  valueClass,
}: {
  label: string;
  icon: typeof Package;
  value: string | null;
  sub: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-medium text-gray-600">{label}</p>
        <Icon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
      </div>
      {value === null ? (
        <Loader2 className="my-1 h-5 w-5 animate-spin text-gray-400" />
      ) : (
        <p className={`mt-0.5 truncate text-lg font-bold md:text-xl ${valueClass ?? ""}`}>{value}</p>
      )}
      <p className="truncate text-[11px] text-gray-500">{sub}</p>
    </div>
  );
}

export default function DealerHomePage() {
  const { t } = useI18n();
  const user = useAuthStore((state) => state.user);
  const canViewFinancialSummaries = !user?.isStaff || user.permissions?.includes("DEALER_VIEW_FINANCIAL_SUMMARIES");

  const formatCurrency = (amount: number) => `रू ${Number(amount || 0).toFixed(2)}`;

  // Fetch real data
  const { data: inventoryData, isLoading: inventoryLoading } = useGetInventorySummary();
  const { data: salesStatsData, isLoading: salesStatsLoading } = useGetSalesStatistics(undefined, { enabled: canViewFinancialSummaries });
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
  const { data: ledgerSummaryData, isLoading: ledgerLoading } = useGetLedgerSummary(undefined, { enabled: canViewFinancialSummaries });

  // Combine loading states
  const isLoading =
    inventoryLoading ||
    (canViewFinancialSummaries && salesStatsLoading) ||
    recentSalesLoading ||
    lowStockLoading ||
    (canViewFinancialSummaries && ledgerLoading) ||
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

  return (
    <div className="space-y-4">
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

      {/* Statistics */}
      <div className={`grid grid-cols-2 gap-3 ${canViewFinancialSummaries ? "md:grid-cols-3 xl:grid-cols-5" : "md:grid-cols-2"}`}>
        <HomeStat
          label="Products"
          icon={Package}
          value={isLoading ? null : String(stats.totalInventory)}
          sub="Product types you sell"
        />
        <HomeStat
          label="Customers"
          icon={Users}
          value={isLoading ? null : String(stats.totalCustomers)}
          sub="Customer records"
        />
        {canViewFinancialSummaries ? (
          <>
            <HomeStat
              label="Product sales"
              icon={Receipt}
              value={isLoading ? null : formatCurrency(stats.totalSalesAmount)}
              sub="Does not include Broiler money"
            />
            <HomeStat
              label={fromCustomerDirection === "receive" ? "Customers owe you" : "You owe customers"}
              icon={Users}
              value={ledgerLoading ? null : formatCurrency(Math.abs(netCustomerBalance))}
              valueClass="text-green-700"
              sub="Current unpaid amount"
            />
            <HomeStat
              label={toCompanyDirection === "give" ? "You owe suppliers" : "Suppliers owe you"}
              icon={Wallet}
              value={ledgerLoading ? null : formatCurrency(Math.abs(netCompanyBalance))}
              valueClass="text-red-600"
              sub="Current unpaid amount"
            />
          </>
        ) : null}
      </div>

      {canViewFinancialSummaries ? <SalesVsCollectedChart /> : null}

      {/* Recent Activity */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="gap-0 rounded-lg border-gray-200 py-0">
          <CardHeader className="border-b border-gray-100 px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-4 w-4 text-gray-500" />
              {t("dealer.dashboard.recentSales.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 py-3">
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
                    className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0"
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

        <Card className="gap-0 rounded-lg border-gray-200 py-0">
          <CardHeader className="border-b border-gray-100 px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-4 w-4 text-gray-500" />
              {t("dealer.dashboard.lowStock.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 py-3">
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
                    className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {product.manualCompany?.name || product.supplierCompany?.name
                          ? `${product.name} (${product.manualCompany?.name || product.supplierCompany?.name})`
                          : product.name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{t("dealer.dashboard.lowStock.stock", { stock: product.currentStock, unit: product.unit })}</span>
                        {product.minStock != null && Number(product.minStock) > 0 && (
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
