import type { HatcheryBatchType } from "@/fetchers/hatchery/hatcheryBatchQueries";
import { BS_MONTH_NAMES, convertADtoBS } from "@/common/lib/nepali-date";

export type AnalyticsTab = "overview" | "batches" | "incubations" | "production" | "sales";

export const ANALYTICS_TABS: { id: AnalyticsTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "batches", label: "Batches" },
  { id: "incubations", label: "Incubations" },
  { id: "production", label: "Production" },
  { id: "sales", label: "Sales" },
];

export const MIX_COLORS = ["#16a34a", "#2563eb", "#f59e0b"];

export type AnalyticsBatchTypeFilter = "all" | HatcheryBatchType;
export type IncubationStageFilter = "all" | "SETTER" | "CANDLING" | "HATCHER" | "COMPLETED";
export type SaleTypeFilter = "ALL" | "EGG" | "PARENT" | "CHICK";

export function formatMoney(value: number | string | null | undefined) {
  return `रू ${new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Number(value || 0))}`;
}

export function formatCompactMoney(value: number | string | null | undefined) {
  return `रू ${new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value || 0))}`;
}

/** Ranges longer than this show one point per Nepali month. */
export const DAILY_TREND_MAX_DAYS = 62;

export const STAGE_LABEL: Record<"SETTER" | "CANDLING" | "HATCHER" | "COMPLETED", string> = {
  SETTER: "In setter",
  CANDLING: "Candled",
  HATCHER: "In hatcher",
  COMPLETED: "Hatched",
};

export const SALE_TYPE_LABEL: Record<"EGG" | "PARENT" | "CHICK", string> = {
  EGG: "Eggs",
  PARENT: "Parent birds",
  CHICK: "Chicks",
};

function bsParts(adDate: string) {
  try {
    const [year, month, day] = convertADtoBS(adDate.slice(0, 10)).split("-").map(Number);
    return { year, month, day };
  } catch {
    return null;
  }
}

/**
 * Daily rows from the server, shown per day ("Kartik 12") for short ranges
 * or added up per Nepali month ("Kartik '83") for long ones.
 */
export function bucketTrend<K extends string>(
  rows: Array<{ date: string } & Record<K, number>>,
  keys: readonly K[],
  byMonth: boolean
): Array<{ label: string } & Record<K, number>> {
  const out = new Map<string, { label: string } & Record<K, number>>();
  for (const row of rows) {
    const bs = bsParts(row.date);
    const key = !bs ? row.date : byMonth ? `${bs.year}-${bs.month}` : row.date.slice(0, 10);
    const label = !bs
      ? row.date.slice(0, 10)
      : byMonth
        ? `${BS_MONTH_NAMES[bs.month - 1]} '${String(bs.year).slice(-2)}`
        : `${BS_MONTH_NAMES[bs.month - 1]} ${bs.day}`;
    let entry = out.get(key);
    if (!entry) {
      entry = { label } as { label: string } & Record<K, number>;
      for (const k of keys) (entry as Record<K, number>)[k] = 0;
      out.set(key, entry);
    }
    for (const k of keys) (entry as Record<K, number>)[k] += Number(row[k] || 0);
  }
  return Array.from(out.values());
}
