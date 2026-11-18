"use client";

import { useMemo, useState } from "react";
import { Bar, Line } from "recharts";
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
  type ChartRangeKey,
} from "@/components/charts/chartKit";
import {
  useGetHatcheryAnalyticsIncubations,
  type HatcheryAnalyticsIncubationRow,
} from "@/fetchers/hatchery/hatcheryAnalyticsQueries";

// Whole incubations: ask for all time so losses and hatches are never cut by a date range.
const ALL_TIME_START = "2000-01-01";
const PX_PER_INCUBATION = 64;

// Stacked from the bottom: good chicks first, then the losses.
const chartConfig = {
  gradeA: { label: "Good chicks (A)", color: "#15803d" },
  gradeB: { label: "Grade B", color: "#86efac" },
  cull: { label: "Cull", color: "#facc15" },
  lateDead: { label: "Late dead", color: "#fb923c" },
  unhatched: { label: "Unhatched", color: "#9ca3af" },
  candling: { label: "Removed at candling", color: "#fca5a5" },
  hatchPct: { label: "Hatch %", color: "#111827" },
} satisfies ChartConfig;

type Point = {
  id: string;
  label: string;
  gradeA: number;
  gradeB: number;
  cull: number;
  lateDead: number;
  unhatched: number;
  candling: number;
  hatchPct: number;
  row: HatcheryAnalyticsIncubationRow;
};

const pct = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0);
const pctText = (value: number) => `${value.toFixed(1)}%`;
const count = (value: number) => Math.round(value).toLocaleString("en-IN");

function TooltipBody({ point }: { point: Point }) {
  const { row } = point;
  const eggs = row.eggsSetCount;
  const lines: Array<[string, number, string]> = [
    ["Good chicks (A)", row.totalHatchedA, chartConfig.gradeA.color],
    ["Grade B", row.totalHatchedB, chartConfig.gradeB.color],
    ["Cull", row.totalCull, chartConfig.cull.color],
    ["Late dead", row.lateDead, chartConfig.lateDead.color],
    ["Unhatched", row.unhatched, chartConfig.unhatched.color],
    ["Removed at candling", row.candlingLoss, chartConfig.candling.color],
  ];
  return (
    <div className="min-w-[230px] space-y-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-md">
      <div>
        <p className="font-semibold text-gray-900">
          {row.code}
          {row.name ? <span className="font-normal text-gray-500"> · {row.name}</span> : null}
        </p>
        <p className="text-gray-500">
          {row.parentBatch?.code ? `Parent ${row.parentBatch.code} · ` : ""}Started {bsLongDate(row.startDate)}
        </p>
      </div>
      <div className="flex justify-between text-gray-600">
        <span>Eggs set</span>
        <span className="font-medium text-gray-900">{count(eggs)}</span>
      </div>
      <div className="space-y-0.5 border-t border-gray-100 pt-1.5">
        {lines.map(([label, value, color]) => (
          <div key={label} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-gray-600">
              <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: color }} />
              {label}
            </span>
            <span className="tabular-nums">
              {count(value)} <span className="text-gray-400">· {pctText(pct(value, eggs))}</span>
            </span>
          </div>
        ))}
      </div>
      <div className="flex justify-between border-t border-gray-100 pt-1.5 font-semibold">
        <span>Hatch % (of fertile eggs)</span>
        <span>{pctText(point.hatchPct)}</span>
      </div>
    </div>
  );
}

