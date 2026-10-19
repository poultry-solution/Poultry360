import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Percent, Receipt, TrendingUp, Wallet } from "lucide-react";
import { StatTile, rupees } from "@/components/dashboard/StatsCards";

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
  isBatchClosed: boolean;
  perBirdRevenue: number;
  /** Full expense list of the batch (not the paged Expenses tab list). */
  expenses: any[];
}

/** Signed money: loss "−रू 2,94,010", profit "+रू 45", zero "रू 0". */
const signedRupees = (value: number) => {
  const rounded = Math.round(value);
  if (rounded === 0) return rupees(0);
  return `${rounded < 0 ? "−" : "+"}${rupees(Math.abs(rounded))}`;
};

const count = (value: number) => Number(value || 0).toLocaleString("en-IN");

/** Same names the Expenses tab filter uses; Hatchery counts as Chicks. */
const costGroup = (name?: string | null) => {
  if (!name) return "Other";
  return name === "Hatchery" ? "Chicks" : name;
};

const BAR_COLORS: Record<string, string> = {
  Feed: "bg-blue-500",
  Chicks: "bg-green-500",
  Medicine: "bg-purple-500",
};

export function ProfitLossTab({
  salesTotal,
  expensesTotal,
  profit,
  analytics,
  perBroilerExpenseData,
  batch,
  isBatchClosed,
  perBirdRevenue,
  expenses,
}: ProfitLossTabProps) {
  const roundedProfit = Math.round(profit);
  const profitClass = roundedProfit > 0 ? "text-green-600" : roundedProfit < 0 ? "text-red-600" : "text-gray-900";
  const initialBirds = Number(batch?.initialChicks || 0);

  const margin = Number(analytics?.profitMargin);
  const hasSales = salesTotal > 0 && Number.isFinite(margin);

  // Per bird: same value and divisor as before (birds left, or birds started when none are left).
  const perBirdRounded = Math.round(perBroilerExpenseData.displayValue);
  const divisor =
    perBroilerExpenseData.remainingBroilers > 0
      ? { birds: perBroilerExpenseData.remainingBroilers, label: "birds left" }
      : initialBirds > 0
        ? { birds: initialBirds, label: "birds started" }
        : null;
  const perBirdLabel = !divisor || perBirdRounded === 0
    ? "Per bird"
    : perBroilerExpenseData.isProfit ? "Profit per bird" : "Loss per bird";
  const perBirdValue = !divisor
    ? "—"
    : perBirdRounded === 0
      ? rupees(0)
      : `${perBroilerExpenseData.isProfit ? "+" : "−"}${rupees(perBirdRounded)}`;
  const perBirdClass = !divisor || perBirdRounded === 0
    ? "text-gray-900"
    : perBroilerExpenseData.isProfit ? "text-green-600" : "text-red-600";

  const costRows = React.useMemo(() => {
    const totals = new Map<string, number>();
    for (const ex of expenses || []) {
      const key = costGroup(ex?.category?.name);
      totals.set(key, (totals.get(key) || 0) + Number(ex?.amount || 0));
    }
    return [...totals.entries()]
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  const birdSteps: Array<[string, number]> = [
    ["Started with", initialBirds],
    ["Died", perBroilerExpenseData.totalMortality],
    ["Sold", perBroilerExpenseData.totalSold],
  ];

  return (
    <div className="space-y-6">
      {/* Summary tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          tile={{
            label: "Sales",
            icon: TrendingUp,
            value: rupees(salesTotal),
            sub: "",
          }}
        />
        <StatTile
          tile={{
            label: "Costs",
            icon: Receipt,
            value: rupees(expensesTotal),
            sub: `${count((expenses || []).length)} ${(expenses || []).length === 1 ? "entry" : "entries"}`,
          }}
        />
        <StatTile
          tile={{
            label: roundedProfit < 0 ? "Loss" : "Profit",
            icon: Wallet,
            value: signedRupees(profit),
            valueClass: profitClass,
            sub: isBatchClosed ? "Final" : "So far",
          }}
        />
        <StatTile
          tile={{
            label: "Margin",
            icon: Percent,
            value: hasSales ? `${margin.toFixed(1)}%` : "—",
            valueClass: !hasSales ? "text-gray-400" : margin < 0 ? "text-red-600" : "",
            sub: hasSales ? "of sales" : "No sales yet",
          }}
        />
      </div>

      {/* Per bird */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Per bird</CardTitle>
          <CardDescription>Sales minus costs, shared over the birds</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">{perBirdLabel}</p>
              <p className={`mt-1 text-3xl font-bold ${perBirdClass}`}>{perBirdValue}</p>
              {divisor && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {signedRupees(-perBroilerExpenseData.netExpenses)} ÷ {count(divisor.birds)} {divisor.label}
                </p>
              )}
            </div>
            <div className="space-y-2 text-sm">
              {birdSteps.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium">{count(value)}</span>
                </div>
              ))}
              <div className="flex justify-between gap-4 border-t pt-2">
                <span className="font-medium">Left</span>
                <span className="font-semibold">{count(perBroilerExpenseData.remainingBroilers)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Sales */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sales</CardTitle>
            <CardDescription>Money from this batch</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Total sales</span>
                <span className="font-medium">{rupees(salesTotal)}</span>
              </div>
              <div className="flex justify-between gap-4 border-t pt-3">
                <span className="text-muted-foreground">
                  Sales per bird
                  {initialBirds > 0 && (
                    <span className="ml-1.5 text-xs text-gray-400">÷ {count(initialBirds)} birds started</span>
                  )}
                </span>
                <span className="font-medium">{initialBirds > 0 ? rupees(perBirdRevenue) : "—"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Costs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Costs</CardTitle>
            <CardDescription>By type, biggest first</CardDescription>
          </CardHeader>
          <CardContent>
            {costRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No costs recorded yet.</p>
            ) : (
              <div className="space-y-3 text-sm">
                {costRows.map((row) => {
                  const share = expensesTotal > 0 ? (row.amount / expensesTotal) * 100 : 0;
                  return (
                    <div key={row.name}>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">{row.name}</span>
                        <span className="font-medium">
                          {rupees(row.amount)}
                          <span className="ml-1.5 text-xs font-normal text-gray-400">{share.toFixed(0)}%</span>
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={`h-full rounded-full ${BAR_COLORS[row.name] ?? "bg-gray-400"}`}
                          style={{ width: `${Math.min(100, Math.max(0, share))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                <div className="flex justify-between gap-4 border-t pt-3 font-semibold">
                  <span>Total costs</span>
                  <span>{rupees(expensesTotal)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
