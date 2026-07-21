import { useQuery } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";
import type { HatcheryBatchType } from "./hatcheryBatchQueries";

export interface HatcheryAnalyticsOverviewParams {
  startDate?: string;
  endDate?: string;
}

export interface HatcheryAnalyticsOverview {
  applied: {
    startDate: string;
    endDate: string;
  };
  overview: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    eggSalesRevenue: number;
    parentSalesRevenue: number;
    chickSalesRevenue: number;
    totalBatches: number;
    activeBatches: number;
    totalIncubations: number;
    activeIncubations: number;
    totalEggStock: number;
    totalProducedChicks: number;
    totalSupplierBalance: number;
    totalPartyBalance: number;
  };
  comparison: {
    current: {
      revenue: number;
      expenses: number;
      profit: number;
    };
    previous: {
      revenue: number;
      expenses: number;
      profit: number;
    };
    revenueGrowthPct: number;
    profitGrowthPct: number;
  };
  trends: {
    daily: Array<{
      date: string;
      label: string;
      revenue: number;
      expenses: number;
      profit: number;
    }>;
  };
  mix: {
    eggSalesRevenue: number;
    parentSalesRevenue: number;
    chickSalesRevenue: number;
  };
  highlights: {
    activeBatches: Array<{
      id: string;
      code: string;
      name: string | null;
      type: HatcheryBatchType;
    }>;
    activeIncubations: Array<{
      id: string;
      code: string;
      name: string | null;
      stage: string;
    }>;
  };
}

export interface HatcheryAnalyticsBatchRow {
  id: string;
  code: string;
  name: string | null;
  type: HatcheryBatchType;
  status: "ACTIVE" | "CLOSED";
  startDate: string;
  endDate: string | null;
  currentParents: number | null;
  initialParents: number | null;
  mortality: number;
  mortalityRate: number;
  expenses: number;
  eggSalesRevenue: number;
  parentSalesRevenue: number;
  chickSalesRevenue: number;
  revenue: number;
  profit: number;
  incubations: number;
  eggsSet: number;
  producedChicks: number;
  soldChicks: number;
  hatchabilityRate: number;
}

