"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { CartesianGrid, ComposedChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/common/components/ui/chart";
import { convertADtoBS, toNepalDayAd } from "@/common/lib/nepali-date";

/**
 * Shared parts for the Home "per batch" charts (farmer profit, hatchery
 * profit, hatchery hatch result) so they look and behave the same.
 */

export const rupees = (value: number) => `रू ${Math.round(value).toLocaleString("en-IN")}`;

/** Short axis numbers in the Nepali way: 15K, 1.5L, 2Cr. */
export function shortAmount(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1e7) return `${+(value / 1e7).toFixed(1)}Cr`;
  if (abs >= 1e5) return `${+(value / 1e5).toFixed(1)}L`;
  if (abs >= 1e3) return `${+(value / 1e3).toFixed(1)}K`;
  return String(Math.round(value));
}

export const toneClass = (value: number) => (value < 0 ? "text-red-600" : value > 0 ? "text-green-700" : "");

export function bsDate(value?: string | null) {
  if (!value) return "";
  try {
    return convertADtoBS(toNepalDayAd(value));
  } catch {
    return "";
  }
}

export function shortName(name: string) {
  return name.length > 12 ? `${name.slice(0, 11)}…` : name;
}

const BS_MONTHS = ["Baisakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin", "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"];

/** Nepali start date parts, or null. */
export function bsStart(startDate: string) {
  try {
    const [year, month, day] = convertADtoBS(toNepalDayAd(startDate)).split("-").map(Number);
    return { year, month, day };
  } catch {
    return null;
  }
}

/** Short Nepali start date like "Ashadh 3", or "Ashadh 3 '82" when the batches cover more than one year. */
export function bsStartLabel(startDate: string, fallback: string, withYear: boolean) {
  const bs = bsStart(startDate);
  if (!bs) return fallback;
  return `${BS_MONTHS[bs.month - 1]} ${bs.day}${withYear ? ` '${String(bs.year).slice(-2)}` : ""}`;
}

/** "Kartik 4, 2083" style long date. */
export function bsLongDate(value?: string | null) {
  const bs = value ? bsStart(value) : null;
  return bs ? `${BS_MONTHS[bs.month - 1]} ${bs.day}, ${bs.year}` : "";
}

