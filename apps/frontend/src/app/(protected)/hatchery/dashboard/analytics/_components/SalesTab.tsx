"use client";

import { useMemo } from "react";
import { Badge } from "@/common/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/common/components/ui/chart";
import { DateDisplay } from "@/common/components/ui/date-display";
import { DataTable, type Column } from "@/common/components/ui/data-table";
import { LedgerPagination } from "@/common/components/ui/ledger-pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/common/components/ui/select";
import { cn } from "@/common/lib/utils";
import { Cell, Pie, PieChart } from "recharts";
import { bucketTrend, formatCompactMoney, formatMoney, MIX_COLORS, SALE_TYPE_LABEL, type SaleTypeFilter } from "./types";
import { MetricCard } from "./MetricCard";
import { TrendChart } from "./TrendChart";
import { SectionShell } from "./SectionShell";
import type { HatcheryAnalyticsSaleRow, HatcheryAnalyticsSalesResponse } from "@/fetchers/hatchery/hatcheryAnalyticsQueries";

const salesChartConfig = {
  revenue: { label: "Sales", color: "#16a34a" },
} satisfies ChartConfig;

const mixChartConfig = {
  amount: { label: "Amount", color: "#16a34a" },
} satisfies ChartConfig;

const TREND_KEYS = ["revenue"] as const;

