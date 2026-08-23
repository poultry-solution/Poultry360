"use client";

import { BarChart3, Bird, CalendarRange, Egg, FlaskConical, Layers, ShieldAlert } from "lucide-react";
import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { Badge } from "@/common/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/common/components/ui/chart";
import { DateDisplay } from "@/common/components/ui/date-display";
import { DataTable, type Column } from "@/common/components/ui/data-table";
import { LedgerPagination } from "@/common/components/ui/ledger-pagination";
import { cn } from "@/common/lib/utils";
import { formatCompactMoney, formatMoney, MIX_COLORS } from "./types";
import { MetricCard } from "./MetricCard";
import { SectionShell } from "./SectionShell";
import type { HatcheryAnalyticsProductionRow, HatcheryAnalyticsProductionResponse } from "@/fetchers/hatchery/hatcheryAnalyticsQueries";

const productionChartConfig = {
  total: { label: "Total", color: "#16a34a" },
  hatchable: { label: "Hatchable", color: "#2563eb" },
  nonHatchable: { label: "Non-hatchable", color: "#f59e0b" },
} satisfies ChartConfig;

const productionMixChartConfig = {
  total: { label: "Eggs", color: "#16a34a" },
} satisfies ChartConfig;

export function ProductionTab({
  data,
  loading,
  page,
  onPageChange,
}: {
  data: HatcheryAnalyticsProductionResponse;
  loading: boolean;
  page: number;
  onPageChange: (page: number) => void;
}) {
  const columns = useMemo<Column<HatcheryAnalyticsProductionRow>[]>(
    () => [
      {
        key: "date",
        label: "Record",
        width: "250px",
        render: (_, row) => (
          <div className="space-y-1">
            <p className="font-semibold text-slate-900">{row.batch.code}</p>
            <p className="text-xs text-slate-500">{row.batch.name ?? "Unnamed batch"}</p>
            <p className="text-[11px] text-slate-400">
              <DateDisplay date={row.date} />
            </p>
          </div>
        ),
      },
      {
        key: "total",
        label: "Total",
        align: "right",
        width: "110px",
        render: (_, row) => <span className="font-semibold text-slate-900">{row.total.toLocaleString()}</span>,
      },
      {
        key: "hatchableTotal",
        label: "Hatchable",
        align: "right",
        width: "120px",
        render: (_, row) => <span className="font-semibold text-emerald-700">{row.hatchableTotal.toLocaleString()}</span>,
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
        label: "Type mix",
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
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
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

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Records" value={data.summary.totalRecords.toLocaleString()} subtitle={`${data.summary.uniqueBatches} batches produced`} icon={FlaskConical} />
        <MetricCard title="Eggs produced" value={data.summary.totalEggs.toLocaleString()} subtitle={`${data.summary.hatchableShare.toFixed(1)}% hatchable`} icon={Egg} tone="text-emerald-700" />
        <MetricCard title="Hatchable" value={data.summary.hatchableEggs.toLocaleString()} subtitle={`${data.summary.nonHatchableEggs.toLocaleString()} non-hatchable`} icon={Bird} tone="text-blue-700" />
        <MetricCard title="Avg per record" value={data.summary.averagePerRecord.toLocaleString(undefined, { maximumFractionDigits: 0 })} subtitle="Production volume per entry" icon={BarChart3} tone="text-slate-900" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <SectionShell title="Production trend" description="Daily egg production total, split by hatchable and non-hatchable output." icon={CalendarRange} badgeLabel="Live">
          {data.trends.daily.length === 0 ? (
            <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
              No production activity in this range.
            </div>
          ) : (
            <ChartContainer config={productionChartConfig} className="h-[320px] w-full">
              <AreaChart data={data.trends.daily} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => Number(value).toLocaleString()} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={(value, name) => <div className="flex min-w-[160px] items-center justify-between gap-3"><span className="capitalize text-slate-500">{String(name)}</span><span className="font-medium">{Number(value).toLocaleString()}</span></div>} />} />
                <Area dataKey="total" type="monotone" fill="var(--color-total)" fillOpacity={0.14} stroke="var(--color-total)" strokeWidth={2} />
                <Area dataKey="hatchable" type="monotone" fill="var(--color-hatchable)" fillOpacity={0.12} stroke="var(--color-hatchable)" strokeWidth={2} />
                <Area dataKey="nonHatchable" type="monotone" fill="var(--color-nonHatchable)" fillOpacity={0.08} stroke="var(--color-nonHatchable)" strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          )}
        </SectionShell>

        <SectionShell title="Egg type mix" description="Top egg types by total production." icon={Egg} badgeLabel="Live">
          {pieSeries.length === 0 ? (
            <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
              No egg type mix available.
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
                  <div key={item.eggTypeId} className="flex items-center justify-between rounded-xl border bg-slate-50 px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: MIX_COLORS[index % MIX_COLORS.length] }} />
                      <span className="truncate text-sm font-medium text-slate-900">{item.name}</span>
                      <Badge variant="outline" className={cn("rounded-full text-[10px]", item.isHatchable ? "border-emerald-200 text-emerald-700" : "border-slate-200 text-slate-500")}>
                        {item.isHatchable ? "Hatchable" : "Other"}
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

      <div className="grid gap-4 md:grid-cols-2">
        <SectionShell title="Top batches" description="Batches contributing the most production in the selected scope." icon={Layers} badgeLabel="Live">
          <div className="space-y-2">
            {data.topBatches.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
                No batch production to compare.
              </div>
            ) : (
              data.topBatches.map((batch) => (
                <div key={batch.id} className="flex items-center justify-between rounded-xl border bg-white px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{batch.code}</p>
                    <p className="text-xs text-slate-500">{batch.name ?? "Unnamed batch"} · {batch.records} records</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{batch.total.toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        </SectionShell>

        <SectionShell title="Scope notes" description="Applied filters and cross-check totals for the current production view." icon={ShieldAlert} badgeLabel="Live">
          <div className="space-y-3">
            <div className="rounded-2xl border bg-white p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Date range</p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                <DateDisplay date={data.applied.startDate} /> to <DateDisplay date={data.applied.endDate} />
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border bg-white p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Page records</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{data.total.toLocaleString()}</p>
              </div>
              <div className="rounded-2xl border bg-white p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">Page size</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{data.limit}</p>
              </div>
            </div>
          </div>
        </SectionShell>
      </div>

      <Card className="overflow-hidden border-slate-200/80 shadow-sm">
        <CardHeader className="space-y-1 border-b bg-gradient-to-r from-slate-50 to-white">
          <CardTitle className="text-base">Production records</CardTitle>
          <CardDescription>Server-side paginated production entries for the selected scope.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable data={data.productions} columns={columns} loading={loading} emptyMessage="No production records match the current filters." className="border-0 rounded-none" />
          <LedgerPagination page={page} totalPages={data.totalPages} totalRows={data.total} pageLimit={data.limit} onPageChange={onPageChange} loading={loading} className="border-t" />
        </CardContent>
      </Card>
    </div>
  );
}