/** Round scale steps (1, 2, 2.5, 5 × 10ⁿ) from below the lowest to above the highest value, always through 0. */
export function niceScale(values: number[], targetSteps = 4) {
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

export type YScale = { domain: [number, number]; ticks: number[] };

export const CHART_RANGES = [
  { key: "8", label: "Last 8", limit: 8 },
  { key: "20", label: "Last 20", limit: 20 },
  { key: "all", label: "Last 60", limit: 60 },
] as const;
export type ChartRangeKey = (typeof CHART_RANGES)[number]["key"];
export const chartRangeLimit = (key: ChartRangeKey) => CHART_RANGES.find((r) => r.key === key)?.limit ?? 8;

/** Above this many bars the axis shows only the start date (full name stays in the tooltip). */
export const COMPACT_LABEL_AFTER = 12;
/** X-axis height, shared by the scrolling chart and the fixed scale so they line up. */
export const X_AXIS_HEIGHT = 30;

/** Card shell with a title, a one-line explanation, and controls on the right. */
export function ChartCard({
  title,
  subtitle,
  controls,
  children,
  className = "",
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  controls?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-3 rounded-lg border border-gray-200 bg-white p-3 sm:p-4 ${className}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold">{title}</p>
          {subtitle ? <p className="text-xs text-gray-500">{subtitle}</p> : null}
        </div>
        {controls ? <div className="flex flex-wrap items-center gap-2">{controls}</div> : null}
      </div>
      {children}
    </div>
  );
}

/** Small button group, e.g. "Last 8 / Last 20 / All". */
export function SegmentedToggle<K extends string>({
  options,
  value,
  onChange,
}: {
  options: ReadonlyArray<{ key: K; label: string }>;
  value: K;
  onChange: (key: K) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-gray-200 bg-gray-50 p-0.5">
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => onChange(option.key)}
          className={`whitespace-nowrap rounded px-2.5 py-0.5 text-xs font-medium transition-colors ${value === option.key ? "bg-primary text-primary-foreground shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export type SummaryItem = { label: string; value: ReactNode; sub?: ReactNode; className?: string };

/** Row of key numbers above a chart. */
export function SummaryStrip({ items, loading }: { items: SummaryItem[]; loading?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-gray-200 bg-gray-200 text-center sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="bg-white px-2 py-1.5">
          <p className="text-[11px] text-gray-500">{item.label}</p>
          <p className={`text-sm font-semibold ${item.className ?? ""}`}>{loading ? "…" : item.value}</p>
          {item.sub && !loading ? <p className="text-[10px] text-gray-400">{item.sub}</p> : null}
        </div>
      ))}
    </div>
  );
}

/** Loading / error / empty boxes. Returns null when the chart should show. */
export function ChartStates({
  loading,
  error,
  empty,
  errorText,
  emptyText,
}: {
  loading: boolean;
  error: boolean;
  empty: boolean;
  errorText: string;
  emptyText: ReactNode;
}) {
  if (loading) return <div className="h-60 animate-pulse rounded-md bg-gray-100" />;
  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 px-3 py-6 text-center text-sm text-red-700">{errorText}</div>
    );
  }
  if (empty) {
    return (
      <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-gray-200 px-3 text-center text-sm text-gray-500">
        {emptyText}
      </div>
    );
  }
  return null;
}

/** Colour key shown under a chart (outside the scroll area so it never scrolls away). */
export function ChartLegend({ config }: { config: ChartConfig }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-gray-600">
      {Object.entries(config).map(([key, item]) => (
        <span key={key} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: (item as { color?: string }).color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

/**
 * Bars that scroll sideways with a fixed scale on the left. Opens at the
 * newest point (right end). `series` are the recharts <Bar>/<Line> elements.
 */
export function ScrollingChart<T extends { label: string }>({
  data,
  config,
  yScale,
  tickFormatter,
  pxPerPoint,
  renderTooltip,
  series,
  scrollKey,
  faded,
  barGap = 12,
  barCategoryGap = "30%",
}: {
  data: T[];
  config: ChartConfig;
  yScale: YScale;
  tickFormatter: (value: number) => string;
  pxPerPoint: number;
  renderTooltip: (point: T) => ReactNode;
  series: ReactNode[];
  /** Changes when the shown set changes, so the view jumps back to the newest. */
  scrollKey: unknown;
  /** Grey the chart a little while new data loads. */
  faded?: boolean;
  barGap?: number;
  barCategoryGap?: string | number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [data.length, scrollKey]);

  return (
    <div className="flex">
      {/* Fixed scale: stays visible while the bars scroll. */}
      <ChartContainer
        config={config}
        className="aspect-auto h-60 w-12 shrink-0 [&_.recharts-cartesian-axis-tick_text]:fill-gray-500"
      >
        <ComposedChart data={data} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
          <XAxis dataKey="label" height={X_AXIS_HEIGHT} tick={false} tickLine={false} axisLine={false} padding={{ left: 8, right: 8 }} />
          <YAxis domain={yScale.domain} ticks={yScale.ticks} tickLine={false} axisLine={false} width={44} fontSize={11} tickFormatter={tickFormatter} />
        </ComposedChart>
      </ChartContainer>
      <div ref={scrollRef} className="min-w-0 flex-1 overflow-x-auto">
        <ChartContainer
          config={config}
          style={{ minWidth: data.length * pxPerPoint }}
          className={`aspect-auto h-60 w-full [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-gray-100 [&_.recharts-cartesian-axis-tick_text]:fill-gray-500 ${faded ? "opacity-60" : ""}`}
        >
          <ComposedChart data={data} margin={{ left: 0, right: 28, top: 8, bottom: 0 }} barGap={barGap} barCategoryGap={barCategoryGap}>
            <CartesianGrid vertical={false} stroke="#eef0f3" />
            <XAxis dataKey="label" height={X_AXIS_HEIGHT} tickLine={false} axisLine={false} tickMargin={8} interval={0} fontSize={10} padding={{ left: 8, right: 8 }} />
            <YAxis hide domain={yScale.domain} ticks={yScale.ticks} />
            <ChartTooltip
              cursor={{ fill: "#f3f4f6" }}
              content={({ active, payload }) =>
                active && payload?.[0]?.payload ? <>{renderTooltip(payload[0].payload as T)}</> : null
              }
            />
            {series}
          </ComposedChart>
        </ChartContainer>
      </div>
    </div>
  );
}
