"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, Cell, Line } from "recharts";
import { type ChartConfig } from "@/common/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/common/components/ui/select";
import {
  CHART_RANGES,
  COMPACT_LABEL_AFTER,
  ChartCard,
  ChartLegend,
  ChartStates,
  ScrollingChart,
  SegmentedToggle,
  SummaryStrip,
  bsDate,
  bsStart,
  bsStartLabel,
  chartRangeLimit,
  niceScale,
  rupees,
  shortAmount,
  shortName,
  toneClass,
  type ChartRangeKey,
} from "@/components/charts/chartKit";
import { useGetBatchProfitTrend, type BatchPerformanceItem } from "@/fetchers/dashboard/dashboardQueries";
import { ACCOUNT_FEATURE_KEYS, useAccountFeature } from "@/fetchers/accountFeatureQueries";

const chartConfig = {
  income: { label: "Income", color: "#16a34a" },
  cost: { label: "Cost", color: "#ef4444" },
  profit: { label: "Profit", color: "#111827" },
} satisfies ChartConfig;

type RangeKey = ChartRangeKey;

/** Wide enough per batch that bars stay readable; the card scrolls sideways if needed. */
const PX_PER_BATCH = 80;
/** Labels like "Shrawan 24 '82" need a little more room. */
const PX_PER_BATCH_WITH_YEAR = 96;

type Point = {
  id: string;
  label: string;
  income: number;
  cost: number;
  profit: number;
  active: boolean;
  item: BatchPerformanceItem;
};

function TooltipBody({ point, showCfcr }: { point: Point; showCfcr: boolean }) {
  const { item } = point;
  const shownFcr = item.currentFcr ?? item.fcr;
  const fcr = shownFcr && shownFcr !== "N/A" ? shownFcr : "—";
  // cFCR only for accounts that turned it on in Settings.
  const cfcr = showCfcr && item.cfcr && item.cfcr !== "N/A" ? item.cfcr : null;
  return (
    <div className="min-w-[200px] space-y-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-md">
      <div>
        <p className="font-semibold text-gray-900">{item.batchNumber}</p>
        <p className="text-gray-500">
          {item.farmName} · {bsDate(item.startDate)}
          {point.active ? ` · Active, day ${item.days}` : item.endDate ? ` → ${bsDate(item.endDate)}` : ""}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-gray-600">
        <span>Birds</span>
        <span className="text-right">{Number(item.initialChicks || 0).toLocaleString("en-IN")}</span>
        <span>Deaths</span>
        <span className="text-right">{item.mortalityRate}%</span>
        <span>FCR</span>
        <span className="text-right">{fcr}{cfcr ? ` (cFCR ${cfcr})` : ""}</span>
      </div>
      <div className="space-y-0.5 border-t border-gray-100 pt-1.5">
        <div className="flex justify-between"><span className="text-gray-600">Income{point.active ? " (so far)" : ""}</span><span className="font-medium text-green-700">{rupees(point.income)}</span></div>
        <div className="flex justify-between"><span className="text-gray-600">Cost{point.active ? " (so far)" : ""}</span><span className="font-medium text-red-600">{rupees(point.cost)}</span></div>
        <div className="flex justify-between font-semibold">
          <span>Profit</span>
          <span className={point.profit < 0 ? "text-red-600" : point.profit > 0 ? "text-green-700" : ""}>{rupees(point.profit)}</span>
        </div>
      </div>
    </div>
  );
}

