"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Egg,
  Layers,
  FlaskConical,
  Bird,
  Package,
  AlertTriangle,
  Lightbulb,
  Replace,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Loader2,
  Plus,
  Wallet,
  Banknote,
} from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Card, CardContent } from "@/common/components/ui/card";
import { useAuthStore } from "@/common/store/store";
import { formatBSLong, getNepalTodayAd, toNepalDayAd } from "@/common/lib/nepali-date";
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
import { ReminderCard } from "@/components/reminders/ReminderCard";
import { HatchResultChart } from "@/components/hatchery/HatchResultChart";
import { HatcheryBatchProfitChart } from "@/components/hatchery/HatcheryBatchProfitChart";

// 21-day chicken-egg incubation: candle day 9, move to hatcher day 18, hatch day 21.
const CANDLE_DAY = 9;
const TRANSFER_DAY = 18;
const HATCH_DAY = 21;

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type ActionKind = "CANDLE" | "TRANSFER" | "HATCH";

type CycleAction = {
  kind: ActionKind;
  /** Incubation day the step is planned for (9, 18 or 21). */
  dueDay: number;
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
  const step = (kind: ActionKind, dueDay: number): CycleAction => ({
    kind,
    dueDay,
    daysUntil: dueDay - day,
    batch,
  });
  if (!batch.candledAt) return step("CANDLE", CANDLE_DAY);
  if (!batch.transferredAt) return step("TRANSFER", TRANSFER_DAY);
  if (!batch.hatchedAt) return step("HATCH", HATCH_DAY);
  return null;
}