export interface HatcheryAnalyticsBatchesResponse {
  applied: HatcheryAnalyticsOverview["applied"];
  summary: {
    totalBatches: number;
    activeBatches: number;
    closedBatches: number;
    totalMortality: number;
    totalExpenses: number;
    totalRevenue: number;
    totalProfit: number;
    totalEggSales: number;
    totalParentSales: number;
    totalChickSales: number;
    totalIncubations: number;
    totalEggsSet: number;
    totalProducedChicks: number;
    totalSoldChicks: number;
    averageMortalityRate: number;
    averageProfitPerBatch: number;
  };
  batches: HatcheryAnalyticsBatchRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface HatcheryAnalyticsIncubationRow {
  id: string;
  code: string;
  name: string | null;
  stage: "SETTER" | "CANDLING" | "HATCHER" | "COMPLETED";
  startDate: string;
  eggsSetCount: number;
  parentBatchId: string;
  parentBatch: { id: string; code: string; name: string | null } | null;
  candlingLoss: number;
  lateDead: number;
  unhatched: number;
  fertileEggs: number;
  totalHatchedA: number;
  totalHatchedB: number;
  totalCull: number;
  totalHatched: number;
  chickSalesCount: number;
  chickSalesRevenue: number;
  currentChickStock: number;
  hatchability: number;
  hatchOfTotal: number;
}

export interface HatcheryAnalyticsIncubationsResponse {
  applied: {
    startDate: string;
    endDate: string;
    parentBatchId: string | null;
    stage: "SETTER" | "CANDLING" | "HATCHER" | "COMPLETED" | null;
  };
  summary: {
    totalIncubations: number;
    setter: number;
    candling: number;
    hatcher: number;
    completed: number;
    totalEggsSet: number;
    totalCandlingLoss: number;
    totalLateDead: number;
    totalUnhatched: number;
    totalFertileEggs: number;
    totalHatched: number;
    totalHatchedA: number;
    totalHatchedB: number;
    totalCull: number;
    totalChickSalesCount: number;
    totalChickSalesRevenue: number;
    totalCurrentChickStock: number;
    averageHatchability: number;
    averageHatchOfTotal: number;
  };
  incubations: HatcheryAnalyticsIncubationRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface HatcheryAnalyticsProductionRow {
  id: string;
  batchId: string;
  date: string;
  note: string | null;
  batch: {
    id: string;
    code: string;
    name: string | null;
    status: "ACTIVE" | "CLOSED";
  };
  total: number;
  hatchableTotal: number;
  nonHatchableTotal: number;
  lines: Array<{
    id: string;
    eggTypeId: string;
    count: number;
    eggType: {
      id: string;
      name: string;
      isHatchable: boolean;
    };
  }>;
}

export interface HatcheryAnalyticsProductionResponse {
  applied: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalRecords: number;
    totalEggs: number;
    hatchableEggs: number;
    nonHatchableEggs: number;
    averagePerRecord: number;
    hatchableShare: number;
    uniqueBatches: number;
  };
  trends: {
    daily: Array<{
      date: string;
      label: string;
      total: number;
      hatchable: number;
      nonHatchable: number;
    }>;
  };
  typeTotals: Array<{
    eggTypeId: string;
    name: string;
    isHatchable: boolean;
    total: number;
  }>;
  topBatches: Array<{
    id: string;
    code: string;
    name: string | null;
    total: number;
    records: number;
  }>;
  productions: HatcheryAnalyticsProductionRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface HatcheryAnalyticsSaleRow {
  id: string;
  saleType: "EGG" | "PARENT" | "CHICK";
  date: string;
  batchCode: string;
  batchName: string | null;
  sourceCode: string | null;
  sourceName: string | null;
  partyName: string | null;
  partyPhone: string | null;
  itemLabel: string;
  count: number;
  amount: number;
  note: string | null;
  grade: string | null;
  saleable: boolean;
}

export interface HatcheryAnalyticsSalesResponse {
  applied: {
    startDate: string;
    endDate: string;
    saleType: "ALL" | "EGG" | "PARENT" | "CHICK";
  };
  summary: {
    totalSales: number;
    totalRevenue: number;
    averageSaleValue: number;
    eggRevenue: number;
    parentRevenue: number;
    chickRevenue: number;
    eggSales: number;
    parentSales: number;
    chickSales: number;
    eggCount: number;
    parentCount: number;
    chickCount: number;
    uniqueBatches: number;
    uniqueParties: number;
  };
  trends: {
    daily: Array<{
      date: string;
      label: string;
      revenue: number;
      sales: number;
    }>;
  };
  topBatches: Array<{
    code: string;
    name: string | null;
    total: number;
    records: number;
  }>;
  topParties: Array<{
    name: string;
    phone: string | null;
    total: number;
    records: number;
  }>;
  sales: HatcheryAnalyticsSaleRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const hatcheryAnalyticsKeys = {
  all: ["hatchery-analytics"] as const,
  overview: (params: HatcheryAnalyticsOverviewParams) =>
    [...hatcheryAnalyticsKeys.all, "overview", params] as const,
  batches: (params: HatcheryAnalyticsOverviewParams & { page: number; limit: number }) =>
    [...hatcheryAnalyticsKeys.all, "batches", params] as const,
  incubations: (
    params: HatcheryAnalyticsOverviewParams & {
      page: number;
      limit: number;
      stage?: string;
      parentBatchId?: string;
    }
  ) => [...hatcheryAnalyticsKeys.all, "incubations", params] as const,
  production: (params: HatcheryAnalyticsOverviewParams & { page: number; limit: number }) =>
    [...hatcheryAnalyticsKeys.all, "production", params] as const,
  sales: (
    params: HatcheryAnalyticsOverviewParams & {
      page: number;
      limit: number;
      saleType?: string;
    }
  ) => [...hatcheryAnalyticsKeys.all, "sales", params] as const,
};

export function useGetHatcheryAnalyticsOverview(params: HatcheryAnalyticsOverviewParams) {
  return useQuery({
    queryKey: hatcheryAnalyticsKeys.overview(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.startDate) searchParams.set("startDate", params.startDate);
      if (params.endDate) searchParams.set("endDate", params.endDate);
      const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
      const { data } = await axiosInstance.get<{ success: boolean; data: HatcheryAnalyticsOverview }>(
        `/hatchery/analytics/overview${suffix}`
      );
      return data.data;
    },
  });
}

export function useGetHatcheryAnalyticsBatches(
  params: HatcheryAnalyticsOverviewParams & { page: number; limit: number },
  enabled = true
) {
  return useQuery({
    queryKey: hatcheryAnalyticsKeys.batches(params),
    enabled,
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.startDate) searchParams.set("startDate", params.startDate);
      if (params.endDate) searchParams.set("endDate", params.endDate);
      searchParams.set("page", String(params.page));
      searchParams.set("limit", String(params.limit));
      const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
      const { data } = await axiosInstance.get<{ success: boolean; data: HatcheryAnalyticsBatchesResponse }>(
        `/hatchery/analytics/batches${suffix}`
      );
      return data.data;
    },
  });
}

