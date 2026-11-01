"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Egg,
  Layers,
  FlaskConical,
  Bird,
  CalendarDays,
  DollarSign,
  Users,
  AlertTriangle,
  Lightbulb,
  Replace,
  Sparkles,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/common/components/ui/card";
import { useAuthStore } from "@/common/store/store";
import { convertADtoBS, getNepalTodayAd, toNepalDayAd } from "@/common/lib/nepali-date";
import { formatRupeesExact } from "@/common/lib/utils";
import { useHatcheryBatches, useHatcheryEggInventory } from "@/fetchers/hatchery/hatcheryBatchQueries";
import { useHatcheryTodaySummary } from "@/fetchers/hatchery/hatcheryAnalyticsQueries";
import {
  useIncubationBatches,
  useProducedChickStock,
  type IncubationBatch,
} from "@/fetchers/hatchery/hatcheryIncubationQueries";
import { useHatcheryParties } from "@/fetchers/hatchery/hatcheryPartyQueries";
import { useGetHatcheryInventoryStatistics } from "@/fetchers/hatchery/hatcheryInventoryQueries";

// 21-day chicken-egg incubation: candle day 9, move to hatcher day 18, hatch day 21.
const CANDLE_DAY = 9;
const TRANSFER_DAY = 18;
const HATCH_DAY = 21;

type ActionKind = "CANDLE" | "TRANSFER" | "HATCH";

type CycleAction = {
  kind: ActionKind;
  day: number;
  /** Positive: due in N days. Zero: today. Negative: N days late. */
  daysUntil: number;
  batch: IncubationBatch;
};

/** Whole days between two Nepal-calendar YYYY-MM-DD strings. */
function daysBetweenNepalAd(fromAd: string, toAd: string): number {
  return Math.round((Date.parse(toAd) - Date.parse(fromAd)) / 86_400_000);
}

/** Compute the next upcoming action for an active incubation batch — whether
 *  it is late, today, or still a few days out. Returns null only for completed
 *  batches and future-dated starts. */
function nextCycleAction(batch: IncubationBatch, today: string): CycleAction | null {
  if (batch.stage === "COMPLETED") return null;
  const start = toNepalDayAd(batch.startDate);
  const day = daysBetweenNepalAd(start, today) + 1; // day 1 == start day
  if (day < 1) return null;

  // Walk the pipeline: whichever step has not been completed is "next".
  // `daysUntil` is `targetDay - day` so positive = upcoming, 0 = today,
  // negative = overdue.
  if (!batch.candledAt) {
    return { kind: "CANDLE", day, daysUntil: CANDLE_DAY - day, batch };
  }
  if (!batch.transferredAt) {
    return { kind: "TRANSFER", day, daysUntil: TRANSFER_DAY - day, batch };
  }
  if (!batch.hatchedAt) {
    return { kind: "HATCH", day, daysUntil: HATCH_DAY - day, batch };
  }
  return null;
}

/** Pill shown next to each row. Colour tells the user how urgent it is. */
function dueBadge(daysUntil: number): { text: string; className: string } {
  if (daysUntil < 0) {
    const n = -daysUntil;
    return {
      text: `${n} day${n === 1 ? "" : "s"} late`,
      className: "bg-amber-50 text-amber-700 border-amber-200",
    };
  }
  if (daysUntil === 0) {
    return { text: "Today", className: "bg-green-50 text-green-700 border-green-200" };
  }
  if (daysUntil === 1) {
    return { text: "Tomorrow", className: "bg-sky-50 text-sky-700 border-sky-200" };
  }
  return {
    text: `In ${daysUntil} days`,
    className: "bg-muted text-muted-foreground border-border",
  };
}

const ACTION_META: Record<
  ActionKind,
  { label: string; icon: React.ComponentType<{ className?: string }>; accent: string }
> = {
  CANDLE: { label: "Candling", icon: Lightbulb, accent: "text-amber-600" },
  TRANSFER: { label: "Move to hatcher", icon: Replace, accent: "text-sky-600" },
  HATCH: { label: "Hatching", icon: Sparkles, accent: "text-green-700" },
};

