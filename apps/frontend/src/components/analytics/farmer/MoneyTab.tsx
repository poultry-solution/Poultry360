"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { BarChart3, Receipt, TrendingUp, Wallet } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/common/components/ui/chart";
import { StatTile, rupees } from "@/components/dashboard/StatsCards";
import type { FarmerMoneyAnalytics } from "@/fetchers/analytics/farmerAnalyticsQueries";
import { useI18n } from "@/i18n/useI18n";
import { EmptyLine, Section, ShareBars, TabLoading, axisMoney, moneyClass, periodLabel, signedRupees } from "./shared";

const chartConfig = {
  sales: { label: "Sales", color: "#16a34a" },
  costs: { label: "Costs", color: "#ef4444" },
} satisfies ChartConfig;

const COST_COLORS: Record<string, string> = {
  Feed: "bg-blue-500",
  Chicks: "bg-green-500",
  Hatchery: "bg-green-500",
  Medicine: "bg-purple-500",
  Labour: "bg-amber-500",
};

export function MoneyTab({ data, loading }: { data?: FarmerMoneyAnalytics; loading: boolean }) {
  const { t } = useI18n();
  if (!data) return loading ? <TabLoading /> : null;
  const { totals, series, range } = data;
  const itemLabel = (itemType: string) => {
    const key = `farmer.analytics.items.${itemType}`;
    const label = t(key);
    return label === key ? itemType : label;
  };
  const chartData = series.map((row) => ({ ...row, label: periodLabel(row.start, range.groupBy, t, true) }));
  const hasMoney = series.some((row) => row.sales || row.costs);
  const nonEmptyRows = [...series].filter((row) => row.sales || row.costs).reverse();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatTile tile={{ label: t("farmer.analytics.sales"), icon: TrendingUp, value: rupees(totals.sales), sub: t("farmer.analytics.overview.bills", { n: totals.salesCount }) }} />
        <StatTile tile={{ label: t("farmer.analytics.costs"), icon: Receipt, value: rupees(totals.costs), sub: t("farmer.analytics.overview.entries", { n: totals.costsCount }) }} />
        <StatTile
          tile={{
            label: totals.profit < 0 ? t("farmer.analytics.loss") : t("farmer.analytics.profit"),
            icon: Wallet,
            value: signedRupees(totals.profit),
            valueClass: moneyClass(totals.profit),
            sub: t("farmer.analytics.overview.salesMinusCosts"),
          }}
        />
      </div>

      <Section title={t("farmer.analytics.money.chartTitle")} icon={BarChart3}>
        {!hasMoney ? (
          <EmptyLine text={t("farmer.analytics.money.noMoney")} />
        ) : (
          <>
            <ChartContainer config={chartConfig} className="h-[240px] w-full">
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={20} />
                <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={axisMoney} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => (
                        <div className="flex min-w-[130px] justify-between gap-4">
                          <span className="text-muted-foreground">
                            {name === "sales" ? t("farmer.analytics.sales") : t("farmer.analytics.costs")}
                          </span>
                          <span className="font-medium">{rupees(Number(value))}</span>
                        </div>
                      )}
                    />
                  }
                />
                <Bar dataKey="sales" fill="var(--color-sales)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="costs" fill="var(--color-costs)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ChartContainer>
            <div className="mt-1 flex justify-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-green-600" /> {t("farmer.analytics.sales")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-red-500" /> {t("farmer.analytics.costs")}
              </span>
            </div>
          </>
        )}
      </Section>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title={t("farmer.analytics.money.costsByType")} icon={Receipt}>
          {data.costsByType.length === 0 ? (
            <EmptyLine text={t("farmer.analytics.money.noCosts")} />
          ) : (
            <ShareBars
              rows={data.costsByType.map((row) => ({ label: row.name, value: row.amount }))}
              colorFor={(label) => COST_COLORS[label] ?? "bg-gray-400"}
              format={rupees}
            />
          )}
        </Section>
        <Section title={t("farmer.analytics.money.salesByItem")} icon={TrendingUp}>
          {data.salesByItem.length === 0 ? (
            <EmptyLine text={t("farmer.analytics.money.noSales")} />
          ) : (
            <ShareBars
              rows={data.salesByItem.map((row) => ({ label: itemLabel(row.itemType), value: row.amount }))}
              colorFor={() => "bg-green-500"}
              format={rupees}
            />
          )}
        </Section>
      </div>

      <Section title={t("farmer.analytics.money.tableTitle")}>
        {nonEmptyRows.length === 0 ? (
          <EmptyLine text={t("farmer.analytics.money.noMoney")} />
        ) : (
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-3 text-left font-normal">{t("farmer.analytics.period")}</th>
                  <th className="py-2 pr-3 text-right font-normal">{t("farmer.analytics.sales")}</th>
                  <th className="py-2 pr-3 text-right font-normal">{t("farmer.analytics.costs")}</th>
                  <th className="py-2 text-right font-normal">{t("farmer.analytics.profit")}</th>
                </tr>
              </thead>
              <tbody>
                {nonEmptyRows.map((row) => (
                  <tr key={row.start} className="border-b last:border-0">
                    <td className="whitespace-nowrap py-2 pr-3">{periodLabel(row.start, range.groupBy, t)}</td>
                    <td className="whitespace-nowrap py-2 pr-3 text-right">{rupees(row.sales)}</td>
                    <td className="whitespace-nowrap py-2 pr-3 text-right">{rupees(row.costs)}</td>
                    <td className={`whitespace-nowrap py-2 text-right font-medium ${moneyClass(row.profit)}`}>
                      {signedRupees(row.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t font-semibold">
                  <td className="py-2 pr-3">{t("farmer.analytics.total")}</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-right">{rupees(totals.sales)}</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-right">{rupees(totals.costs)}</td>
                  <td className={`whitespace-nowrap py-2 text-right ${moneyClass(totals.profit)}`}>{signedRupees(totals.profit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}