/** Farmer Home: income, cost and profit for the latest batches (whole batches, never cut by date). */
export function BatchProfitChart({ farms }: { farms: Array<{ id: string; name: string }> }) {
  const [range, setRange] = useState<RangeKey>("8");
  const [farmId, setFarmId] = useState<string>("all");
  // Broilers and layers are not comparable (a layer flock runs for months), so show one type at a time.
  const [batchType, setBatchType] = useState<"BROILER" | "LAYERS">("BROILER");
  const limit = chartRangeLimit(range);
  const cfcrFeature = useAccountFeature(ACCOUNT_FEATURE_KEYS.FARMER_CFCR);

  const { data, isLoading, isFetching, isError } = useGetBatchProfitTrend({
    limit,
    farmId: farmId === "all" ? undefined : farmId,
    batchType,
  });
  const availableTypes = data?.availableTypes ?? [];

  // If this farm (or farmer) has no batches of the chosen type, switch to the type it has.
  useEffect(() => {
    if (availableTypes.length > 0 && !availableTypes.includes(batchType)) {
      setBatchType(availableTypes[0]);
    }
  }, [availableTypes, batchType]);

  // Server sends newest first; show oldest → newest so the trend reads left to right.
  const points = useMemo<Point[]>(
    () =>
      [...(data?.data ?? [])].reverse().map((item, _index, all) => {
        const spansYears = new Set(all.map((b) => bsStart(b.startDate)?.year)).size > 1;
        const income = Number(item.salesAmount || 0);
        const cost = Number(item.expenses || 0);
        return {
          id: item.id,
          label: all.length > COMPACT_LABEL_AFTER
            ? bsStartLabel(item.startDate, shortName(item.batchNumber), spansYears)
            : shortName(item.batchNumber),
          income,
          cost,
          profit: Number(item.profitLoss ?? income - cost),
          active: item.status === "ACTIVE",
          item,
        };
      }),
    [data]
  );

  // Summary counts finished batches only; running batches are shown on their own ("so far").
  const finished = points.filter((p) => !p.active);
  const running = points.filter((p) => p.active);
  const closedProfit = finished.reduce((sum, p) => sum + p.profit, 0);
  const closedBirds = finished.reduce((sum, p) => sum + Number(p.item.initialChicks || 0), 0);
  const profitable = finished.filter((p) => p.profit > 0).length;
  const runningSoFar = running.reduce((sum, p) => sum + p.profit, 0);
  const isLayers = batchType === "LAYERS";
  const perUnit = finished.length === 0
    ? "—"
    : isLayers
      ? rupees(closedProfit / finished.length)
      : closedBirds > 0
        ? rupees(closedProfit / closedBirds)
        : "—";
  const tone = toneClass;

  // One amount scale with clean round steps (always including 0) for both the
  // fixed scale and the scrolling bars, so they line up.
  const yScale = useMemo(() => niceScale(points.flatMap((p) => [p.income, p.cost, p.profit])), [points]);

  return (
    <ChartCard
      title={<>Profit per batch · {isLayers ? "Layers" : "Broilers"}</>}
      subtitle={<>Whole batches, oldest to newest. Active batches show &quot;so far&quot;.</>}
      controls={
        <>
          {availableTypes.length > 1 ? (
            <SegmentedToggle
              options={[
                { key: "BROILER" as const, label: "Broilers" },
                { key: "LAYERS" as const, label: "Layers" },
              ]}
              value={batchType}
              onChange={setBatchType}
            />
          ) : null}
          {farms.length > 1 ? (
            <Select value={farmId} onValueChange={setFarmId}>
              <SelectTrigger className="h-8 w-40 bg-white text-xs" aria-label="Farm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" align="end" className="bg-white">
                <SelectItem value="all">All farms</SelectItem>
                {farms.map((farm) => (
                  <SelectItem key={farm.id} value={farm.id}>{farm.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          <SegmentedToggle options={CHART_RANGES} value={range} onChange={setRange} />
        </>
      }
    >
      <SummaryStrip
        loading={isLoading}
        items={[
          {
            label: "Profit (closed batches)",
            value: finished.length ? rupees(closedProfit) : "—",
            sub: finished.length ? undefined : "No closed batches yet",
            className: tone(closedProfit),
          },
          { label: isLayers ? "Per batch (closed)" : "Per bird (closed)", value: perUnit, className: finished.length ? tone(closedProfit) : "" },
          { label: "Batches in profit", value: finished.length ? `${profitable} of ${finished.length}` : "—", className: "" },
          {
            label: "Running now",
            value: running.length ? rupees(runningSoFar) : "None",
            sub: running.length ? `${running.length} active · so far` : undefined,
            className: running.length ? tone(runningSoFar) : "text-gray-500",
          },
        ]}
      />

      {isLoading || isError || points.length === 0 ? (
        <ChartStates
          loading={isLoading}
          error={isError}
          empty={points.length === 0}
          errorText="Could not load batches. Please refresh."
          emptyText="No batches yet."
        />
      ) : (
        <>
          <ScrollingChart
            data={points}
            config={chartConfig}
            yScale={yScale}
            tickFormatter={shortAmount}
            pxPerPoint={points.some((p) => p.label.includes("'")) ? PX_PER_BATCH_WITH_YEAR : PX_PER_BATCH}
            faded={isFetching}
            scrollKey={`${batchType}-${farmId}-${range}`}
            renderTooltip={(point) => <TooltipBody point={point} showCfcr={cfcrFeature.isEnabled} />}
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
          {range === "all" && data?.hasMore ? (
            <p className="text-xs text-gray-500">Showing the latest 60 batches.</p>
          ) : null}
        </>
      )}
    </ChartCard>
  );
}
