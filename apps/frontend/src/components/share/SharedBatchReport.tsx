"use client";

import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import { Bird, Egg, HeartPulse, Link2Off, Loader2, NotebookPen, Pill, Scale, Wheat } from "lucide-react";
import { Badge } from "@/common/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/common/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/common/components/ui/chart";
import { DateDisplay } from "@/common/components/ui/date-display";
import { formatQuantity } from "@/common/lib/utils";
import { useGetBatchShareReport, type BatchShareReport } from "@/fetchers/batchShare/batchShareQueries";
import { useI18n } from "@/i18n/useI18n";

const deathsChart = { count: { label: "Deaths", color: "#ef4444" } } satisfies ChartConfig;
const weightChart = { avgWeightKg: { label: "Weight", color: "#2563eb" } } satisfies ChartConfig;
const feedChart = { kg: { label: "Feed", color: "#d97706" } } satisfies ChartConfig;
const eggChart = {
  eggs: { label: "Eggs", color: "#f59e0b" },
  layingPercent: { label: "Laying %", color: "#16a34a" },
} satisfies ChartConfig;

const num = (value: number | null | undefined, digits = 0) =>
  value == null
    ? "—"
    : Number(value).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: digits });

function Tile({ label, value, sub, valueClass = "" }: { label: string; value: string; sub?: ReactNode; valueClass?: string }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${valueClass}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: typeof Bird; title: string; children: ReactNode }) {
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-4">{children}</CardContent>
    </Card>
  );
}

