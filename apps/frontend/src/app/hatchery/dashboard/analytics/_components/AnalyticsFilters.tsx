"use client";

import { Search } from "lucide-react";
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import { Card, CardContent } from "@/common/components/ui/card";
import { Input } from "@/common/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/common/components/ui/select";
import { QUICK_RANGES, type AnalyticsBatchTypeFilter, type AnalyticsRangePreset } from "./types";

export function AnalyticsFilters({
  rangePreset,
  onRangePresetChange,
  batchSearch,
  onBatchSearchChange,
  batchType,
  onBatchTypeChange,
  selectedRangeLabel,
}: {
  rangePreset: AnalyticsRangePreset;
  onRangePresetChange: (range: AnalyticsRangePreset) => void;
  batchSearch: string;
  onBatchSearchChange: (value: string) => void;
  batchType: AnalyticsBatchTypeFilter;
  onBatchTypeChange: (value: AnalyticsBatchTypeFilter) => void;
  selectedRangeLabel: string;
}) {
  return (
    <Card className="border-slate-200/80 shadow-sm">
      <CardContent className="space-y-4 p-4 md:p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {QUICK_RANGES.map((range) => (
              <Button
                key={range.value}
                type="button"
                variant={rangePreset === range.value ? "default" : "outline"}
                className="rounded-full px-4"
                onClick={() => onRangePresetChange(range.value)}
              >
                {range.label}
              </Button>
            ))}
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:w-[520px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={batchSearch}
                onChange={(e) => onBatchSearchChange(e.target.value)}
                placeholder="Search batch or incubation"
                className="h-10 rounded-xl pl-9"
              />
            </div>

            <Select value={batchType} onValueChange={(value) => onBatchTypeChange(value as AnalyticsBatchTypeFilter)}>
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue placeholder="Batch type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All batches</SelectItem>
                <SelectItem value="PARENT_FLOCK">Parent flock</SelectItem>
                <SelectItem value="INCUBATION">Incubation</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
          <Badge variant="secondary" className="rounded-full bg-slate-100 text-slate-700 hover:bg-slate-100">
            {selectedRangeLabel}
          </Badge>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
            Search: {batchSearch.trim() || "All"}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
            Batch type: {batchType === "all" ? "All" : batchType.replace("_", " ")}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
