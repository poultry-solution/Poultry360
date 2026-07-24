"use client";

import { ArrowUpRight, BarChart3, Layers, Wallet } from "lucide-react";
import { useMemo } from "react";
import { Badge } from "@/common/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";
import { DateDisplay } from "@/common/components/ui/date-display";
import { DataTable, type Column } from "@/common/components/ui/data-table";
import { LedgerPagination } from "@/common/components/ui/ledger-pagination";
import { cn } from "@/common/lib/utils";
import { formatMoney } from "./types";
import { MetricCard } from "./MetricCard";
import type { HatcheryAnalyticsBatchRow, HatcheryAnalyticsBatchesResponse } from "@/fetchers/hatchery/hatcheryAnalyticsQueries";

export function BatchesTab({
  data,
  loading,
  page,
  onPageChange,
}: {
  data: HatcheryAnalyticsBatchesResponse;
  loading: boolean;
  page: number;
  onPageChange: (page: number) => void;
}) {
  const columns = useMemo<Column<HatcheryAnalyticsBatchRow>[]>(
    () => [
      {
        key: "code",
        label: "Batch",
        width: "240px",
        render: (_, row) => (
          <div className="space-y-1">
            <p className="font-semibold text-slate-900">{row.code}</p>
            <p className="text-xs text-slate-500">{row.name ?? "Unnamed batch"}</p>
            <p className="text-[11px] text-slate-400">
              <DateDisplay date={row.startDate} />
            </p>
          </div>
        ),
      },
      {
        key: "type",
        label: "Type",
        width: "140px",
        render: (_, row) => (
          <Badge
            className={cn(
              "rounded-full",
              row.type === "PARENT_FLOCK"
                ? "bg-amber-50 text-amber-700 hover:bg-amber-50"
                : "bg-indigo-50 text-indigo-700 hover:bg-indigo-50"
            )}
          >
            {row.type === "PARENT_FLOCK" ? "Parent flock" : "Incubation"}
          </Badge>
        ),
      },
      {
        key: "status",
        label: "Status",
        width: "120px",
        render: (_, row) => (
          <Badge
            className={cn(
              "rounded-full",
              row.status === "ACTIVE"
                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                : "bg-slate-100 text-slate-600 hover:bg-slate-100"
            )}
          >
            {row.status}
          </Badge>
        ),
      },
      {
        key: "currentParents",
        label: "Birds",
        align: "right",
        width: "120px",
        render: (_, row) =>
          row.currentParents !== null ? (
            <div className="text-right">
              <p className="font-semibold text-slate-900">{row.currentParents.toLocaleString()}</p>
              <p className="text-[11px] text-slate-500">
                {row.initialParents !== null ? `${row.initialParents.toLocaleString()} started` : "—"}
              </p>
            </div>
          ) : (
            <span className="text-slate-400">—</span>
          ),
      },
      {
        key: "mortality",
        label: "Mortality",
        align: "right",
        width: "140px",
        render: (_, row) => (
          <div className="text-right">
            <p className="font-semibold text-slate-900">{row.mortality.toLocaleString()}</p>
            <p className="text-[11px] text-slate-500">{row.mortalityRate.toFixed(1)}%</p>
          </div>
        ),
      },
      {
        key: "expenses",
        label: "Expenses",
        align: "right",
        width: "150px",
        render: (_, row) => <span className="font-semibold text-slate-900">{formatMoney(row.expenses)}</span>,
      },
      {
        key: "revenue",
        label: "Revenue",
        align: "right",
        width: "150px",
        render: (_, row) => <span className="font-semibold text-emerald-700">{formatMoney(row.revenue)}</span>,
      },
      {
        key: "profit",
        label: "Profit",
        align: "right",
        width: "150px",
        render: (_, row) => (
          <span className={cn("font-semibold", row.profit >= 0 ? "text-indigo-700" : "text-rose-600")}>
            {formatMoney(row.profit)}
          </span>
        ),
      },
      {
        key: "producedChicks",
        label: "Output",
        align: "right",
        width: "170px",
        render: (_, row) => (
          <div className="text-right">
            <p className="font-semibold text-slate-900">{row.producedChicks.toLocaleString()}</p>
            <p className="text-[11px] text-slate-500">
              {row.soldChicks.toLocaleString()} sold · {row.hatchabilityRate.toFixed(1)}%
            </p>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Batches"
          value={data.summary.totalBatches.toLocaleString()}
          subtitle={`${data.summary.activeBatches} active · ${data.summary.closedBatches} closed`}
          icon={Layers}
        />
        <MetricCard
          title="Revenue"
          value={formatMoney(data.summary.totalRevenue)}
          subtitle={`Avg per batch ${formatMoney(data.summary.totalBatches > 0 ? data.summary.totalRevenue / data.summary.totalBatches : 0)}`}
          icon={ArrowUpRight}
          tone="text-emerald-600"
        />
        <MetricCard
          title="Expenses"
          value={formatMoney(data.summary.totalExpenses)}
          subtitle={`Avg per batch ${formatMoney(data.summary.totalBatches > 0 ? data.summary.totalExpenses / data.summary.totalBatches : 0)}`}
          icon={Wallet}
          tone="text-orange-700"
        />
        <MetricCard
          title="Profit"
          value={formatMoney(data.summary.totalProfit)}
          subtitle={`${data.summary.averageMortalityRate.toFixed(1)}% avg mortality`}
          icon={BarChart3}
          tone={data.summary.totalProfit >= 0 ? "text-indigo-600" : "text-rose-600"}
        />
      </div>

      <Card className="overflow-hidden border-slate-200/80 shadow-sm">
        <CardHeader className="space-y-1 border-b bg-gradient-to-r from-slate-50 to-white">
          <CardTitle className="text-base">Batch performance</CardTitle>
          <CardDescription>Server-side paginated batch summary for the selected scope.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable data={data.batches} columns={columns} loading={loading} emptyMessage="No batches match the current filters." className="border-0 rounded-none" />
          <LedgerPagination page={page} totalPages={data.totalPages} totalRows={data.total} pageLimit={data.limit} onPageChange={onPageChange} loading={loading} className="border-t" />
        </CardContent>
      </Card>
    </div>
  );
}