/** Hatchery Home: where every egg of each finished incubation went, and the hatch %. */
export function HatchResultChart({ enabled = true }: { enabled?: boolean }) {
  const [range, setRange] = useState<ChartRangeKey>("8");
  const limit = chartRangeLimit(range);

  const { data, isLoading, isFetching, isError } = useGetHatcheryAnalyticsIncubations(
    { startDate: ALL_TIME_START, stage: "COMPLETED", page: 1, limit },
    enabled
  );

  // Server sends newest first; show oldest → newest so the trend reads left to right.
  const points = useMemo<Point[]>(
    () =>
      [...(data?.incubations ?? [])].reverse().map((row) => {
        const eggs = row.eggsSetCount;
        const hatched = row.totalHatchedA + row.totalHatchedB + row.totalCull;
        const fertile = Math.max(eggs - row.candlingLoss, 0);
        return {
          id: row.id,
          label: row.code,
          gradeA: pct(row.totalHatchedA, eggs),
          gradeB: pct(row.totalHatchedB, eggs),
          cull: pct(row.totalCull, eggs),
          lateDead: pct(row.lateDead, eggs),
          unhatched: pct(row.unhatched, eggs),
          candling: pct(row.candlingLoss, eggs),
          hatchPct: pct(hatched, fertile),
          row,
        };
      }),
    [data]
  );

  // Totals for the incubations shown. Hatch % is all chicks ÷ all fertile eggs (not an average of averages).
  const totals = points.reduce(
    (acc, p) => {
      const r = p.row;
      acc.eggs += r.eggsSetCount;
      acc.hatched += r.totalHatchedA + r.totalHatchedB + r.totalCull;
      acc.fertile += Math.max(r.eggsSetCount - r.candlingLoss, 0);
      return acc;
    },
    { eggs: 0, hatched: 0, fertile: 0 }
  );
  const best = points.reduce<Point | null>((top, p) => (!top || p.hatchPct > top.hatchPct ? p : top), null);
  const total = data?.total ?? 0;

  return (
    <ChartCard
      title="Hatch result per incubation"
      subtitle="Finished incubations only, oldest to newest. Each bar is all the eggs set."
      controls={<SegmentedToggle options={CHART_RANGES} value={range} onChange={setRange} />}
    >
      <SummaryStrip
        loading={isLoading}
        items={[
          { label: "Eggs set", value: points.length ? count(totals.eggs) : "—" },
          { label: "Chicks hatched", value: points.length ? count(totals.hatched) : "—" },
          {
            label: "Hatch % (all shown)",
            value: points.length ? pctText(pct(totals.hatched, totals.fertile)) : "—",
            sub: points.length ? "of fertile eggs" : undefined,
          },
          {
            label: "Best",
            value: best ? `${best.row.code} · ${pctText(best.hatchPct)}` : "—",
            className: best ? "text-green-700" : "",
          },
        ]}
      />

      {isLoading || isError || points.length === 0 ? (
        <ChartStates
          loading={isLoading}
          error={isError}
          empty={points.length === 0}
          errorText="Could not load incubations. Please refresh."
          emptyText="No finished incubations yet. Bars show after you record a hatch result."
        />
      ) : (
        <>
          <ScrollingChart
            data={points}
            config={chartConfig}
            yScale={{ domain: [0, 100], ticks: [0, 25, 50, 75, 100] }}
            tickFormatter={(v) => `${v}%`}
            pxPerPoint={PX_PER_INCUBATION}
            faded={isFetching}
            scrollKey={range}
            barCategoryGap="35%"
            renderTooltip={(point) => <TooltipBody point={point} />}
            series={[
              ...(["gradeA", "gradeB", "cull", "lateDead", "unhatched", "candling"] as const).map((key, i, all) => (
                <Bar
                  key={key}
                  dataKey={key}
                  stackId="eggs"
                  fill={`var(--color-${key})`}
                  maxBarSize={28}
                  radius={i === all.length - 1 ? [3, 3, 0, 0] : 0}
                />
              )),
              <Line
                key="hatchPct"
                dataKey="hatchPct"
                type="monotone"
                stroke="var(--color-hatchPct)"
                strokeWidth={1.5}
                dot={{ r: 3, fill: "var(--color-hatchPct)" }}
                activeDot={{ r: 4 }}
              />,
            ]}
          />
          <ChartLegend config={chartConfig} />
          {range === "all" && total > limit ? (
            <p className="text-xs text-gray-500">Showing the latest {limit} incubations.</p>
          ) : null}
        </>
      )}
    </ChartCard>
  );
}
