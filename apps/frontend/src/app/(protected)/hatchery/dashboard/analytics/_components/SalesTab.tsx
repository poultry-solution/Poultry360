"use client";

import { ArrowUpRight, BarChart3, Bird, CalendarRange, Egg, Layers, ShieldAlert, Users, Wallet } from "lucide-react";
import { useMemo } from "react";
import { Badge } from "@/common/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/common/components/ui/chart";
import { DateDisplay } from "@/common/components/ui/date-display";
import { DataTable, type Column } from "@/common/components/ui/data-table";
import { LedgerPagination } from "@/common/components/ui/ledger-pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/common/components/ui/select";
import { cn } from "@/common/lib/utils";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { formatCompactMoney, formatMoney, MIX_COLORS, type SaleTypeFilter } from "./types";
import { MetricCard } from "./MetricCard";
import { SectionShell } from "./SectionShell";
import type { HatcheryAnalyticsSaleRow, HatcheryAnalyticsSalesResponse } from "@/fetchers/hatchery/hatcheryAnalyticsQueries";

const salesChartConfig = {
  revenue: { label: "Revenue", color: "#16a34a" },
} satisfies ChartConfig;

const mixChartConfig = {
  amount: { label: "Amount", color: "#16a34a" },
} satisfies ChartConfig;

export function SalesTab({
  data,
  loading,
  page,
  onPageChange,
  saleType,
  onSaleTypeChange,
}: {
  data: HatcheryAnalyticsSalesResponse;
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
        label: "Sale",
        width: "250px",
        render: (_, row) => (
          <div className="space-y-1">
            <p className="font-semibold text-slate-900">{row.batchCode}</p>
            <p className="text-xs text-slate-500">{row.batchName ?? "Unnamed batch"}</p>
            <p className="text-[11px] text-slate-400">
              <DateDisplay date={row.date} />
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
                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                : row.saleType === "PARENT"
                  ? "bg-amber-50 text-amber-700 hover:bg-amber-50"
                  : "bg-indigo-50 text-indigo-700 hover:bg-indigo-50"
            )}
          >
            {row.saleType}
          </Badge>
        ),
      },
      {
        key: "itemLabel",
        label: "Item",
        width: "180px",
        render: (_, row) => (
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-900">{row.itemLabel}</p>
            <p className="text-xs text-slate-500">{row.sourceCode ?? row.batchCode}</p>
          </div>
        ),
      },
      {
        key: "partyName",
        label: "Party",
        width: "180px",
        render: (_, row) => (
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-900">{row.partyName ?? "Cash"}</p>
            <p className="text-xs text-slate-500">{row.partyPhone ?? "—"}</p>
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
        render: (_, row) => <span className="font-semibold text-emerald-700">{formatMoney(row.amount)}</span>,
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
    { name: "Parent sales", amount: data.summary.parentRevenue },
    { name: "Chick sales", amount: data.summary.chickRevenue },
  ].filter((item) => item.amount > 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Sales" value={data.summary.totalSales.toLocaleString()} subtitle={`${data.summary.uniqueBatches} batches · ${data.summary.uniqueParties} parties`} icon={ArrowUpRight} />
        <MetricCard title="Revenue" value={formatMoney(data.summary.totalRevenue)} subtitle={`Avg sale ${formatMoney(data.summary.averageSaleValue)}`} icon={Wallet} tone="text-emerald-700" />
        <MetricCard title="Egg revenue" value={formatMoney(data.summary.eggRevenue)} subtitle={`${data.summary.eggSales} records · ${data.summary.eggCount.toLocaleString()} units`} icon={Egg} tone="text-emerald-700" />
        <MetricCard title="Chick revenue" value={formatMoney(data.summary.chickRevenue)} subtitle={`${data.summary.chickSales} records · ${data.summary.chickCount.toLocaleString()} chicks`} icon={Bird} tone="text-indigo-700" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <SectionShell title="Revenue trend" description="Daily sales revenue across egg, parent, and chick sales." icon={CalendarRange} badgeLabel="Live">
          {data.trends.daily.length === 0 ? (
            <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
              No sales in this range.
            </div>
          ) : (
            <ChartContainer config={salesChartConfig} className="h-[320px] w-full">
              <AreaChart data={data.trends.daily} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => formatCompactMoney(Number(value))} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={(value, name) => <div className="flex min-w-[160px] items-center justify-between gap-3"><span className="capitalize text-slate-500">{String(name)}</span><span className="font-medium">{formatMoney(Number(value))}</span></div>} />} />
                <Area dataKey="revenue" type="monotone" fill="var(--color-revenue)" fillOpacity={0.14} stroke="var(--color-revenue)" strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          )}
        </SectionShell>

        <SectionShell title="Revenue mix" description="Split of revenue by sale type." icon={BarChart3} badgeLabel="Live">
          {mixData.length === 0 ? (
            <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
              No revenue mix available.
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

      <div className="grid gap-4 md:grid-cols-2">
        <SectionShell title="Top batches" description="Batches generating the most sales revenue." icon={Layers} badgeLabel="Live">
          <div className="space-y-2">
            {data.topBatches.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
                No batch sales to compare.
              </div>
            ) : (
              data.topBatches.map((batch) => (
                <div key={`${batch.code}-${batch.records}`} className="flex items-center justify-between rounded-xl border bg-white px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{batch.code}</p>
                    <p className="text-xs text-slate-500">{batch.name ?? "Unnamed batch"} · {batch.records} records</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{formatMoney(batch.total)}</span>
                </div>
              ))
            )}
          </div>
        </SectionShell>

        <SectionShell title="Top parties" description="Customers and buyers contributing the most sales." icon={Users} badgeLabel="Live">
          <div className="space-y-2">
            {data.topParties.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
                No party-linked sales found.
              </div>
            ) : (
              data.topParties.map((party) => (
                <div key={`${party.name}-${party.phone ?? ""}`} className="flex items-center justify-between rounded-xl border bg-white px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{party.name}</p>
                    <p className="text-xs text-slate-500">{party.phone ?? "—"} · {party.records} records</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">{formatMoney(party.total)}</span>
                </div>
              ))
            )}
          </div>
        </SectionShell>
      </div>

      <Card className="border-slate-200/80 shadow-sm">
        <CardContent className="space-y-4 p-4 md:p-5">
          <div className="flex justify-end">
            <Select value={saleType} onValueChange={(value) => onSaleTypeChange(value as SaleTypeFilter)}>
              <SelectTrigger className="h-10 w-[220px] rounded-xl">
                <SelectValue placeholder="Sale type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All sales</SelectItem>
                <SelectItem value="EGG">Egg sales</SelectItem>
                <SelectItem value="PARENT">Parent sales</SelectItem>
                <SelectItem value="CHICK">Chick sales</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-slate-200/80 shadow-sm">
        <CardHeader className="space-y-1 border-b bg-gradient-to-r from-slate-50 to-white">
          <CardTitle className="text-base">Sales records</CardTitle>
          <CardDescription>Server-side paginated merged sale records for the selected scope.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable data={data.sales} columns={columns} loading={loading} emptyMessage="No sales records match the current filters." className="border-0 rounded-none" />
          <LedgerPagination page={page} totalPages={data.totalPages} totalRows={data.total} pageLimit={data.limit} onPageChange={onPageChange} loading={loading} className="border-t" />
        </CardContent>
      </Card>
    </div>
  );
}
