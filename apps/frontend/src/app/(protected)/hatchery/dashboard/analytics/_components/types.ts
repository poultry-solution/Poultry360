import type { HatcheryBatchType } from "@/fetchers/hatchery/hatcheryBatchQueries";

export type AnalyticsTab = "overview" | "batches" | "incubations" | "production" | "sales";

export type AnalyticsRangePreset = "7d" | "30d" | "90d" | "ytd";

export const ANALYTICS_TABS: { id: AnalyticsTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "batches", label: "Batches" },
  { id: "incubations", label: "Incubations" },
  { id: "production", label: "Production" },
  { id: "sales", label: "Sales" },
];

export const QUICK_RANGES = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "ytd", label: "Year to date" },
] as const;

export const MIX_COLORS = ["#16a34a", "#2563eb", "#f59e0b"];

export type AnalyticsBatchTypeFilter = "all" | HatcheryBatchType;
export type IncubationStageFilter = "all" | "SETTER" | "CANDLING" | "HATCHER" | "COMPLETED";
export type SaleTypeFilter = "ALL" | "EGG" | "PARENT" | "CHICK";

export function formatMoney(value: number | string | null | undefined) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "NPR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function formatCompactMoney(value: number | string | null | undefined) {
  return `NPR ${new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value || 0))}`;
}

export function toInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfYear(date: Date) {
  return new Date(date.getFullYear(), 0, 1);
}

export function getRangeBounds(preset: AnalyticsRangePreset) {
  const today = new Date();
  const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startDate = new Date(endDate);

  if (preset === "7d") {
    startDate.setDate(endDate.getDate() - 6);
  } else if (preset === "30d") {
    startDate.setDate(endDate.getDate() - 29);
  } else if (preset === "90d") {
    startDate.setDate(endDate.getDate() - 89);
  } else {
    return {
      startDate: toInputDate(startOfYear(endDate)),
      endDate: toInputDate(endDate),
    };
  }

  return {
    startDate: toInputDate(startDate),
    endDate: toInputDate(endDate),
  };
}