function fmtNpr(amount: number) {
  return formatRupeesExact(amount);
}

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  valueClassName,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  valueClassName?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${valueClassName ?? "text-foreground"}`}>{value}</p>
            {subtitle ? <p className="text-xs text-muted-foreground mt-1">{subtitle}</p> : null}
          </div>
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

function TodaysWork({
  incubations,
  loading,
}: {
  incubations: IncubationBatch[];
  loading: boolean;
}) {
  const today = useMemo(() => getNepalTodayAd(), []);
  const groups = useMemo(() => {
    const buckets: Record<ActionKind, CycleAction[]> = {
      CANDLE: [],
      TRANSFER: [],
      HATCH: [],
    };
    for (const b of incubations) {
      const action = nextCycleAction(b, today);
      if (action) buckets[action.kind].push(action);
    }
    // Most urgent first within each group: late → today → tomorrow → farther out.
    for (const kind of Object.keys(buckets) as ActionKind[]) {
      buckets[kind].sort((a, b) => a.daysUntil - b.daysUntil);
    }
    return buckets;
  }, [incubations, today]);

  const total = groups.CANDLE.length + groups.TRANSFER.length + groups.HATCH.length;

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-xs text-muted-foreground">Today&apos;s work</p>
            <h2 className="text-base sm:text-lg font-semibold">Incubation schedule</h2>
          </div>
          <CalendarDays className="h-5 w-5 text-muted-foreground" />
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-10 rounded bg-muted animate-pulse" />
            ))}
          </div>
        ) : total === 0 ? (
          <div className="flex items-start gap-3 rounded-md border bg-muted/30 p-3">
            <CheckCircle2 className="h-5 w-5 text-green-700 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">No active incubations</p>
              <p className="text-muted-foreground">
                Start an incubation to see candling (day 9), transfer (day 18) and hatch (day 21) reminders here.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {(Object.keys(groups) as ActionKind[]).map((kind) => {
              const items = groups[kind];
              if (items.length === 0) return null;
              const meta = ACTION_META[kind];
              const Icon = meta.icon;
              return (
                <section key={kind}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`h-4 w-4 ${meta.accent}`} />
                    <h3 className="text-sm font-semibold">{meta.label}</h3>
                    <span className="text-xs text-muted-foreground">
                      {items.length} batch{items.length === 1 ? "" : "es"}
                    </span>
                  </div>
                  <ul className="divide-y rounded-md border">
                    {items.map((a) => (
                      <li key={a.batch.id}>
                        <Link
                          href={`/hatchery/dashboard/incubations/${a.batch.id}`}
                          className="flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-muted/40 active:bg-muted/60"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {a.batch.code}
                              {a.batch.name ? (
                                <span className="font-normal text-muted-foreground"> · {a.batch.name}</span>
                              ) : null}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Day {a.day} of {HATCH_DAY} · {a.batch.eggsSetCount.toLocaleString()} eggs set
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {(() => {
                              const badge = dueBadge(a.daysUntil);
                              return (
                                <span className={`rounded-full text-xs font-medium px-2 py-0.5 border ${badge.className}`}>
                                  {badge.text}
                                </span>
                              );
                            })()}
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HatcheryHomeContent() {
  const { user } = useAuthStore();
  const { data: todaySummary, isLoading: isTodaySummaryLoading } = useHatcheryTodaySummary();

  // Label comes from the SAME AD day the server counted, parsed as UTC midnight
  // exactly like stored record dates. Converting `new Date()` directly would
  // double-apply the Nepal offset and roll to the next BS day in the evening.
  const today = useMemo(
    () => (todaySummary?.date ? convertADtoBS(new Date(todaySummary.date)) : "—"),
    [todaySummary?.date]
  );

  const { data: activeParentBatchData, isLoading: isActiveParentBatchLoading } = useHatcheryBatches({
    type: "PARENT_FLOCK",
    status: "ACTIVE",
    limit: 200,
  });
  const { data: incubationData, isLoading: isIncubationLoading } = useIncubationBatches({ limit: 200 });
  const { data: eggInventoryRes, isLoading: isEggStockLoading } = useHatcheryEggInventory();
  const { data: producedChickRes, isLoading: isProducedChickLoading } = useProducedChickStock();
  const { data: partiesData, isLoading: isPartiesLoading } = useHatcheryParties();
  const { data: statsRes, isLoading: isInventoryStatsLoading } = useGetHatcheryInventoryStatistics();

  const activeParentBatches = activeParentBatchData?.total ?? 0;
  const incubations = incubationData?.batches ?? [];
  const activeIncubations = incubations.filter(
    (b) => b.stage === "SETTER" || b.stage === "CANDLING" || b.stage === "HATCHER"
  ).length;
  const totalEggStock = Number(eggInventoryRes?.summary?.totalStock ?? 0);
  const totalProducedChicks = Number(producedChickRes?.summary?.totalStock ?? 0);
  const outstandingPartiesBalance = (partiesData?.parties ?? []).reduce(
    (sum, p) => sum + Number(p.balance ?? 0),
    0
  );
  const lowStockItems = Number(statsRes?.data?.lowStockCount ?? 0);
  const isLoadingCards =
    isTodaySummaryLoading ||
    isActiveParentBatchLoading ||
    isIncubationLoading ||
    isEggStockLoading ||
    isProducedChickLoading ||
    isPartiesLoading ||
    isInventoryStatsLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Welcome, {user?.name ?? "User"}</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {isLoadingCards ? (
          Array.from({ length: 8 }).map((_, idx) => (
            <Card key={`kpi-skeleton-${idx}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2 w-full">
                    <div className="h-3 w-32 rounded bg-muted animate-pulse" />
                    <div className="h-7 w-20 rounded bg-muted animate-pulse" />
                    <div className="h-3 w-40 rounded bg-muted animate-pulse" />
                  </div>
                  <div className="h-5 w-5 rounded bg-muted animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <KpiCard title="Active Parent Batches" value={activeParentBatches} subtitle="Parent flock batches currently active" icon={Layers} />
            <KpiCard title="Active Incubations" value={activeIncubations} subtitle="Setter/Candling/Hatcher stages" icon={FlaskConical} />
            <KpiCard title="Total Egg Stock" value={totalEggStock.toLocaleString()} subtitle="Across all egg types and batches" icon={Egg} />
            <KpiCard title="Total Produced Chicks" value={totalProducedChicks.toLocaleString()} subtitle="Available stock across incubations" icon={Bird} />
            <KpiCard
              title="Today Egg Production"
              value={(todaySummary?.eggProduction ?? 0).toLocaleString()}
              subtitle={`Production records on ${today}`}
              icon={CalendarDays}
            />
            <KpiCard
              title="Today Chick Sales Revenue"
              value={fmtNpr(todaySummary?.chickSalesRevenue ?? 0)}
              subtitle={`Chick sales on ${today}`}
              icon={DollarSign}
              valueClassName="text-green-700"
            />
            <KpiCard
              title="Outstanding Parties Balance"
              value={fmtNpr(outstandingPartiesBalance)}
              subtitle="Total receivable from hatchery parties"
              icon={Users}
              valueClassName={outstandingPartiesBalance > 0 ? "text-red-600" : "text-green-700"}
            />
            <KpiCard
              title="Low Inventory Items"
              value={lowStockItems}
              subtitle="Items at or below minimum stock"
              icon={AlertTriangle}
              valueClassName={lowStockItems > 0 ? "text-red-600" : "text-green-700"}
            />
          </>
        )}
      </div>

      <TodaysWork incubations={incubations} loading={isIncubationLoading} />
    </div>
  );
}

export default function HatcheryHomePage() {
  const user = useAuthStore((state) => state.user);
  if (user?.isStaff && !user.permissions?.includes("HATCHERY_MANAGE_OPERATIONS")) {
    return <Card className="mx-auto mt-10 max-w-lg"><CardContent className="py-10 text-center"><h1 className="text-lg font-semibold">No Hatchery operations access</h1><p className="mt-2 text-sm text-muted-foreground">Your owner can grant Hatchery operations, analytics, or payroll access from Staff access.</p></CardContent></Card>;
  }
  return <HatcheryHomeContent />;
}