/** Pill shown next to each row. Colour tells the user how urgent it is. */
function dueBadge(daysUntil: number): { text: string; className: string } {
  if (daysUntil < 0) {
    const n = -daysUntil;
    return {
      text: `${n} day${n === 1 ? "" : "s"} late`,
      className: "bg-red-50 text-red-700 border-red-200",
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

function actionText(a: CycleAction): string {
  const label = ACTION_META[a.kind].label;
  if (a.daysUntil < 0) return `${label} was due on day ${a.dueDay}`;
  if (a.daysUntil === 0) return `${label} today (day ${a.dueDay})`;
  return `${label} on day ${a.dueDay}`;
}

/** "Friday, Kartik 20, 2083" for a Nepal-day YYYY-MM-DD string. */
function formatNepalToday(todayAd: string): string {
  const weekday = WEEKDAYS[new Date(`${todayAd}T00:00:00Z`).getUTCDay()];
  return `${weekday}, ${formatBSLong(todayAd)}`;
}

/** Small tile, same size as the dealer and farmer Home tiles. */
function HomeStat({
  label,
  icon: Icon,
  value,
  sub,
  href,
  valueClass,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** null while loading. */
  value: string | null;
  sub: string;
  href: string;
  valueClass?: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-lg border border-gray-200 bg-white px-3 py-2.5 transition-colors hover:border-gray-300 hover:bg-gray-50"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-medium text-gray-600">{label}</p>
        <Icon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
      </div>
      {value === null ? (
        <Loader2 className="my-1 h-5 w-5 animate-spin text-gray-400" />
      ) : (
        <p className={`mt-0.5 truncate text-lg font-bold md:text-xl ${valueClass ?? ""}`}>{value}</p>
      )}
      <p className="truncate text-[11px] text-gray-500">{sub}</p>
    </Link>
  );
}

function StatGroup({
  title,
  children,
  wide,
}: {
  title: string;
  children: React.ReactNode;
  /** 4 tiles in one row from tablet width up. */
  wide?: boolean;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</h2>
      <div className={`grid grid-cols-2 gap-3 ${wide ? "md:grid-cols-4" : ""}`}>{children}</div>
    </section>
  );
}

function WorkRow({ action }: { action: CycleAction }) {
  const meta = ACTION_META[action.kind];
  const Icon = meta.icon;
  const badge = dueBadge(action.daysUntil);
  return (
    <li>
      <Link
        href={`/hatchery/dashboard/incubations/${action.batch.id}`}
        className="flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-muted/40 active:bg-muted/60"
      >
        <div className="flex min-w-0 items-start gap-2.5">
          <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${meta.accent}`} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {action.batch.code}
              {action.batch.name ? (
                <span className="font-normal text-muted-foreground"> · {action.batch.name}</span>
              ) : null}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {actionText(action)} · {action.batch.eggsSetCount.toLocaleString()} eggs
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${badge.className}`}>
            {badge.text}
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </Link>
    </li>
  );
}

function TodaysWork({
  incubations,
  loading,
}: {
  incubations: IncubationBatch[];
  loading: boolean;
}) {
  const [showLater, setShowLater] = useState(false);
  const today = useMemo(() => getNepalTodayAd(), []);

  // Late, today and tomorrow are shown; anything later sits behind a toggle.
  const { urgent, later } = useMemo(() => {
    const actions = incubations
      .map((b) => nextCycleAction(b, today))
      .filter((a): a is CycleAction => a !== null)
      .sort((a, b) => a.daysUntil - b.daysUntil);
    return {
      urgent: actions.filter((a) => a.daysUntil <= 1),
      later: actions.filter((a) => a.daysUntil > 1),
    };
  }, [incubations, today]);

  return (
    <Card className="gap-0 rounded-lg border-gray-200 py-0">
      <CardContent className="px-4 py-3">
        <h2 className="mb-2 text-base font-semibold">Today&apos;s work</h2>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : urgent.length === 0 && later.length === 0 ? (
          <div className="flex items-start gap-3 rounded-md border bg-muted/30 p-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-700" />
            <div className="text-sm">
              <p className="font-medium">No incubations running</p>
              <p className="text-muted-foreground">
                Start an incubation to see candling (day 9), move to hatcher (day 18) and hatch (day 21) here.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {urgent.length === 0 ? (
              <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2.5 text-sm">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-700" />
                Nothing due today or tomorrow.
              </div>
            ) : (
              <ul className="divide-y rounded-md border">
                {urgent.map((a) => (
                  <WorkRow key={a.batch.id} action={a} />
                ))}
              </ul>
            )}

            {later.length > 0 ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowLater((v) => !v)}
                  className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${showLater ? "rotate-180" : ""}`} />
                  {showLater ? "Hide" : "Show"} {later.length} coming up later
                </button>
                {showLater ? (
                  <ul className="divide-y rounded-md border">
                    {later.map((a) => (
                      <WorkRow key={a.batch.id} action={a} />
                    ))}
                  </ul>
                ) : null}
              </>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HatcheryHomeContent() {
  const { user } = useAuthStore();
  // Charts read analytics data: owners always, staff only with the analytics permission.
  const canViewAnalytics = !user?.isStaff || Boolean(user.permissions?.includes("HATCHERY_VIEW_ANALYTICS"));
  const { data: todaySummary, isLoading: isTodaySummaryLoading } = useHatcheryTodaySummary();

  // Use the SAME AD day the server counted, so the date and the "today"
  // numbers always match. Fall back to the Nepal day while it loads.
  const todayLabel = formatNepalToday(todaySummary?.date ?? getNepalTodayAd());

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
  const partiesBalance = (partiesData?.parties ?? []).reduce(
    (sum, p) => sum + Number(p.balance ?? 0),
    0
  );
  const lowStockItems = Number(statsRes?.data?.lowStockCount ?? 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Welcome, {user?.name ?? "User"}</h1>
          <p className="text-sm text-muted-foreground md:text-base">{todayLabel}</p>
        </div>
        <Link href="/hatchery/dashboard/incubations?new=1">
          <Button
            variant="outline"
            className="w-full gap-2 border-green-200 hover:bg-green-50 hover:text-green-700 md:w-auto"
          >
            <Plus className="h-4 w-4" />
            Start incubation
          </Button>
        </Link>
      </div>

      {/* Left: today's work and numbers. Right: reminders, which can get long,
          so they scroll inside their own card and never leave a gap. */}
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_440px]">
        <div className="min-w-0 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <StatGroup title="Today">
              <HomeStat
                label="Eggs today"
                icon={Egg}
                value={isTodaySummaryLoading ? null : (todaySummary?.eggProduction ?? 0).toLocaleString()}
                sub="All parent batches"
                href="/hatchery/dashboard/batches"
              />
              <HomeStat
                label="Chick sales today"
                icon={Banknote}
                value={isTodaySummaryLoading ? null : formatRupeesExact(todaySummary?.chickSalesRevenue ?? 0)}
                sub="Sold today"
                href="/hatchery/dashboard/produced-chicks"
                valueClass="text-green-700"
              />
            </StatGroup>

            <StatGroup title="Money">
              <HomeStat
                label={partiesBalance >= 0 ? "Parties owe you" : "You owe parties"}
                icon={Wallet}
                value={isPartiesLoading ? null : formatRupeesExact(Math.abs(partiesBalance))}
                sub="Current unpaid amount"
                href="/hatchery/dashboard/parties"
                valueClass={partiesBalance >= 0 ? "text-green-700" : "text-red-600"}
              />
              <HomeStat
                label="Items low in stock"
                icon={lowStockItems > 0 ? AlertTriangle : Package}
                value={isInventoryStatsLoading ? null : String(lowStockItems)}
                sub="Below minimum stock"
                href="/hatchery/dashboard/inventory"
                valueClass={lowStockItems > 0 ? "text-orange-600" : "text-gray-500"}
              />
            </StatGroup>
          </div>

          <StatGroup title="Stock now" wide>
            <HomeStat
              label="Eggs in stock"
              icon={Egg}
              value={isEggStockLoading ? null : totalEggStock.toLocaleString()}
              sub="All egg types"
              href="/hatchery/dashboard/egg-inventory"
            />
            <HomeStat
              label="Chicks to sell"
              icon={Bird}
              value={isProducedChickLoading ? null : totalProducedChicks.toLocaleString()}
              sub="Hatched, not sold yet"
              href="/hatchery/dashboard/produced-chicks"
            />
            <HomeStat
              label="Incubations"
              icon={FlaskConical}
              value={isIncubationLoading ? null : String(activeIncubations)}
              sub="Running now"
              href="/hatchery/dashboard/incubations"
            />
            <HomeStat
              label="Parent batches"
              icon={Layers}
              value={isActiveParentBatchLoading ? null : String(activeParentBatches)}
              sub="Active parent flocks"
              href="/hatchery/dashboard/batches"
            />
          </StatGroup>

          <TodaysWork incubations={incubations} loading={isIncubationLoading} />
          {/* Smaller screens: reminders full width, right after today's work. */}
          <ReminderCard module="hatchery" className="xl:hidden" />
        </div>
        <ReminderCard module="hatchery" className="hidden xl:sticky xl:top-4 xl:block" />
      </div>

      {canViewAnalytics ? (
        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Results</h2>
            <Link href="/hatchery/dashboard/analytics" className="text-xs font-medium text-primary hover:underline">
              See more in Analytics →
            </Link>
          </div>
          {/* Full width, one under the other, so more bars fit before scrolling. */}
          <div className="space-y-4">
            <HatchResultChart enabled={canViewAnalytics} />
            <HatcheryBatchProfitChart enabled={canViewAnalytics} />
          </div>
        </section>
      ) : null}
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
