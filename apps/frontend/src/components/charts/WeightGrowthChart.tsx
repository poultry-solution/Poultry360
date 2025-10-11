"use client";

import React from "react";
import { TrendingUp } from "lucide-react";
import { CartesianGrid, LabelList, Line, LineChart, XAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useCalendar } from "@/hooks/useCalendar";

type Point = { date: string; weight: number; source?: string };

interface WeightGrowthChartProps {
  data: Point[];
  className?: string;
  title?: string;
  description?: string;
}

const chartConfig = {
  weight: {
    label: "Weight",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export const WeightGrowthChart: React.FC<WeightGrowthChartProps> = ({
  data,
  className,
  title = "Weight Growth Chart",
  description,
}) => {
  const { toDisplayDate } = useCalendar();
  
  // Transform data for recharts
  const chartData = React.useMemo(() => {
    return (data || [])
      .map((d) => ({
        date: toDisplayDate(d.date, 'short'),
        weight: Number(d.weight || 0),
        fullDate: d.date,
        source: d.source,
      }))
      .sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());
  }, [data, toDisplayDate]);

  // Calculate date range for description
  const dateRange = React.useMemo(() => {
    if (chartData.length === 0) return "";
    const firstDate = new Date(chartData[0].fullDate);
    const lastDate = new Date(chartData[chartData.length - 1].fullDate);
    return `${toDisplayDate(firstDate, 'long')} - ${toDisplayDate(lastDate, 'long')}`;
  }, [chartData, toDisplayDate]);

  if (chartData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full text-sm text-muted-foreground py-8 text-center">
            No weight data recorded yet
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate growth rate
  const firstWeight = chartData[0].weight;
  const lastWeight = chartData[chartData.length - 1].weight;
  const growthRate = firstWeight > 0 ? (((lastWeight - firstWeight) / firstWeight) * 100) : 0;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description || dateRange}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{
              top: 20,
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 6)}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <Line
              dataKey="weight"
              type="natural"
              stroke="var(--color-weight)"
              strokeWidth={2}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                const sourceColor =
                  payload.source === "SALE"
                    ? "#059669"
                    : payload.source === "MANUAL"
                      ? "#3b82f6"
                      : "var(--color-weight)";
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={sourceColor}
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                );
              }}
              activeDot={{
                r: 6,
              }}
            >
              <LabelList
                position="top"
                offset={12}
                className="fill-foreground"
                fontSize={12}
              />
            </Line>
          </LineChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium">
          {growthRate > 0 ? (
            <>
              Trending up by {Math.abs(growthRate).toFixed(1)}% <TrendingUp className="h-4 w-4" />
            </>
          ) : growthRate < 0 ? (
            <>
              Trending down by {Math.abs(growthRate).toFixed(1)}%
            </>
          ) : (
            <>
              Weight stable
            </>
          )}
        </div>
        <div className="text-muted-foreground leading-none">
          From {firstWeight.toFixed(2)} kg to {lastWeight.toFixed(2)} kg • {chartData.length} measurements
        </div>
      </CardFooter>
    </Card>
  );
};

export default WeightGrowthChart;