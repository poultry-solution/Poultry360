"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { DateDisplay } from "@/common/components/ui/date-display";
import { DataTable, type Column } from "@/common/components/ui/data-table";
import { LedgerPagination } from "@/common/components/ui/ledger-pagination";
import { cn } from "@/common/lib/utils";
import { formatMoney } from "./types";
import { MetricCard } from "./MetricCard";
import { SectionShell } from "./SectionShell";
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
  const router = useRouter();
  const columns = useMemo<Column<HatcheryAnalyticsBatchRow>[]>(
    () => [
      {
        key: "code",
        label: "Batch",
        width: "240px",
        render: (_, row) => (
          <div className="space-y-1">
            <p className="font-semibold text-slate-900">{row.code}</p>
            {row.name ? <p className="text-xs text-slate-500">{row.name}</p> : null}
            <p className="text-[11px] text-slate-400">
              Started <DateDisplay date={row.startDate} format="long" />
            </p>
          </div>
        ),
      },
      {
        key: "status",
        label: "Status",
        width: "120px",
        render: (_, row) => (
          <span className={cn("text-sm", row.status === "ACTIVE" ? "font-medium text-green-700" : "text-gray-500")}>
            {row.status === "ACTIVE" ? "Active" : "Closed"}
          </span>
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
              {(row.currentFemaleParents ?? 0) + (row.currentMaleParents ?? 0) > 0 && (
                <p className="text-[11px] text-slate-500">
                  female {(row.currentFemaleParents ?? 0).toLocaleString()} · male{" "}
                  {(row.currentMaleParents ?? 0).toLocaleString()}
                </p>
              )}
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
        label: "Deaths",
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
        label: "Cost",
        align: "right",
        width: "150px",
        render: (_, row) => <span className="font-semibold text-slate-900">{formatMoney(row.expenses)}</span>,
      },
      {
        key: "revenue",
        label: "Income",
        align: "right",
        width: "150px",
        render: (_, row) => <span className="font-semibold text-green-700">{formatMoney(row.revenue)}</span>,
      },
      {
        key: "profit",
        label: "Profit",
        align: "right",
        width: "150px",
        render: (_, row) => (
          <span className={cn("font-semibold", row.profit >= 0 ? "text-green-700" : "text-red-600")}>
            {formatMoney(row.profit)}
          </span>
        ),
      },
      {
        key: "producedChicks",
        label: "Chicks",
        align: "right",
        width: "170px",
        render: (_, row) => (
          <div className="text-right">
            <p className="font-semibold text-slate-900">{row.producedChicks.toLocaleString()}</p>
            <p className="text-[11px] text-slate-500">
              {row.soldChicks.toLocaleString()} sold · hatch {row.hatchabilityRate.toFixed(1)}%
            </p>
          </div>
        ),
      },
    ],
    []
  );

  const avg = (n: number) => formatMoney(data.summary.totalBatches > 0 ? n / data.summary.totalBatches : 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard
          title="Batches"
          value={data.summary.totalBatches.toLocaleString()}
          subtitle={`${data.summary.activeBatches} active · ${data.summary.closedBatches} closed`}
        />
        <MetricCard title="Income" value={formatMoney(data.summary.totalRevenue)} subtitle={`About ${avg(data.summary.totalRevenue)} per batch`} tone="text-green-700" />
        <MetricCard title="Cost" value={formatMoney(data.summary.totalExpenses)} subtitle={`About ${avg(data.summary.totalExpenses)} per batch`} tone="text-red-600" />
        <MetricCard
          title="Profit"
          value={formatMoney(data.summary.totalProfit)}
          subtitle={`${data.summary.averageMortalityRate.toFixed(1)}% birds died on average`}
          tone={data.summary.totalProfit >= 0 ? "text-green-700" : "text-red-600"}
        />
      </div>

      <SectionShell title="Each batch" description="Money and birds for each parent flock. Tap a row to open it." flush>
        <div className="overflow-x-auto">
          <DataTable
            data={data.batches}
            columns={columns}
            loading={loading}
            emptyMessage="No batches in these dates."
            className="rounded-none border-0"
            getRowKey={(row) => row.id}
            onRowClick={(row) => router.push(`/hatchery/dashboard/batches/${row.id}`)}
          />
          <LedgerPagination page={page} totalPages={data.totalPages} totalRows={data.total} pageLimit={data.limit} onPageChange={onPageChange} loading={loading} className="border-t px-4" />
        </div>
      </SectionShell>
    </div>
  );
}
