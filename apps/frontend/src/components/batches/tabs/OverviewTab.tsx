import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Activity, AlertTriangle, CheckCircle, TrendingUp, TrendingDown } from "lucide-react";
import { DateDisplay } from "@/common/components/ui/date-display";
import type { FcrHistoryRow } from "@/types/fcr";

interface OverviewTabProps {
  batch: any;
  analytics: any;
  fcrHistory: FcrHistoryRow[];
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
  onRecordWeight: () => void;
}

export function OverviewTab({
  batch,
  analytics,
  fcrHistory,
  isBatchClosed,
  currentAge,
  perBroilerExpenseData,
  salesTotal,
  expensesTotal,
  mortalityStats,
  recentExpenses,
  recentSales,
  recentMortalities,
  onRecordWeight,
}: OverviewTabProps) {
  const fcrData = analytics?.fcrData;
  const fcrIsFinal =
    fcrData?.basis === "FINAL" || fcrData?.basis === "FINAL_PENDING_CLOSE";
  const fcrIsStale = fcrData?.freshnessStatus === "STALE";
  const displayedFcr = fcrData?.fcr ?? analytics?.lastKnownFcr ?? null;
  const weightCanRefreshFcr =
    fcrData?.basis === "LIVE" &&
    (fcrData?.status === "NO_MANUAL_WEIGHT" ||
      fcrData?.status === "INVALID_WEIGHT_DATA" ||
      (fcrData?.staleReasons || []).some((reason: string) =>
        [
          "WEIGHT_TOO_OLD",
          "NEWER_FEED_NOT_INCLUDED",
          "NEWER_SALE_NOT_INCLUDED",
          "NEWER_MORTALITY_NOT_INCLUDED",
        ].includes(reason)
      ));
  const staleMessages = (fcrData?.staleReasons || []).map((reason: string) => {
    switch (reason) {
      case "WEIGHT_TOO_OLD":
        return `Weight is ${fcrData?.weightAgeDays ?? 0} days old`;
      case "NEWER_FEED_NOT_INCLUDED":
        return `${fcrData?.newerFeedCount ?? 0} newer feed record(s) not included`;
      case "NEWER_SALE_NOT_INCLUDED":
        return `${fcrData?.newerSaleCount ?? 0} newer sale(s) not included`;
      case "NEWER_MORTALITY_NOT_INCLUDED":
        return `${fcrData?.newerMortalityCount ?? 0} newer death record(s) not included`;
      default:
        return reason;
    }
  });

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
              {analytics?.mortalityRate != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Mortality Rate:
                  </span>
                  <span className="font-medium">
                    {analytics.mortalityRate.toFixed(2)}%
                  </span>
                </div>
              )}
              {(batch as { batchType?: string })?.batchType === "BROILER" && (
                <div className={`rounded-lg border p-3 ${fcrIsStale ? "border-amber-200 bg-amber-50" : "bg-muted/30"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {fcrIsFinal ? "Final FCR" : fcrData?.asOfDate ? "FCR as of" : "Current FCR"}
                      </p>
                      {fcrData?.asOfDate && !fcrIsFinal && (
                        <DateDisplay date={fcrData.asOfDate} format="short" />
                      )}
                      {fcrData?.weightSourceDate && !fcrIsFinal && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Weight recorded: {" "}
                          <DateDisplay date={fcrData.weightSourceDate} format="short" />
                        </p>
                      )}
                    </div>
                    <span className="text-lg font-semibold">
                      {displayedFcr != null ? Number(displayedFcr).toFixed(2) : "—"}
                    </span>
                  </div>

                  {displayedFcr == null && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {fcrData?.message || "FCR is not available"}
                    </p>
                  )}

                  {fcrIsFinal && fcrData?.remainingBirds === 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      All birds are accounted for. Sale weights are used, so no current weight is needed.
                    </p>
                  )}

                  {fcrIsStale && (
                    <div className="mt-2 space-y-1 text-xs text-amber-800">
                      <p className="flex items-center gap-1 font-medium">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        This FCR is stale
                      </p>
                      {staleMessages.map((message: string) => (
                        <p key={message}>{message}</p>
                      ))}
                    </div>
                  )}

                  {fcrData?.initialWeightEstimated && (
                    <p className="mt-2 text-xs text-amber-700">
                      Initial chick weight uses the old 0.05 kg estimate.
                    </p>
                  )}

                  {!isBatchClosed && weightCanRefreshFcr && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3 h-8"
                      onClick={onRecordWeight}
                    >
                      Record current weight
                    </Button>
                  )}
                </div>
              )}
              {analytics?.currentAvgWeight != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Avg weight (kg):
                  </span>
                  <span className="font-medium">
                    {Number(analytics.currentAvgWeight).toFixed(2)}
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

      {(batch as { batchType?: string })?.batchType === "BROILER" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">FCR History</CardTitle>
            <CardDescription>Saved FCR values by date</CardDescription>
          </CardHeader>
          <CardContent>
            {fcrHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No FCR history yet. Record feed and a live weight to create the first value.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-2 py-2 font-medium">Date</th>
                      <th className="px-2 py-2 font-medium">FCR</th>
                      <th className="px-2 py-2 font-medium">Average kg</th>
                      <th className="px-2 py-2 font-medium">Feed kg</th>
                      <th className="px-2 py-2 font-medium">Produced kg</th>
                      <th className="px-2 py-2 font-medium">Gain kg</th>
                      <th className="px-2 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...fcrHistory].reverse().map((row) => (
                      <tr key={row.id} className="border-b last:border-0">
                        <td className="px-2 py-2">
                          <DateDisplay date={row.calculationDate} format="short" />
                        </td>
                        <td className="px-2 py-2 font-medium">{row.fcr.toFixed(2)}</td>
                        <td className="px-2 py-2">
                          {row.remainingAverageWeightKg == null
                            ? "—"
                            : row.remainingAverageWeightKg.toFixed(2)}
                        </td>
                        <td className="px-2 py-2">{row.feedKg.toFixed(2)}</td>
                        <td className="px-2 py-2">{row.producedLiveWeightKg.toFixed(2)}</td>
                        <td className="px-2 py-2">{row.weightGainKg.toFixed(2)}</td>
                        <td className="px-2 py-2">
                          <span className={row.displayStatus === "FRESH"
                            ? "text-green-700"
                            : row.displayStatus === "FINAL"
                              ? "text-blue-700"
                              : "text-amber-700"}
                          >
                            {row.displayStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