export function useGetHatcheryAnalyticsIncubations(
  params: HatcheryAnalyticsOverviewParams & {
    page: number;
    limit: number;
    stage?: string;
    parentBatchId?: string;
  },
  enabled = true
) {
  return useQuery({
    queryKey: hatcheryAnalyticsKeys.incubations(params),
    enabled,
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.startDate) searchParams.set("startDate", params.startDate);
      if (params.endDate) searchParams.set("endDate", params.endDate);
      if (params.stage) searchParams.set("stage", params.stage);
      if (params.parentBatchId) searchParams.set("parentBatchId", params.parentBatchId);
      searchParams.set("page", String(params.page));
      searchParams.set("limit", String(params.limit));
      const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
      const { data } = await axiosInstance.get<{ success: boolean; data: HatcheryAnalyticsIncubationsResponse }>(
        `/hatchery/analytics/incubations${suffix}`
      );
      return data.data;
    },
  });
}

export function useGetHatcheryAnalyticsProduction(
  params: HatcheryAnalyticsOverviewParams & { page: number; limit: number },
  enabled = true
) {
  return useQuery({
    queryKey: hatcheryAnalyticsKeys.production(params),
    enabled,
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.startDate) searchParams.set("startDate", params.startDate);
      if (params.endDate) searchParams.set("endDate", params.endDate);
      searchParams.set("page", String(params.page));
      searchParams.set("limit", String(params.limit));
      const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
      const { data } = await axiosInstance.get<{ success: boolean; data: HatcheryAnalyticsProductionResponse }>(
        `/hatchery/analytics/production${suffix}`
      );
      return data.data;
    },
  });
}

export function useGetHatcheryAnalyticsSales(
  params: HatcheryAnalyticsOverviewParams & {
    page: number;
    limit: number;
    saleType?: string;
  },
  enabled = true
) {
  return useQuery({
    queryKey: hatcheryAnalyticsKeys.sales(params),
    enabled,
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.startDate) searchParams.set("startDate", params.startDate);
      if (params.endDate) searchParams.set("endDate", params.endDate);
      if (params.saleType) searchParams.set("saleType", params.saleType);
      searchParams.set("page", String(params.page));
      searchParams.set("limit", String(params.limit));
      const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
      const { data } = await axiosInstance.get<{ success: boolean; data: HatcheryAnalyticsSalesResponse }>(
        `/hatchery/analytics/sales${suffix}`
      );
      return data.data;
    },
  });
}
