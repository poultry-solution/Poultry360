import { keepPreviousData, useQuery } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

/**
 * Farmer analytics. Dates are Nepal days ("YYYY-MM-DD" AD). No dates = all time.
 * Period numbers follow the dates; per-batch numbers are whole batch life.
 */

export type FarmerAnalyticsBatchType = "BROILER" | "LAYERS";
export type FarmerAnalyticsGroupBy = "daily" | "weekly" | "monthly";
export type FarmerReportType = "money" | "batches" | "sales" | "costs" | "deaths" | "eggs";
export type FcrStatus = "FRESH" | "STALE" | "WEIGHT_REQUIRED" | "FINAL" | "NOT_CALCULABLE";

export interface FarmerAnalyticsParams {
  farmId?: string;
  batchId?: string;
  batchType?: FarmerAnalyticsBatchType;
  startDate?: string;
  endDate?: string;
}

export interface AnalyticsRangeInfo {
  startDay: string;
  endDay: string;
  groupBy: FarmerAnalyticsGroupBy;
  allTime: boolean;
}

export interface BatchStatRow {
  id: string;
  batchNumber: string;
  batchType: FarmerAnalyticsBatchType;
  status: "ACTIVE" | "COMPLETED";
  farmName: string;
  startDate: string;
  endDate: string | null;
  day: number;
  started: number;
  sold: number;
  died: number;
  leftAtClose: number;
  alive: number;
  deathPercent: number;
  feedKg: number;
  avgWeightKg: number | null;
  fcr: number | null;
  fcrStatus: FcrStatus | null;
  sales: number;
  costs: number;
  profit: number;
  costPerBird: number | null;
  profitPerBird: number | null;
}

export interface FarmerAnalyticsOverview {
  filters: {
    farms: Array<{ id: string; name: string }>;
    batches: Array<{
      id: string;
      batchNumber: string;
      batchType: FarmerAnalyticsBatchType;
      status: "ACTIVE" | "COMPLETED";
      farmName: string;
    }>;
  };
  range: AnalyticsRangeInfo;
  hasLayers: boolean;
  tiles: {
    sales: number;
    costs: number;
    profit: number;
    salesCount: number;
    costsCount: number;
    toReceive: number;
    customersOwing: number;
    toPay: number;
    birdsAlive: number;
    activeBatches: number;
    deaths: number;
    deathRate: number | null;
    fcr: number | null;
    /** True when no running batch has an up-to-date weight; FCR is from old weights. */
    fcrIsOld: boolean;
    fcrBatches: number;
  };
  running: Array<
    Pick<
      BatchStatRow,
      "id" | "batchNumber" | "batchType" | "farmName" | "day" | "started" | "alive" | "deathPercent" | "avgWeightKg" | "fcr" | "fcrStatus"
    >
  >;
}

export interface FarmerMoneyAnalytics {
  range: AnalyticsRangeInfo;
  totals: { sales: number; costs: number; profit: number; salesCount: number; costsCount: number };
  series: Array<{ start: string; sales: number; costs: number; profit: number }>;
  costsByType: Array<{ name: string; amount: number }>;
  salesByItem: Array<{ itemType: string; amount: number }>;
}

export interface FarmerBatchesAnalytics {
  range: AnalyticsRangeInfo;
  batches: BatchStatRow[];
}

export interface FarmerHealthFeedAnalytics {
  range: AnalyticsRangeInfo;
  health: {
    deaths: number;
    deathRate: number | null;
    birdsBase: number;
    series: Array<{ start: string; count: number }>;
    reasons: Array<{ reason: string | null; count: number }>;
  };
  feed: {
    totalKg: number;
    perBirdKg: number | null;
    cost: number;
    series: Array<{ start: string; kg: number }>;
    byName: Array<{ name: string; kg: number }>;
  };
  medicines: Array<{ name: string; unit: string | null; quantity: number; batches: number }>;
}

export type FarmerEggsAnalytics =
  | { range: AnalyticsRangeInfo; hasLayers: false }
  | {
      range: AnalyticsRangeInfo;
      hasLayers: true;
      totals: {
        eggsLaid: number;
        eggsSold: number;
        eggSales: number;
        layingPercent: number | null;
        costPerEgg: number | null;
        stock: number;
      };
      series: Array<{ start: string; eggs: number; sold: number; layingPercent: number | null }>;
      byType: Array<{ name: string; count: number }>;
      batches: Array<{
        id: string;
        batchNumber: string;
        farmName: string;
        day: number;
        hens: number;
        eggsLaid: number;
        layingPercent: number | null;
        sales: number;
        costs: number;
        profit: number;
      }>;
    };

export interface FarmerReport {
  type: FarmerReportType;
  range: AnalyticsRangeInfo;
  rows: Array<Record<string, any>>;
  totals?: { sales: number; costs: number; profit: number };
  truncated: boolean;
  limit: number;
}

export const farmerAnalyticsQueryKeys = {
  all: ["farmer-analytics"] as const,
  tab: (tab: string, params: FarmerAnalyticsParams) => ["farmer-analytics", tab, params] as const,
};

const cleanParams = (params: FarmerAnalyticsParams) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value != null && value !== "" && value !== "all"));

function useAnalytics<T>(tab: string, path: string, params: FarmerAnalyticsParams, enabled: boolean) {
  return useQuery({
    queryKey: farmerAnalyticsQueryKeys.tab(tab, params),
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/analytics/farmer/${path}`, { params: cleanParams(params) });
      return data.data as T;
    },
    enabled,
    // Keep showing the last numbers while new filters load (no flicker, picks don't reset).
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export const useFarmerAnalyticsOverview = (params: FarmerAnalyticsParams, enabled = true) =>
  useAnalytics<FarmerAnalyticsOverview>("overview", "overview", params, enabled);
export const useFarmerMoneyAnalytics = (params: FarmerAnalyticsParams, enabled = true) =>
  useAnalytics<FarmerMoneyAnalytics>("money", "finance", params, enabled);
export const useFarmerBatchesAnalytics = (params: FarmerAnalyticsParams, enabled = true) =>
  useAnalytics<FarmerBatchesAnalytics>("batches", "flock-comparison", params, enabled);
export const useFarmerHealthFeedAnalytics = (params: FarmerAnalyticsParams, enabled = true) =>
  useAnalytics<FarmerHealthFeedAnalytics>("health-feed", "operations", params, enabled);
export const useFarmerEggsAnalytics = (params: FarmerAnalyticsParams, enabled = true) =>
  useAnalytics<FarmerEggsAnalytics>("eggs", "production", params, enabled);

export async function fetchFarmerReport(type: FarmerReportType, params: FarmerAnalyticsParams) {
  const { data } = await axiosInstance.get("/analytics/farmer/reports", {
    params: { ...cleanParams(params), reportType: type },
  });
  return data.data as FarmerReport;
}
