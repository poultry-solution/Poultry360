"use client";

import {
  Building2,
  Layers,
  TrendingUp,
  DollarSign,
  CreditCard,
  Receipt,
} from "lucide-react";
import { useI18n } from "@/i18n/useI18n";

interface StatsCardsProps {
  farms: any[];
  activeBatches: any[];
  /** Total active batches from the server (the list may be shorter). */
  activeBatchCount?: number;
  lifetimeProfit: number;
  monthlyRevenue: number;
  monthlyRevenueGrowth: number;
  moneyToReceive: number;
  moneyToGive: number;
  totalExpenses: number;
  /** Customers who owe money now. */
  customersOwingCount?: number;
  /** Current Nepali month, e.g. "Ashwin 2083". */
  monthLabel?: string;
  statsLoading: boolean;
  onFarmsClick: () => void;
  onBatchesClick: () => void;
  onMoneyToReceiveClick: () => void;
  onMoneyToPayClick?: () => void;
}

export type Tile = {
  label: string;
  icon: typeof Building2;
  iconClass?: string;
  value: string | number;
  valueClass?: string;
  sub: string;
  loading?: boolean;
  onClick?: () => void;
};

/** Compact number tile; clickable tiles get a green hover edge. */
export function StatTile({ tile }: { tile: Tile }) {
  const Icon = tile.icon;
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-medium text-gray-600">{tile.label}</p>
        <Icon className={`h-3.5 w-3.5 shrink-0 ${tile.iconClass ?? "text-gray-400"}`} />
      </div>
      {tile.loading ? (
        <div className="my-1 h-6 w-20 animate-pulse rounded bg-gray-200" />
      ) : (
        <p className={`mt-0.5 truncate text-lg font-bold md:text-xl ${tile.valueClass ?? ""}`}>{tile.value}</p>
      )}
      <p className="truncate text-[11px] text-gray-500">{tile.sub}</p>
    </>
  );
  const base = "rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-left";
  return tile.onClick ? (
    <button
      type="button"
      onClick={tile.onClick}
      className={`${base} w-full transition-colors hover:border-primary hover:bg-green-50/50`}
    >
      {body}
    </button>
  ) : (
    <div className={base}>{body}</div>
  );
}

/** Nepali (lakh) grouping, whole rupees, same as the profit graph. */
export const rupees = (value: number) =>
  `रू ${Math.round(Number(value || 0)).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export function StatsCards({
  farms,
  activeBatches,
  activeBatchCount,
  lifetimeProfit,
  monthlyRevenue,
  monthlyRevenueGrowth,
  moneyToReceive,
  moneyToGive,
  totalExpenses,
  customersOwingCount,
  monthLabel,
  statsLoading,
  onFarmsClick,
  onBatchesClick,
  onMoneyToReceiveClick,
  onMoneyToPayClick,
}: StatsCardsProps) {
  const { t } = useI18n();
  const growth = Number(monthlyRevenueGrowth || 0);

  const mainTiles: Tile[] = [
    { label: t("farmer.dashboard.stats.farms"), icon: Building2, value: farms.length, sub: t("farmer.dashboard.stats.totalLocations"), onClick: onFarmsClick },
    { label: t("farmer.dashboard.stats.batches"), icon: Layers, value: activeBatchCount ?? activeBatches.length, sub: t("farmer.dashboard.stats.active"), onClick: onBatchesClick },
    {
      label: t("farmer.dashboard.stats.profit"),
      icon: TrendingUp,
      value: rupees(lifetimeProfit),
      valueClass: Number(lifetimeProfit) < 0 ? "text-red-600" : "text-gray-900",
      sub: `${t("farmer.dashboard.stats.allTime")} · sales − expenses`,
      loading: statsLoading,
    },
    {
      label: t("farmer.dashboard.stats.revenue"),
      icon: TrendingUp,
      value: rupees(monthlyRevenue),
      sub:
        growth !== 0
          ? `${growth > 0 ? "+" : ""}${growth.toFixed(1)}% vs same days last month · ${monthLabel ?? t("farmer.dashboard.stats.thisMonth")}`
          : `${monthLabel ?? t("farmer.dashboard.stats.thisMonth")} so far`,
      loading: statsLoading,
    },
  ];

  const moneyTiles: Tile[] = [
    {
      label: t("farmer.dashboard.stats.toReceive"),
      icon: DollarSign,
      iconClass: "text-green-600",
      value: rupees(moneyToReceive),
      valueClass: "text-green-700",
      sub:
        customersOwingCount === undefined
          ? t("farmer.dashboard.stats.creditSales")
          : customersOwingCount === 0
            ? "Nobody owes you"
            : `${customersOwingCount} customer${customersOwingCount === 1 ? "" : "s"} owe you`,
      loading: statsLoading,
      onClick: onMoneyToReceiveClick,
    },
    {
      label: t("farmer.dashboard.stats.toPay"),
      icon: CreditCard,
      iconClass: "text-red-500",
      value: rupees(moneyToGive),
      valueClass: "text-red-600",
      sub: t("farmer.dashboard.stats.suppliers"),
      loading: statsLoading,
      onClick: onMoneyToPayClick,
    },
    {
      label: t("farmer.dashboard.stats.expenses"),
      icon: Receipt,
      iconClass: "text-orange-500",
      value: rupees(totalExpenses),
      valueClass: "text-orange-600",
      sub: monthLabel ? `${monthLabel} so far` : t("farmer.dashboard.stats.thisMonth"),
      loading: statsLoading,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {mainTiles.map((tile) => <StatTile key={tile.label} tile={tile} />)}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {moneyTiles.map((tile, index) => (
          <div key={tile.label} className={index === 2 ? "col-span-2 md:col-span-1" : ""}>
            <StatTile tile={tile} />
          </div>
        ))}
      </div>
    </div>
  );
}
