import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Activity, AlertTriangle, CheckCircle, TrendingUp, TrendingDown } from "lucide-react";
import { DateDisplay } from "@/common/components/ui/date-display";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/common/components/ui/chart";
import { useCalendar } from "@/common/hooks/useCalendar";
import type { FcrHistoryRow } from "@/types/fcr";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

const fcrChartConfig = {
  fcr: {
    label: "FCR",
    color: "#15803d",
  },
  cfcr: {
    label: "cFCR",
    color: "#2563eb",
  },
} satisfies ChartConfig;

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
  cfcrEnabled: boolean;
  onSaveCfcrSettings: (
    targetWeightKg: number,
    correctionFactorPerKg: number,
  ) => Promise<void>;
  cfcrSettingsSaving: boolean;
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
  cfcrEnabled,
  onSaveCfcrSettings,
  cfcrSettingsSaving,
}: OverviewTabProps) {
  const { toDisplayDate } = useCalendar();
  const fcrData = analytics?.fcrData;
  const fcrIsFinal =
    fcrData?.basis === "FINAL" || fcrData?.basis === "FINAL_PENDING_CLOSE";
  const fcrIsStale = fcrData?.freshnessStatus === "STALE";
  const displayedFcr = fcrData?.fcr ?? analytics?.lastKnownFcr ?? null;
  const displayedCfcr = fcrData?.cfcr ?? analytics?.lastKnownCfcr ?? null;
  const [cfcrTarget, setCfcrTarget] = React.useState("2.00");
  const [cfcrFactor, setCfcrFactor] = React.useState("0.40");
  React.useEffect(() => {
    setCfcrTarget(
      batch?.cfcrTargetWeightKg == null
        ? isBatchClosed ? "" : "2.00"
        : String(batch.cfcrTargetWeightKg),
    );
    setCfcrFactor(
      batch?.cfcrCorrectionFactorPerKg == null
        ? isBatchClosed ? "" : "0.40"
        : String(batch.cfcrCorrectionFactorPerKg),
    );
  }, [
    batch?.cfcrTargetWeightKg,
    batch?.cfcrCorrectionFactorPerKg,
    isBatchClosed,
  ]);

  const saveCfcrSettings = async () => {
    const target = Number(cfcrTarget);
    const factor = Number(cfcrFactor);
    if (!Number.isFinite(target) || target <= 0) return;
    if (!Number.isFinite(factor) || factor < 0) return;
    try {
      await onSaveCfcrSettings(target, factor);
    } catch {
      // The shared request handler shows the server error.
    }
  };
  const fcrChartData = fcrHistory.map((row) => ({
    ...row,
    dateLabel: toDisplayDate(row.calculationDate, "short"),
  }));
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
  const staleReasons: string[] = fcrData?.staleReasons || [];
  const hasOldWeight = staleReasons.includes("WEIGHT_TOO_OLD");
  const hasNewerRecords = staleReasons.some((reason) =>
    [
      "NEWER_FEED_NOT_INCLUDED",
      "NEWER_SALE_NOT_INCLUDED",
      "NEWER_MORTALITY_NOT_INCLUDED",
    ].includes(reason)
  );
  const fcrStatusLabel = fcrIsFinal
    ? "Final"
    : fcrIsStale
      ? "Needs update"
      : displayedFcr != null
        ? "Up to date"
        : "Not available";
  const fcrStatusClass = fcrIsFinal
    ? "bg-blue-100 text-blue-700"
    : fcrIsStale
      ? "bg-amber-100 text-amber-800"
      : displayedFcr != null
        ? "bg-green-100 text-green-700"
        : "bg-gray-100 text-gray-600";
  const fcrSummaryMessage = fcrIsStale
    ? hasOldWeight && hasNewerRecords
      ? "This FCR uses an old weight and does not include the latest batch records."
      : hasOldWeight
        ? "This FCR uses an old weight."
        : hasNewerRecords
          ? "This FCR does not include the latest batch records."
          : "Add a current weight to update this FCR."
    : displayedFcr == null
      ? fcrData?.message || "Record feed and a live weight to calculate FCR."
      : null;

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
            <CardTitle className="text-base">FCR Performance</CardTitle>
            <CardDescription>Latest result, history, and trend</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`mb-6 rounded-lg border p-4 ${
                fcrIsStale ? "border-amber-200 bg-amber-50/50" : "bg-muted/20"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex gap-8">
                  <div>
                    <p className="text-xs text-muted-foreground">FCR</p>
                    <p className="mt-1 text-2xl font-semibold">
                      {displayedFcr == null ? "—" : Number(displayedFcr).toFixed(2)}
                    </p>
                  </div>
                  {cfcrEnabled && (
                    <div>
                      <p className="text-xs text-muted-foreground">cFCR</p>
                      <p className="mt-1 text-2xl font-semibold text-blue-700">
                        {displayedCfcr == null ? "—" : Number(displayedCfcr).toFixed(2)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Target {fcrData?.cfcrTargetWeightKg ?? batch?.cfcrTargetWeightKg ?? "—"} kg
                      </p>
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${fcrStatusClass}`}>
                    {fcrStatusLabel}
                  </span>
                  {fcrData?.asOfDate && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      As of <DateDisplay date={fcrData.asOfDate} format="short" />
                    </p>
                  )}
                </div>
              </div>

              {fcrSummaryMessage && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                  <p className={`flex items-center gap-2 text-xs ${fcrIsStale ? "text-amber-800" : "text-muted-foreground"}`}>
                    {fcrIsStale && <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
                    {fcrSummaryMessage}
                  </p>
                  {!isBatchClosed && weightCanRefreshFcr && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={onRecordWeight}
                    >
                      Record current weight
                    </Button>
                  )}
                </div>
              )}
            </div>

            {fcrHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No saved FCR history yet.
              </p>
            ) : (
              <div className="space-y-6">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="px-2 py-2 font-medium">Date</th>
                        <th className="px-2 py-2 font-medium">FCR</th>
                        {cfcrEnabled && (
                          <>
                            <th className="px-2 py-2 font-medium">cFCR</th>
                            <th className="px-2 py-2 font-medium">Output birds</th>
                            <th className="px-2 py-2 font-medium">Output avg kg</th>
                          </>
                        )}
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
                          {cfcrEnabled && (
                            <>
                              <td className="px-2 py-2 font-medium text-blue-700">
                                {row.cfcr == null ? "—" : row.cfcr.toFixed(2)}
                              </td>
                              <td className="px-2 py-2">
                                {row.outputBirdCount ?? "—"}
                              </td>
                              <td className="px-2 py-2">
                                {row.averageOutputWeightKg == null
                                  ? "—"
                                  : row.averageOutputWeightKg.toFixed(2)}
                              </td>
                            </>
                          )}
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

                <div className="border-t pt-5">
                  <div className="mb-4">
                    <p className="text-sm font-medium">FCR trend</p>
                    <p className="text-xs text-muted-foreground">
                      Daily FCR based on the saved values above
                    </p>
                  </div>
                  <ChartContainer config={fcrChartConfig} className="h-[260px] w-full">
                    <LineChart data={fcrChartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis
                        dataKey="dateLabel"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                        minTickGap={24}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        width={36}
                        domain={["auto", "auto"]}
                        tickFormatter={(value) => Number(value).toFixed(1)}
                      />
                      <ChartTooltip
                        cursor={{ stroke: "#d1d5db", strokeDasharray: "3 3" }}
                        content={
                          <ChartTooltipContent
                            formatter={(value, name) => (
                              <div className="flex min-w-[110px] items-center justify-between gap-4">
                                <span className="text-muted-foreground">
                                  {name === "cfcr" ? "cFCR" : "FCR"}
                                </span>
                                <span className="font-medium">{Number(value).toFixed(2)}</span>
                              </div>
                            )}
                          />
                        }
                      />
                      <Line
                        dataKey="fcr"
                        type="monotone"
                        stroke="var(--color-fcr)"
                        strokeWidth={2.5}
                        dot={{ r: 3.5, fill: "var(--color-fcr)", strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: "var(--color-fcr)", stroke: "white", strokeWidth: 2 }}
                      />
                      {cfcrEnabled && (
                        <Line
                          dataKey="cfcr"
                          type="monotone"
                          stroke="var(--color-cfcr)"
                          strokeWidth={2.5}
                          connectNulls={false}
                          dot={{ r: 3.5, fill: "var(--color-cfcr)", strokeWidth: 0 }}
                          activeDot={{ r: 5, fill: "var(--color-cfcr)", stroke: "white", strokeWidth: 2 }}
                        />
                      )}
                    </LineChart>
                  </ChartContainer>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {cfcrEnabled &&
        (batch as { batchType?: string })?.batchType === "BROILER" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Corrected FCR settings</CardTitle>
              <CardDescription>
                cFCR uses a target bird weight to make batch results easier to compare.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="batch-cfcr-target">Target weight (kg)</Label>
                  <Input
                    id="batch-cfcr-target"
                    type="number"
                    min="0.001"
                    step="0.01"
                    value={cfcrTarget}
                    onChange={(event) => setCfcrTarget(event.target.value)}
                    disabled={isBatchClosed || cfcrSettingsSaving}
                  />
                </div>
                <div>
                  <Label htmlFor="batch-cfcr-factor">Correction per kg</Label>
                  <Input
                    id="batch-cfcr-factor"
                    type="number"
                    min="0"
                    step="0.01"
                    value={cfcrFactor}
                    onChange={(event) => setCfcrFactor(event.target.value)}
                    disabled={isBatchClosed || cfcrSettingsSaving}
                  />
                </div>
              </div>
              {!isBatchClosed ? (
                <div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={saveCfcrSettings}
                    disabled={cfcrSettingsSaving}
                  >
                    {cfcrSettingsSaving ? "Saving..." : "Save corrected FCR settings"}
                  </Button>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Changing these values recalculates saved cFCR values. Raw FCR does not change.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  These settings are locked because the batch is closed.
                </p>
              )}
            </CardContent>
          </Card>
        )}
    </div>
  );
}
