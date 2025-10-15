import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";
import { CheckCircle, TrendingUp, TrendingDown, DollarSign, Users, Activity } from "lucide-react";
import { DateDisplay } from "@/common/components/ui/date-display";

interface OverviewTabProps {
  batch: any;
  analytics: any;
  isBatchClosed: boolean;
  currentAge: number;
  perBroilerExpenseData: {
    netExpenses: number;
    remainingBroilers: number;
    totalMortality: number;
    totalSold: number;
    perBroilerExpense: number;
    displayValue: number;
    isProfit: boolean;
  };
  salesTotal: number;
  expensesTotal: number;
  mortalityStats: any;
  recentExpenses: any[];
  recentSales: any[];
  recentMortalities: any[];
}

export function OverviewTab({
  batch,
  analytics,
  isBatchClosed,
  currentAge,
  perBroilerExpenseData,
  salesTotal,
  expensesTotal,
  mortalityStats,
  recentExpenses,
  recentSales,
  recentMortalities,
}: OverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Batch Status Banner */}
      {isBatchClosed && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-green-900">
                    Batch Completed
                  </h3>
                  <p className="text-sm text-green-700">
                    Closed on{" "}
                    {batch.endDate
                      ? <DateDisplay date={batch.endDate} format="short" />
                      : "N/A"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-900">
                  {analytics?.daysActive || currentAge} days
                </div>
                <div className="text-sm text-green-700">Total Duration</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance Metrics</CardTitle>
            <CardDescription>
              {isBatchClosed
                ? "Final performance summary"
                : "Current performance snapshot"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Initial Birds:
                </span>
                <span className="font-medium">
                  {batch?.initialChicks?.toLocaleString() || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Current Birds:
                </span>
                <span className="font-medium">
                  {mortalityStats?.currentBirds?.toLocaleString() || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Mortality:
                </span>
                <span className="font-medium text-red-600">
                  {mortalityStats?.totalMortality?.toLocaleString() || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Sold:
                </span>
                <span className="font-medium text-blue-600">
                  {analytics?.totalSalesQuantity?.toLocaleString() || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Age:
                </span>
                <span className="font-medium">
                  {currentAge} days
                </span>
              </div>
              {analytics?.mortalityRate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Mortality Rate:
                  </span>
                  <span className="font-medium">
                    {analytics.mortalityRate.toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Financial Summary</CardTitle>
            <CardDescription>Revenue and cost breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Total Revenue:
                </span>
                <span className="font-medium text-green-600">
                  ₹{salesTotal.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Total Expenses:
                </span>
                <span className="font-medium text-red-600">
                  ₹{expensesTotal.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Net Result:
                </span>
                <span className={`font-medium ${perBroilerExpenseData.netExpenses >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ₹{Math.abs(perBroilerExpenseData.netExpenses).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Per Broiler:
                </span>
                <span className={`font-medium ${perBroilerExpenseData.isProfit ? 'text-green-600' : 'text-red-600'}`}>
                  {perBroilerExpenseData.isProfit ? '+' : '-'}₹{perBroilerExpenseData.displayValue.toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
            <CardDescription>Latest batch activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              {recentExpenses.length > 0 && (
                <div className="flex items-center space-x-2">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  <span className="text-muted-foreground">
                    Latest expense: ₹{recentExpenses[0]?.amount?.toLocaleString()}
                  </span>
                </div>
              )}
              {recentSales.length > 0 && (
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-muted-foreground">
                    Latest sale: ₹{recentSales[0]?.amount?.toLocaleString()}
                  </span>
                </div>
              )}
              {recentMortalities.length > 0 && (
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-orange-500" />
                  <span className="text-muted-foreground">
                    Latest mortality: {recentMortalities[0]?.count} birds
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
