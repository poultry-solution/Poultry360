import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import Link from "next/link";
import { Activity, AlertTriangle, CheckCircle, LogOut, TrendingUp, TrendingDown } from "lucide-react";
import { rupees } from "@/components/dashboard/StatsCards";
import { DateDisplay } from "@/common/components/ui/date-display";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/common/components/ui/chart";
import { useCalendar } from "@/common/hooks/useCalendar";
import { useAuth } from "@/common/store/store";
import type { FcrHistoryRow } from "@/types/fcr";
import type { BatchEggCost } from "@/fetchers/batches/batchQueries";
import { LayerMoneyRow } from "@/components/batches/eggCost/LayerSummary";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

const fcrChartConfig = {
  fcr: {
    label: "FCR",
    color: "#15803d",
  },
} satisfies ChartConfig;

const FCR_ROWS_DEFAULT = 10;
const RECENT_ACTIVITY_LIMIT = 5;
/** Above this many days the dots crowd together, so only the lines are drawn. */
const FCR_CHART_DOTS_MAX = 20;

const kg = (value: number | null | undefined) =>
  value == null ? "—" : Number(value).toLocaleString("en-IN", { maximumFractionDigits: 1 });

/** "2083-06-10" -> "06-10" for chart ticks; other formats stay as they are. */
const shortDateTick = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? String(value).slice(5) : String(value);

/** Signed money: loss "−रू 2,94,010", profit "+रू 45", zero "रू 0". */
const signedRupees = (value: number) => {
  const rounded = Math.round(value);
  if (rounded === 0) return rupees(0);
  return `${rounded < 0 ? "−" : "+"}${rupees(Math.abs(rounded))}`;
};

type ActivityItem = {
  key: string;
  kind: "expense" | "sale" | "mortality" | "closure";
  text: string;
  date: string | null;
  time: number;
};

