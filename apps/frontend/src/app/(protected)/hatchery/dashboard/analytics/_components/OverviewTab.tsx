"use client";

import Link from "next/link";
import { Cell, Pie, PieChart } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/common/components/ui/chart";
import { bucketTrend, formatCompactMoney, formatMoney, MIX_COLORS, STAGE_LABEL } from "./types";
import { MetricCard } from "./MetricCard";
import { TrendChart } from "./TrendChart";
import { SectionShell } from "./SectionShell";
import type { HatcheryAnalyticsOverview } from "@/fetchers/hatchery/hatcheryAnalyticsQueries";

const financialChartConfig = {
  revenue: { label: "Income", color: "#16a34a" },
  expenses: { label: "Cost", color: "#c2410c" },
  profit: { label: "Profit", color: "#2563eb" },
} satisfies ChartConfig;

const mixChartConfig = {
  amount: { label: "Amount", color: "#16a34a" },
} satisfies ChartConfig;

const TREND_KEYS = ["revenue", "expenses", "profit"] as const;

function growth(pct: number) {
  // A tiny "before" number makes huge, useless percents (e.g. +45227%).
  if (Math.abs(pct) >= 1000) return pct > 0 ? "Much more than the days before" : "Much less than the days before";
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}% vs the days before`;
}

export function OverviewTab({
  data,
  byMonth,
  showComparison,
}: {
  data: HatcheryAnalyticsOverview;
  /** Long range: one chart point per Nepali month. */
  byMonth: boolean;
  /** Custom dates only. All time has nothing before it to compare with. */
  showComparison: boolean;
}) {
  // Exposure tile removed 2026-11-01: it added supplier payables and party
  // receivables, which have opposite signs semantically, so the number was
  // confusing and the label did not help. The decision on how (if at all) to
  // show net financial exposure is tracked in SECURITY_FOLLOWUPS.md.
  const mixData = [
    { name: "Egg sales", amount: data.mix.eggSalesRevenue },
    { name: "Parent bird sales", amount: data.mix.parentSalesRevenue },
    { name: "Chick sales", amount: data.mix.chickSalesRevenue },
  ].filter((item) => item.amount > 0);
  const trend = bucketTrend(data.trends.daily, TREND_KEYS, byMonth);
  const hasMovement = trend.some((row) => row.revenue !== 0 || row.expenses !== 0);
  const before = (amount: number) => (showComparison ? `${formatMoney(amount)} in the same days before` : undefined);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <MetricCard
          title="Income"
          value={formatMoney(data.overview.totalRevenue)}
          subtitle={before(data.comparison.previous.revenue) ?? "Egg, bird and chick sales"}
          tone="text-green-700"
          badge={showComparison ? growth(data.comparison.revenueGrowthPct) : undefined}
        />
        <MetricCard
          title="Cost"
          value={formatMoney(data.overview.totalExpenses)}
          subtitle={before(data.comparison.previous.expenses) ?? "Batch expenses"}
          tone="text-red-600"
        />
        <MetricCard
          title="Profit"
          value={formatMoney(data.overview.netProfit)}
          subtitle={before(data.comparison.previous.profit) ?? "Income minus cost"}
          tone={data.overview.netProfit >= 0 ? "text-green-700" : "text-red-600"}
          badge={showComparison ? growth(data.comparison.profitGrowthPct) : undefined}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard
          title="Active batches"
          value={data.overview.activeBatches.toLocaleString()}
          subtitle={`${data.overview.totalBatches.toLocaleString()} batches in all`}
        />
        <MetricCard
          title="Running incubations"
          value={data.overview.activeIncubations.toLocaleString()}
          subtitle={`${data.overview.totalIncubations.toLocaleString()} incubations in all`}
        />
        <MetricCard title="Eggs in stock" value={data.overview.totalEggStock.toLocaleString()} subtitle="Now" tone="text-amber-700" />
        <MetricCard title="Chicks in stock" value={data.overview.totalProducedChicks.toLocaleString()} subtitle="Now" tone="text-amber-700" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.8fr)]">
        <SectionShell title="Money over time" description={byMonth ? "Income, cost and profit by month." : "Income, cost and profit by day."}>
          {!hasMovement ? (
            <div className="flex min-h-[320px] items-center justify-center rounded-md border border-dashed border-gray-200 bg-gray-50 text-sm text-slate-500">
              No income or cost in these dates.
            </div>
          ) : (
            <TrendChart data={trend} config={financialChartConfig} byMonth={byMonth} formatValue={formatMoney} formatAxis={formatCompactMoney} />
          )}
        </SectionShell>

        <div className="space-y-5">
          <SectionShell title="Where income comes from" description="Sales split by type.">
            {mixData.length === 0 ? (
              <div className="flex min-h-[240px] items-center justify-center rounded-md border border-dashed border-gray-200 bg-gray-50 text-sm text-slate-500">
                No sales in these dates.
              </div>
            ) : (
              <div className="space-y-4">
                <ChartContainer config={mixChartConfig} className="mx-auto h-[220px] w-full">
                  <PieChart>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          hideLabel
                          formatter={(value, name) => (
                            <div className="flex min-w-[150px] items-center justify-between gap-3">
                              <span className="text-slate-500">{String(name)}</span>
                              <span className="font-medium">{formatMoney(Number(value))}</span>
                            </div>
                          )}
                        />
                      }
                    />
                    <Pie data={mixData} dataKey="amount" nameKey="name" innerRadius={56} outerRadius={88} paddingAngle={2}>
                      {mixData.map((entry, index) => (
                        <Cell key={entry.name} fill={MIX_COLORS[index % MIX_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>

                <div className="space-y-2">
                  {mixData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: MIX_COLORS[index % MIX_COLORS.length] }} />
                        <span className="text-sm font-medium text-slate-900">{entry.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-slate-900">{formatMoney(entry.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
          )}
        </SectionShell>
      </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <SectionShell title="Active batches" description="Parent flocks still running.">
          {data.highlights.activeBatches.length === 0 ? (
            <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-sm text-slate-500">
              No active batches.
            </div>
          ) : (
            <div className="space-y-2">
              {data.highlights.activeBatches.map((batch) => (
                <Link
                  key={batch.id}
                  href={`/hatchery/dashboard/batches/${batch.id}`}
                  className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 hover:bg-gray-50"
                >
                  <span className="text-sm font-medium text-gray-900">
                    {batch.code}
                    {batch.name ? <span className="font-normal text-gray-500"> · {batch.name}</span> : null}
                  </span>
                  <span className="text-xs text-gray-500">Parent flock</span>
                </Link>
              ))}
            </div>
          )}
        </SectionShell>

        <SectionShell title="Running incubations" description="Eggs in the machine now.">
          {data.highlights.activeIncubations.length === 0 ? (
            <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-sm text-slate-500">
              No running incubations.
            </div>
          ) : (
            <div className="space-y-2">
              {data.highlights.activeIncubations.map((incubation) => (
                <Link
                  key={incubation.id}
                  href={`/hatchery/dashboard/incubations/${incubation.id}`}
                  className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 hover:bg-gray-50"
                >
                  <span className="text-sm font-medium text-gray-900">
                    {incubation.code}
                    {incubation.name ? <span className="font-normal text-gray-500"> · {incubation.name}</span> : null}
                  </span>
                  <span className="text-xs text-gray-500">
                    {STAGE_LABEL[incubation.stage as keyof typeof STAGE_LABEL] ?? incubation.stage}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </SectionShell>
      </div>
    </div>
  );
}