function LanguageSwitch() {
  const { language, setLanguage } = useI18n();
  return (
    <div className="flex items-center gap-1 text-xs">
      {(["en", "ne"] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLanguage(code)}
          className={`rounded px-2 py-1 ${language === code ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
        >
          {code === "en" ? "English" : "नेपाली"}
        </button>
      ))}
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2.5">
          <div>
            <p className="font-semibold leading-tight">Poultry360</p>
            <p className="text-xs text-muted-foreground">{t("batchShare.page.headerTitle")}</p>
          </div>
          <LanguageSwitch />
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-4">{children}</main>
    </div>
  );
}

export function SharedBatchReport({ token }: { token: string }) {
  const { t } = useI18n();
  const { data, isLoading, error } = useGetBatchShareReport(token);
  const status = (error as any)?.response?.status;

  if (isLoading) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 py-24 text-muted-foreground">
          <Loader2 className="h-7 w-7 animate-spin" />
          <p className="text-sm">{t("batchShare.page.loading")}</p>
        </div>
      </Shell>
    );
  }

  if (!data) {
    const ended = !error || status === 404;
    return (
      <Shell>
        <Card className="mx-auto mt-12 max-w-md">
          <CardContent className="space-y-3 pt-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Link2Off className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-lg font-semibold">
              {ended ? t("share.ended.title") : t("batchShare.page.errorTitle")}
            </p>
            <p className="text-sm text-muted-foreground">
              {ended ? t("share.ended.body") : status === 429 ? t("batchShare.page.tooMany") : t("batchShare.page.errorBody")}
            </p>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell>
      <Report report={data} />
    </Shell>
  );
}

function Report({ report }: { report: BatchShareReport }) {
  const { t } = useI18n();
  const { batch, birds, deaths, weight, feed, fcr, medicines, eggs, notes } = report;
  const isLayers = batch.type === "LAYERS";
  const closed = batch.status === "COMPLETED";
  const last7 = deaths.daily.slice(-7);
  const dayTick = (value: number) => `${value}`;
  const dayLabel = (_: unknown, payload: any[]) => {
    const row = payload?.[0]?.payload;
    return row ? (
      <span>
        {t("batchShare.page.dayN", { n: row.day })} · <DateDisplay date={row.date} />
      </span>
    ) : null;
  };

  const fcrSub = () => {
    if (!fcr) return undefined;
    if (fcr.status === "WEIGHT_REQUIRED") return t("batchShare.page.fcrNeedsWeight");
    if (fcr.status === "NOT_CALCULABLE") return t("batchShare.page.fcrNotReady");
    if (fcr.weightDate)
      return (
        <>
          {t(fcr.status === "STALE" ? "batchShare.page.fcrOldWeight" : "batchShare.page.fcrWeightFrom")}{" "}
          <DateDisplay date={fcr.weightDate} />
        </>
      );
    return undefined;
  };

  return (
    <>
      {/* Batch header */}
      <Card className="gap-2 py-4">
        <CardContent className="space-y-2 px-4">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold">{batch.name}</h1>
            <Badge variant="secondary">{isLayers ? t("batchShare.page.layers") : t("batchShare.page.broiler")}</Badge>
            <Badge variant="outline" className={closed ? "text-gray-600" : "border-green-600/30 text-green-700"}>
              {closed ? t("batchShare.page.closed") : t("batchShare.page.active")}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {batch.farmName}
            {batch.location && ` · ${batch.location}`}
          </p>
          <p className="text-sm">
            <span className="text-2xl font-semibold">{t("batchShare.page.dayN", { n: batch.day })}</span>
            <span className="ml-2 text-muted-foreground">
              {t("batchShare.page.started")} <DateDisplay date={batch.startDate} />
              {batch.endDate && (
                <>
                  {" · "}
                  {t("batchShare.page.closedOn")} <DateDisplay date={batch.endDate} />
                </>
              )}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            {t("batchShare.page.updatedNow")} · {t("batchShare.page.linkEnds")} <DateDisplay date={report.expiresAt} />
          </p>
        </CardContent>
      </Card>

      {/* Key numbers */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile
          label={closed ? t("batchShare.page.birdsStarted") : t("batchShare.page.birdsAlive")}
          value={num(closed ? birds.started : birds.alive)}
          sub={closed ? undefined : t("batchShare.page.ofStarted", { n: num(birds.started) })}
        />
        <Tile
          label={t("batchShare.page.deaths")}
          value={num(deaths.total)}
          sub={`${num(deaths.percent, 2)}%`}
          valueClass={deaths.percent >= 5 ? "text-red-600" : ""}
        />
        {isLayers ? (
          <Tile
            label={t("batchShare.page.layingPercent")}
            value={eggs?.latest?.layingPercent != null ? `${num(eggs.latest.layingPercent, 1)}%` : "—"}
            sub={eggs?.latest ? <DateDisplay date={eggs.latest.date} /> : t("batchShare.page.noEggs")}
          />
        ) : (
          <Tile
            label={t("batchShare.page.avgWeight")}
            value={weight.latest ? `${num(weight.latest.avgWeightKg, 3)} kg` : "—"}
            sub={weight.latest ? <DateDisplay date={weight.latest.date} /> : t("batchShare.page.noWeight")}
          />
        )}
        {isLayers ? (
          <Tile
            label={t("batchShare.page.avgWeight")}
            value={weight.latest ? `${num(weight.latest.avgWeightKg, 3)} kg` : "—"}
            sub={weight.latest ? <DateDisplay date={weight.latest.date} /> : t("batchShare.page.noWeight")}
          />
        ) : (
          <Tile label="FCR" value={fcr?.value != null ? num(fcr.value, 2) : "—"} sub={fcrSub()} />
        )}
      </div>

      {/* Birds */}
      <Section icon={Bird} title={t("batchShare.page.birdsTitle")}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
          <Row label={t("batchShare.page.birdsStarted")} value={num(birds.started)} />
          <Row label={t("batchShare.page.died")} value={num(birds.died)} />
          <Row label={t("batchShare.page.sold")} value={num(birds.sold)} />
          {closed ? (
            <Row label={t("batchShare.page.leftAtClose")} value={num(birds.leftAtClose)} />
          ) : (
            <Row label={t("batchShare.page.birdsAlive")} value={num(birds.alive)} strong />
          )}
        </div>
      </Section>

      {/* Deaths */}
      <Section icon={HeartPulse} title={t("batchShare.page.deathsTitle")}>
        {deaths.total === 0 ? (
          <p className="text-sm text-muted-foreground">{t("batchShare.page.noDeaths")}</p>
        ) : (
          <>
            <ChartContainer config={deathsChart} className="h-[200px] w-full">
              <BarChart data={deaths.daily} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tickFormatter={dayTick} minTickGap={16} />
                <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent labelFormatter={dayLabel} />} />
                <Bar isAnimationActive={false} dataKey="count" fill="var(--color-count)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ChartContainer>
            <p className="text-center text-xs text-muted-foreground">{t("batchShare.page.chartByDay")}</p>
          </>
        )}

        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">{t("batchShare.page.last7Days")}</p>
          <div className="grid grid-cols-7 gap-1 text-center">
            {last7.map((row) => (
              <div key={row.date} className="rounded-md bg-muted/60 px-1 py-1.5">
                <p className="text-[10px] text-muted-foreground">{t("batchShare.page.dayShort", { n: row.day })}</p>
                <p className={`text-sm font-semibold ${row.count > 0 ? "text-red-600" : ""}`}>{row.count}</p>
              </div>
            ))}
          </div>
        </div>

        {deaths.reasons.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">{t("batchShare.page.reasons")}</p>
            <div className="flex flex-wrap gap-2">
              {deaths.reasons.map((row) => (
                <span key={row.reason ?? "none"} className="rounded-full border px-2.5 py-1 text-xs">
                  {row.reason ?? t("batchShare.page.noReason")} <strong className="ml-1">{num(row.count)}</strong>
                </span>
              ))}
            </div>
          </div>
        )}

        {deaths.recent.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="py-1.5 pr-3 text-left font-normal">{t("batchShare.page.date")}</th>
                  <th className="py-1.5 pr-3 text-right font-normal">{t("batchShare.page.died")}</th>
                  <th className="py-1.5 text-left font-normal">{t("batchShare.page.reason")}</th>
                </tr>
              </thead>
              <tbody>
                {deaths.recent.map((row, index) => (
                  <tr key={`${row.date}-${index}`} className="border-b last:border-0">
                    <td className="whitespace-nowrap py-1.5 pr-3">
                      {t("batchShare.page.dayShort", { n: row.day })} · <DateDisplay date={row.date} />
                    </td>
                    <td className="py-1.5 pr-3 text-right font-medium">{num(row.count)}</td>
                    <td className="py-1.5 text-muted-foreground">{row.reason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Eggs (layers) */}
      {eggs && (
        <Section icon={Egg} title={t("batchShare.page.eggsTitle")}>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <Row label={t("batchShare.page.totalEggs")} value={num(eggs.totalEggs)} />
            <Row
              label={t("batchShare.page.lastEggs")}
              value={eggs.latest?.eggs != null ? num(eggs.latest.eggs) : "—"}
            />
          </div>
          {eggs.daily.some((row) => row.eggs != null) ? (
            <>
              <ChartContainer config={eggChart} className="h-[220px] w-full">
                <ComposedChart data={eggs.daily} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tickFormatter={dayTick} minTickGap={16} />
                  <YAxis yAxisId="eggs" tickLine={false} axisLine={false} width={40} allowDecimals={false} />
                  <YAxis yAxisId="pct" orientation="right" tickLine={false} axisLine={false} width={36} domain={[0, 100]} unit="%" />
                  <ChartTooltip content={<ChartTooltipContent labelFormatter={dayLabel} />} />
                  <Bar isAnimationActive={false} yAxisId="eggs" dataKey="eggs" fill="var(--color-eggs)" radius={[3, 3, 0, 0]} />
                  <Line isAnimationActive={false} yAxisId="pct" dataKey="layingPercent" stroke="var(--color-layingPercent)" strokeWidth={2} dot={false} connectNulls />
                </ComposedChart>
              </ChartContainer>
              <p className="text-center text-xs text-muted-foreground">{t("batchShare.page.eggChartHint")}</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t("batchShare.page.noEggs")}</p>
          )}
        </Section>
      )}

      {/* Weight */}
      <Section icon={Scale} title={t("batchShare.page.weightTitle")}>
        {weight.points.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("batchShare.page.noWeight")}</p>
        ) : (
          <>
            {weight.points.length > 1 && (
              <>
                <ChartContainer config={weightChart} className="h-[200px] w-full">
                  <LineChart data={weight.points} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="day" type="number" domain={[1, "dataMax"]} tickLine={false} axisLine={false} tickFormatter={dayTick} />
                    <YAxis tickLine={false} axisLine={false} width={36} tickFormatter={(v) => Number(v).toFixed(2)} />
                    <ChartTooltip content={<ChartTooltipContent labelFormatter={dayLabel} />} />
                    <Line isAnimationActive={false} dataKey="avgWeightKg" stroke="var(--color-avgWeightKg)" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ChartContainer>
                <p className="text-center text-xs text-muted-foreground">{t("batchShare.page.weightChartHint")}</p>
              </>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-1.5 pr-3 text-left font-normal">{t("batchShare.page.date")}</th>
                    <th className="py-1.5 pr-3 text-right font-normal">{t("batchShare.page.avgWeight")}</th>
                    <th className="py-1.5 text-right font-normal">{t("batchShare.page.birdsWeighed")}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...weight.points].reverse().map((row, index) => (
                    <tr key={`${row.date}-${index}`} className="border-b last:border-0">
                      <td className="whitespace-nowrap py-1.5 pr-3">
                        {t("batchShare.page.dayShort", { n: row.day })} · <DateDisplay date={row.date} />
                      </td>
                      <td className="py-1.5 pr-3 text-right font-medium">{num(row.avgWeightKg, 3)} kg</td>
                      <td className="py-1.5 text-right text-muted-foreground">{num(row.sampleCount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Section>

      {/* Feed */}
      <Section icon={Wheat} title={t("batchShare.page.feedTitle")}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <Row label={t("batchShare.page.totalFeed")} value={`${num(feed.totalKg, 1)} kg`} />
          <Row
            label={t("batchShare.page.feedPerBird")}
            value={feed.perBirdKg != null ? `${num(feed.perBirdKg, 3)} kg` : "—"}
          />
        </div>
        <p className="text-xs text-muted-foreground">{t("batchShare.page.feedPerBirdHint")}</p>
        {feed.totalKg > 0 && (
          <>
            <ChartContainer config={feedChart} className="h-[180px] w-full">
              <BarChart data={feed.recent} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tickFormatter={dayTick} />
                <YAxis tickLine={false} axisLine={false} width={40} />
                <ChartTooltip content={<ChartTooltipContent labelFormatter={dayLabel} />} />
                <Bar isAnimationActive={false} dataKey="kg" fill="var(--color-kg)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ChartContainer>
            <p className="text-center text-xs text-muted-foreground">{t("batchShare.page.feedChartHint")}</p>
          </>
        )}
        {feed.types.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {feed.types.map((row) => (
              <span key={row.name} className="rounded-full border px-2.5 py-1 text-xs">
                {row.name} <strong className="ml-1">{num(row.kg, 1)} kg</strong>
              </span>
            ))}
          </div>
        )}
      </Section>

      {/* Medicine and vaccines */}
      <Section icon={Pill} title={t("batchShare.page.medicineTitle")}>
        {medicines.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("batchShare.page.noMedicine")}</p>
        ) : (
          <ol className="space-y-2">
            {medicines.map((row, index) => (
              <li key={`${row.date}-${index}`} className="flex gap-3 text-sm">
                <div className="w-20 shrink-0 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">{t("batchShare.page.dayShort", { n: row.day })}</p>
                  <DateDisplay date={row.date} />
                </div>
                <div className="min-w-0 space-y-0.5">
                  {row.items.map((item, i) => (
                    <p key={i}>
                      {item.name}
                      {item.quantity != null && (
                        <span className="text-muted-foreground">
                          {" "}· {formatQuantity(item.quantity)} {item.unit}
                        </span>
                      )}
                    </p>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        )}
      </Section>

      {/* Notes (only if the farmer chose to share them) */}
      {notes && notes.length > 0 && (
        <Section icon={NotebookPen} title={t("batchShare.page.notesTitle")}>
          <ul className="space-y-2 text-sm">
            {notes.map((row, index) => (
              <li key={`${row.date}-${index}`} className="flex gap-3">
                <DateDisplay date={row.date} className="w-20 shrink-0 text-xs text-muted-foreground" />
                <p className="min-w-0 whitespace-pre-wrap break-words">{row.description}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <p className="pb-6 text-center text-xs text-muted-foreground">{t("batchShare.page.footer")}</p>
    </>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-semibold" : "font-medium"}>{value}</span>
    </div>
  );
}
