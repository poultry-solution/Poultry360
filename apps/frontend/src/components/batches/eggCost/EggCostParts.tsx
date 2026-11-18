"use client";

import type { ReactNode } from "react";
import { Bird, Egg, HandCoins, Percent, Scale, Tag, TrendingUp, Wheat } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { StatTile } from "@/components/dashboard/StatsCards";
import type { BatchEggCost, EggCostPeriod } from "@/fetchers/batches/batchQueries";
import {
  count,
  monthLabel,
  percentText,
  rupeesWhole,
  signedUnitMoney,
  unitLabel,
  unitMoney,
  EGGS_PER_TRAY,
  type EggUnit,
} from "./format";

type OkView = Extract<BatchEggCost, { status: "OK" }>;

const GROUP_COLORS: Record<string, string> = {
  Feed: "bg-amber-500",
  Chicks: "bg-green-600",
  Medicine: "bg-purple-500",
  Labour: "bg-blue-500",
  Electricity: "bg-yellow-400",
  Equipment: "bg-slate-500",
  Other: "bg-gray-400",
};

/** Small card shell used by every block in the tab. */
export function Block({ title, sub, right, children }: { title: string; sub?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900">{title}</p>
          {sub ? <p className="text-xs text-gray-500">{sub}</p> : null}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

const grey = "text-gray-400";

/** The 8 main numbers for the chosen period. */
export function EggCostTiles({ view, period, unit }: { view: OkView; period: EggCostPeriod; unit: EggUnit }) {
  const per = unitLabel(unit);
  const full = view.closed ? view.full.finalPerEgg : view.full.fullPerEgg;
  const marginClass =
    period.marginPerEgg == null ? grey : period.marginPerEgg > 0 ? "text-green-600" : period.marginPerEgg < 0 ? "text-red-600" : "";
  const feedGrams = period.feedGramsPerEgg;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          tile={{
            label: `Running cost ${per}`,
            icon: HandCoins,
            value: unitMoney(period.runningPerEgg, unit),
            valueClass: period.runningPerEgg == null ? grey : "",
            sub: period.runningCost === 0 ? "No running costs entered" : "Feed, medicine, labour… no hen cost",
          }}
        />
        <StatTile
          tile={{
            label: view.closed ? `Final cost ${per}` : `Full cost ${per} so far`,
            icon: Scale,
            value: unitMoney(full, unit),
            sub: view.closed ? "All costs − hen sales · whole batch" : "All costs incl. hens · whole batch",
          }}
        />
        <StatTile
          tile={{
            label: `Egg sale price ${per}`,
            icon: Tag,
            value: unitMoney(period.salePrice, unit),
            valueClass: period.salePrice == null ? grey : "",
            sub: period.eggsSold > 0 ? `${count(period.eggsSold)} eggs sold` : "No egg sales in these days",
          }}
        />
        <StatTile
          tile={{
            label: `Margin ${per}`,
            icon: TrendingUp,
            value: signedUnitMoney(period.marginPerEgg, unit),
            valueClass: marginClass,
            sub:
              period.marginPerEgg == null
                ? "Needs egg sales"
                : period.marginUsesBatchPrice
                  ? "Using batch average price"
                  : "Sale price − running cost",
          }}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          tile={{
            label: `Feed cost ${per}`,
            icon: Wheat,
            value: unitMoney(period.feedPerEgg, unit),
            valueClass: period.feedPerEgg == null ? grey : "",
            sub: period.feedSharePercent != null ? `${period.feedSharePercent.toFixed(0)}% of running cost` : "No feed cost entered",
          }}
        />
        <StatTile
          tile={{
            label: `Feed ${per}`,
            icon: Egg,
            value:
              feedGrams == null
                ? "—"
                : unit === "tray"
                  ? `${((feedGrams * EGGS_PER_TRAY) / 1000).toFixed(1)} kg`
                  : `${feedGrams} g`,
            valueClass: feedGrams == null ? grey : "",
            sub: feedGrams == null ? "Feed kg not recorded" : `${count(period.feedKg)} kg feed used`,
          }}
        />
        <StatTile
          tile={{
            label: "Laying %",
            icon: Percent,
            value: percentText(period.layingPercent),
            valueClass: period.layingPercent == null ? grey : "",
            sub: "Eggs ÷ hens each day",
          }}
        />
        <StatTile
          tile={{
            label: "Break-even per tray",
            icon: Bird,
            value: period.breakEvenPerTray == null ? "—" : rupeesWhole(period.breakEvenPerTray),
            valueClass: period.breakEvenPerTray == null ? grey : "",
            sub: `Hens paid back too: ${rupeesWhole(view.full.fullBreakEvenPerTray)}`,
          }}
        />
      </div>
    </div>
  );
}

const EXPECTED_TEXT: Record<OkView["payback"]["expected"]["reason"], string> = {
  ok: "",
  closed: "Batch is closed.",
  noFlockCost: "No hen or rearing cost entered.",
  paid: "",
  notEnoughMonths: "Needs 2 full months of eggs to guess.",
  notPaying: "Not paying back yet at the current margin.",
  tooLong: "More than 3 years at the current margin.",
};

/** How much of the flock cost (hens + rearing) the eggs have paid back. */
export function PaybackCard({ view }: { view: OkView }) {
  const p = view.payback;
  const pct = Math.min(100, Math.max(0, p.percent ?? 0));
  return (
    <Block title="Hen cost payback" sub="Money left after running costs, paying back the hens">
      <div className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm text-gray-600">
            Flock cost <span className="font-semibold text-gray-900">{rupeesWhole(p.flockCost)}</span>
            <span className="text-xs text-gray-500">
              {" "}
              (hens {rupeesWhole(p.chicks)}
              {p.rearing > 0 ? ` · before laying ${rupeesWhole(p.rearing)}` : ""})
            </span>
          </p>
          <p className={`text-lg font-bold ${p.paidBack ? "text-green-600" : "text-gray-900"}`}>
            {p.paidBack ? "Paid back ✓" : `${percentText(p.percent)} paid back`}
          </p>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
          <div className={`h-full rounded-full ${p.paidBack ? "bg-green-600" : "bg-amber-500"}`} style={{ width: `${pct}%` }} />
        </div>
        <div className="flex flex-wrap justify-between gap-2 text-xs text-gray-600">
          <span>
            {p.recovered >= 0 ? (
              <>Paid back so far {rupeesWhole(p.recovered)}</>
            ) : (
              <span className="text-red-600">Running costs are {rupeesWhole(-p.recovered)} more than sales so far</span>
            )}
          </span>
          <span>
            {p.paidBack
              ? `Extra profit ${rupeesWhole(p.extraProfit)}`
              : p.expected.reason === "ok" && p.expected.monthStart
                ? `Expected: about ${monthLabel(p.expected.monthStart)}`
                : EXPECTED_TEXT[p.expected.reason]}
          </span>
        </div>
      </div>
    </Block>
  );
}

/** Where the money goes, per egg (or tray), for the chosen period. */
export function BreakdownCard({ period, unit, whole }: { period: EggCostPeriod; unit: EggUnit; whole: boolean }) {
  return (
    <Block
      title="Where the money goes"
      sub={whole ? `All costs ${unitLabel(unit)}, hens included` : `Running costs ${unitLabel(unit)}`}
    >
      {period.breakdown.length === 0 ? (
        <p className="text-sm text-gray-500">No costs entered in these days.</p>
      ) : (
        <div className="space-y-2.5">
          {period.breakdown.map((row) => (
            <div key={row.group} className="space-y-1">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-gray-700">
                  {row.group}
                  {row.names && row.names.length > 0 ? (
                    <span className="text-xs text-gray-400"> · {row.names.map((n) => n.name).join(", ")}</span>
                  ) : null}
                </span>
                <span className="whitespace-nowrap font-medium text-gray-900">
                  {unitMoney(row.perEgg, unit)}
                  <span className="ml-1.5 text-xs font-normal text-gray-500">{percentText(row.percent)}</span>
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div className={`h-full ${GROUP_COLORS[row.group] ?? "bg-gray-400"}`} style={{ width: `${Math.max(2, row.percent ?? 0)}%` }} />
              </div>
            </div>
          ))}
          <p className="pt-1 text-xs text-gray-500">Total {rupeesWhole(period.breakdown.reduce((s, r) => s + r.cost, 0))}</p>
        </div>
      )}
    </Block>
  );
}

/** Average sale price per egg type and what the eggs in stock are worth. */
export function PricesCard({ view, unit }: { view: OkView; unit: EggUnit }) {
  const rows = view.prices.byType;
  return (
    <Block title="Egg prices" sub="Whole batch, after bill discounts">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-gray-500">
              <th className="py-1.5 pr-2 font-medium">Type</th>
              <th className="py-1.5 pr-2 text-right font-medium">Laid</th>
              <th className="py-1.5 pr-2 text-right font-medium">Sold</th>
              <th className="py-1.5 pr-2 text-right font-medium">Price {unitLabel(unit)}</th>
              <th className="py-1.5 text-right font-medium">In stock</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.eggTypeId} className="border-b last:border-0">
                <td className="py-1.5 pr-2 text-gray-800">{t.name}</td>
                <td className="py-1.5 pr-2 text-right">{count(t.laid)}</td>
                <td className="py-1.5 pr-2 text-right">{count(t.sold)}</td>
                <td className={`py-1.5 pr-2 text-right ${t.avgPrice == null ? grey : ""}`}>{unitMoney(t.avgPrice, unit)}</td>
                <td className="py-1.5 text-right">{count(t.inStock)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-gray-600">
        Eggs in stock worth{" "}
        <span className="font-semibold text-gray-900">
          {view.prices.stockWorth == null ? "— (no egg sales yet)" : `about ${rupeesWhole(view.prices.stockWorth)}`}
        </span>
      </p>
    </Block>
  );
}

/** Flock numbers that explain why cost per egg moved. */
export function FlockCard({ view, period }: { view: OkView; period: EggCostPeriod }) {
  const rows: Array<[string, string]> = [
    ["Hens now", view.closed ? "Batch closed" : `${count(view.hensNow)} of ${count(view.initialHens)}`],
    ["Eggs per hen so far", view.full.eggsPerHen == null ? "—" : view.full.eggsPerHen.toLocaleString("en-IN")],
    ["Running cost per hen per day", unitMoney(period.costPerHenDay, "egg")],
    ["Feed per hen per day", period.feedGramsPerHenDay == null ? "— (feed kg not recorded)" : `${period.feedGramsPerHenDay} g`],
    ["Days in these numbers", `${count(period.days)} days`],
  ];
  return (
    <Block title="Flock" sub="Why the cost per egg goes up or down">
      <div className="space-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <span className="text-gray-600">{label}</span>
            <span className="text-right font-medium text-gray-900">{value}</span>
          </div>
        ))}
      </div>
    </Block>
  );
}

