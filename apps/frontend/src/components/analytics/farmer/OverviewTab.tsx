"use client";

import Link from "next/link";
import { Bird, ChevronRight, HandCoins, HeartPulse, Receipt, Scale, TrendingUp, Wallet, Wheat } from "lucide-react";
import { Badge } from "@/common/components/ui/badge";
import { StatTile, rupees } from "@/components/dashboard/StatsCards";
import type { FarmerAnalyticsOverview } from "@/fetchers/analytics/farmerAnalyticsQueries";
import { useI18n } from "@/i18n/useI18n";
import { EmptyLine, FcrText, Section, count, moneyClass, percent, signedRupees } from "./shared";

export function OverviewTab({ data, loading }: { data?: FarmerAnalyticsOverview; loading: boolean }) {
  const { t } = useI18n();
  const tiles = data?.tiles;
  const allTime = data?.range.allTime ?? true;
  const periodSub = allTime ? t("farmer.analytics.overview.allTime") : t("farmer.analytics.overview.inDates");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          tile={{
            label: t("farmer.analytics.sales"),
            icon: TrendingUp,
            value: rupees(tiles?.sales ?? 0),
            sub: `${periodSub} · ${t("farmer.analytics.overview.bills", { n: count(tiles?.salesCount) })}`,
            loading,
          }}
        />
        <StatTile
          tile={{
            label: t("farmer.analytics.costs"),
            icon: Receipt,
            value: rupees(tiles?.costs ?? 0),
            sub: `${periodSub} · ${t("farmer.analytics.overview.entries", { n: count(tiles?.costsCount) })}`,
            loading,
          }}
        />
        <StatTile
          tile={{
            label: (tiles?.profit ?? 0) < 0 ? t("farmer.analytics.loss") : t("farmer.analytics.profit"),
            icon: Wallet,
            value: signedRupees(tiles?.profit ?? 0),
            valueClass: moneyClass(tiles?.profit ?? 0),
            sub: t("farmer.analytics.overview.salesMinusCosts"),
            loading,
          }}
        />
        <StatTile
          tile={{
            label: "FCR",
            icon: Wheat,
            value: tiles?.fcr != null ? tiles.fcr.toFixed(2) : "—",
            valueClass: tiles?.fcrIsOld ? "text-amber-600" : "",
            sub:
              tiles?.fcr == null
                ? t("farmer.analytics.overview.fcrNeedsWeights")
                : tiles.fcrIsOld
                  ? t("farmer.analytics.overview.fcrOldWeight")
                  : t("farmer.analytics.overview.fcrRunning", { n: tiles.fcrBatches }),
            loading,
          }}
        />
        <StatTile
          tile={{
            label: t("farmer.analytics.birdsAlive"),
            icon: Bird,
            value: count(tiles?.birdsAlive),
            sub: t("farmer.analytics.overview.inRunning", { n: count(tiles?.activeBatches) }),
            loading,
          }}
        />
        <StatTile
          tile={{
            label: t("farmer.analytics.deaths"),
            icon: HeartPulse,
            value: count(tiles?.deaths),
            valueClass: (tiles?.deathRate ?? 0) >= 5 ? "text-red-600" : "",
            sub: `${percent(tiles?.deathRate, 2)} · ${periodSub}`,
            loading,
          }}
        />
        <StatTile
          tile={{
            label: t("farmer.analytics.toReceive"),
            icon: HandCoins,
            value: rupees(tiles?.toReceive ?? 0),
            valueClass: (tiles?.toReceive ?? 0) > 0 ? "text-green-600" : "",
            sub: t("farmer.analytics.overview.todayAllFarms"),
            loading,
          }}
        />
        <StatTile
          tile={{
            label: t("farmer.analytics.toPay"),
            icon: Wallet,
            value: rupees(tiles?.toPay ?? 0),
            valueClass: (tiles?.toPay ?? 0) > 0 ? "text-red-600" : "",
            sub: t("farmer.analytics.overview.todayAllFarms"),
            loading,
          }}
        />
      </div>

      <Section
        title={t("farmer.analytics.overview.runningTitle")}
        icon={Scale}
        right={<span className="text-xs text-muted-foreground">{count(data?.running.length ?? 0)}</span>}
      >
        {!data?.running.length ? (
          <EmptyLine text={t("farmer.analytics.overview.noRunning")} />
        ) : (
          <ul className="divide-y">
            {data.running.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/farmer/dashboard/batches/${row.id}`}
                  className="flex items-center gap-3 py-2.5 hover:bg-muted/40 md:px-1"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{row.batchNumber}</span>
                      <Badge variant="secondary" className="font-normal">
                        {row.batchType === "LAYERS" ? t("farmer.analytics.layers") : t("farmer.analytics.broiler")}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {row.farmName} · {t("farmer.analytics.dayN", { n: row.day })}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                      <span>
                        {t("farmer.analytics.alive")} <strong className="text-foreground">{count(row.alive)}</strong>
                      </span>
                      <span>
                        {t("farmer.analytics.deaths")}{" "}
                        <strong className={row.deathPercent >= 5 ? "text-red-600" : "text-foreground"}>
                          {percent(row.deathPercent, 2)}
                        </strong>
                      </span>
                      <span>
                        {t("farmer.analytics.weight")}{" "}
                        <strong className="text-foreground">
                          {row.avgWeightKg != null ? `${row.avgWeightKg} kg` : "—"}
                        </strong>
                      </span>
                      {row.batchType === "BROILER" && (
                        <span>
                          FCR{" "}
                          <strong className="text-foreground">
                            <FcrText value={row.fcr} status={row.fcrStatus} t={t} />
                          </strong>
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
