"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { HeartPulse, Percent, Pill, Wheat } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/common/components/ui/chart";
import { StatTile, rupees } from "@/components/dashboard/StatsCards";
import type { FarmerHealthFeedAnalytics } from "@/fetchers/analytics/farmerAnalyticsQueries";
import { useI18n } from "@/i18n/useI18n";
import { EmptyLine, Section, TabLoading, count, kg, percent, periodLabel } from "./shared";

const deathsConfig = { count: { label: "Deaths", color: "#ef4444" } } satisfies ChartConfig;
const feedConfig = { kg: { label: "Feed", color: "#d97706" } } satisfies ChartConfig;

export function HealthFeedTab({ data, loading }: { data?: FarmerHealthFeedAnalytics; loading: boolean }) {
  const { t } = useI18n();
  if (!data) return loading ? <TabLoading /> : null;
  const { health, feed, medicines, range } = data;
  const label = (start: string) => periodLabel(start, range.groupBy, t, true);
  const deathsData = health.series.map((row) => ({ ...row, label: label(row.start) }));
  const feedData = feed.series.map((row) => ({ ...row, label: label(row.start) }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          tile={{
            label: t("farmer.analytics.deaths"),
            icon: HeartPulse,
            value: count(health.deaths),
            sub: t("farmer.analytics.health.naturalOnly"),
          }}
        />
        <StatTile
          tile={{
            label: t("farmer.analytics.health.deathRate"),
            icon: Percent,
            value: percent(health.deathRate, 2),
            valueClass: (health.deathRate ?? 0) >= 5 ? "text-red-600" : "",
            sub: t("farmer.analytics.health.ofBirds", { n: count(health.birdsBase) }),
          }}
        />
        <StatTile
          tile={{
            label: t("farmer.analytics.feed"),
            icon: Wheat,
            value: kg(feed.totalKg, 0),
            sub: t("farmer.analytics.health.feedCost", { amount: rupees(feed.cost) }),
          }}
        />
        <StatTile
          tile={{
            label: t("farmer.analytics.health.feedPerBird"),
            icon: Wheat,
            value: kg(feed.perBirdKg, 2),
            sub: t("farmer.analytics.health.feedPerBirdHint"),
          }}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title={t("farmer.analytics.health.deathsTitle")} icon={HeartPulse}>
          {health.deaths === 0 ? (
            <EmptyLine text={t("farmer.analytics.health.noDeaths")} />
          ) : (
            <>
              <ChartContainer config={deathsConfig} className="h-[200px] w-full">
                <BarChart data={deathsData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={20} />
                  <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ChartContainer>
              {health.reasons.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {health.reasons.map((row) => (
                    <span key={row.reason ?? "none"} className="rounded-full border px-2.5 py-1 text-xs">
                      {row.reason ?? t("farmer.analytics.health.noReason")} <strong className="ml-1">{count(row.count)}</strong>
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </Section>

        <Section title={t("farmer.analytics.health.feedTitle")} icon={Wheat}>
          {feed.totalKg === 0 ? (
            <EmptyLine text={t("farmer.analytics.health.noFeed")} />
          ) : (
            <>
              <ChartContainer config={feedConfig} className="h-[200px] w-full">
                <BarChart data={feedData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={20} />
                  <YAxis tickLine={false} axisLine={false} width={40} />
                  <ChartTooltip content={<ChartTooltipContent formatter={(value) => kg(Number(value), 1)} />} />
                  <Bar dataKey="kg" fill="var(--color-kg)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ChartContainer>
              <div className="mt-3 flex flex-wrap gap-2">
                {feed.byName.map((row) => (
                  <span key={row.name} className="rounded-full border px-2.5 py-1 text-xs">
                    {row.name} <strong className="ml-1">{kg(row.kg, 0)}</strong>
                  </span>
                ))}
              </div>
            </>
          )}
        </Section>
      </div>

      <Section title={t("farmer.analytics.health.medicineTitle")} icon={Pill}>
        {medicines.length === 0 ? (
          <EmptyLine text={t("farmer.analytics.health.noMedicine")} />
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 pr-3 text-left font-normal">{t("farmer.analytics.health.medicine")}</th>
                <th className="py-2 pr-3 text-right font-normal">{t("farmer.analytics.health.amount")}</th>
                <th className="py-2 text-right font-normal">{t("farmer.analytics.health.batches")}</th>
              </tr>
            </thead>
            <tbody>
              {medicines.map((row) => (
                <tr key={`${row.name}|${row.unit}`} className="border-b last:border-0">
                  <td className="py-2 pr-3">{row.name}</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-right">
                    {row.unit ? `${count(row.quantity, 2)} ${row.unit}` : "—"}
                  </td>
                  <td className="py-2 text-right text-muted-foreground">{count(row.batches)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}
