"use client";

import { Button } from "@/common/components/ui/button";
import { QUICK_RANGES, type AnalyticsRangePreset } from "./types";

export function AnalyticsFilters({
  rangePreset,
  onRangePresetChange,
}: {
  rangePreset: AnalyticsRangePreset;
  onRangePresetChange: (range: AnalyticsRangePreset) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm">
      {QUICK_RANGES.map((range) => (
        <Button
          key={range.value}
          type="button"
          size="sm"
          variant={rangePreset === range.value ? "default" : "outline"}
          className="rounded-full px-3"
          onClick={() => onRangePresetChange(range.value)}
        >
          {range.label}
        </Button>
      ))}
    </div>
  );
}