export function SalesTab({
  data,
  loading,
  page,
  onPageChange,
  saleType,
  onSaleTypeChange,
  byMonth,
}: {
  data: HatcheryAnalyticsSalesResponse;
  byMonth: boolean;
  loading: boolean;
  page: number;
  onPageChange: (page: number) => void;
  saleType: SaleTypeFilter;
  onSaleTypeChange: (value: SaleTypeFilter) => void;
}) {
  const columns = useMemo<Column<HatcheryAnalyticsSaleRow>[]>(
    () => [
      {
        key: "date",
        label: "Batch and date",
        width: "250px",
        render: (_, row) => (
          <div className="space-y-1">
            <p className="font-semibold text-slate-900">{row.batchCode}</p>
                        <p className="text-[11px] text-slate-400">
              <DateDisplay date={row.date} format="long" />
            </p>
          </div>
        ),
      },
      {
        key: "saleType",
        label: "Type",
        width: "110px",
        render: (_, row) => (
          <Badge
            className={cn(
              "rounded-full",
              row.saleType === "EGG"
                ? "bg-emerald-50 text-green-700 hover:bg-emerald-50"
                : row.saleType === "PARENT"
                  ? "bg-amber-50 text-amber-700 hover:bg-amber-50"
                  : "bg-blue-50 text-blue-700 hover:bg-blue-50"
            )}
          >
            {SALE_TYPE_LABEL[row.saleType]}
          </Badge>
        ),
      },
      {
        key: "itemLabel",
        label: "Item",
        width: "180px",
        render: (_, row) => (
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-900">{row.itemLabel.replace("Grade CULL", "Cull")}</p>
            {row.sourceCode && row.sourceCode !== row.itemLabel ? <p className="text-xs text-slate-500">{row.sourceCode}</p> : null}
          </div>
        ),
      },
      {
        key: "partyName",
        label: "Party",
        width: "180px",
        render: (_, row) => (
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-900">{row.partyName ?? "Cash sale"}</p>
            {row.partyPhone ? <p className="text-xs text-slate-500">{row.partyPhone}</p> : null}
          </div>
        ),
      },
      {
        key: "count",
        label: "Qty",
        align: "right",
        width: "100px",
        render: (_, row) => <span className="font-semibold text-slate-900">{row.count.toLocaleString()}</span>,
      },
      {
        key: "amount",
        label: "Amount",
        align: "right",
        width: "140px",
        render: (_, row) => <span className="font-semibold text-green-700">{formatMoney(row.amount)}</span>,
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

  const mixData = [
    { name: "Egg sales", amount: data.summary.eggRevenue },
    { name: "Parent bird sales", amount: data.summary.parentRevenue },
    { name: "Chick sales", amount: data.summary.chickRevenue },
  ].filter((item) => item.amount > 0);

  const trend = bucketTrend(data.trends.daily, TREND_KEYS, byMonth);
  // The server gives one row per batch per sale type; show one per batch.
  const topBatches = Object.values(
    data.topBatches.reduce<Record<string, { code: string; name: string | null; total: number; records: number }>>((acc, b) => {
      const entry = (acc[b.code] ??= { code: b.code, name: b.name, total: 0, records: 0 });
      entry.total += b.total;
      entry.records += b.records;
      return acc;
    }, {})
  ).sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard
          title="Total sales"
          value={formatMoney(data.summary.totalRevenue)}
          subtitle={`${data.summary.totalSales.toLocaleString()} sales · about ${formatMoney(data.summary.averageSaleValue)} each`}
          tone="text-green-700"
        />
        <MetricCard
          title="Egg sales"
          value={formatMoney(data.summary.eggRevenue)}
          subtitle={`${data.summary.eggCount.toLocaleString()} eggs in ${data.summary.eggSales} sales`}
        />
        <MetricCard
          title="Chick sales"
          value={formatMoney(data.summary.chickRevenue)}
          subtitle={`${data.summary.chickCount.toLocaleString()} chicks in ${data.summary.chickSales} sales`}
        />
        <MetricCard
          title="Buyers"
          value={data.summary.uniqueParties.toLocaleString()}
          subtitle={`From ${data.summary.uniqueBatches} batch${data.summary.uniqueBatches === 1 ? "" : "es"}`}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.8fr)]">
        <SectionShell title="Sales over time" description={byMonth ? "Sales money by month." : "Sales money by day."}>
          {trend.length === 0 ? (
            <div className="flex min-h-[320px] items-center justify-center rounded-md border border-dashed border-gray-200 bg-gray-50 text-sm text-slate-500">
              No sales in these dates.
            </div>
          ) : (
            <TrendChart data={trend} config={salesChartConfig} byMonth={byMonth} formatValue={formatMoney} formatAxis={formatCompactMoney} />
          )}
        </SectionShell>

        <SectionShell title="Sales by type" description="Eggs, parent birds and chicks.">
          {mixData.length === 0 ? (
            <div className="flex min-h-[320px] items-center justify-center rounded-md border border-dashed border-gray-200 bg-gray-50 text-sm text-slate-500">
              No sales in these dates.
            </div>
          ) : (
            <div className="space-y-4">
              <ChartContainer config={mixChartConfig} className="mx-auto h-[220px] w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel formatter={(value, name) => <div className="flex min-w-[150px] items-center justify-between gap-3"><span className="text-slate-500">{String(name)}</span><span className="font-medium">{formatMoney(Number(value))}</span></div>} />} />
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

      <div className="grid gap-4 md:grid-cols-2">
        <SectionShell title="Top batches" description="Batches that sold the most.">
          <div className="space-y-2">
            {topBatches.length === 0 ? (
              <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-sm text-slate-500">
                No sales in these dates.
              </div>
            ) : (
              topBatches.map((batch) => (
                <div key={batch.code} className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {batch.code}
                      {batch.name ? <span className="font-normal text-slate-500"> · {batch.name}</span> : null}
                    </p>
                    <p className="text-xs text-slate-500">{batch.records} sale{batch.records === 1 ? "" : "s"}</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{formatMoney(batch.total)}</span>
                </div>
              ))
            )}
          </div>
        </SectionShell>

        <SectionShell title="Top buyers" description="Parties who bought the most.">
          <div className="space-y-2">
            {data.topParties.length === 0 ? (
              <div className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-sm text-slate-500">
                No sales to parties in these dates.
              </div>
            ) : (
              data.topParties.map((party) => (
                <div key={`${party.name}-${party.phone ?? ""}`} className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{party.name}</p>
                    <p className="text-xs text-slate-500">
                      {party.phone ? `${party.phone} · ` : ""}
                      {party.records} sale{party.records === 1 ? "" : "s"}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{formatMoney(party.total)}</span>
                </div>
              ))
            )}
          </div>
        </SectionShell>
      </div>

      <SectionShell
        title="Sale records"
        description="Each sale, newest first."
        flush
        action={
          <Select value={saleType} onValueChange={(value) => onSaleTypeChange(value as SaleTypeFilter)}>
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue placeholder="Sale type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All sales</SelectItem>
              <SelectItem value="EGG">Egg sales</SelectItem>
              <SelectItem value="PARENT">Parent bird sales</SelectItem>
              <SelectItem value="CHICK">Chick sales</SelectItem>
            </SelectContent>
          </Select>
        }
      >
        <div className="overflow-x-auto">
          <DataTable data={data.sales} columns={columns} loading={loading} emptyMessage="No sales match these filters." className="rounded-none border-0" />
          <LedgerPagination page={page} totalPages={data.totalPages} totalRows={data.total} pageLimit={data.limit} onPageChange={onPageChange} loading={loading} className="border-t px-4" />
        </div>
      </SectionShell>
    </div>
  );
}