/** Plain words on how each number is worked out. Closed by default. */
export function HowWeCount() {
  const lines = [
    ["Running cost per egg", "Feed, medicine, labour and other costs from the first egg day ÷ eggs. Hen cost is not in it."],
    ["Full cost per egg so far", "Every cost of this batch, hens included ÷ every egg so far. It is high at first and goes down as hens keep laying."],
    ["Flock cost", "Hens (chicks or pullets) plus every cost before the first egg day."],
    ["Hen cost payback", "Egg sales + hen sales − running costs, shared against the flock cost."],
    ["Eggs", "All egg types laid are counted, cracked ones too, because they are also sold."],
    ["Days and months", "Nepal days and Nepali months. Costs count on the date they were entered."],
  ];
  return (
    <details className="group rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
      <summary className="cursor-pointer list-none text-sm font-semibold text-gray-900">
        How we count <span className="text-xs font-normal text-gray-500 group-open:hidden">(tap to open)</span>
      </summary>
      <dl className="mt-3 space-y-2 text-sm">
        {lines.map(([term, text]) => (
          <div key={term}>
            <dt className="font-medium text-gray-800">{term}</dt>
            <dd className="text-gray-600">{text}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

/** Shown before the first egg record. */
export function NoEggsCard({ view, onGoToEggs }: { view: BatchEggCost; onGoToEggs?: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center">
      <Egg className="mx-auto h-8 w-8 text-amber-500" />
      <p className="mt-2 font-semibold text-gray-900">
        {view.closed ? "No eggs were recorded in this batch" : "Laying has not started yet"}
      </p>
      <p className="mt-1 text-sm text-gray-600">
        Day {count(view.rearing.days)} · costs so far {rupeesWhole(view.rearing.totalCost)}
        {view.rearing.byGroup.length > 0 ? (
          <span className="block text-xs text-gray-500">
            {view.rearing.byGroup.map((g) => `${g.group} ${rupeesWhole(g.cost)}`).join(" · ")}
          </span>
        ) : null}
      </p>
      {!view.closed ? <p className="mt-2 text-sm text-gray-500">Cost per egg starts after the first egg record.</p> : null}
      {onGoToEggs && !view.closed ? (
        <Button variant="outline" size="sm" className="mt-4" onClick={onGoToEggs}>
          Add eggs in Egg Production
        </Button>
      ) : null}
    </div>
  );
}
