"use client";

import { useState } from "react";
import { CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/common/components/ui/chart";
import { ChartCard, SegmentedToggle } from "@/components/charts/chartKit";
import type { EggCostRow } from "@/fetchers/batches/batchQueries";
import { count, monthLabel, percentText, rupeesWhole, signedUnitMoney, unitLabel, unitMoney, weekLabel, EGGS_PER_TRAY, type EggUnit } from "./format";

const chartConfig = {
  running: { label: "Running cost", color: "#f59e0b" },
  price: { label: "Egg sale price", color: "#16a34a" },
  laying: { label: "Laying %", color: "#94a3b8" },
} satisfies ChartConfig;

type View = "month" | "week";
const PX_PER_POINT = 56;

/** Cost per egg against sale price over time, plus the same numbers as a table. */
export function EggCostTrend({ monthly, weekly, unit, closed }: { monthly: EggCostRow[]; weekly: EggCostRow[]; unit: EggUnit; closed: boolean }) {
  const [view, setView] = useState<View>("month");
  const rows = view === "month" ? monthly : weekly;
  const label = (row: EggCostRow) => (view === "month" ? monthLabel(row.start) : weekLabel(row.start));
  const scale = unit === "tray" ? EGGS_PER_TRAY : 1;
  const money = (v: number | null) => (v == null ? null : Math.round(v * scale * 100) / 100);
  const data = rows.map((row) => ({
    label: label(row),
    running: money(row.runningPerEgg),
    price: money(row.salePrice),
    laying: row.layingPercent,
  }));
  const minWidth = Math.max(0, data.length * PX_PER_POINT);
  const tag = (row: EggCostRow) => (row.partial ? "so far" : closed && row === rows[rows.length - 1] ? "final" : null);

  return (
    <ChartCard
      title="Cost per egg over time"
      subtitle={`Running cost vs sale price, ${unitLabel(unit)} · costs above the green line mean a loss on each egg`}
      controls={
        <SegmentedToggle
          options={[
            { key: "month", label: "Month" },
            { key: "week", label: "Week" },
          ]}
          value={view}
          onChange={setView}
        />
      }
    >
      {rows.length < 2 ? (
        <p className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 py-6 text-center text-sm text-gray-500">
          The line shows once there are 2 {view === "month" ? "months" : "weeks"} of eggs. The table below has the numbers.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <div style={{ minWidth }}>
            <ChartContainer config={chartConfig} className="h-[260px] w-full">
              <ComposedChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={16} fontSize={11} />
                <YAxis yAxisId="money" tickLine={false} axisLine={false} width={56} fontSize={11} tickFormatter={(v) => `रू ${Number(v).toLocaleString("en-IN")}`} />
                <YAxis yAxisId="pct" orientation="right" tickLine={false} axisLine={false} width={36} domain={[0, 100]} unit="%" fontSize={11} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => (
                        <div className="flex min-w-[170px] items-center justify-between gap-3">
                          <span className="text-gray-500">{chartConfig[name as keyof typeof chartConfig]?.label ?? String(name)}</span>
                          <span className="font-medium">
                            {name === "laying" ? percentText(Number(value)) : unitMoney(Number(value) / scale, unit)}
                          </span>
                        </div>
                      )}
                    />
                  }
                />
                <Line yAxisId="pct" dataKey="laying" stroke="var(--color-laying)" strokeWidth={1.5} strokeDasharray="4 3" dot={{ r: 2 }} connectNulls isAnimationActive={false} />
                <Line yAxisId="money" dataKey="running" stroke="var(--color-running)" strokeWidth={2.5} dot={{ r: 2.5 }} connectNulls isAnimationActive={false} />
                <Line yAxisId="money" dataKey="price" stroke="var(--color-price)" strokeWidth={2.5} dot={{ r: 2.5 }} connectNulls isAnimationActive={false} />
              </ComposedChart>
            </ChartContainer>
          </div>
        </div>
      )}
      <div className="flex flex-wrap justify-center gap-4 text-xs text-gray-600">
        {Object.entries(chartConfig).map(([key, c]) => (
          <span key={key} className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded" style={{ backgroundColor: c.color }} />
            {c.label}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-y bg-gray-50 text-left text-xs text-gray-500">
              <th className="sticky left-0 bg-gray-50 px-2 py-2 font-medium">{view === "month" ? "Month" : "Week"}</th>
              <th className="px-2 py-2 text-right font-medium">Eggs</th>
              <th className="px-2 py-2 text-right font-medium">Laying %</th>
              <th className="px-2 py-2 text-right font-medium">Running cost</th>
              <th className="px-2 py-2 text-right font-medium">Cost {unitLabel(unit)}</th>
              <th className="px-2 py-2 text-right font-medium">Feed / egg</th>
              <th className="px-2 py-2 text-right font-medium">Sale price</th>
              <th className="px-2 py-2 text-right font-medium">Margin</th>
              <th className="px-2 py-2 text-right font-medium" title="All costs incl. hens ÷ all eggs, up to the end of this period">
                Full cost so far
              </th>
            </tr>
          </thead>
          <tbody>
            {[...rows].reverse().map((row) => {
              const t = tag(row);
              const margin = row.marginPerEgg;
              return (
                <tr key={row.start} className="border-b last:border-0">
                  <td className="sticky left-0 whitespace-nowrap bg-white px-2 py-2 text-gray-800">
                    {label(row)}
                    {t ? <span className="ml-1.5 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">{t}</span> : null}
                  </td>
                  <td className="px-2 py-2 text-right">{count(row.eggs)}</td>
                  <td className="px-2 py-2 text-right">{percentText(row.layingPercent)}</td>
                  <td className="px-2 py-2 text-right">{rupeesWhole(row.runningCost)}</td>
                  <td className="px-2 py-2 text-right font-medium">{unitMoney(row.runningPerEgg, unit)}</td>
                  <td className="px-2 py-2 text-right">{row.feedGramsPerEgg == null ? "—" : `${row.feedGramsPerEgg} g`}</td>
                  <td className="px-2 py-2 text-right">{unitMoney(row.salePrice, unit)}</td>
                  <td className={`px-2 py-2 text-right font-medium ${margin == null ? "text-gray-400" : margin > 0 ? "text-green-600" : margin < 0 ? "text-red-600" : ""}`}>
                    {signedUnitMoney(margin, unit)}
                  </td>
                  <td className="px-2 py-2 text-right text-gray-600">{unitMoney(row.cumulativeFullPerEgg, unit)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}
