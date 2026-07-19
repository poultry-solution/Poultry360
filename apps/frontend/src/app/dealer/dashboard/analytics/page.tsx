"use client";

import { useMemo, useState } from "react";
import type { ComponentType } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  CalendarRange,
  LayoutDashboard,
  RefreshCcw,
  ReceiptText,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import {
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/common/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Badge } from "@/common/components/ui/badge";
import { DateInput } from "@/common/components/ui/date-input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/common/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/common/components/ui/chart";
import { useQueryClient } from "@tanstack/react-query";
import { useGetInventorySummary, useGetDealerProducts } from "@/fetchers/dealer/dealerProductQueries";
import { useGetSalesStatistics, useGetDealerCustomers } from "@/fetchers/dealer/dealerSaleQueries";
import { useGetLedgerSummary } from "@/fetchers/dealer/dealerLedgerQueries";
import { useGetManualCompanies, useGetDealerProfitSummary } from "@/fetchers/dealer/dealerManualCompanyQueries";

const quickRanges = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "month", label: "This month" },
  { value: "quarter", label: "This quarter" },
  { value: "year", label: "This year" },
] as const;

const chartConfig = {
  count: {
    label: "Products",
    color: "hsl(var(--chart-1))",
  },
};

const chartColors = [
  "#16a34a",
  "#2563eb",
  "#f59e0b",
  "#a855f7",
  "#ef4444",
  "#14b8a6",
  "#f97316",
  "#0f766e",
];

function toDateOnly(value: string | Date | null | undefined) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfQuarter(date: Date) {
  const quarterStartMonth = Math.floor(date.getMonth() / 3) * 3;
  return new Date(date.getFullYear(), quarterStartMonth, 1);
}

function startOfYear(date: Date) {
  return new Date(date.getFullYear(), 0, 1);
}

