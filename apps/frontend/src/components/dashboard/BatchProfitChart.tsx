"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bar, CartesianGrid, Cell, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/common/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/common/components/ui/select";
import { convertADtoBS, toNepalDayAd } from "@/common/lib/nepali-date";
import { useGetBatchProfitTrend, type BatchPerformanceItem } from "@/fetchers/dashboard/dashboardQueries";

const chartConfig = {
  income: { label: "Income", color: "#16a34a" },
  cost: { label: "Cost", color: "#ef4444" },
  profit: { label: "Profit", color: "#111827" },
} satisfies ChartConfig;

const RANGES = [
  { key: "8", label: "Last 8", limit: 8 },
  { key: "20", label: "Last 20", limit: 20 },
  { key: "all", label: "All", limit: 60 },
] as const;
type RangeKey = (typeof RANGES)[number]["key"];

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

const rupees = (value: number) => `रू ${Math.round(value).toLocaleString("en-IN")}`;

/** Short axis numbers in the Nepali way: 15K, 1.5L, 2Cr. */
function shortAmount(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1e7) return `${+(value / 1e7).toFixed(1)}Cr`;
  if (abs >= 1e5) return `${+(value / 1e5).toFixed(1)}L`;
  if (abs >= 1e3) return `${+(value / 1e3).toFixed(1)}K`;
  return String(Math.round(value));
}

function bsDate(value?: string | null) {
  if (!value) return "";
  try {
    return convertADtoBS(toNepalDayAd(value));
  } catch {
    return "";
  }
}

function shortName(name: string) {
  return name.length > 12 ? `${name.slice(0, 11)}…` : name;
}

const BS_MONTHS = ["Baisakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin", "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"];

/** Short Nepali start date like "Ashadh 3", used when many batches share the axis. */
function bsStart(startDate: string) {
  try {
    const [year, month, day] = convertADtoBS(toNepalDayAd(startDate)).split("-").map(Number);
    return { year, month, day };
  } catch {
    return null;
  }
}

/** Short Nepali start date like "Ashadh 3", or "Ashadh 3 '82" when the batches cover more than one year. */
function bsStartLabel(startDate: string, fallback: string, withYear: boolean) {
  const bs = bsStart(startDate);
  if (!bs) return fallback;
  return `${BS_MONTHS[bs.month - 1]} ${bs.day}${withYear ? ` '${String(bs.year).slice(-2)}` : ""}`;
}

/** Round scale steps (1, 2, 2.5, 5 × 10ⁿ) from below the lowest to above the highest value, always through 0. */
function niceScale(values: number[], targetSteps = 4) {
  const max = Math.max(0, ...values);
  const min = Math.min(0, ...values);
  const range = max - min || 1;
  const raw = range / targetSteps;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 2, 2.5, 5, 10].find((m) => m * power >= raw) ?? 10) * power;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let t = lo; t <= hi + step / 2; t += step) ticks.push(Math.round(t));
  return { domain: [lo, hi] as [number, number], ticks };
}

/** Above this many batches the axis shows only the start date (full name stays in the tooltip). */
const COMPACT_LABEL_AFTER = 12;
/** X-axis height, shared by the scrolling chart and the fixed amount scale so they line up. */
const X_AXIS_HEIGHT = 30;

