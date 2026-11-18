"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart } from "recharts";
import { Badge } from "@/common/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/common/components/ui/chart";
import { DateDisplay } from "@/common/components/ui/date-display";
import { DataTable, type Column } from "@/common/components/ui/data-table";
import { LedgerPagination } from "@/common/components/ui/ledger-pagination";
import { cn } from "@/common/lib/utils";
import { bucketTrend, MIX_COLORS } from "./types";
import { MetricCard } from "./MetricCard";
import { TrendChart } from "./TrendChart";
import { SectionShell } from "./SectionShell";
import type { HatcheryAnalyticsProductionRow, HatcheryAnalyticsProductionResponse } from "@/fetchers/hatchery/hatcheryAnalyticsQueries";

const productionChartConfig = {
  hatchable: { label: "Hatchable", color: "#16a34a" },
  nonHatchable: { label: "Other eggs", color: "#f59e0b" },
} satisfies ChartConfig;

const productionMixChartConfig = {
  total: { label: "Eggs", color: "#16a34a" },
} satisfies ChartConfig;

const TREND_KEYS = ["total", "hatchable", "nonHatchable"] as const;

export function ProductionTab({
  data,
  loading,
  page,
  onPageChange,
  byMonth,
}: {
  data: HatcheryAnalyticsProductionResponse;
  byMonth: boolean;
  loading: boolean;
  page: number;
  onPageChange: (page: number) => void;
}) {
  const columns = useMemo<Column<HatcheryAnalyticsProductionRow>[]>(
    () => [
      {
        key: "date",
        label: "Batch and date",
        width: "250px",
        render: (_, row) => (
          <div className="space-y-1">
            <p className="font-semibold text-slate-900">{row.batch.code}</p>
                        <p className="text-[11px] text-slate-400">
              <DateDisplay date={row.date} format="long" />
            </p>
          </div>
        ),
      },
      {
        key: "total",
        label: "All eggs",
        align: "right",
        width: "110px",
        render: (_, row) => <span className="font-semibold text-slate-900">{row.total.toLocaleString()}</span>,
      },
      {
        key: "hatchableTotal",
        label: "Hatchable",
        align: "right",
        width: "120px",
        render: (_, row) => <span className="font-semibold text-green-700">{row.hatchableTotal.toLocaleString()}</span>,
      },
      {
        key: "nonHatchableTotal",
        label: "Other",
        align: "right",
        width: "110px",
        render: (_, row) => <span className="font-semibold text-amber-700">{row.nonHatchableTotal.toLocaleString()}</span>,
      },
      {
        key: "lines",
        label: "By type",
        width: "320px",
        render: (_, row) => (
          <div className="flex flex-wrap gap-2">
            {row.lines.map((line) => (
              <Badge
                key={line.id}
                variant="outline"
                className={cn(
                  "rounded-full",
                  line.eggType.isHatchable
                    ? "border-emerald-200 bg-emerald-50 text-green-700"
                    : "border-slate-200 bg-slate-50 text-slate-700"
                )}
              >
                {line.count.toLocaleString()} {line.eggType.name}
              </Badge>
            ))}
          </div>
        ),
      },
      {
        key: "note",
        label: "Note",
        width: "220px",
        render: (_, row) => <span className="text-sm text-slate-600">{row.note ?? "—"}</span>,
      },
    ],
    []
  );

  const pieData = data.typeTotals.slice(0, 6).map((item) => ({ name: item.name, total: item.total }));
  const pieOthers = data.typeTotals.slice(6).reduce((sum, item) => sum + item.total, 0);
  const pieSeries = pieOthers > 0 ? [...pieData, { name: "Others", total: pieOthers }] : pieData;

  const trend = bucketTrend(data.trends.daily, TREND_KEYS, byMonth);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard title="Eggs collected" value={data.summary.totalEggs.toLocaleString()} subtitle={`${data.summary.hatchableShare.toFixed(1)}% hatchable`} tone="text-green-700" />
        <MetricCard title="Hatchable eggs" value={data.summary.hatchableEggs.toLocaleString()} subtitle={`${data.summary.nonHatchableEggs.toLocaleString()} other eggs`} />
        <MetricCard title="Entries" value={data.summary.totalRecords.toLocaleString()} subtitle={`From ${data.summary.uniqueBatches} batch${data.summary.uniqueBatches === 1 ? "" : "es"}`} />
        <MetricCard
          title="Eggs per entry"
          value={data.summary.averagePerRecord.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          subtitle="On average"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.8fr)]">
        <SectionShell title="Eggs over time" description={byMonth ? "Eggs collected by month." : "Eggs collected by day."}>
          {trend.length === 0 ? (
            <div className="flex min-h-[320px] items-center justify-center rounded-md border border-dashed border-gray-200 bg-gray-50 text-sm text-slate-500">
              No eggs collected in these dates.
            </div>
          ) : (
            <TrendChart data={trend} config={productionChartConfig} byMonth={byMonth} formatValue={(v) => v.toLocaleString()} />
          )}
        </SectionShell>

        <SectionShell title="Eggs by type" description="How many of each egg type.">
          {pieSeries.length === 0 ? (
            <div className="flex min-h-[320px] items-center justify-center rounded-md border border-dashed border-gray-200 bg-gray-50 text-sm text-slate-500">
              No eggs in these dates.
            </div>
          ) : (
            <div className="space-y-4">
              <ChartContainer config={productionMixChartConfig} className="mx-auto h-[220px] w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel formatter={(value, name) => <div className="flex min-w-[150px] items-center justify-between gap-3"><span className="text-slate-500">{String(name)}</span><span className="font-medium">{Number(value).toLocaleString()}</span></div>} />} />
                  <Pie data={pieSeries} dataKey="total" nameKey="name" innerRadius={56} outerRadius={88} paddingAngle={2}>
                    {pieSeries.map((entry, index) => (
                      <Cell key={entry.name} fill={MIX_COLORS[index % MIX_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>

              <div className="space-y-2 max-h-[260px] overflow-auto pr-1">
                {data.typeTotals.map((item, index) => (
                  <div key={item.eggTypeId} className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: MIX_COLORS[index % MIX_COLORS.length] }} />
                      <span className="truncate text-sm font-medium text-slate-900">{item.name}</span>
                      <Badge variant="outline" className={cn("rounded-full text-[10px]", item.isHatchable ? "border-emerald-200 text-green-700" : "border-slate-200 text-slate-500")}>
                        {item.isHatchable ? "Hatchable" : "For sale"}
                      </Badge>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">{item.total.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionShell>
      </div>

      <SectionShell title="Top batches" description="Batches that gave the most eggs.">
        <div className="grid gap-2 md:grid-cols-2">
          {data.topBatches.length === 0 ? (
            <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-sm text-gray-500">
              No eggs collected in these dates.
            </div>
          ) : (
            data.topBatches.map((batch) => (
              <div key={batch.id} className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {batch.code}
                    {batch.name ? <span className="font-normal text-gray-500"> · {batch.name}</span> : null}
                  </p>
                  <p className="text-xs text-gray-500">
                    {batch.records} entr{batch.records === 1 ? "y" : "ies"}
                  </p>
                </div>
                <span className="text-sm font-semibold text-gray-900">{batch.total.toLocaleString()} eggs</span>
              </div>
            ))
          )}
        </div>
      </SectionShell>

      <SectionShell title="Egg entries" description="Each day's egg count, newest first." flush>
        <div className="overflow-x-auto">
          <DataTable data={data.productions} columns={columns} loading={loading} emptyMessage="No egg entries in these dates." className="rounded-none border-0" />
          <LedgerPagination page={page} totalPages={data.totalPages} totalRows={data.total} pageLimit={data.limit} onPageChange={onPageChange} loading={loading} className="border-t px-4" />
        </div>
      </SectionShell>
    </div>
  );
}
