import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";

interface ProfitLossTabProps {
  salesTotal: number;
  expensesTotal: number;
  profit: number;
  analytics: any;
  perBroilerExpenseData: {
    netExpenses: number;
    remainingBroilers: number;
    totalMortality: number;
    totalSold: number;
    perBroilerExpense: number;
    displayValue: number;
    isProfit: boolean;
  };
  batch: any;
  receivableTotal: number;
  perBirdRevenue: number;
  expenseBreakdown: any[];
  salesBreakdown: any[];
}

export function ProfitLossTab({
  salesTotal,
  expensesTotal,
  profit,
  analytics,
  perBroilerExpenseData,
  batch,
  receivableTotal,
  perBirdRevenue,
  expenseBreakdown,
  salesBreakdown,
}: ProfitLossTabProps) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-900">
                ₹{salesTotal.toLocaleString()}
              </div>
              <div className="text-sm text-green-700">Total Revenue</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-900">
                ₹{expensesTotal.toLocaleString()}
              </div>
              <div className="text-sm text-red-700">Total Expenses</div>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`border-2 ${profit >= 0 ? "border-green-300 bg-green-100" : "border-red-300 bg-red-100"}`}
        >
          <CardContent className="pt-6">
            <div className="text-center">
              <div
                className={`text-2xl font-bold ${profit >= 0 ? "text-green-900" : "text-red-900"}`}
              >
                ₹{profit.toLocaleString()}
              </div>
              <div
                className={`text-sm ${profit >= 0 ? "text-green-700" : "text-red-700"}`}
              >
                Net Profit
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-900">
                {analytics?.profitMargin
                  ? `${analytics.profitMargin.toFixed(1)}%`
                  : "0%"}
              </div>
              <div className="text-sm text-orange-700">Profit Margin</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per Broiler Expense Card */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="text-base">Per Broiler Analysis</CardTitle>
          <CardDescription>
            Net expense/profit per remaining broiler
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-2">
                  {perBroilerExpenseData.isProfit
                    ? "Profit per Broiler"
                    : "Cost per Broiler"}
                </div>
                <div
                  className={`text-3xl font-bold ${perBroilerExpenseData.isProfit ? "text-green-600" : "text-orange-600"}`}
                >
                  ₹{perBroilerExpenseData.displayValue.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Initial Broilers:
                </span>
                <span className="font-medium">
                  {batch.initialChicks?.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mortality:</span>
                <span className="font-medium text-red-600">
                  -{perBroilerExpenseData.totalMortality?.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sold:</span>
                <span className="font-medium text-blue-600">
                  -{perBroilerExpenseData.totalSold?.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-muted-foreground font-medium">
                  Remaining Broilers:
                </span>
                <span className="font-bold">
                  {perBroilerExpenseData.remainingBroilers?.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="space-y-2 border-t pt-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Total Expenses:
                </span>
                <span className="font-medium text-red-600">
                  ₹{expensesTotal.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Sales:</span>
                <span className="font-medium text-green-600">
                  -₹{salesTotal.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-muted-foreground font-medium">
                  Net Expenses:
                </span>
                <span
                  className={`font-bold ${perBroilerExpenseData.netExpenses >= 0 ? "text-red-600" : "text-green-600"}`}
                >
                  ₹{perBroilerExpenseData.netExpenses.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-xs text-blue-800">
                <strong>Formula:</strong> Net Expenses ÷ Remaining Broilers
              </div>
              <div className="text-xs text-blue-600 mt-1">
                ({perBroilerExpenseData.netExpenses >= 0 ? "₹" : "-₹"}
                {Math.abs(
                  perBroilerExpenseData.netExpenses
                ).toLocaleString()}{" "}
                ÷{" "}
                {perBroilerExpenseData.remainingBroilers ||
                  batch.initialChicks}
                )
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Revenue Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue Analysis</CardTitle>
            <CardDescription>Breakdown of income sources</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Total Sales Amount:
                </span>
                <span className="font-medium text-green-600">
                  ₹{salesTotal.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Amount Received:
                </span>
                <span className="font-medium text-green-600">
                  ₹{(salesTotal - receivableTotal).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Outstanding Amount:
                </span>
                <span className="font-medium text-orange-600">
                  ₹{receivableTotal.toLocaleString()}
                </span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Revenue per Bird:
                  </span>
                  <span className="font-medium">
                    ₹{perBirdRevenue.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Expense Analysis</CardTitle>
            <CardDescription>Breakdown by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              {expenseBreakdown.map((category: any) => (
                <div key={category.name} className="flex justify-between">
                  <span className="text-muted-foreground">
                    {category.name}:
                  </span>
                  <span className="font-medium">
                    ₹{category.amount.toLocaleString()}
                  </span>
                </div>
              ))}
              <div className="border-t pt-2">
                <div className="flex justify-between font-semibold">
                  <span>Total Expenses:</span>
                  <span className="text-red-600">
                    ₹{expensesTotal.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
