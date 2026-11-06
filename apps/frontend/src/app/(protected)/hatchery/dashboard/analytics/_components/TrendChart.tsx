"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/common/components/ui/chart";

/**
 * Bars for months (each bar is a real total), lines for days. The legend
 * labels and tooltip names come from `config`.
 */
export function TrendChart({
  data,
  config,
  byMonth,
  formatValue,
  formatAxis = formatValue,
}: {
  data: Array<Record<string, string | number>>;
  config: ChartConfig;
  byMonth: boolean;
  formatValue: (value: number) => string;
  formatAxis?: (value: number) => string;
}) {
  const keys = Object.keys(config);
  const tooltip = (
    <ChartTooltip
      cursor={byMonth ? { fill: "rgba(0,0,0,0.04)" } : false}
      content={
        <ChartTooltipContent
          formatter={(value, name) => (
            <div className="flex min-w-[150px] items-center justify-between gap-3">
              <span className="text-slate-500">{String(config[String(name)]?.label ?? name)}</span>
              <span className="font-medium">{formatValue(Number(value))}</span>
            </div>
          )}
        />
      }
    />
  );
  // Recharts only sees direct children, so these are a keyed list, not a fragment.
  const axes = [
    <CartesianGrid key="grid" vertical={false} />,
    <XAxis key="x" dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={12} />,
    <YAxis key="y" tickLine={false} axisLine={false} tickMargin={8} width={64} tickFormatter={(value) => formatAxis(Number(value))} />,
  ];

  return (
    <div className="space-y-2">
      <ChartContainer config={config} className="h-[300px] w-full">
        {byMonth ? (
          <BarChart data={data} margin={{ left: 4, right: 4 }}>
            {axes}
            {tooltip}
            {keys.map((key) => (
              <Bar key={key} dataKey={key} fill={`var(--color-${key})`} radius={[3, 3, 0, 0]} maxBarSize={28} />
            ))}
          </BarChart>
        ) : (
          <AreaChart data={data} margin={{ left: 4, right: 4 }}>
            {axes}
            {tooltip}
            {keys.map((key, i) => (
              <Area
                key={key}
                dataKey={key}
                type="linear"
                fill={`var(--color-${key})`}
                fillOpacity={i === 0 ? 0.15 : 0.08}
                stroke={`var(--color-${key})`}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        )}
      </ChartContainer>
      {keys.length > 1 ? (
        <div className="flex flex-wrap justify-center gap-4 text-xs text-gray-600">
          {keys.map((key) => (
            <span key={key} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: config[key]?.color }} />
              {config[key]?.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
