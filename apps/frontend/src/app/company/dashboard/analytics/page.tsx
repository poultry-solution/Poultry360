"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Badge } from "@/common/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Users,
  Truck,
  CreditCard,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  PieChart,
} from "lucide-react";
import { useGetCompanyAnalytics } from "@/fetchers/company/companyAnalyticsQueries";

export default function CompanyAnalyticsPage() {
  const [period, setPeriod] = useState("30");
  const { data: analytics, isLoading } = useGetCompanyAnalytics(period);

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return "रू 0";
    return `रू ${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
  };

  // Calculate min and max revenue for chart scaling
  const revenueValues = analytics?.trends.revenueTrends.map(t => t.revenue) || [];
  const minRevenue = revenueValues.length > 0 ? Math.min(...revenueValues) : 0;
  const maxRevenue = revenueValues.length > 0 ? Math.max(...revenueValues) : 1;
  const revenueRange = maxRevenue - minRevenue || 1; // Avoid division by zero

  // Calculate max dealer sales for chart scaling
  const maxDealerSales = analytics?.salesByDealer.reduce(
    (max, dealer) => Math.max(max, dealer.totalAmount),
    0
  ) || 1;

  // Calculate max product sales for chart scaling
  const maxProductSales = analytics?.productPerformance.reduce(
    (max, product) => Math.max(max, product.totalAmount),
    0
  ) || 1;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics & Insights</h1>
          <p className="text-muted-foreground">
            Comprehensive analytics for your distribution network
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.overview.totalRevenue)}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              {analytics.trends.monthlyComparison.growth >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <span className={analytics.trends.monthlyComparison.growth >= 0 ? "text-green-600" : "text-red-600"}>
                {formatPercent(analytics.trends.monthlyComparison.growth)} from last month
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.totalSales.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.trends.monthlyComparison.currentMonth.salesCount} this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(analytics.overview.totalOutstanding)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Pending from dealers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payments Received</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(analytics.overview.totalPayments)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total collected</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Revenue Trends
          </CardTitle>
          <CardDescription>Daily revenue over the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.trends.revenueTrends.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No revenue data for the selected period
            </div>
          ) : (
            <div className="space-y-4">
              <div className="h-[280px] flex items-end gap-2 px-2">
                {analytics.trends.revenueTrends.map((trend, index) => {
                  // Use range-based scaling: (value - min) / (max - min) * 100
                  // This ensures all bars are visible and proportional
                  const normalizedValue = revenueRange > 0 
                    ? ((trend.revenue - minRevenue) / revenueRange) * 100 
                    : 50; // If all values are same, show 50%
                  
                  // Ensure minimum height of 15% for visibility, maximum 100%
                  const height = Math.max(15, Math.min(100, normalizedValue));
                  
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center group relative">
                      <div className="w-full h-full flex flex-col justify-end relative">
                        <div
                          className="w-full bg-gradient-to-t from-primary via-primary/80 to-primary/60 rounded-t transition-all hover:from-primary/90 hover:via-primary/70 hover:to-primary/50 cursor-pointer shadow-sm hover:shadow-md"
                          style={{ 
                            height: `${height}%`,
                            minHeight: '20px' // Ensure minimum pixel height
                          }}
                          title={`${new Date(trend.date).toLocaleDateString()}: ${formatCurrency(trend.revenue)} (${trend.salesCount} sales)`}
                        />
                        {/* Value label on hover */}
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-10">
                          {formatCurrency(trend.revenue)}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground mt-2 text-center leading-tight">
                        {new Date(trend.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  );
                })}
              </div>
              {/* Legend */}
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                <span>Min: {formatCurrency(minRevenue)}</span>
                <span>Max: {formatCurrency(maxRevenue)}</span>
                <span>Range: {formatCurrency(revenueRange)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Comparison */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Monthly Comparison
            </CardTitle>
            <CardDescription>Current vs previous month performance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Current Month</span>
                <span className="text-lg font-bold">
                  {formatCurrency(analytics.trends.monthlyComparison.currentMonth.revenue)}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      (analytics.trends.monthlyComparison.currentMonth.revenue /
                        Math.max(
                          analytics.trends.monthlyComparison.currentMonth.revenue,
                          analytics.trends.monthlyComparison.previousMonth.revenue,
                          1
                        )) *
                        100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Previous Month</span>
                <span className="text-lg font-bold">
                  {formatCurrency(analytics.trends.monthlyComparison.previousMonth.revenue)}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-muted-foreground/50 h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      (analytics.trends.monthlyComparison.previousMonth.revenue /
                        Math.max(
                          analytics.trends.monthlyComparison.currentMonth.revenue,
                          analytics.trends.monthlyComparison.previousMonth.revenue,
                          1
                        )) *
                        100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Growth Rate</span>
                <Badge
                  variant={analytics.trends.monthlyComparison.growth >= 0 ? "default" : "destructive"}
                  className="text-sm"
                >
                  {analytics.trends.monthlyComparison.growth >= 0 ? (
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 mr-1" />
                  )}
                  {formatPercent(analytics.trends.monthlyComparison.growth)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Dealers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Dealers by Revenue
            </CardTitle>
            <CardDescription>Best performing dealers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.salesByDealer.slice(0, 5).map((dealer, index) => {
                const percentage = (dealer.totalAmount / maxDealerSales) * 100;
                return (
                  <div key={dealer.dealerId} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                        <div>
                          <p className="text-sm font-medium">{dealer.dealerName}</p>
                          <p className="text-xs text-muted-foreground">{dealer.totalSales} sales</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold">{formatCurrency(dealer.totalAmount)}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Product Performance & Consignments */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Top Products
            </CardTitle>
            <CardDescription>Best selling products</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.productPerformance.slice(0, 5).map((product) => {
                const percentage = (product.totalAmount / maxProductSales) * 100;
                return (
                  <div key={product.productId} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium">{product.productName}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.totalQuantity.toFixed(2)} {product.unit} • {product.saleCount} sales
                        </p>
                      </div>
                      <span className="text-sm font-bold">{formatCurrency(product.totalAmount)}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Consignment Status
            </CardTitle>
            <CardDescription>Consignment distribution by status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.consignments.byStatus.map((stat) => {
                const totalConsignments = analytics.consignments.byStatus.reduce(
                  (sum, s) => sum + s.count,
                  0
                );
                const percentage = totalConsignments > 0 ? (stat.count / totalConsignments) * 100 : 0;
                const statusColors: Record<string, string> = {
                  CREATED: "bg-gray-500",
                  ACCEPTED_PENDING_DISPATCH: "bg-blue-600",
                  DISPATCHED: "bg-purple-600",
                  RECEIVED: "bg-green-600",
                  SETTLED: "bg-emerald-600",
                  REJECTED: "bg-red-600",
                  CANCELLED: "bg-orange-600",
                };
                return (
                  <div key={stat.status} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {stat.status.replace(/_/g, " ")}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{stat.count} consignments</span>
                      </div>
                      <span className="text-sm font-bold">{formatCurrency(stat.totalAmount)}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${statusColors[stat.status] || "bg-gray-500"}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Methods & Top Accounts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Payments by Method
            </CardTitle>
            <CardDescription>Payment distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.payments.byMethod.map((payment) => {
                const totalPayments = analytics.payments.byMethod.reduce(
                  (sum, p) => sum + p.totalAmount,
                  0
                );
                const percentage = totalPayments > 0 ? (payment.totalAmount / totalPayments) * 100 : 0;
                return (
                  <div key={payment.method} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium capitalize">{payment.method.toLowerCase()}</span>
                        <span className="text-xs text-muted-foreground">{payment.count} payments</span>
                      </div>
                      <span className="text-sm font-bold">{formatCurrency(payment.totalAmount)}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Top Accounts
            </CardTitle>
            <CardDescription>Dealers with highest balances</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.topAccounts.slice(0, 5).map((account) => {
                const maxBalance = Math.max(
                  ...analytics.topAccounts.map((a) => Math.abs(a.balance)),
                  1
                );
                const percentage = (Math.abs(account.balance) / maxBalance) * 100;
                return (
                  <div key={account.dealerId} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium">{account.dealerName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(account.totalSales)} sales • {formatCurrency(account.totalPayments)} paid
                        </p>
                      </div>
                      <span
                        className={`text-sm font-bold ${
                          account.balance > 0 ? "text-red-600" : account.balance < 0 ? "text-green-600" : ""
                        }`}
                      >
                        {formatCurrency(account.balance)}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          account.balance > 0 ? "bg-red-600" : account.balance < 0 ? "bg-green-600" : "bg-gray-500"
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
