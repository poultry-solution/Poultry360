"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/common/components/ui/chart";
import { BS_MONTH_NAMES, convertADtoBS, getNepalTodayAd } from "@/common/lib/nepali-date";
import { useGetDealerSalesTrend, type SalesTrendDay } from "@/fetchers/dealer/dealerSaleQueries";
import { CustomRangePickers, RangeModeSwitch, useNepaliDateRange, type DateRange } from "@/components/dealer/NepaliRangeFilter";

const chartConfig = {
  sales: { label: "Sales", color: "#16a34a" },
  collected: { label: "Collected", color: "#2563eb" },
} satisfies ChartConfig;

/** Custom ranges up to this many days show one pair of bars per day. */
const DAILY_LIMIT_DAYS = 62;

type ChartPoint = { key: string; label: string; tooltip: string; sales: number; collected: number };

const money = (value: number) =>
  new Intl.NumberFormat("en-NP", { style: "currency", currency: "NPR", maximumFractionDigits: 0 }).format(value);

/** Short axis numbers in the Nepali way: 15K, 1.5L, 2Cr. */
function shortAmount(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1e7) return `${+(value / 1e7).toFixed(1)}Cr`;
  if (abs >= 1e5) return `${+(value / 1e5).toFixed(1)}L`;
  if (abs >= 1e3) return `${+(value / 1e3).toFixed(1)}K`;
  return String(Math.round(value));
}

function toBs(adDay: string) {
  try {
    return convertADtoBS(adDay);
  } catch {
    return adDay;
  }
}