function TooltipBody({ point }: { point: Point }) {
  const { item } = point;
  const shownFcr = item.currentFcr ?? item.fcr;
  const fcr = shownFcr && shownFcr !== "N/A" ? shownFcr : "—";
  const cfcr = item.cfcr && item.cfcr !== "N/A" ? item.cfcr : null;
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
  const limit = RANGES.find((r) => r.key === range)?.limit ?? 8;

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
  const tone = (value: number) => (value < 0 ? "text-red-600" : value > 0 ? "text-green-700" : "");

  // One amount scale with clean round steps (always including 0) for both the
  // fixed scale and the scrolling bars, so they line up.
  const yScale = useMemo(() => niceScale(points.flatMap((p) => [p.income, p.cost, p.profit])), [points]);

  // Open at the newest batches (right end); scroll left for older ones.
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [points.length, batchType, farmId, range]);

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold">Profit per batch · {isLayers ? "Layers" : "Broilers"}</p>
          <p className="text-xs text-gray-500">Whole batches, oldest to newest. Active batches show &quot;so far&quot;.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {availableTypes.length > 1 ? (
            <div className="inline-flex rounded-md border border-gray-200 bg-gray-50 p-0.5">
              {(["BROILER", "LAYERS"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setBatchType(type)}
                  className={`rounded px-2.5 py-0.5 text-xs font-medium transition-colors ${batchType === type ? "bg-primary text-primary-foreground shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
                >
                  {type === "BROILER" ? "Broilers" : "Layers"}
                </button>
              ))}
            </div>
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
          <div className="inline-flex rounded-md border border-gray-200 bg-gray-50 p-0.5">
            {RANGES.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setRange(option.key)}
                className={`rounded px-2.5 py-0.5 text-xs font-medium transition-colors ${range === option.key ? "bg-primary text-primary-foreground shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-gray-200 bg-gray-200 text-center sm:grid-cols-4">
        {[
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
        ].map((item) => (
          <div key={item.label} className="bg-white px-2 py-1.5">
            <p className="text-[11px] text-gray-500">{item.label}</p>
            <p className={`text-sm font-semibold ${item.className}`}>{isLoading ? "…" : item.value}</p>
            {item.sub && !isLoading ? <p className="text-[10px] text-gray-400">{item.sub}</p> : null}
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="h-60 animate-pulse rounded-md bg-gray-100" />
      ) : isError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-6 text-center text-sm text-red-700">
          Could not load batches. Please refresh.
        </div>
      ) : points.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-gray-200 text-sm text-gray-500">
          No batches yet.
        </div>
      ) : (
        <>
          <div className="flex">
            {/* Fixed amount scale: stays visible while the bars scroll. */}
            <ChartContainer
              config={chartConfig}
              className="aspect-auto h-60 w-12 shrink-0 [&_.recharts-cartesian-axis-tick_text]:fill-gray-500"
            >
              <ComposedChart data={points} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
                <XAxis dataKey="label" height={X_AXIS_HEIGHT} tick={false} tickLine={false} axisLine={false} padding={{ left: 8, right: 8 }} />
                <YAxis domain={yScale.domain} ticks={yScale.ticks} tickLine={false} axisLine={false} width={44} fontSize={11} tickFormatter={shortAmount} />
              </ComposedChart>
            </ChartContainer>
            <div ref={scrollRef} className="min-w-0 flex-1 overflow-x-auto">
              <ChartContainer
                config={chartConfig}
                style={{ minWidth: points.length * (points.some((p) => p.label.includes("'")) ? PX_PER_BATCH_WITH_YEAR : PX_PER_BATCH) }}
                className={`aspect-auto h-60 w-full [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-gray-100 [&_.recharts-cartesian-axis-tick_text]:fill-gray-500 ${isFetching ? "opacity-60" : ""}`}
              >
                <ComposedChart data={points} margin={{ left: 0, right: 28, top: 8, bottom: 0 }} barGap={3} barCategoryGap="30%">
                  <CartesianGrid vertical={false} stroke="#eef0f3" />
                  <XAxis dataKey="label" height={X_AXIS_HEIGHT} tickLine={false} axisLine={false} tickMargin={8} interval={0} fontSize={10} padding={{ left: 8, right: 8 }} />
                  <YAxis hide domain={yScale.domain} ticks={yScale.ticks} />
                  <ChartTooltip
                    cursor={{ fill: "#f3f4f6" }}
                    content={({ active, payload }) =>
                      active && payload?.[0]?.payload ? <TooltipBody point={payload[0].payload as Point} /> : null
                    }
                  />
                  <Bar dataKey="income" fill="var(--color-income)" radius={[3, 3, 0, 0]} barSize={18}>
                    {points.map((p) => <Cell key={p.id} fillOpacity={p.active ? 0.45 : 1} />)}
                  </Bar>
                  <Bar dataKey="cost" fill="var(--color-cost)" radius={[3, 3, 0, 0]} barSize={18}>
                    {points.map((p) => <Cell key={p.id} fillOpacity={p.active ? 0.45 : 1} />)}
                  </Bar>
                  <Line
                    dataKey="profit"
                    type="monotone"
                    stroke="var(--color-profit)"
                    strokeWidth={1.5}
                    dot={{ r: 3, fill: "var(--color-profit)" }}
                    activeDot={{ r: 4 }}
                  />
                </ComposedChart>
              </ChartContainer>
            </div>
          </div>
          {/* Legend outside the scroll area so it never scrolls away. */}
          <div className="flex items-center justify-center gap-4 text-xs text-gray-600">
            {(Object.keys(chartConfig) as Array<keyof typeof chartConfig>).map((key) => (
              <span key={key} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: chartConfig[key].color }} />
                {chartConfig[key].label}
              </span>
            ))}
          </div>
          {range === "all" && data?.hasMore ? (
            <p className="text-xs text-gray-500">Showing the latest 60 batches.</p>
          ) : null}
        </>
      )}
    </div>
  );
}