function buildPresetRange(preset: (typeof quickRanges)[number]["value"]) {
  const end = new Date();
  const start = new Date(end);
  switch (preset) {
    case "7d":
      start.setDate(end.getDate() - 6);
      break;
    case "30d":
      start.setDate(end.getDate() - 29);
      break;
    case "month":
      return {
        startDate: toDateOnly(startOfMonth(end)),
        endDate: toDateOnly(end),
      };
    case "quarter":
      return {
        startDate: toDateOnly(startOfQuarter(end)),
        endDate: toDateOnly(end),
      };
    case "year":
      return {
        startDate: toDateOnly(startOfYear(end)),
        endDate: toDateOnly(end),
      };
  }

  return {
    startDate: toDateOnly(start),
    endDate: toDateOnly(end),
  };
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

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  tone,
  badge,
}: {
  title: string;
  value: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  tone: string;
  badge?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <CardDescription className="text-xs">{description}</CardDescription>
        </div>
        <Icon className={`h-4 w-4 ${tone}`} />
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        {badge ? (
          <Badge variant="outline" className="text-[10px] font-normal">
            {badge}
          </Badge>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function DealerAnalyticsPage() {
  const queryClient = useQueryClient();
  const [rangePreset, setRangePreset] = useState<(typeof quickRanges)[number]["value"]>("30d");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const presetRange = useMemo(() => buildPresetRange(rangePreset), [rangePreset]);
  const resolvedStartDate = toDateOnly(startDate) || presetRange.startDate;
  const resolvedEndDate = toDateOnly(endDate) || presetRange.endDate;
  const rangeLabel = useMemo(() => {
    if (startDate || endDate) return "Custom range";
    return quickRanges.find((range) => range.value === rangePreset)?.label ?? "Custom range";
  }, [endDate, rangePreset, startDate]);

  const statsParams = useMemo(
    () => ({ startDate: resolvedStartDate, endDate: resolvedEndDate }),
    [resolvedEndDate, resolvedStartDate]
  );

  const inventorySummaryQuery = useGetInventorySummary();
  const lowStockProductsQuery = useGetDealerProducts({ lowStock: true, limit: 6 });
  const salesStatsQuery = useGetSalesStatistics(statsParams);
  const ledgerSummaryQuery = useGetLedgerSummary(statsParams);
  const manualCompaniesQuery = useGetManualCompanies({ archived: false });
  const profitSummaryQuery = useGetDealerProfitSummary();
  const customersQuery = useGetDealerCustomers({ page: 1, limit: 100, archived: false });

  const inventorySummary = inventorySummaryQuery.data?.data;
  const salesStats = salesStatsQuery.data?.data;
  const ledgerSummary = ledgerSummaryQuery.data?.data;
  const manualCompanies = manualCompaniesQuery.data ?? [];
  const profitSummary = profitSummaryQuery.data;
  const customers = customersQuery.data?.data ?? [];
  const lowStockProducts = lowStockProductsQuery.data?.data ?? [];

  const activeCustomers = useMemo(
    () => customers.filter((customer) => Number(customer.balance || 0) > 0),
    [customers]
  );
  const overdueCustomers = useMemo(
    () =>
      [...activeCustomers]
        .sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0))
        .slice(0, 5),
    [activeCustomers]
  );

  const sortedManualCompanies = useMemo(
    () =>
      [...manualCompanies]
        .sort((a, b) => Math.abs(Number(b.balance || 0)) - Math.abs(Number(a.balance || 0)))
        .slice(0, 5),
    [manualCompanies]
  );

  const totalPaymentsMade = useMemo(
    () => manualCompanies.reduce((sum, company) => sum + Number(company.totalPayments || 0), 0),
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
  const alertCount = lowStockCount + overdueCustomers.length + outOfStockCount;

  const handleReset = () => {
    setRangePreset("30d");
    setStartDate("");
    setEndDate("");
  };

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
  const totalPurchases = Number(profitSummary?.totalPurchases || 0);
  const totalPaymentsReceived = Number(ledgerSummary?.totalPaymentsReceived || 0);
  const netCustomerBalance = Number(ledgerSummary?.netCustomerBalance || 0);
  const netCompanyBalance = Number(ledgerSummary?.netCompanyBalance || 0);
  const profit = Number(profitSummary?.profit || 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Analytics</h1>
          <p className="text-sm text-muted-foreground md:text-base">
            Dealer sales, balances, inventory pressure, and company exposure in one view.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="gap-2">
            <Link href="/dealer/dashboard/home">
              <LayoutDashboard className="h-4 w-4" />
              Home
            </Link>
          </Button>
          <Button type="button" variant="outline" className="gap-2" onClick={handleRefresh}>
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Dealer analytics
              </CardTitle>
              <CardDescription>Current range: {rangeLabel}</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {quickRanges.map((range) => (
                <Button
                  key={range.value}
                  type="button"
                  size="sm"
                  variant={rangePreset === range.value ? "default" : "outline"}
                  onClick={() => {
                    setRangePreset(range.value);
                    setStartDate("");
                    setEndDate("");
                  }}
                  className="gap-1.5"
                >
                  {range.label}
                </Button>
              ))}
              <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={handleReset}>
                <RefreshCcw className="h-4 w-4" />
                Reset
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr]">
            <div className="space-y-2">
              <div className="text-sm font-medium">Range preset</div>
              <div className="rounded-lg border bg-background p-2">
                <select
                  value={rangePreset}
                  onChange={(e) => {
                    setRangePreset(e.target.value as typeof rangePreset);
                    setStartDate("");
                    setEndDate("");
                  }}
                  className="h-10 w-full bg-transparent px-2 text-sm outline-none"
                >
                  {quickRanges.map((range) => (
                    <option key={range.value} value={range.value}>
                      {range.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <DateInput label="Start date" value={startDate} onChange={setStartDate} preferNativeInput />
            <DateInput label="End date" value={endDate} onChange={setEndDate} preferNativeInput />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className="gap-1">
              <CalendarRange className="h-3.5 w-3.5" />
              Filtered summary
            </Badge>
            <span>Use the quick ranges or override with custom dates.</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          title="Sales"
          value={salesStatsQuery.isLoading ? "..." : formatMoney(salesTotal)}
          description="Revenue in the selected range"
          icon={ReceiptText}
          tone="text-green-600"
          badge={`${formatNumber(salesStats?.totalSales || 0)} sales`}
        />
        <MetricCard
          title="Collections"
          value={salesStatsQuery.isLoading ? "..." : formatMoney(paidAtSale)}
          description="Cash collected at sale time"
          icon={Wallet}
          tone="text-blue-600"
          badge={`${formatMoney(dueAtSale)} due`}
        />
        <MetricCard
          title="Profit"
          value={profitSummaryQuery.isLoading ? "..." : formatMoney(profit)}
          description="Purchase cost versus sales"
          icon={TrendingUp}
          tone="text-emerald-600"
          badge={`${formatMoney(totalPurchases)} purchases`}
        />
        <MetricCard
          title="Customer balance"
          value={ledgerSummaryQuery.isLoading ? "..." : formatMoney(netCustomerBalance)}
          description="Net manual customer exposure"
          icon={Users}
          tone="text-violet-600"
          badge={`${formatNumber(overdueCustomers.length)} overdue`}
        />
        <MetricCard
          title="Company balance"
          value={ledgerSummaryQuery.isLoading ? "..." : formatMoney(netCompanyBalance)}
          description="Net manual company exposure"
          icon={Building2}
          tone="text-amber-600"
          badge={`${manualCompanies.length} suppliers`}
        />
        <MetricCard
          title="Alerts"
          value={inventorySummaryQuery.isLoading ? "..." : formatNumber(alertCount)}
          description="Low stock, out of stock, overdue"
          icon={AlertTriangle}
          tone="text-red-600"
          badge={`${formatNumber(lowStockCount)} low stock`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="min-h-[360px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <AlertTriangle className="h-5 w-5" />
              Watch list
            </CardTitle>
            <CardDescription>Customers owing money and products needing attention.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-medium">Top overdue customers</div>
                <Badge variant="outline">{formatNumber(overdueCustomers.length)}</Badge>
              </div>
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overdueCustomers.length > 0 ? (
                      overdueCustomers.map((customer) => (
                        <TableRow key={customer.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">{customer.name}</div>
                              <div className="text-xs text-muted-foreground">{customer.phone}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium text-red-600">
                            {formatMoney(customer.balance)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                          No overdue customers in this range.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-medium">Low stock products</div>
                <Badge variant="outline">{formatNumber(lowStockCount)}</Badge>
              </div>
              <div className="space-y-2">
                {lowStockProducts.length > 0 ? (
                  lowStockProducts.map((product: any) => (
                    <div key={product.id} className="flex items-start justify-between rounded-lg border p-3">
                      <div className="space-y-1">
                        <div className="font-medium">{product.name}</div>
                        <div className="text-xs text-muted-foreground">{product.type}</div>
                      </div>
                      <div className="text-right text-sm">
                        <div className="font-medium text-red-600">{formatNumber(product.currentStock)} left</div>
                        <div className="text-xs text-muted-foreground">Min {formatNumber(product.minStock || 0)}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    No low stock products.
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Building2 className="h-5 w-5" />
              Company balances
            </CardTitle>
            <CardDescription>Manual companies currently on the books.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sortedManualCompanies.length > 0 ? (
              sortedManualCompanies.map((company) => {
                const balance = Number(company.balance || 0);
                const isOwed = balance >= 0;
                return (
                  <div key={company.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="font-medium">{company.name}</div>
                        <div className="text-xs text-muted-foreground">{company.phone || "No phone"}</div>
                      </div>
                      <Badge variant={isOwed ? "default" : "secondary"} className="gap-1">
                        {isOwed ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                        {isOwed ? "Owed" : "Advance"}
                      </Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground">Balance</div>
                        <div className={`font-medium ${balance >= 0 ? "text-red-600" : "text-green-600"}`}>
                          {formatMoney(Math.abs(balance))}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Purchases</div>
                        <div className="font-medium">{formatMoney(company.totalPurchases)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Payments</div>
                        <div className="font-medium">{formatMoney(company.totalPayments)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Status</div>
                        <div className="font-medium">{company.archivedAt ? "Archived" : "Active"}</div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No manual companies found.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Wallet className="h-5 w-5" />
            Balance summary
          </CardTitle>
          <CardDescription>Aggregated money flow across dealer books.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Total sales</div>
              <div className="mt-1 text-lg font-semibold">{formatMoney(salesTotal)}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Total purchases</div>
              <div className="mt-1 text-lg font-semibold">{formatMoney(totalPurchases)}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Payments received</div>
              <div className="mt-1 text-lg font-semibold">{formatMoney(totalPaymentsReceived)}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Payments made</div>
              <div className="mt-1 text-lg font-semibold">{formatMoney(totalPaymentsMade)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <BarChart3 className="h-5 w-5" />
              Inventory type distribution
            </CardTitle>
            <CardDescription>Compact view of stock composition.</CardDescription>
          </CardHeader>
          <CardContent>
            {productsByTypeChart.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[280px] w-full">
                <PieChart>
                  <Pie
                    data={productsByTypeChart}
                    dataKey="count"
                    nameKey="type"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                  >
                    {productsByTypeChart.map((entry, index) => (
                      <Cell
                        key={entry.type}
                        fill={chartColors[index % chartColors.length]}
                      />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="flex min-h-[240px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                No stock mix data.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Users className="h-5 w-5" />
              Customer exposure
            </CardTitle>
            <CardDescription>Customers with outstanding balances.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {overdueCustomers.length > 0 ? (
              overdueCustomers.map((customer) => (
                <div key={customer.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium">{customer.name}</div>
                      <div className="text-xs text-muted-foreground">{customer.phone}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-red-600">{formatMoney(customer.balance)}</div>
                      <div className="text-xs text-muted-foreground">Outstanding</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No overdue customer balances.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
