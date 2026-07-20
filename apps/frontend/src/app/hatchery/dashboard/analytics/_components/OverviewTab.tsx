"use client";

import { ArrowUpRight, BarChart3, CalendarRange, Egg, FlaskConical, Layers, ShieldAlert, Wallet } from "lucide-react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { Badge } from "@/common/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/common/components/ui/chart";
import { formatCompactMoney, formatMoney, MIX_COLORS } from "./types";
import { MetricCard } from "./MetricCard";
import { SectionShell } from "./SectionShell";
import type { HatcheryAnalyticsOverview } from "@/fetchers/hatchery/hatcheryAnalyticsQueries";

const financialChartConfig = {
  revenue: { label: "Revenue", color: "#16a34a" },
  expenses: { label: "Expenses", color: "#c2410c" },
  profit: { label: "Profit", color: "#2563eb" },
} satisfies ChartConfig;

const mixChartConfig = {
  amount: { label: "Amount", color: "#16a34a" },
} satisfies ChartConfig;

export function OverviewTab({
  data,
  onRetry,
}: {
  data: HatcheryAnalyticsOverview;
  onRetry?: () => void;
}) {
  const exposure = data.overview.totalSupplierBalance + data.overview.totalPartyBalance;
  const mixData = [
    { name: "Egg sales", amount: data.mix.eggSalesRevenue },
    { name: "Parent sales", amount: data.mix.parentSalesRevenue },
    { name: "Chick sales", amount: data.mix.chickSalesRevenue },
  ].filter((item) => item.amount > 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Revenue"
          value={formatMoney(data.overview.totalRevenue)}
          subtitle={`${formatMoney(data.comparison.previous.revenue)} in previous range`}
          icon={ArrowUpRight}
          tone="text-emerald-600"
          badge={`${data.comparison.revenueGrowthPct >= 0 ? "+" : ""}${data.comparison.revenueGrowthPct.toFixed(1)}% vs previous`}
        />
        <MetricCard
          title="Expenses"
          value={formatMoney(data.overview.totalExpenses)}
          subtitle={`${formatMoney(data.comparison.previous.expenses)} in previous range`}
          icon={Wallet}
          tone="text-orange-700"
        />
        <MetricCard
          title="Net profit"
          value={formatMoney(data.overview.netProfit)}
          subtitle={`${formatMoney(data.comparison.previous.profit)} in previous range`}
          icon={BarChart3}
          tone={data.overview.netProfit >= 0 ? "text-indigo-600" : "text-rose-600"}
          badge={`${data.comparison.profitGrowthPct >= 0 ? "+" : ""}${data.comparison.profitGrowthPct.toFixed(1)}% vs previous`}
        />
        <MetricCard
          title="Exposure"
          value={formatMoney(exposure)}
          subtitle="Supplier payables + customer receivables"
          icon={ShieldAlert}
          tone={exposure > 0 ? "text-rose-600" : "text-emerald-600"}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Active batches"
          value={data.overview.activeBatches.toLocaleString()}
          subtitle={`${data.overview.totalBatches.toLocaleString()} total batches`}
          icon={Layers}
          tone="text-slate-900"
        />
        <MetricCard
          title="Active incubations"
          value={data.overview.activeIncubations.toLocaleString()}
          subtitle={`${data.overview.totalIncubations.toLocaleString()} total incubations`}
          icon={FlaskConical}
          tone="text-slate-900"
        />
        <MetricCard
          title="Egg stock"
          value={data.overview.totalEggStock.toLocaleString()}
          subtitle="Filtered to the selected scope"
          icon={Egg}
          tone="text-slate-900"
        />
        <MetricCard
          title="Produced chicks"
          value={data.overview.totalProducedChicks.toLocaleString()}
          subtitle="Filtered to the selected scope"
          icon={BarChart3}
          tone="text-slate-900"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)]">
        <SectionShell title="Financial trend" description="Revenue, expenses, and profit across the selected date range." icon={CalendarRange} badgeLabel="Live">
          {data.trends.daily.length === 0 ? (
            <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
              No financial movement in this range.
            </div>
          ) : (
            <ChartContainer config={financialChartConfig} className="h-[320px] w-full">
              <AreaChart data={data.trends.daily} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => formatCompactMoney(Number(value))} />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => (
                        <div className="flex min-w-[140px] items-center justify-between gap-3">
                          <span className="capitalize text-slate-500">{String(name)}</span>
                          <span className="font-medium">{formatMoney(Number(value))}</span>
                        </div>
                      )}
                    />
                  }
                />
                <Area dataKey="revenue" type="monotone" fill="var(--color-revenue)" fillOpacity={0.18} stroke="var(--color-revenue)" strokeWidth={2} />
                <Area dataKey="expenses" type="monotone" fill="var(--color-expenses)" fillOpacity={0.12} stroke="var(--color-expenses)" strokeWidth={2} />
                <Area dataKey="profit" type="monotone" fill="var(--color-profit)" fillOpacity={0.08} stroke="var(--color-profit)" strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          )}
        </SectionShell>

        <div className="space-y-5">
          <SectionShell title="Revenue mix" description="How revenue splits across sales streams." icon={ArrowUpRight} badgeLabel="Live">
            {mixData.length === 0 ? (
              <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                No revenue yet in this range.
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
                    <div key={entry.name} className="flex items-center justify-between rounded-xl border bg-slate-50 px-3 py-2">
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
        <SectionShell title="Active batches" description="Batch scope from the current filters." icon={Layers} badgeLabel="Live">
          {data.highlights.activeBatches.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
              No active batches in this scope.
            </div>
          ) : (
            <div className="space-y-2">
              {data.highlights.activeBatches.map((batch) => (
                <div key={batch.id} className="flex items-center justify-between rounded-xl border bg-white px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{batch.code}</p>
                    <p className="text-xs text-slate-500">{batch.name ?? "Unnamed batch"} · {batch.type.replace("_", " ")}</p>
                  </div>
                  <Badge className="rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-50">Active</Badge>
                </div>
              ))}
            </div>
          )}
        </SectionShell>

        <SectionShell title="Active incubations" description="Incubation scope from the current filters." icon={FlaskConical} badgeLabel="Live">
          {data.highlights.activeIncubations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
              No active incubations in this scope.
            </div>
          ) : (
            <div className="space-y-2">
              {data.highlights.activeIncubations.map((incubation) => (
                <div key={incubation.id} className="flex items-center justify-between rounded-xl border bg-white px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{incubation.code}</p>
                    <p className="text-xs text-slate-500">{incubation.name ?? "Unnamed incubation"} · {incubation.stage}</p>
                  </div>
                  <Badge className="rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-50">Active</Badge>
                </div>
              ))}
            </div>
          )}
        </SectionShell>
      </div>
    </div>
  );
}
