"use client";

import { cn } from "@/common/lib/utils";

/** Small tile, same look as the tiles on the other hatchery pages. */
export function MetricCard({
  title,
  value,
  subtitle,
  tone = "text-gray-900",
  badge,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  tone?: string;
  badge?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5">
      <p className="truncate text-xs font-medium text-gray-600">{title}</p>
      <p className={cn("mt-0.5 text-lg font-bold md:text-xl", tone)}>{value}</p>
      {subtitle ? <p className="truncate text-[11px] text-gray-500">{subtitle}</p> : null}
      {badge ? <p className="truncate text-[11px] font-medium text-gray-700">{badge}</p> : null}
    </div>
  );
}
