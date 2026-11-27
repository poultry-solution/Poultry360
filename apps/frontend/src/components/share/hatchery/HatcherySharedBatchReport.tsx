"use client";

import Link from "next/link";
import { Bar, BarChart, CartesianGrid, ComposedChart, Line, LineChart, XAxis, YAxis } from "recharts";
import { Bird, ChevronRight, Egg, FlaskConical, HeartPulse, NotebookPen, Pill, Wheat } from "lucide-react";
import { Badge } from "@/common/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/common/components/ui/chart";
import { DateDisplay } from "@/common/components/ui/date-display";
import {
  useHatcheryShareReport,
  type HatcheryIncubationStage,
  type HatcheryShareBatchReport,
} from "@/fetchers/hatchery/hatcheryShareQueries";
import { Empty, LoadingState, NotesList, ProblemState, Row, Section, Shell, Tile, fmt, fmtPct } from "./HatcheryShareParts";

const deathsChart = {
  deathsFemale: { label: "Female", color: "#ef4444" },
  deathsMale: { label: "Male", color: "#2563eb" },
} satisfies ChartConfig;
const eggChart = {
  eggs: { label: "Eggs", color: "#f59e0b" },
  layPercent: { label: "Lay %", color: "#16a34a" },
} satisfies ChartConfig;
const feedChart = { gramsPerBirdPerDay: { label: "Grams per bird per day", color: "#d97706" } } satisfies ChartConfig;

const weekTick = (week: number) => `W${week}`;
const weekLabel = (_: unknown, payload: Array<{ payload?: { week?: number } }>) =>
  `Week ${payload?.[0]?.payload?.week ?? ""}`;

export const STAGE_LABEL: Record<HatcheryIncubationStage, string> = {
  SETTER: "In setter",
  CANDLING: "Candled",
  HATCHER: "In hatcher",
  COMPLETED: "Hatched",
};

export function HatcherySharedBatchReport({ token }: { token: string }) {
  const { data, isLoading, error } = useHatcheryShareReport(token);
  if (isLoading) return <LoadingState />;
  if (!data) return <ProblemState status={(error as any)?.response?.status} />;
  return (
    <Shell>
      <Report report={data} token={token} />
    </Shell>
  );
}

