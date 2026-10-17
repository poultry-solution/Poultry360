"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/common/components/ui/card";
import { formatBSLong, formatBSMonthYear } from "@/common/lib/nepali-date";
import { rupees } from "@/components/dashboard/StatsCards";
import type { FarmerAnalyticsGroupBy, FcrStatus } from "@/fetchers/analytics/farmerAnalyticsQueries";

/** "Ashwin 15, 2083" for an AD Nepal day "YYYY-MM-DD". */
export const bsDay = (dayKey: string) => {
  try {
    return formatBSLong(dayKey);
  } catch {
    return dayKey;
  }
};

/** "Ashwin 15" (no year), for chart axes. */
export const bsDayShort = (dayKey: string) => bsDay(dayKey).replace(/, \d+$/, "");

/** Label of a period that starts on `start`. */
export function periodLabel(start: string, groupBy: FarmerAnalyticsGroupBy, t: (k: string, p?: any) => string, short = false) {
  if (groupBy === "monthly") return formatBSMonthYear(start);
  if (groupBy === "weekly") return t("farmer.analytics.weekOf", { date: bsDayShort(start) });
  return short ? bsDayShort(start) : bsDay(start);
}

/** Loss shows as "−रू 69,206" (red is added by the caller). */
export const signedRupees = (value: number) => {
  const rounded = Math.round(value);
  if (rounded === 0) return rupees(0);
  return `${rounded < 0 ? "−" : ""}${rupees(Math.abs(rounded))}`;
};

export const moneyClass = (value: number) =>
  Math.round(value) > 0 ? "text-green-600" : Math.round(value) < 0 ? "text-red-600" : "";

/** Short money for chart axes: 5L, 50K. */
export const axisMoney = (value: number) => {
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (abs >= 100000) return `${sign}${Number((abs / 100000).toFixed(1))}L`;
  if (abs >= 1000) return `${sign}${Number((abs / 1000).toFixed(0))}K`;
  return `${sign}${abs}`;
};

export const count = (value: number | null | undefined, digits = 0) =>
  value == null ? "—" : Number(value).toLocaleString("en-IN", { maximumFractionDigits: digits });

export const kg = (value: number | null | undefined, digits = 1) => (value == null ? "—" : `${count(value, digits)} kg`);

export const percent = (value: number | null | undefined, digits = 1) =>
  value == null ? "—" : `${Number(value).toFixed(digits)}%`;

/** FCR value with a short note when it is not up to date. */
export function FcrText({ value, status, t }: { value: number | null; status: FcrStatus | null; t: (k: string) => string }) {
  if (value == null) {
    return <span className="text-muted-foreground">{status === "WEIGHT_REQUIRED" ? t("farmer.analytics.fcrNeedsWeight") : "—"}</span>;
  }
  return (
    <span>
      {value.toFixed(2)}
      {status === "STALE" && <span className="ml-1 text-xs text-amber-600">({t("farmer.analytics.oldWeight")})</span>}
    </span>
  );
}

export function Section({
  title,
  icon: Icon,
  right,
  children,
  className = "",
}: {
  title: string;
  icon?: LucideIcon;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={`gap-3 py-0 ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 px-3 pt-3 pb-0 md:px-5 md:pt-4">
        <CardTitle className="flex items-center gap-2 text-base">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
          {title}
        </CardTitle>
        {right}
      </CardHeader>
      <CardContent className="px-3 pb-3 md:px-5 md:pb-4">{children}</CardContent>
    </Card>
  );
}

export const EmptyLine = ({ text }: { text: string }) => (
  <p className="py-6 text-center text-sm text-muted-foreground">{text}</p>
);

export const TabLoading = () => (
  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="h-[74px] animate-pulse rounded-lg border bg-gray-50" />
    ))}
  </div>
);

/** Horizontal share bars (like the Profit & Loss "Costs by type" card). */
export function ShareBars({
  rows,
  colorFor,
  format,
}: {
  rows: Array<{ label: string; value: number }>;
  colorFor?: (label: string) => string;
  format: (value: number) => string;
}) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  return (
    <div className="space-y-3 text-sm">
      {rows.map((row) => {
        const share = total > 0 ? (row.value / total) * 100 : 0;
        return (
          <div key={row.label}>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-medium">
                {format(row.value)}
                <span className="ml-1.5 text-xs font-normal text-gray-400">{share.toFixed(0)}%</span>
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={`h-full rounded-full ${colorFor?.(row.label) ?? "bg-gray-400"}`}
                style={{ width: `${Math.min(100, Math.max(0, share))}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