interface OverviewTabProps {
  /** Layer batches show cost per tray instead of "per bird" while running. */
  isLayers?: boolean;
  eggCost?: BatchEggCost;
  eggCostLoading?: boolean;
  onOpenEggCost?: () => void;
  batch: any;
  analytics: any;
  fcrHistory: FcrHistoryRow[];
  isBatchClosed: boolean;
  currentAge: number;
  perBroilerExpenseData: {
    netExpenses: number;
    initialBroilers: number;
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
  isLayers = false,
  eggCost,
  eggCostLoading,
  onOpenEggCost,
}: OverviewTabProps) {
  const { toDisplayDate } = useCalendar();
  const fcrData = analytics?.fcrData;
  const fcrIsFinal =
    fcrData?.basis === "FINAL" || fcrData?.basis === "FINAL_PENDING_CLOSE";
  const fcrIsStale = fcrData?.freshnessStatus === "STALE";
  const displayedFcr = fcrData?.fcr ?? analytics?.lastKnownFcr ?? null;
  // cFCR is a result for finished batches (all birds sold or closed), used to
  // compare batches. A running batch shows FCR only.
  const { user } = useAuth();
  const showFinalCfcr = cfcrEnabled && fcrIsFinal && fcrData?.cfcr != null;
  const cfcrTargetKg = fcrData?.cfcrTargetWeightKg ?? null;
  const cfcrCorrection = fcrData?.cfcrCorrectionFactorPerKg ?? null;
  const averageOutputWeightKg = fcrData?.averageOutputWeightKg ?? null;

  const [showFcrDetails, setShowFcrDetails] = React.useState(false);
  const [showAllFcrRows, setShowAllFcrRows] = React.useState(false);

  const fcrRowsNewestFirst = [...fcrHistory].reverse();
  const visibleFcrRows = showAllFcrRows
    ? fcrRowsNewestFirst
    : fcrRowsNewestFirst.slice(0, FCR_ROWS_DEFAULT);
  const latestFcrRowId = fcrRowsNewestFirst[0]?.id;

  const netResult = perBroilerExpenseData.netExpenses;
  const isLoss = Math.round(netResult) > 0;
  const isGain = Math.round(netResult) < 0;
  const perBirdBase =
    perBroilerExpenseData.initialBroilers > 0
      ? `÷ ${perBroilerExpenseData.initialBroilers.toLocaleString("en-IN")} ${isLayers ? "hens" : "birds"} started`
      : null;
  const perBirdRounded = Math.round(perBroilerExpenseData.displayValue);

  const toTime = (value: unknown) => {
    const time = value ? new Date(value as string).getTime() : NaN;
    return Number.isFinite(time) ? time : -Infinity;
  };
  const recentActivity: ActivityItem[] = [
    ...recentExpenses.map((ex: any, i: number) => ({
      key: `e-${ex.id ?? i}`,
      kind: "expense" as const,
      text: `Expense · ${ex.category?.name || ex.description || "Other"} · ${rupees(Number(ex.amount || 0))}`,
      date: ex.date ?? null,
      time: toTime(ex.date),
    })),
    ...recentSales.map((sale: any, i: number) => ({
      key: `s-${sale.id ?? i}`,
      kind: "sale" as const,
      text: `Sale · ${sale.category?.name || "Sale"} · ${rupees(Number(sale.amount || 0))}`,
      date: sale.date ?? null,
      time: toTime(sale.date),
    })),
    ...recentMortalities.map((m: any, i: number) => ({
      key: `m-${m.id ?? i}`,
      // Birds still alive when the batch was closed did not die.
      kind: m.reason === "BATCH_CLOSURE" ? ("closure" as const) : ("mortality" as const),
      text: `${m.reason === "BATCH_CLOSURE" ? "Left at close" : "Deaths"} · ${Number(m.count || 0).toLocaleString("en-IN")} ${Number(m.count) === 1 ? "bird" : "birds"}`,
      date: m.date ?? null,
      time: toTime(m.date),
    })),
  ]
    .map((item, index) => ({ item, index }))
    .sort((a, b) => b.item.time - a.item.time || a.index - b.index)
    .slice(0, RECENT_ACTIVITY_LIMIT)
    .map(({ item }) => item);

  const showFcrDots = fcrHistory.length <= FCR_CHART_DOTS_MAX;
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

  const isBroiler = (batch as { batchType?: string })?.batchType === "BROILER";

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
                  {currentAge} days
                </div>
                <div className="text-sm text-green-700">Total Duration</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Money */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Money</CardTitle>
            <CardDescription>Sales and costs of this batch</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Sales</span>
                <span className="font-medium">{rupees(salesTotal)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Costs</span>
                <span className="font-medium">{rupees(expensesTotal)}</span>
              </div>
              <div className="flex justify-between gap-4 border-t pt-3">
                <span className="font-medium">
                  {isGain ? "Profit" : "Loss"}
                  {isBatchClosed ? "" : " so far"}
                </span>
                <span
                  className={`text-base font-bold ${
                    isLoss ? "text-red-600" : isGain ? "text-green-600" : "text-gray-600"
                  }`}
                >
                  {/* netExpenses is cost − sales, so flip the sign for profit/loss. */}
                  {signedRupees(-netResult)}
                </span>
              </div>
              {isLayers && !isBatchClosed ? (
                <LayerMoneyRow eggCost={eggCost} loading={eggCostLoading} onOpen={onOpenEggCost} />
              ) : (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">
                  {isLayers
                    ? perBirdRounded === 0
                      ? "Per hen"
                      : perBroilerExpenseData.isProfit
                        ? "Profit per hen"
                        : "Loss per hen"
                    : "Per bird"}
                  {perBirdBase && (
                    <span className="ml-1.5 text-xs text-gray-400">{perBirdBase}</span>
                  )}
                </span>
                <span
                  className={`font-medium ${
                    !perBirdBase || perBirdRounded === 0
                      ? "text-gray-600"
                      : perBroilerExpenseData.isProfit
                        ? "text-green-600"
                        : "text-red-600"
                  }`}
                >
                  {!perBirdBase
                    ? "—"
                    : perBirdRounded === 0
                      ? rupees(0)
                      : `${perBroilerExpenseData.isProfit ? "+" : "−"}${rupees(perBirdRounded)}`}
                </span>
              </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent activity</CardTitle>
            <CardDescription>Latest records in this batch</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing recorded yet.</p>
            ) : (
              <ul className="space-y-2.5 text-sm">
                {recentActivity.map((item) => (
                  <li key={item.key} className="flex items-center gap-2">
                    {item.kind === "expense" ? (
                      <TrendingDown className="h-4 w-4 shrink-0 text-red-500" />
                    ) : item.kind === "sale" ? (
                      <TrendingUp className="h-4 w-4 shrink-0 text-green-500" />
                    ) : item.kind === "closure" ? (
                      <LogOut className="h-4 w-4 shrink-0 text-gray-400" />
                    ) : (
                      <Activity className="h-4 w-4 shrink-0 text-orange-500" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-gray-700">{item.text}</span>
                    {item.date && (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        <DateDisplay date={item.date} format="short" />
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {isBroiler && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">FCR Performance</CardTitle>
                <CardDescription>Latest result, history, and trend</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`mb-6 rounded-lg border px-4 py-3 ${
                fcrIsStale ? "border-amber-200 bg-amber-50/50" : "bg-muted/20"
              }`}
            >
              <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">FCR</p>
                  <p className="text-2xl font-semibold leading-tight">
                    {displayedFcr == null ? "—" : Number(displayedFcr).toFixed(2)}
                  </p>
                </div>
                {showFinalCfcr && (
                  <div>
                    <p className="text-xs text-muted-foreground">Final cFCR</p>
                    <p className="text-2xl font-semibold leading-tight text-blue-700">
                      {Number(fcrData.cfcr).toFixed(2)}
                    </p>
                  </div>
                )}
                {showFinalCfcr && averageOutputWeightKg != null && (
                  <div>
                    <p className="text-xs text-muted-foreground">Average sold weight</p>
                    <p className="text-lg font-semibold leading-tight">{Number(averageOutputWeightKg).toFixed(2)} kg</p>
                  </div>
                )}
                <div className="flex items-center gap-2 pb-0.5">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${fcrStatusClass}`}>
                    {fcrStatusLabel}
                  </span>
                  {fcrData?.asOfDate && (
                    <span className="text-xs text-muted-foreground">
                      as of <DateDisplay date={fcrData.asOfDate} format="short" />
                    </span>
                  )}
                </div>
              </div>

              {showFinalCfcr && cfcrTargetKg != null && cfcrCorrection != null && (
                <p className="mt-2 text-xs text-muted-foreground">
                  cFCR is FCR corrected to {cfcrTargetKg} kg ({cfcrCorrection} per kg), so you can compare batches.
                  {!user?.isStaff && (
                    <>
                      {" "}
                      <Link href="/farmer/dashboard/settings" className="text-primary underline-offset-2 hover:underline">
                        Change in Settings
                      </Link>
                    </>
                  )}
                </p>
              )}
              {cfcrEnabled && !fcrIsFinal && (
                <p className="mt-2 text-xs text-muted-foreground">
                  cFCR shows when all birds are sold. Use it to compare finished batches.
                </p>
              )}

              {fcrSummaryMessage && (
                <div className="mt-3 flex flex-col gap-2 border-t border-black/5 pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className={`flex items-start gap-1.5 text-sm ${fcrIsStale ? "text-amber-800" : "text-muted-foreground"}`}>
                    {fcrIsStale && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
                    {fcrSummaryMessage}
                  </p>
                  {!isBatchClosed && weightCanRefreshFcr && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 shrink-0 self-start px-3 text-xs sm:self-auto"
                      onClick={onRecordWeight}
                    >
                      Record weight
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
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">History</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setShowFcrDetails((v) => !v)}
                    >
                      {showFcrDetails ? "Hide details" : "Show details"}
                    </Button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className={`w-full text-sm ${showFcrDetails ? "min-w-[760px]" : "min-w-[480px]"}`}>
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="px-2 py-2 font-medium">Date</th>
                          <th className="px-2 py-2 font-medium">FCR</th>
                          <th className="px-2 py-2 font-medium">Avg weight (kg)</th>
                          <th className="px-2 py-2 font-medium">Feed (kg)</th>
                          {showFcrDetails && (
                            <>
                              <th className="px-2 py-2 font-medium">Total weight (kg)</th>
                              <th className="px-2 py-2 font-medium">Weight gained (kg)</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {visibleFcrRows.map((row) => (
                          <tr key={row.id} className="border-b last:border-0">
                            <td className="px-2 py-2">
                              <span className="inline-flex items-center gap-1.5">
                                <DateDisplay date={row.calculationDate} format="short" />
                                {row.displayStatus === "FINAL" ? (
                                  <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                                    Final
                                  </span>
                                ) : row.id === latestFcrRowId ? (
                                  <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                                    Latest
                                  </span>
                                ) : null}
                              </span>
                            </td>
                            <td className="px-2 py-2 font-medium">{row.fcr.toFixed(2)}</td>
                            <td className="px-2 py-2">
                              {row.remainingAverageWeightKg == null
                                ? "—"
                                : row.remainingAverageWeightKg.toFixed(2)}
                            </td>
                            <td className="px-2 py-2">{kg(row.feedKg)}</td>
                            {showFcrDetails && (
                              <>
                                <td className="px-2 py-2">{kg(row.producedLiveWeightKg)}</td>
                                <td className="px-2 py-2">{kg(row.weightGainKg)}</td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {fcrRowsNewestFirst.length > FCR_ROWS_DEFAULT && (
                    <div className="mt-2 text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setShowAllFcrRows((v) => !v)}
                      >
                        {showAllFcrRows ? "Show less" : `Show all (${fcrRowsNewestFirst.length})`}
                      </Button>
                    </div>
                  )}
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
                        tickFormatter={shortDateTick}
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
                            formatter={(value) => (
                              <div className="flex min-w-[110px] items-center justify-between gap-4">
                                <span className="text-muted-foreground">FCR</span>
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
                        dot={showFcrDots ? { r: 3.5, fill: "var(--color-fcr)", strokeWidth: 0 } : false}
                        activeDot={{ r: 5, fill: "var(--color-fcr)", stroke: "white", strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ChartContainer>
                  <div className="mt-2 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: fcrChartConfig.fcr.color }} />
                      FCR
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

    </div>
  );
}
