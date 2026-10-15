"use client";

import Link from "next/link";
import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";
import { Egg, Package, Percent, TrendingUp } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/common/components/ui/chart";
import { StatTile, rupees } from "@/components/dashboard/StatsCards";
import { formatRupeesExact } from "@/common/lib/utils";
import type { FarmerEggsAnalytics } from "@/fetchers/analytics/farmerAnalyticsQueries";
import { useI18n } from "@/i18n/useI18n";
import { EmptyLine, Section, ShareBars, TabLoading, count, moneyClass, percent, periodLabel, signedRupees } from "./shared";

const eggConfig = {
  eggs: { label: "Eggs laid", color: "#f59e0b" },
  sold: { label: "Eggs sold", color: "#2563eb" },
  layingPercent: { label: "Laying %", color: "#16a34a" },
} satisfies ChartConfig;

export function EggsTab({ data, loading }: { data?: FarmerEggsAnalytics; loading: boolean }) {
  const { t } = useI18n();
  if (!data) return loading ? <TabLoading /> : null;
  if (!data.hasLayers) return <EmptyLine text={t("farmer.analytics.eggs.noLayers")} />;
  const { totals, series, range } = data;
  const chartData = series.map((row) => ({ ...row, label: periodLabel(row.start, range.groupBy, t, true) }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile tile={{ label: t("farmer.analytics.eggs.laid"), icon: Egg, value: count(totals.eggsLaid), sub: t("farmer.analytics.eggs.inStock", { n: count(totals.stock) }) }} />
        <StatTile tile={{ label: t("farmer.analytics.eggs.layingPercent"), icon: Percent, value: percent(totals.layingPercent, 1), sub: t("farmer.analytics.eggs.layingHint") }} />
        <StatTile tile={{ label: t("farmer.analytics.eggs.sold"), icon: TrendingUp, value: count(totals.eggsSold), sub: rupees(totals.eggSales) }} />
        <StatTile
          tile={{
            label: t("farmer.analytics.eggs.costPerEgg"),
            icon: Package,
            value: totals.costPerEgg != null ? formatRupeesExact(totals.costPerEgg) : "—",
            sub: t("farmer.analytics.eggs.costPerEggHint"),
          }}
        />
      </div>

      <Section title={t("farmer.analytics.eggs.chartTitle")} icon={Egg}>
        {!series.some((row) => row.eggs || row.sold) ? (
          <EmptyLine text={t("farmer.analytics.eggs.noEggs")} />
        ) : (
          <>
            <ChartContainer config={eggConfig} className="h-[240px] w-full">
              <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={20} />
                <YAxis yAxisId="eggs" tickLine={false} axisLine={false} width={48} />
                <YAxis yAxisId="pct" orientation="right" tickLine={false} axisLine={false} width={36} domain={[0, 100]} unit="%" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar yAxisId="eggs" dataKey="eggs" fill="var(--color-eggs)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                <Bar yAxisId="eggs" dataKey="sold" fill="var(--color-sold)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                <Line yAxisId="pct" dataKey="layingPercent" stroke="var(--color-layingPercent)" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
              </ComposedChart>
            </ChartContainer>
            <div className="mt-1 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-amber-500" /> {t("farmer.analytics.eggs.laid")}</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-blue-600" /> {t("farmer.analytics.eggs.sold")}</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-3 bg-green-600" /> {t("farmer.analytics.eggs.layingPercent")}</span>
            </div>
          </>
        )}
      </Section>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title={t("farmer.analytics.eggs.byType")} icon={Egg}>
          {data.byType.length === 0 ? (
            <EmptyLine text={t("farmer.analytics.eggs.noEggs")} />
          ) : (
            <ShareBars rows={data.byType.map((row) => ({ label: row.name, value: row.count }))} colorFor={() => "bg-amber-500"} format={(v) => count(v)} />
          )}
        </Section>
        <Section title={t("farmer.analytics.eggs.batchesTitle")} icon={TrendingUp}>
          <ul className="divide-y text-sm">
            {data.batches.map((row) => (
              <li key={row.id} className="py-2">
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/farmer/dashboard/batches/${row.id}`} className="font-medium hover:underline">
                    {row.batchNumber}
                  </Link>
                  <span className={`font-medium ${moneyClass(row.profit)}`}>{signedRupees(row.profit)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {row.farmName} · {t("farmer.analytics.dayN", { n: row.day })} · {t("farmer.analytics.eggs.hens", { n: count(row.hens) })} ·{" "}
                  {t("farmer.analytics.eggs.laidN", { n: count(row.eggsLaid) })} · {percent(row.layingPercent, 1)}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">{t("farmer.analytics.eggs.profitHint")}</p>
        </Section>
      </div>
    </div>
  );
}