function addAdDays(adDay: string, days: number) {
  const [y, m, d] = adDay.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function daysBetween(startAd: string, endAd: string) {
  return Math.round((Date.parse(`${endAd}T00:00:00Z`) - Date.parse(`${startAd}T00:00:00Z`)) / 86400000) + 1;
}

/** One point per Nepal day, with empty days filled in. */
function buildDailyPoints(rows: SalesTrendDay[], range: DateRange): ChartPoint[] {
  const byDay = new Map(rows.map((row) => [row.day, row]));
  const points: ChartPoint[] = [];
  for (let day = range.startDate; day <= range.endDate; day = addAdDays(day, 1)) {
    const bs = toBs(day);
    const row = byDay.get(day);
    points.push({ key: day, label: bs.slice(5), tooltip: bs, sales: row?.sales ?? 0, collected: row?.collected ?? 0 });
  }
  return points;
}

/** One point per Nepali month, from the first to the last month, empty months filled in. */
function buildMonthlyPoints(rows: SalesTrendDay[], fromAd: string | null, toAd: string): ChartPoint[] {
  const totals = new Map<string, { sales: number; collected: number }>();
  for (const row of rows) {
    const monthKey = toBs(row.day).slice(0, 7);
    const current = totals.get(monthKey) ?? { sales: 0, collected: 0 };
    current.sales += row.sales;
    current.collected += row.collected;
    totals.set(monthKey, current);
  }
  const firstKey = fromAd ? toBs(fromAd).slice(0, 7) : [...totals.keys()].sort()[0];
  const lastKey = toBs(toAd).slice(0, 7);
  if (!firstKey) return [];

  let [year, month] = firstKey.split("-").map(Number);
  const [lastYear, lastMonth] = lastKey.split("-").map(Number);
  const spansYears = year !== lastYear;
  const points: ChartPoint[] = [];
  while (year < lastYear || (year === lastYear && month <= lastMonth)) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const name = BS_MONTH_NAMES[month - 1] ?? key;
    const total = totals.get(key) ?? { sales: 0, collected: 0 };
    points.push({
      key,
      label: spansYears ? `${name.slice(0, 3)} ${String(year).slice(2)}` : name.slice(0, 3),
      tooltip: `${name} ${year}`,
      sales: Math.round(total.sales * 100) / 100,
      collected: Math.round(total.collected * 100) / 100,
    });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return points;
}

/** Home card: sales vs money collected, all time by month or a custom Nepali range. */
export function SalesVsCollectedChart() {
  const dateRange = useNepaliDateRange();
  const { appliedRange } = dateRange;
  const { data: rows = [], isLoading, isFetching } = useGetDealerSalesTrend(appliedRange);

  const isDaily = !!appliedRange && daysBetween(appliedRange.startDate, appliedRange.endDate) <= DAILY_LIMIT_DAYS;

  const points = useMemo(() => {
    if (appliedRange && isDaily) return buildDailyPoints(rows, appliedRange);
    return buildMonthlyPoints(rows, appliedRange?.startDate ?? null, appliedRange?.endDate ?? getNepalTodayAd());
  }, [rows, appliedRange, isDaily]);

  const totalSales = rows.reduce((sum, row) => sum + row.sales, 0);
  const totalCollected = rows.reduce((sum, row) => sum + row.collected, 0);
  const notCollected = totalSales - totalCollected;
  const hasData = rows.some((row) => row.sales > 0 || row.collected > 0);

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold">Sales vs collected</p>
          <p className="text-xs text-gray-500">
            {dateRange.rangeLabel} · {isDaily ? "by day" : "by Nepali month"}
          </p>
        </div>
        <RangeModeSwitch state={dateRange} size="sm" />
      </div>

      {dateRange.isCustomRange ? <CustomRangePickers state={dateRange} /> : null}

      <div className="grid grid-cols-3 gap-px overflow-hidden rounded-md border border-gray-200 bg-gray-200 text-center">
        {[
          { label: "Sales", value: money(totalSales), className: "text-green-700" },
          { label: "Collected", value: money(totalCollected), className: "text-blue-700" },
          // More can come in than was sold in the range (old dues, opening balances).
          notCollected >= 0
            ? { label: "Not collected", value: money(notCollected), className: notCollected > 0 ? "text-red-600" : "text-gray-900" }
            : { label: "Old dues collected", value: money(Math.abs(notCollected)), className: "text-green-700" },
        ].map((item) => (
          <div key={item.label} className="bg-white px-2 py-1.5">
            <p className="text-[11px] text-gray-500">{item.label}</p>
            <p className={`text-sm font-semibold ${item.className}`}>{isLoading ? "…" : item.value}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="h-56 animate-pulse rounded-md bg-gray-100 sm:h-64" />
      ) : !hasData ? (
        <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-gray-200 text-sm text-gray-500">
          No sales in these dates.
        </div>
      ) : (
        <ChartContainer
          config={chartConfig}
          // Light hover band and grey axis text; the theme's "muted" colour is broken (see globals.css note).
          className={`aspect-auto h-56 w-full sm:h-64 [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-gray-100 [&_.recharts-cartesian-axis-tick_text]:fill-gray-500 ${isFetching ? "opacity-60" : ""}`}
        >
          <BarChart data={points} margin={{ left: 0, right: 4, top: 8 }} barGap={2}>
            <CartesianGrid vertical={false} stroke="#eef0f3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={12} fontSize={11} />
            <YAxis tickLine={false} axisLine={false} width={44} fontSize={11} tickFormatter={shortAmount} />
            <ChartTooltip
              cursor={{ fill: "#f3f4f6" }}
              content={
                <ChartTooltipContent
                  className="bg-white"
                  labelFormatter={(_label, payload) => payload?.[0]?.payload?.tooltip ?? _label}
                  formatter={(value, name) => (
                    <div className="flex w-full justify-between gap-4">
                      <span className="text-gray-500">{chartConfig[name as keyof typeof chartConfig]?.label ?? name}</span>
                      <span className="font-semibold">{money(Number(value))}</span>
                    </div>
                  )}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="sales" fill="var(--color-sales)" radius={[3, 3, 0, 0]} maxBarSize={28} />
            <Bar dataKey="collected" fill="var(--color-collected)" radius={[3, 3, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ChartContainer>
      )}
    </div>
  );
}
