"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/common/components/ui/button";
import { SegmentedToggle } from "@/components/charts/chartKit";
import { useGetBatchEggCost } from "@/fetchers/batches/batchQueries";
import {
  BreakdownCard,
  EggCostTiles,
  FlockCard,
  HowWeCount,
  NoEggsCard,
  PaybackCard,
  PricesCard,
} from "../eggCost/EggCostParts";
import { EggCostTrend } from "../eggCost/EggCostTrend";
import { monthName, type EggUnit } from "../eggCost/format";

type PeriodKey = "current" | "previous" | "whole";

interface EggCostTabProps {
  batchId: string;
  onGoToEggs?: () => void;
}

/** Cost per egg for a layer batch: running cost, full cost, prices, payback and trend. */
export function EggCostTab({ batchId, onGoToEggs }: EggCostTabProps) {
  const { data, isLoading, isError, refetch } = useGetBatchEggCost(batchId);
  const [unit, setUnit] = useState<EggUnit>("egg");
  const [period, setPeriod] = useState<PeriodKey | null>(null);

  const ok = data && data.status === "OK" ? data : null;

  // Period options: active batch = this month / last month / whole; closed = whole / last month of the batch.
  const options = useMemo(() => {
    if (!ok) return [] as Array<{ key: PeriodKey; label: string }>;
    const list: Array<{ key: PeriodKey; label: string }> = [];
    const { current, previous } = ok.periods;
    if (ok.closed) {
      list.push({ key: "whole", label: "Whole batch" });
      if (current) list.push({ key: "current", label: `${monthName(current.monthStart!)} (final month)` });
      return list;
    }
    if (current) list.push({ key: "current", label: `This month (${monthName(current.monthStart!)}, so far)` });
    if (previous) list.push({ key: "previous", label: `Last month (${monthName(previous.monthStart!)})` });
    list.push({ key: "whole", label: "Whole batch" });
    return list;
  }, [ok]);

  // Start on this month; if it has no eggs yet, on last month; closed batches start on the whole batch.
  const defaultPeriod: PeriodKey | null = useMemo(() => {
    if (!ok) return null;
    if (ok.closed) return "whole";
    if (ok.periods.current && ok.periods.current.eggs > 0) return "current";
    if (ok.periods.previous) return "previous";
    return "whole";
  }, [ok]);
  useEffect(() => {
    if (period && !options.some((o) => o.key === period)) setPeriod(null);
  }, [options, period]);
  const active = period ?? defaultPeriod;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-[74px] animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
        <div className="h-60 animate-pulse rounded-lg bg-gray-100" />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="rounded-lg border border-dashed border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-700">Could not load egg cost.</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }
  if (data.status === "NO_EGGS" || !ok || !active) return <NoEggsCard view={data} onGoToEggs={onGoToEggs} />;

  const chosen = ok.periods[active] ?? ok.periods.whole;
  const isWhole = active === "whole";
  const currentHasNoEggs = !ok.closed && ok.periods.current && ok.periods.current.eggs === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentedToggle options={options} value={active} onChange={setPeriod} />
        <SegmentedToggle
          options={[
            { key: "egg", label: "Per egg" },
            { key: "tray", label: "Per tray (30)" },
          ]}
          value={unit}
          onChange={setUnit}
        />
      </div>
      {currentHasNoEggs && active !== "current" ? (
        <p className="text-xs text-gray-500">No eggs entered this month yet, so this starts on {isWhole ? "the whole batch" : "last month"}.</p>
      ) : null}

      <EggCostTiles view={ok} period={chosen} unit={unit} />
      <PaybackCard view={ok} />

      <div className="grid gap-4 md:grid-cols-2">
        <BreakdownCard period={chosen} unit={unit} whole={isWhole} />
        <FlockCard view={ok} period={chosen} />
      </div>

      <PricesCard view={ok} unit={unit} />
      <EggCostTrend monthly={ok.monthly} weekly={ok.weekly} unit={unit} closed={ok.closed} />
      <HowWeCount />
    </div>
  );
}
