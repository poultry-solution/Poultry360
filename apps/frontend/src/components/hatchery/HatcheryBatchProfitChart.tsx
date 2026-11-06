"use client";

import { useMemo, useState } from "react";
import { Bar, Cell, Line } from "recharts";
import { type ChartConfig } from "@/common/components/ui/chart";
import {
  CHART_RANGES,
  ChartCard,
  ChartLegend,
  ChartStates,
  ScrollingChart,
  SegmentedToggle,
  SummaryStrip,
  bsLongDate,
  chartRangeLimit,
  niceScale,
  rupees,
  shortAmount,
  toneClass,
  type ChartRangeKey,
} from "@/components/charts/chartKit";
import {
  useGetHatcheryAnalyticsBatches,
  type HatcheryAnalyticsBatchRow,
} from "@/fetchers/hatchery/hatcheryAnalyticsQueries";

// Whole batches: ask for all time so sales and costs are never cut by a date range.
const ALL_TIME_START = "2000-01-01";
const PX_PER_BATCH = 80;

const chartConfig = {
  income: { label: "Income", color: "#16a34a" },
  cost: { label: "Cost", color: "#ef4444" },
  profit: { label: "Profit", color: "#111827" },
} satisfies ChartConfig;

type Point = {
  id: string;
  label: string;
  income: number;
  cost: number;
  profit: number;
  active: boolean;
  row: HatcheryAnalyticsBatchRow;
};

function TooltipBody({ point }: { point: Point }) {
  const { row } = point;
  const soFar = point.active ? " (so far)" : "";
  return (
    <div className="min-w-[220px] space-y-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-md">
      <div>
        <p className="font-semibold text-gray-900">
          {row.code}
          {row.name ? <span className="font-normal text-gray-500"> · {row.name}</span> : null}
        </p>
        <p className="text-gray-500">
          {bsLongDate(row.startDate)}
          {point.active ? " · Active" : row.endDate ? ` → ${bsLongDate(row.endDate)}` : ""}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-gray-600">
        <span>Birds now</span>
        <span className="text-right">{row.currentParents != null ? row.currentParents.toLocaleString("en-IN") : "—"}</span>
        <span>Deaths</span>
        <span className="text-right">{Number(row.mortalityRate || 0).toFixed(1)}%</span>
      </div>
      <div className="space-y-0.5 border-t border-gray-100 pt-1.5 text-gray-600">
        <div className="flex justify-between"><span>Egg sales</span><span>{rupees(row.eggSalesRevenue)}</span></div>
        <div className="flex justify-between"><span>Chick sales</span><span>{rupees(row.chickSalesRevenue)}</span></div>
        <div className="flex justify-between"><span>Parent bird sales</span><span>{rupees(row.parentSalesRevenue)}</span></div>
      </div>
      <div className="space-y-0.5 border-t border-gray-100 pt-1.5">
        <div className="flex justify-between"><span className="text-gray-600">Income{soFar}</span><span className="font-medium text-green-700">{rupees(point.income)}</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Cost{soFar}</span><span className="font-medium text-red-600">{rupees(point.cost)}</span></div>
        <div className="flex justify-between font-semibold">
          <span>Profit</span>
          <span className={toneClass(point.profit)}>{rupees(point.profit)}</span>
        </div>
      </div>
    </div>
  );
}

/** Hatchery Home: income, cost and profit per parent batch (whole batches, never cut by date). */
export function HatcheryBatchProfitChart({ enabled = true }: { enabled?: boolean }) {
  const [range, setRange] = useState<ChartRangeKey>("8");
  const limit = chartRangeLimit(range);

  const { data, isLoading, isFetching, isError } = useGetHatcheryAnalyticsBatches(
    { startDate: ALL_TIME_START, page: 1, limit },
    enabled
  );

  // Server sends newest first; show oldest → newest so the trend reads left to right.
  const points = useMemo<Point[]>(
    () =>
      [...(data?.batches ?? [])]
        .filter((row) => row.type === "PARENT_FLOCK")
        .reverse()
        .map((row) => {
          const income = Number(row.revenue || 0);
          const cost = Number(row.expenses || 0);
          return {
            id: row.id,
            label: row.code,
            income,
            cost,
            profit: Number(row.profit ?? income - cost),
            active: row.status === "ACTIVE",
            row,
          };
        }),
    [data]
  );

  // Summary counts closed batches only; running batches are shown on their own ("so far").
  const finished = points.filter((p) => !p.active);
  const running = points.filter((p) => p.active);
  const closedProfit = finished.reduce((sum, p) => sum + p.profit, 0);
  const profitable = finished.filter((p) => p.profit > 0).length;
  const runningSoFar = running.reduce((sum, p) => sum + p.profit, 0);
  const totalIncome = points.reduce((sum, p) => sum + p.income, 0);
  const total = data?.total ?? 0;

  const yScale = useMemo(() => niceScale(points.flatMap((p) => [p.income, p.cost, p.profit])), [points]);

  return (
    <ChartCard
      title="Profit per parent batch"
      subtitle={<>Whole batches, oldest to newest. Active batches show &quot;so far&quot;. Cost includes the parent birds bought.</>}
      controls={<SegmentedToggle options={CHART_RANGES} value={range} onChange={setRange} />}
    >
      <SummaryStrip
        loading={isLoading}
        items={[
          {
            label: "Profit (closed batches)",
            value: finished.length ? rupees(closedProfit) : "—",
            sub: finished.length ? undefined : "No closed batches yet",
            className: toneClass(closedProfit),
          },
          { label: "Batches in profit", value: finished.length ? `${profitable} of ${finished.length}` : "—" },
          {
            label: "Running now",
            value: running.length ? rupees(runningSoFar) : "None",
            sub: running.length ? `${running.length} active · so far` : undefined,
            className: running.length ? toneClass(runningSoFar) : "text-gray-500",
          },
          {
            label: "Total income",
            value: points.length ? rupees(totalIncome) : "—",
            sub: points.length ? "egg + chick + parent sales" : undefined,
          },
        ]}
      />

      {isLoading || isError || points.length === 0 ? (
        <ChartStates
          loading={isLoading}
          error={isError}
          empty={points.length === 0}
          errorText="Could not load batches. Please refresh."
          emptyText="No parent batches yet."
        />
      ) : (
        <>
          <ScrollingChart
            data={points}
            config={chartConfig}
            yScale={yScale}
            tickFormatter={shortAmount}
            pxPerPoint={PX_PER_BATCH}
            faded={isFetching}
            scrollKey={range}
            renderTooltip={(point) => <TooltipBody point={point} />}
            series={[
              <Bar key="income" dataKey="income" fill="var(--color-income)" radius={[3, 3, 0, 0]} barSize={18}>
                {points.map((p) => <Cell key={p.id} fillOpacity={p.active ? 0.45 : 1} />)}
              </Bar>,
              <Bar key="cost" dataKey="cost" fill="var(--color-cost)" radius={[3, 3, 0, 0]} barSize={18}>
                {points.map((p) => <Cell key={p.id} fillOpacity={p.active ? 0.45 : 1} />)}
              </Bar>,
              <Line
                key="profit"
                dataKey="profit"
                type="monotone"
                stroke="var(--color-profit)"
                strokeWidth={1.5}
                dot={{ r: 3, fill: "var(--color-profit)" }}
                activeDot={{ r: 4 }}
              />,
            ]}
          />
          <ChartLegend config={chartConfig} />
          {range === "all" && total > limit ? (
            <p className="text-xs text-gray-500">Showing the latest {limit} batches.</p>
          ) : null}
        </>
      )}
    </ChartCard>
  );
}