function Report({ report, token }: { report: HatcheryShareBatchReport; token: string }) {
  const { batch, birds, eggs, feed, weekly, medicines, hatching, deaths } = report;
  const closed = batch.status === "CLOSED";
  // Charts start at the first week with any record, so a long rearing period
  // with nothing written doesn't squash the chart.
  const firstDataWeek = weekly.find((w) => w.deaths > 0 || w.eggs > 0 || w.feedKg > 0)?.week ?? 1;
  const chartWeeks = weekly.filter((w) => w.week >= firstDataWeek);
  const eggWeeks = weekly.filter((w) => w.eggs > 0 || (w.layPercent != null && w.layPercent > 0));
  const firstEggWeek = eggWeeks[0]?.week;
  const eggChartWeeks = firstEggWeek ? weekly.filter((w) => w.week >= firstEggWeek) : [];
  const feedWeeks = weekly.filter((w) => w.gramsPerBirdPerDay != null);
  const totals = hatching.totals;

  return (
    <>
      {/* Header */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">{batch.code}</h1>
          {batch.name && <span className="text-muted-foreground">{batch.name}</span>}
          <Badge variant="outline">Parent flock</Badge>
          <Badge className={closed ? "bg-gray-200 text-gray-700" : "bg-emerald-100 text-emerald-800"}>
            {closed ? "Closed" : "Active"}
          </Badge>
        </div>
        {batch.hatcheryName && <p className="text-sm text-muted-foreground">{batch.hatcheryName}</p>}
        <p className="text-sm">
          Week {batch.ageWeek} · Day {batch.ageDay} · Started <DateDisplay date={batch.startDate} />
          {batch.endDate && (
            <>
              {" "}
              · Closed <DateDisplay date={batch.endDate} />
            </>
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          Live report. This link ends on <DateDisplay date={report.expiresAt} />.
        </p>
      </div>

      {/* Key numbers */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile
          label="Birds alive"
          value={fmt(birds.now.total)}
          sub={`Female ${fmt(birds.now.female)} · Male ${fmt(birds.now.male)}`}
        />
        <Tile
          label="Deaths"
          value={fmtPct(birds.deaths.percent)}
          sub={`${fmt(birds.deaths.total)} birds`}
          valueClass={birds.deaths.total > 0 ? "text-red-600" : ""}
        />
        <Tile label="Lay %" value={fmtPct(eggs.layPercent)} sub="Eggs per hen per day" />
        <Tile
          label="Hatch %"
          value={fmtPct(totals.hatchOfFertile)}
          sub={totals.finishedCount > 0 ? "Of fertile eggs" : "No hatch yet"}
        />
      </div>

      {/* Birds */}
      <Section icon={Bird} title="Birds">
        <div className="grid gap-x-6 sm:grid-cols-2">
          <div>
            <Row label="Started with" value={`${fmt(birds.started.total)} (F ${fmt(birds.started.female)} · M ${fmt(birds.started.male)})`} />
            <Row label="Alive now" value={`${fmt(birds.now.total)} (F ${fmt(birds.now.female)} · M ${fmt(birds.now.male)})`} />
            <Row label="Males per 100 females" value={fmt(birds.malesPer100Females, 1)} />
          </div>
          <div>
            <Row
              label="Deaths"
              value={`${fmt(birds.deaths.total)} (${fmtPct(birds.deaths.percent)})`}
              valueClass={birds.deaths.total > 0 ? "text-red-600" : ""}
            />
            <Row
              label="Female deaths"
              value={`${fmt(birds.deaths.female)} (${fmtPct(birds.deaths.femalePercent)})`}
            />
            <Row label="Male deaths" value={`${fmt(birds.deaths.male)} (${fmtPct(birds.deaths.malePercent)})`} />
            {birds.deaths.notSplit > 0 && <Row label="Deaths not split" value={fmt(birds.deaths.notSplit)} />}
            {birds.sold.total > 0 && (
              <Row
                label="Birds sold"
                value={`${fmt(birds.sold.total)} (F ${fmt(birds.sold.female)} · M ${fmt(birds.sold.male)})${
                  birds.sold.avgWeightKg ? ` · avg ${fmt(birds.sold.avgWeightKg, 2)} kg` : ""
                }`}
              />
            )}
          </div>
        </div>
      </Section>

      {/* Deaths */}
      <Section icon={HeartPulse} title="Deaths">
        {birds.deaths.total === 0 ? (
          <Empty>No deaths recorded.</Empty>
        ) : (
          <>
            <ChartContainer config={deathsChart} className="h-[200px] w-full">
              <BarChart data={chartWeeks} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="week" tickLine={false} axisLine={false} tickFormatter={weekTick} minTickGap={12} />
                <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent labelFormatter={weekLabel} />} />
                <Bar isAnimationActive={false} dataKey="deathsFemale" stackId="d" fill="var(--color-deathsFemale)" />
                <Bar isAnimationActive={false} dataKey="deathsMale" stackId="d" fill="var(--color-deathsMale)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ChartContainer>
            <p className="text-center text-xs text-muted-foreground">Deaths each week of flock age (red female, blue male)</p>
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Latest deaths</p>
              <div className="divide-y rounded-lg border text-sm">
                {deaths.recent.map((row, i) => (
                  <div key={i} className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2">
                    <span>
                      <DateDisplay date={row.date} /> <span className="text-xs text-muted-foreground">· Day {row.day}</span>
                    </span>
                    <span className="font-medium text-red-600">
                      {row.total} <span className="text-xs font-normal text-muted-foreground">(F {row.female} · M {row.male})</span>
                    </span>
                    {row.note && <p className="w-full text-xs text-muted-foreground">{row.note}</p>}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </Section>

      {/* Eggs */}
      <Section icon={Egg} title="Eggs">
        {eggs.total === 0 ? (
          <Empty>No eggs recorded yet.</Empty>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Tile label="Total eggs" value={fmt(eggs.total)} />
              <Tile label="Hatchable" value={fmtPct(eggs.hatchablePercent)} sub={`${fmt(eggs.hatchable)} eggs`} />
              <Tile label="Lay %" value={fmtPct(eggs.layPercent)} />
            </div>
            {eggs.firstEggDate && (
              <p className="text-xs text-muted-foreground">
                First eggs on <DateDisplay date={eggs.firstEggDate} />
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {eggs.byType.map((type) => (
                <Badge key={type.name} variant="outline" className={type.isHatchable ? "border-emerald-300 text-emerald-800" : ""}>
                  {type.name}: {fmt(type.count)}
                </Badge>
              ))}
            </div>
            {eggChartWeeks.length > 0 && (
              <>
                <ChartContainer config={eggChart} className="h-[220px] w-full">
                  <ComposedChart data={eggChartWeeks} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="week" tickLine={false} axisLine={false} tickFormatter={weekTick} minTickGap={12} />
                    <YAxis yAxisId="eggs" tickLine={false} axisLine={false} width={44} allowDecimals={false} />
                    <YAxis yAxisId="pct" orientation="right" tickLine={false} axisLine={false} width={36} domain={[0, 100]} unit="%" />
                    <ChartTooltip content={<ChartTooltipContent labelFormatter={weekLabel} />} />
                    <Bar isAnimationActive={false} yAxisId="eggs" dataKey="eggs" fill="var(--color-eggs)" radius={[3, 3, 0, 0]} />
                    <Line isAnimationActive={false} yAxisId="pct" dataKey="layPercent" stroke="var(--color-layPercent)" strokeWidth={2} dot={false} connectNulls />
                  </ComposedChart>
                </ChartContainer>
                <p className="text-center text-xs text-muted-foreground">Eggs each week (bars) and lay % (line)</p>
              </>
            )}
          </>
        )}
      </Section>

      {/* Feed */}
      <Section icon={Wheat} title="Feed">
        {feed.byUnit.length === 0 ? (
          <Empty>No feed recorded.</Empty>
        ) : (
          <>
            {feed.byUnit.map((u) => (
              <div key={u.unit} className="grid gap-x-6 sm:grid-cols-2">
                <div>
                  <Row label="Total feed" value={`${fmt(u.total, 1)} ${u.unit}`} />
                  <Row label="Female" value={`${fmt(u.female, 1)} ${u.unit}`} />
                </div>
                <div>
                  <Row label="Male" value={`${fmt(u.male, 1)} ${u.unit}`} />
                  {u.notSplit > 0 && <Row label="Not split" value={`${fmt(u.notSplit, 1)} ${u.unit}`} />}
                </div>
              </div>
            ))}
            {feedWeeks.length > 0 && (
              <>
                <ChartContainer config={feedChart} className="h-[200px] w-full">
                  <LineChart data={chartWeeks} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="week" tickLine={false} axisLine={false} tickFormatter={weekTick} minTickGap={12} />
                    <YAxis tickLine={false} axisLine={false} width={40} unit="g" />
                    <ChartTooltip content={<ChartTooltipContent labelFormatter={weekLabel} />} />
                    <Line isAnimationActive={false} dataKey="gramsPerBirdPerDay" stroke="var(--color-gramsPerBirdPerDay)" strokeWidth={2} dot connectNulls />
                  </LineChart>
                </ChartContainer>
                <p className="text-center text-xs text-muted-foreground">Feed per bird per day (grams), each week</p>
              </>
            )}
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Last 14 days</p>
              {feed.recent.length === 0 ? (
                <Empty>No feed in the last 14 days.</Empty>
              ) : (
                <div className="divide-y rounded-lg border text-sm">
                  {feed.recent.map((row, i) => (
                    <div key={i} className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2">
                      <span>
                        <DateDisplay date={row.date} /> · {row.item}
                      </span>
                      <span className="font-medium">
                        {fmt(row.quantity, 2)} {row.unit} <span className="text-xs font-normal text-muted-foreground">({row.forWhom})</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </Section>

      {/* Medicine */}
      <Section icon={Pill} title="Medicine and vaccines">
        {medicines.length === 0 ? (
          <Empty>No medicine recorded.</Empty>
        ) : (
          <div className="divide-y rounded-lg border text-sm">
            {medicines.map((row, i) => (
              <div key={i} className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2">
                <span>
                  <DateDisplay date={row.date} /> <span className="text-xs text-muted-foreground">· Day {row.day}</span>
                </span>
                <span className="font-medium">
                  {row.item}
                  {row.quantity != null && (
                    <span className="font-normal text-muted-foreground">
                      {" "}
                      · {fmt(row.quantity, 2)} {row.unit ?? ""}
                    </span>
                  )}
                </span>
                {row.note && <p className="w-full text-xs text-muted-foreground">{row.note}</p>}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Hatching */}
      <Section icon={FlaskConical} title="Hatching">
        {hatching.incubations.length === 0 ? (
          <Empty>No eggs set from this batch yet.</Empty>
        ) : (
          <>
            {totals.finishedCount > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Tile label="Eggs set" value={fmt(totals.eggsSet)} sub={`${totals.finishedCount} hatched incubations`} />
                <Tile label="Fertile" value={fmtPct(totals.fertilePercent)} sub={`${fmt(totals.fertileEggs)} eggs`} />
                <Tile label="Hatch % of fertile" value={fmtPct(totals.hatchOfFertile)} />
                <Tile label="Hatch % of all set" value={fmtPct(totals.hatchOfSet)} sub={`${fmt(totals.totalHatched)} chicks`} />
              </div>
            )}
            {totals.runningCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {totals.runningCount} incubation{totals.runningCount === 1 ? "" : "s"} still running ({fmt(totals.runningEggs)} eggs) —
                not counted in the numbers above.
              </p>
            )}
            <div className="divide-y rounded-lg border text-sm">
              {hatching.incubations.map((inc) => (
                <Link
                  key={inc.id}
                  href={`/share/hatchery-batch/${encodeURIComponent(token)}/incubations/${inc.id}`}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {inc.code}
                      {inc.name && <span className="font-normal text-muted-foreground"> · {inc.name}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Set <DateDisplay date={inc.setDate} /> · {fmt(inc.eggsSet)} eggs · {STAGE_LABEL[inc.stage]}
                    </p>
                  </div>
                  <div className="text-right text-xs">
                    {inc.hatchOfFertile != null ? (
                      <>
                        <p className="text-sm font-semibold text-emerald-700">{fmtPct(inc.hatchOfFertile)}</p>
                        <p className="text-muted-foreground">hatch of fertile</p>
                      </>
                    ) : inc.fertilePercent != null ? (
                      <>
                        <p className="text-sm font-semibold">{fmtPct(inc.fertilePercent)}</p>
                        <p className="text-muted-foreground">fertile</p>
                      </>
                    ) : (
                      <p className="text-muted-foreground">Not candled yet</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              ))}
            </div>
            <p className="text-center text-xs text-muted-foreground">Tap an incubation to see its details</p>
          </>
        )}
      </Section>

      {/* Notes */}
      {report.notes && (
        <Section icon={NotebookPen} title="Notes">
          <NotesList notes={report.notes} />
        </Section>
      )}

      <p className="pb-6 text-center text-xs text-muted-foreground">
        Made with Poultry360 · This report does not show any money.
      </p>
    </>
  );
}
