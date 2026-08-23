"use client";

import { Bird, FlaskConical, Egg, ArrowUpRight } from "lucide-react";
import { useMemo } from "react";
import { Badge } from "@/common/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";
import { DateDisplay } from "@/common/components/ui/date-display";
import { DataTable, type Column } from "@/common/components/ui/data-table";
import { LedgerPagination } from "@/common/components/ui/ledger-pagination";
import { cn } from "@/common/lib/utils";
import { formatMoney } from "./types";
import { MetricCard } from "./MetricCard";
import { SectionShell } from "./SectionShell";
import type { HatcheryAnalyticsIncubationRow, HatcheryAnalyticsIncubationsResponse } from "@/fetchers/hatchery/hatcheryAnalyticsQueries";

const INCUBATION_STAGE_LABELS: Record<"SETTER" | "CANDLING" | "HATCHER" | "COMPLETED", string> = {
  SETTER: "Setter",
  CANDLING: "Candling",
  HATCHER: "Hatcher",
  COMPLETED: "Completed",
};

export function IncubationsTab({
  data,
  loading,
  page,
  onPageChange,
  parentBatchOptions,
  incubationStage,
  onIncubationStageChange,
  incubationParentBatchId,
  onIncubationParentBatchIdChange,
}: {
  data: HatcheryAnalyticsIncubationsResponse;
  loading: boolean;
  page: number;
  onPageChange: (page: number) => void;
  parentBatchOptions: Array<{ id: string; code: string }>;
  incubationStage: "all" | "SETTER" | "CANDLING" | "HATCHER" | "COMPLETED";
  onIncubationStageChange: (value: "all" | "SETTER" | "CANDLING" | "HATCHER" | "COMPLETED") => void;
  incubationParentBatchId: string;
  onIncubationParentBatchIdChange: (value: string) => void;
}) {
  const columns = useMemo<Column<HatcheryAnalyticsIncubationRow>[]>(
    () => [
      {
        key: "code",
        label: "Incubation",
        width: "250px",
        render: (_, row) => (
          <div className="space-y-1">
            <p className="font-semibold text-slate-900">{row.code}</p>
            <p className="text-xs text-slate-500">{row.name ?? "Unnamed incubation"}</p>
            <p className="text-[11px] text-slate-400">
              <DateDisplay date={row.startDate} />
            </p>
          </div>
        ),
      },
      {
        key: "parentBatch",
        label: "Parent batch",
        width: "180px",
        render: (_, row) => (
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-900">{row.parentBatch?.code ?? row.parentBatchId}</p>
            <p className="text-xs text-slate-500">{row.parentBatch?.name ?? "Parent flock"}</p>
          </div>
        ),
      },
      {
        key: "stage",
        label: "Stage",
        width: "120px",
        render: (_, row) => (
          <Badge
            className={cn(
              "rounded-full",
              row.stage === "COMPLETED"
                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-50"
                : row.stage === "HATCHER"
                  ? "bg-orange-50 text-orange-700 hover:bg-orange-50"
                  : row.stage === "CANDLING"
                    ? "bg-amber-50 text-amber-700 hover:bg-amber-50"
                    : "bg-blue-50 text-blue-700 hover:bg-blue-50"
            )}
          >
            {INCUBATION_STAGE_LABELS[row.stage]}
          </Badge>
        ),
      },
      {
        key: "eggsSetCount",
        label: "Eggs set",
        align: "right",
        width: "120px",
        render: (_, row) => <span className="font-semibold text-slate-900">{row.eggsSetCount.toLocaleString()}</span>,
      },
      {
        key: "candlingLoss",
        label: "Candling loss",
        align: "right",
        width: "130px",
        render: (_, row) => <span className="font-semibold text-rose-600">{row.candlingLoss.toLocaleString()}</span>,
      },
      {
        key: "totalHatched",
        label: "Hatched",
        align: "right",
        width: "120px",
        render: (_, row) => <span className="font-semibold text-emerald-700">{row.totalHatched.toLocaleString()}</span>,
      },
      {
        key: "hatchability",
        label: "Hatchability",
        align: "right",
        width: "130px",
        render: (_, row) => <span className="font-semibold text-slate-900">{row.hatchability.toFixed(1)}%</span>,
      },
      {
        key: "chickSalesCount",
        label: "Sales",
        align: "right",
        width: "150px",
        render: (_, row) => (
          <div className="text-right">
            <p className="font-semibold text-slate-900">{row.chickSalesCount.toLocaleString()}</p>
            <p className="text-[11px] text-slate-500">{formatMoney(row.chickSalesRevenue)}</p>
          </div>
        ),
      },
      {
        key: "currentChickStock",
        label: "Stock",
        align: "right",
        width: "110px",
        render: (_, row) => <span className="font-semibold text-slate-900">{row.currentChickStock.toLocaleString()}</span>,
      },
    ],
    []
  );

  const stageCounts = [
    { label: "Setter", value: data.summary.setter },
    { label: "Candling", value: data.summary.candling },
    { label: "Hatcher", value: data.summary.hatcher },
    { label: "Completed", value: data.summary.completed },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Incubations" value={data.summary.totalIncubations.toLocaleString()} subtitle={`${data.summary.setter} setter · ${data.summary.completed} completed`} icon={FlaskConical} />
        <MetricCard title="Eggs set" value={data.summary.totalEggsSet.toLocaleString()} subtitle={`${data.summary.totalFertileEggs.toLocaleString()} fertile after candling`} icon={Egg} tone="text-slate-900" />
        <MetricCard title="Hatchability" value={`${data.summary.averageHatchability.toFixed(1)}%`} subtitle={`${data.summary.averageHatchOfTotal.toFixed(1)}% hatch of total`} icon={Bird} tone="text-emerald-700" />
        <MetricCard title="Chick revenue" value={formatMoney(data.summary.totalChickSalesRevenue)} subtitle={`${data.summary.totalChickSalesCount.toLocaleString()} chicks sold`} icon={ArrowUpRight} tone="text-indigo-700" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
        <SectionShell title="Incubation stage mix" description="Current incubations grouped by stage." icon={FlaskConical} badgeLabel="Live">
          <div className="space-y-3">
            {stageCounts.map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">{item.label}</span>
                  <span className="text-sm font-semibold text-slate-900">{item.value.toLocaleString()}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${data.summary.totalIncubations > 0 ? (item.value / data.summary.totalIncubations) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </SectionShell>

        <SectionShell title="Outcome summary" description="Candling, hatch, and stock totals for the filtered scope." icon={Bird} badgeLabel="Live">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border bg-white p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Candling loss</p>
              <p className="mt-1 text-xl font-semibold text-rose-600">{data.summary.totalCandlingLoss.toLocaleString()}</p>
              <p className="text-xs text-slate-500">Late dead: {data.summary.totalLateDead.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border bg-white p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Hatched chicks</p>
              <p className="mt-1 text-xl font-semibold text-emerald-700">{data.summary.totalHatched.toLocaleString()}</p>
              <p className="text-xs text-slate-500">A: {data.summary.totalHatchedA.toLocaleString()} · B: {data.summary.totalHatchedB.toLocaleString()} · Cull: {data.summary.totalCull.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border bg-white p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Unhatched</p>
              <p className="mt-1 text-xl font-semibold text-amber-700">{data.summary.totalUnhatched.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border bg-white p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Current stock</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{data.summary.totalCurrentChickStock.toLocaleString()}</p>
            </div>
          </div>
        </SectionShell>
      </div>

      <Card className="border-slate-200/80 shadow-sm">
        <CardContent className="space-y-4 p-4 md:p-5">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
            <div className="rounded-xl border bg-white p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Stage</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {(["all", "SETTER", "CANDLING", "HATCHER", "COMPLETED"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onIncubationStageChange(value)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-sm font-medium transition",
                      incubationStage === value ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-600"
                    )}
                  >
                    {value === "all" ? "All stages" : INCUBATION_STAGE_LABELS[value]}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl border bg-white p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Parent batch</p>
              <select
                className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                value={incubationParentBatchId}
                onChange={(e) => onIncubationParentBatchIdChange(e.target.value)}
              >
                <option value="all">All parent batches</option>
                {parentBatchOptions.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.code}
                  </option>
                ))}
              </select>
            </div>
            <div className="rounded-xl border bg-white p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Scope</p>
              <p className="mt-2 text-sm text-slate-600">
                {data.applied.parentBatchId ? `Parent batch ${data.applied.parentBatchId}` : "All parent batches"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-slate-200/80 shadow-sm">
        <CardHeader className="space-y-1 border-b bg-gradient-to-r from-slate-50 to-white">
          <CardTitle className="text-base">Incubation performance</CardTitle>
          <CardDescription>Server-side paginated incubation summary for the selected scope.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable data={data.incubations} columns={columns} loading={loading} emptyMessage="No incubations match the current filters." className="border-0 rounded-none" />
          <LedgerPagination page={page} totalPages={data.totalPages} totalRows={data.total} pageLimit={data.limit} onPageChange={onPageChange} loading={loading} className="border-t" />
        </CardContent>
      </Card>
    </div>
  );
}
