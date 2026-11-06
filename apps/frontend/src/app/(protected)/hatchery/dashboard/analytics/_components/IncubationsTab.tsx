"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Badge } from "@/common/components/ui/badge";
import { DateDisplay } from "@/common/components/ui/date-display";
import { DataTable, type Column } from "@/common/components/ui/data-table";
import { LedgerPagination } from "@/common/components/ui/ledger-pagination";
import { cn } from "@/common/lib/utils";
import { formatMoney, STAGE_LABEL as INCUBATION_STAGE_LABELS } from "./types";
import { MetricCard } from "./MetricCard";
import { SectionShell } from "./SectionShell";
import type { HatcheryAnalyticsIncubationRow, HatcheryAnalyticsIncubationsResponse } from "@/fetchers/hatchery/hatcheryAnalyticsQueries";

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
  const router = useRouter();
  const columns = useMemo<Column<HatcheryAnalyticsIncubationRow>[]>(
    () => [
      {
        key: "code",
        label: "Incubation",
        width: "250px",
        render: (_, row) => (
          <div className="space-y-1">
            <p className="font-semibold text-slate-900">{row.code}</p>
            {row.name ? <p className="text-xs text-slate-500">{row.name}</p> : null}
            <p className="text-[11px] text-slate-400">
              Set <DateDisplay date={row.startDate} format="long" />
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
            <p className="text-sm font-medium text-slate-900">{row.parentBatch?.code ?? "—"}</p>
            {row.parentBatch?.name ? <p className="text-xs text-slate-500">{row.parentBatch.name}</p> : null}
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
                ? "bg-emerald-50 text-green-700 hover:bg-emerald-50"
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
        label: "Lost at candling",
        align: "right",
        width: "130px",
        render: (_, row) => <span className="font-semibold text-red-600">{row.candlingLoss.toLocaleString()}</span>,
      },
      {
        key: "totalHatched",
        label: "Hatched",
        align: "right",
        width: "120px",
        render: (_, row) => <span className="font-semibold text-green-700">{row.totalHatched.toLocaleString()}</span>,
      },
      {
        key: "hatchability",
        label: "Hatch %",
        align: "right",
        width: "130px",
        render: (_, row) => <span className="font-semibold text-slate-900">{row.hatchability.toFixed(1)}%</span>,
      },
      {
        key: "chickSalesCount",
        label: "Chicks sold",
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
        label: "In stock",
        align: "right",
        width: "110px",
        render: (_, row) => <span className="font-semibold text-slate-900">{row.currentChickStock.toLocaleString()}</span>,
      },
    ],
    []
  );

  const stageCounts = (["SETTER", "CANDLING", "HATCHER", "COMPLETED"] as const).map((stage) => ({
    label: INCUBATION_STAGE_LABELS[stage],
    value: data.summary[stage === "COMPLETED" ? "completed" : (stage.toLowerCase() as "setter" | "candling" | "hatcher")],
  }));
  const parentCode = parentBatchOptions.find((b) => b.id === data.applied.parentBatchId)?.code;
  const filterClass = "h-9 rounded-md border border-gray-200 bg-white px-3 text-sm";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard
          title="Incubations"
          value={data.summary.totalIncubations.toLocaleString()}
          subtitle={`${data.summary.completed} hatched · ${data.summary.totalIncubations - data.summary.completed} running`}
        />
        <MetricCard title="Eggs set" value={data.summary.totalEggsSet.toLocaleString()} subtitle={`${data.summary.totalFertileEggs.toLocaleString()} good after candling`} />
        <MetricCard
          title="Hatch %"
          value={`${data.summary.averageHatchability.toFixed(1)}%`}
          subtitle={`${data.summary.averageHatchOfTotal.toFixed(1)}% of all eggs set`}
          tone="text-green-700"
        />
        <MetricCard
          title="Chick sales"
          value={formatMoney(data.summary.totalChickSalesRevenue)}
          subtitle={`${data.summary.totalChickSalesCount.toLocaleString()} chicks sold`}
          tone="text-green-700"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionShell title="Stage" description="Where each incubation is now.">
          <div className="space-y-3">
            {stageCounts.map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{item.label}</span>
                  <span className="text-sm font-semibold text-gray-900">{item.value.toLocaleString()}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full bg-green-500"
                    style={{ width: `${data.summary.totalIncubations > 0 ? (item.value / data.summary.totalIncubations) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </SectionShell>

        <SectionShell title="Hatch result" description="What happened to the eggs.">
          <div className="grid grid-cols-2 gap-3">
            <MetricCard
              title="Lost at candling"
              value={data.summary.totalCandlingLoss.toLocaleString()}
              subtitle={`Died late: ${data.summary.totalLateDead.toLocaleString()}`}
              tone="text-red-600"
            />
            <MetricCard
              title="Chicks hatched"
              value={data.summary.totalHatched.toLocaleString()}
              subtitle={`A ${data.summary.totalHatchedA.toLocaleString()} · B ${data.summary.totalHatchedB.toLocaleString()} · Cull ${data.summary.totalCull.toLocaleString()}`}
              tone="text-green-700"
            />
            <MetricCard title="Did not hatch" value={data.summary.totalUnhatched.toLocaleString()} tone="text-amber-700" />
            <MetricCard title="Chicks in stock" value={data.summary.totalCurrentChickStock.toLocaleString()} subtitle="Now" />
          </div>
        </SectionShell>
      </div>

      <SectionShell
        title="Each incubation"
        description={parentCode ? `Only from parent batch ${parentCode}. Tap a row to open it.` : "Tap a row to open it."}
        flush
        action={
          <div className="flex flex-wrap gap-2">
            <select
              className={filterClass}
              value={incubationStage}
              onChange={(e) => onIncubationStageChange(e.target.value as typeof incubationStage)}
              aria-label="Stage"
            >
              <option value="all">All stages</option>
              {(["SETTER", "CANDLING", "HATCHER", "COMPLETED"] as const).map((stage) => (
                <option key={stage} value={stage}>
                  {INCUBATION_STAGE_LABELS[stage]}
                </option>
              ))}
            </select>
            <select
              className={filterClass}
              value={incubationParentBatchId}
              onChange={(e) => onIncubationParentBatchIdChange(e.target.value)}
              aria-label="Parent batch"
            >
              <option value="all">All parent batches</option>
              {parentBatchOptions.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.code}
                </option>
              ))}
            </select>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <DataTable
            data={data.incubations}
            columns={columns}
            loading={loading}
            emptyMessage="No incubations match these filters."
            className="rounded-none border-0"
            getRowKey={(row) => row.id}
            onRowClick={(row) => router.push(`/hatchery/dashboard/incubations/${row.id}`)}
          />
          <LedgerPagination page={page} totalPages={data.totalPages} totalRows={data.total} pageLimit={data.limit} onPageChange={onPageChange} loading={loading} className="border-t px-4" />
        </div>
      </SectionShell>
    </div>
  );
}
