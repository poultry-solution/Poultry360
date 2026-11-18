"use client";

import { ChevronRight } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import type { BatchEggCost } from "@/fetchers/batches/batchQueries";
import { PaybackCard } from "./EggCostParts";
import { monthName, percentText, pickDefaultPeriod, rupeesWhole, unitMoney } from "./format";

/** Running layer batch: one money row "Cost per tray · hen cost paid back", opening the Egg cost tab. */
export function LayerMoneyRow({
  eggCost,
  loading,
  onOpen,
}: {
  eggCost: BatchEggCost | undefined;
  loading?: boolean;
  onOpen?: () => void;
}) {
  let label = "Cost per tray";
  let note: string | null = null;
  let value = "Open Egg cost";
  if (loading) {
    value = "…";
  } else if (eggCost?.status === "NO_EGGS") {
    label = "Laying not started";
    value = "Egg cost";
  } else if (eggCost?.status === "OK") {
    const key = pickDefaultPeriod(eggCost);
    const period = eggCost.periods[key] ?? eggCost.periods.whole;
    note = key === "whole" ? "whole batch" : monthName(period.monthStart ?? period.from);
    value = `${unitMoney(period.runningPerEgg, "tray")} · hen cost ${
      eggCost.payback.paidBack ? "paid back" : `${percentText(eggCost.payback.percent)} paid back`
    }`;
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      className="-mx-2 flex w-[calc(100%+1rem)] flex-wrap items-center justify-between gap-x-4 gap-y-0.5 rounded-md px-2 py-1 text-left hover:bg-gray-50"
    >
      <span className="text-muted-foreground">
        {label}
        {note ? <span className="ml-1.5 text-xs text-gray-400">{note}</span> : null}
      </span>
      <span className="inline-flex items-center gap-1 font-medium text-gray-900">
        {value}
        <ChevronRight className="h-4 w-4 text-gray-400" />
      </span>
    </button>
  );
}

/** Running layer batch on Profit & Loss: hen cost payback instead of "loss per bird". */
export function LayerPaybackBlock({ eggCost, onOpen }: { eggCost: BatchEggCost | undefined; onOpen?: () => void }) {
  const button = onOpen ? (
    <Button variant="outline" size="sm" onClick={onOpen}>
      Open Egg cost
      <ChevronRight className="ml-1 h-4 w-4" />
    </Button>
  ) : null;
  if (eggCost?.status === "OK") {
    return (
      <div className="space-y-2">
        <PaybackCard view={eggCost} />
        {button}
      </div>
    );
  }
  return (
    <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
      <p className="font-semibold text-gray-900">Hen cost payback</p>
      <p className="text-sm text-gray-600">
        {eggCost?.status === "NO_EGGS"
          ? `Laying not started. Costs so far ${rupeesWhole(eggCost.rearing.totalCost)}, hens included. Payback starts after the first eggs.`
          : "Open Egg cost to see how much of the hen cost is paid back."}
      </p>
      {button}
    </div>
  );
}
