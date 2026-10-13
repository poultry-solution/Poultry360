"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarRange, RefreshCcw } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";
import { NepaliDatePicker } from "@/common/components/ui/nepali-date-picker";
import {
  convertADtoBS,
  getBSYearMonthFromAD,
  getFirstDayOfBSMonthAD,
  getNepalTodayAd,
} from "@/common/lib/nepali-date";
import { useQueryClient } from "@tanstack/react-query";
import { useGetInventorySummary, useGetDealerProducts } from "@/fetchers/dealer/dealerProductQueries";
import { useGetSalesStatistics, useGetDealerCustomers } from "@/fetchers/dealer/dealerSaleQueries";
import { useGetLedgerSummary } from "@/fetchers/dealer/dealerLedgerQueries";
import { useGetManualCompanies, useGetDealerProfitSummary } from "@/fetchers/dealer/dealerManualCompanyQueries";
import { useAuthStore } from "@/common/store/store";
import { BusinessDownloadDialog } from "@/components/downloads/BusinessDownloadDialog";
import { ACCOUNT_FEATURE_KEYS, useAccountFeature } from "@/fetchers/accountFeatureQueries";

type DateRange = { startDate: string; endDate: string };

/** Problem with a custom range, or null when it can be used. Dates are AD YYYY-MM-DD. */
function getRangeError(startDate: string, endDate: string, today: string): string | null {
  if (!startDate || !endDate) return "Please pick both dates.";
  if (startDate > today || endDate > today) return "Dates cannot be in the future.";
  if (startDate > endDate) return "Start date must be on or before end date.";
  return null;
}

function toBsLabel(adDate: string) {
  try {
    return convertADtoBS(adDate);
  } catch {
    return adDate;
  }
}

function describeRange(range: DateRange | null) {
  if (!range) return "All time";
  const start = toBsLabel(range.startDate);
  const end = toBsLabel(range.endDate);
  return start === end ? start : `${start} to ${end}`;
}

function formatMoney(value: number | string | null | undefined) {
  return new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency: "NPR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatNumber(value: number | string | null | undefined) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

type StatItem = { label: string; value: string; sub?: string; valueClass?: string; note?: string };

function SectionLabel({ title, tag }: { title: string; tag?: string }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
      {title}
      {tag ? <span className="font-normal normal-case tracking-normal"> · {tag}</span> : null}
    </p>
  );
}

/** One slim bordered row of numbers; 2 per row on phones. */
function StatStrip({ items, columns }: { items: StatItem[]; columns: 3 | 4 }) {
  const desktopCols = columns === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3";
  return (
    <div className={`grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-gray-200 bg-gray-200 ${desktopCols}`}>
      {items.map((item, index) => (
        <div
          key={item.label}
          className={`bg-white px-3 py-2.5 ${items.length % 2 === 1 && index === items.length - 1 ? "col-span-2 lg:col-span-1" : ""}`}
        >
          <p className="text-[11px] text-gray-500">{item.label}</p>
          <p className={`text-lg font-semibold leading-tight ${item.valueClass ?? ""}`}>{item.value}</p>
          {item.sub ? <p className="mt-0.5 text-[11px] text-gray-500">{item.sub}</p> : null}
          {item.note ? <p className="mt-0.5 text-[11px] text-amber-600">{item.note}</p> : null}
        </div>
      ))}
    </div>
  );
}

function ListBox({
  title,
  count,
  empty,
  viewAllHref,
  children,
}: {
  title: string;
  count: number;
  empty: string;
  viewAllHref?: string;
  children: React.ReactNode;
}) {
  const hasRows = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-2">
        <p className="flex items-center gap-2 text-sm font-semibold">
          {title}
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-600">{count}</span>
        </p>
        {viewAllHref ? (
          <Link href={viewAllHref} className="shrink-0 text-xs font-medium text-primary hover:underline">
            View all →
          </Link>
        ) : null}
      </div>
      {hasRows ? <div className="divide-y divide-gray-100">{children}</div> : <p className="px-3 py-6 text-center text-sm text-gray-500">{empty}</p>}
    </div>
  );
}

function ListRow({ title, sub, value, valueClass }: { title: string; sub?: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{title}</p>
        {sub ? <p className="truncate text-xs text-gray-500">{sub}</p> : null}
      </div>
      <p className={`shrink-0 text-sm font-semibold ${valueClass ?? ""}`}>{value}</p>
    </div>
  );
}

export default function DealerAnalyticsPage() {
  const user = useAuthStore((state) => state.user);
  const allowed = !user?.isStaff || user.permissions?.includes("DEALER_VIEW_FINANCIAL_SUMMARIES");
  if (!allowed) {
    return <Card className="mx-auto mt-10 max-w-lg"><CardHeader><CardTitle>Analytics restricted</CardTitle><CardDescription>Your owner has not enabled financial summaries for this staff account.</CardDescription></CardHeader><CardContent><Link href="/dealer/dashboard/home"><Button>Back to dashboard</Button></Link></CardContent></Card>;
  }
  return <DealerAnalyticsContent />;
}

function DealerAnalyticsContent() {
  const queryClient = useQueryClient();
  // All time by default. Custom dates are Nepal days (AD YYYY-MM-DD under the hood).
  const [isCustomRange, setIsCustomRange] = useState(false);
  const [customStartAd, setCustomStartAd] = useState("");
  const [customEndAd, setCustomEndAd] = useState("");
  // Last valid custom range; numbers keep showing it while the picked dates are wrong.
  const [appliedRange, setAppliedRange] = useState<DateRange | null>(null);

  const rangeError = isCustomRange ? getRangeError(customStartAd, customEndAd, getNepalTodayAd()) : null;
  const rangeLabel = describeRange(appliedRange);

  const setCustomDates = (startDate: string, endDate: string) => {
    setCustomStartAd(startDate);
    setCustomEndAd(endDate);
    if (!getRangeError(startDate, endDate, getNepalTodayAd())) {
      setAppliedRange({ startDate, endDate });
    }
  };

  const showCustomRange = () => {
    if (isCustomRange) return;
    const today = getNepalTodayAd();
    const { year, month } = getBSYearMonthFromAD(today);
    setIsCustomRange(true);
    setCustomDates(getFirstDayOfBSMonthAD(year, month), today);
  };

  const showAllTime = () => {
    setIsCustomRange(false);
    setCustomStartAd("");
    setCustomEndAd("");
    setAppliedRange(null);
  };

  const statsParams = useMemo(() => appliedRange ?? {}, [appliedRange]);

  const inventorySummaryQuery = useGetInventorySummary();
  const lowStockProductsQuery = useGetDealerProducts({ lowStock: true, limit: 6 });
  const salesStatsQuery = useGetSalesStatistics(statsParams);
  const lifetimeSalesStatsQuery = useGetSalesStatistics();
  const supplierSettlementFeature = useAccountFeature(ACCOUNT_FEATURE_KEYS.DEALER_SUPPLIER_SETTLEMENT_SALES);
  const lifetimeLedgerSummaryQuery = useGetLedgerSummary();
  const manualCompaniesQuery = useGetManualCompanies({ archived: false });
  const profitSummaryQuery = useGetDealerProfitSummary(appliedRange ?? undefined);
  const lifetimeProfitSummaryQuery = useGetDealerProfitSummary();
  // Top 5 customers who owe, chosen on the server from all customers; total = how many owe.
  const customersQuery = useGetDealerCustomers({ page: 1, limit: 5, archived: false, owing: true });

  const inventorySummary = inventorySummaryQuery.data?.data;
  const salesStats = salesStatsQuery.data?.data;
  const lifetimeSalesStats = lifetimeSalesStatsQuery.data?.data;
  const lifetimeLedgerSummary = lifetimeLedgerSummaryQuery.data?.data;
  const manualCompanies = manualCompaniesQuery.data ?? [];
  const profitSummary = profitSummaryQuery.data;
  const lifetimeProfitSummary = lifetimeProfitSummaryQuery.data;
  const customers = customersQuery.data?.data ?? [];
  const lowStockProducts = lowStockProductsQuery.data?.data ?? [];

  const overdueCustomers = customers;
  const owingCustomerCount = Number(customersQuery.data?.pagination?.total ?? customers.length);

  const sortedManualCompanies = useMemo(
    () =>
      [...manualCompanies]
        .sort((a, b) => Math.abs(Number(b.balance || 0)) - Math.abs(Number(a.balance || 0)))
        .slice(0, 5),
    [manualCompanies]
  );

  const productsByTypeChart = useMemo(
    () =>
      (inventorySummary?.productsByType || [])
        .map((entry) => ({
          type: entry.type,
          count: Number(entry._count || 0),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
    [inventorySummary?.productsByType]
  );

  const lowStockCount = Number(inventorySummary?.lowStockProducts || 0);
  const outOfStockCount = Number(inventorySummary?.outOfStockProducts || 0);

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["dealer-products"] });
    await queryClient.invalidateQueries({ queryKey: ["dealer-sales"] });
    await queryClient.invalidateQueries({ queryKey: ["dealer-ledger"] });
    await queryClient.invalidateQueries({ queryKey: ["dealer-manual-companies"] });
    await queryClient.invalidateQueries({ queryKey: ["dealer-customers"] });
    await queryClient.invalidateQueries({ queryKey: ["dealer-profit-summary"] });
  };

  const salesTotal = Number(salesStats?.totalRevenue || 0);
  const paidAtSale = Number(salesStats?.totalPaid || 0);
  const dueAtSale = Number(salesStats?.totalDue || 0);
  const supplierSettlementSales = Number(salesStats?.supplierSettlementSales || 0);
  const supplierSettlementRevenue = Number(salesStats?.supplierSettlementRevenue || 0);
  // "Sell to supplier" is an admin-enabled feature. Show its numbers only to
  // dealers who have it, or who already made such sales (so old numbers stay
  // visible if the feature is later turned off).
  const showSupplierSettlements =
    supplierSettlementFeature.isEnabled || Number(lifetimeSalesStats?.supplierSettlementSales || 0) > 0;
  const lifetimeSalesTotal = Number(lifetimeSalesStats?.totalRevenue || 0);
  const totalPurchases = Number(lifetimeProfitSummary?.totalPurchases || 0);
  const costOfGoodsSold = Number(profitSummary?.costOfGoodsSold || 0);
  const itemsMissingCost = Number(profitSummary?.itemsMissingCost || 0);
  const totalPaymentsReceived = Number(lifetimeLedgerSummary?.totalPaymentsReceived || 0);
  const totalPaymentsMade = Number(lifetimeLedgerSummary?.totalPaymentsMade || 0);
  const netCustomerBalance = Number(lifetimeLedgerSummary?.netCustomerBalance || 0);
  const netCompanyBalance = Number(lifetimeLedgerSummary?.netCompanyBalance || 0);
  const profit = Number(profitSummary?.profit || 0);
  const downloadAnalytics = async () => ({
    sections: [
      {
        title: "Summary",
        columns: [{ label: "Item", value: (row: any) => row.label }, { label: "Amount", value: (row: any) => row.value }],
        rows: [
          { label: `Sales (${rangeLabel})`, value: formatMoney(salesTotal) },
          { label: `Paid at sale time (${rangeLabel})`, value: formatMoney(paidAtSale) },
          { label: `Not paid at sale time (${rangeLabel})`, value: formatMoney(dueAtSale) },
          ...(showSupplierSettlements
            ? [{ label: `Supplier settlement sales (${rangeLabel})`, value: formatMoney(supplierSettlementRevenue) }]
            : []),
          { label: `Cost of items sold (${rangeLabel})`, value: formatMoney(costOfGoodsSold) },
          { label: `Profit (${rangeLabel})`, value: formatMoney(profit) },
          { label: "Customers owe you (today)", value: formatMoney(netCustomerBalance) },
          { label: "You owe suppliers (today)", value: formatMoney(netCompanyBalance) },
        ],
      },
      {
        title: "Customers with balance",
        columns: [{ label: "Customer", value: (row: any) => row.name }, { label: "Balance", value: (row: any) => formatMoney(row.balance) }],
        rows: overdueCustomers,
      },
      {
        title: "Low stock products",
        columns: [{ label: "Product", value: (row: any) => row.name }, { label: "Stock", value: (row: any) => `${Number(row.currentStock || 0).toFixed(2)} ${row.unit || ""}` }],
        rows: lowStockProducts,
      },
    ],
    summary: [
      { label: "Range", value: rangeLabel },
      ...(showSupplierSettlements ? [{ label: "Settlement sales", value: supplierSettlementSales }] : []),
    ],
  });

  const rangeTag = appliedRange ? rangeLabel : "All time";
  const loadingOr = (isLoading: boolean, value: string) => (isLoading ? "…" : value);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <div className="flex gap-2">
          <BusinessDownloadDialog title="analytics" fileName="dealer-analytics" getData={downloadAnalytics} hasDateFilter={false} buttonLabel="Download" />
          <Button type="button" variant="outline" size="sm" className="h-9" onClick={handleRefresh} aria-label="Refresh">
            <RefreshCcw className="h-4 w-4" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Date bar */}
      <div className="space-y-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-sm">
            <CalendarRange className="h-4 w-4 text-gray-500" />
            <span className="text-gray-500">Showing:</span>
            <span className="font-semibold">{rangeLabel}</span>
          </p>
          <div className="inline-flex w-full rounded-md border border-gray-200 bg-gray-50 p-0.5 sm:w-auto">
            {([
              { key: "all", label: "All time", active: !isCustomRange, onClick: showAllTime },
              { key: "custom", label: "Custom dates", active: isCustomRange, onClick: showCustomRange },
            ] as const).map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={option.onClick}
                className={`flex-1 rounded px-3 py-1 text-sm font-medium transition-colors sm:flex-none ${option.active ? "bg-primary text-primary-foreground shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        {isCustomRange ? (
          <div className="space-y-2 border-t border-gray-100 pt-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs text-gray-500">Start date</p>
                <NepaliDatePicker
                  defaultDate={customStartAd ? toBsLabel(customStartAd) : undefined}
                  onChange={({ adDate }) => setCustomDates(adDate.split("T")[0], customEndAd)}
                  className="w-full rounded-md border border-gray-300"
                  theme="light"
                  language="en"
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500">End date</p>
                <NepaliDatePicker
                  defaultDate={customEndAd ? toBsLabel(customEndAd) : undefined}
                  onChange={({ adDate }) => setCustomDates(customStartAd, adDate.split("T")[0])}
                  className="w-full rounded-md border border-gray-300"
                  theme="light"
                  language="en"
                />
              </div>
            </div>
            {rangeError ? (
              <p className="text-sm text-red-600">
                {rangeError} Still showing {rangeLabel}.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Strip 1: sales for the chosen dates */}
      <section className="space-y-2">
        <SectionLabel title="Sales" tag={rangeTag} />
        <StatStrip
          columns={showSupplierSettlements ? 4 : 3}
          items={[
            {
              label: "Sales",
              value: loadingOr(salesStatsQuery.isLoading, formatMoney(salesTotal)),
              sub: !salesStatsQuery.isLoading && Number(salesStats?.totalSales || 0) === 0
                ? "No sales in these dates"
                : `${formatNumber(salesStats?.totalSales || 0)} sales`,
            },
            {
              label: "Paid at sale",
              value: loadingOr(salesStatsQuery.isLoading, formatMoney(paidAtSale)),
              sub: `${formatMoney(dueAtSale)} not paid at sale`,
            },
            ...(showSupplierSettlements
              ? [{
                  label: "Supplier settlements",
                  value: loadingOr(salesStatsQuery.isLoading, formatMoney(supplierSettlementRevenue)),
                  sub: `${formatNumber(supplierSettlementSales)} sale${supplierSettlementSales === 1 ? "" : "s"}`,
                  valueClass: "text-blue-700",
                }]
              : []),
            {
              label: "Profit",
              value: loadingOr(profitSummaryQuery.isLoading, formatMoney(profit)),
              sub: `Cost ${formatMoney(costOfGoodsSold)}`,
              valueClass: profit < 0 ? "text-red-600" : "text-green-700",
              note: itemsMissingCost > 0
                ? `${formatNumber(itemsMissingCost)} old item${itemsMissingCost === 1 ? " has" : "s have"} no cost saved, so profit may be a little high.`
                : undefined,
            },
          ]}
        />
      </section>

      {/* Strip 2: right now */}
      <section className="space-y-2">
        <SectionLabel title="Right now" />
        <StatStrip
          columns={4}
          items={[
            {
              label: "Customers owe you",
              value: loadingOr(lifetimeLedgerSummaryQuery.isLoading, formatMoney(netCustomerBalance)),
              sub: `${formatNumber(owingCustomerCount)} owing`,
              valueClass: netCustomerBalance > 0 ? "text-red-600" : undefined,
            },
            {
              label: "You owe suppliers",
              value: loadingOr(lifetimeLedgerSummaryQuery.isLoading, formatMoney(netCompanyBalance)),
              sub: `${formatNumber(manualCompanies.length)} suppliers`,
              valueClass: netCompanyBalance > 0 ? "text-amber-700" : undefined,
            },
            {
              label: "Low stock",
              value: loadingOr(inventorySummaryQuery.isLoading, formatNumber(lowStockCount)),
              sub: "products",
              valueClass: lowStockCount > 0 ? "text-amber-700" : undefined,
            },
            {
              label: "Out of stock",
              value: loadingOr(inventorySummaryQuery.isLoading, formatNumber(outOfStockCount)),
              sub: "products",
              valueClass: outOfStockCount > 0 ? "text-red-600" : undefined,
            },
          ]}
        />
      </section>

      {/* Lists: who owes you, low stock */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ListBox title="Customers who owe you" count={owingCustomerCount} empty="No one owes you right now." viewAllHref="/dealer/dashboard/customers">
          {overdueCustomers.map((customer) => (
            <ListRow
              key={customer.id}
              title={customer.name}
              sub={customer.phone || "—"}
              value={formatMoney(customer.balance)}
              valueClass="text-red-600"
            />
          ))}
        </ListBox>
        <ListBox title="Low stock" count={lowStockCount} empty="All stock is fine." viewAllHref="/dealer/dashboard/inventory">
          {lowStockProducts.map((product: any) => (
            <ListRow
              key={product.id}
              title={product.name}
              sub={product.type ? String(product.type).toLowerCase() : "—"}
              value={`${formatNumber(product.currentStock)}${product.minStock != null ? ` / ${formatNumber(product.minStock)}` : ""} ${product.unit || ""}`.trim()}
              valueClass="text-amber-700"
            />
          ))}
        </ListBox>
      </div>

      {/* Lists: suppliers, stock by type */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ListBox title="Suppliers" count={manualCompanies.length} empty="No suppliers yet." viewAllHref="/dealer/dashboard/company">
          {sortedManualCompanies.map((company) => {
            const balance = Number(company.balance || 0);
            return (
              <ListRow
                key={company.id}
                title={company.name}
                sub={company.phone || "—"}
                value={balance === 0 ? formatMoney(0) : `${formatMoney(Math.abs(balance))} ${balance > 0 ? "owed" : "advance"}`}
                valueClass={balance > 0 ? "text-red-600" : balance < 0 ? "text-green-700" : "text-gray-500"}
              />
            );
          })}
        </ListBox>
        <ListBox title="Stock by type" count={Number(inventorySummary?.totalProducts || 0)} empty="No products yet.">
          {(() => {
            const max = Math.max(1, ...productsByTypeChart.map((entry) => entry.count));
            return productsByTypeChart.map((entry) => (
              <div key={entry.type} className="flex items-center gap-3 px-3 py-2">
                <span className="w-24 shrink-0 truncate text-sm capitalize">{String(entry.type).toLowerCase()}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(entry.count / max) * 100}%` }} />
                </div>
                <span className="w-8 shrink-0 text-right text-sm font-medium">{entry.count}</span>
              </div>
            ));
          })()}
        </ListBox>
      </div>

      {/* Strip 3: all time totals */}
      <section className="space-y-2">
        <SectionLabel title="All time totals" />
        <StatStrip
          columns={4}
          items={[
            { label: "Total sales", value: loadingOr(lifetimeSalesStatsQuery.isLoading, formatMoney(lifetimeSalesTotal)) },
            { label: "Purchases (after discount)", value: loadingOr(lifetimeProfitSummaryQuery.isLoading, formatMoney(totalPurchases)) },
            { label: "Payments received", value: loadingOr(lifetimeLedgerSummaryQuery.isLoading, formatMoney(totalPaymentsReceived)) },
            { label: "Payments made", value: loadingOr(lifetimeLedgerSummaryQuery.isLoading, formatMoney(totalPaymentsMade)) },
          ]}
        />
      </section>
    </div>
  );
}
