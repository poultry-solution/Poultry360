import { useQuery } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

export type FarmerAnalyticsBatchType = "BROILER" | "LAYERS";
export type FarmerAnalyticsBatchStatus = "ACTIVE" | "COMPLETED";
export type FarmerAnalyticsGroupBy = "daily" | "weekly" | "monthly";

export interface FarmerAnalyticsOverviewParams {
  farmId?: string;
  batchId?: string;
  batchType?: FarmerAnalyticsBatchType;
  status?: FarmerAnalyticsBatchStatus;
  startDate?: string;
  endDate?: string;
  groupBy?: FarmerAnalyticsGroupBy;
}

export interface FarmerAnalyticsOverview {
  filters: {
    farms: Array<{
      id: string;
      name: string;
    }>;
    batches: Array<{
      id: string;
      batchNumber: string;
      batchType: FarmerAnalyticsBatchType;
      status: FarmerAnalyticsBatchStatus;
      startDate: string;
      farmId: string;
      farmName: string;
    }>;
    applied: {
      farmId: string | null;
      batchId: string | null;
      batchType: FarmerAnalyticsBatchType | null;
      status: FarmerAnalyticsBatchStatus | null;
      startDate: string | null;
      endDate: string | null;
      groupBy: FarmerAnalyticsGroupBy;
    };
  };
  summary: {
    totalFarms: number;
    activeBatches: number;
    totalBirds: number;
    currentBirds: number;
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    moneyToReceive: number;
    moneyToPay: number;
  };
}

export interface FarmerFinanceAnalytics {
  totals: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    salesCount: number;
    expenseCount: number;
  };
  trend: Array<{
    period: string;
    label: string;
    revenue: number;
    expenses: number;
    profit: number;
  }>;
  expenseCategories: Array<{
    categoryId: string;
    categoryName: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
  table: Array<{
    period: string;
    label: string;
    revenue: number;
    expenses: number;
    profit: number;
  }>;
}

export interface FarmerFlockComparisonAnalytics {
  rows: Array<{
    batchId: string;
    batchNumber: string;
    farmId: string;
    farmName: string;
    batchType: FarmerAnalyticsBatchType;
    status: FarmerAnalyticsBatchStatus;
    startDate: string;
    endDate: string | null;
    ageDays: number;
    initialBirds: number;
    currentBirds: number;
    naturalMortality: number;
    totalMortality: number;
    mortalityRate: number;
    revenue: number;
    expense: number;
    profit: number;
    costPerBird: number;
    profitPerBird: number;
    feedConsumed: number;
  }>;
  charts: {
    profitByBatch: Array<{
      batchId: string;
      batchNumber: string;
      farmName: string;
      profit: number;
    }>;
    costPerBirdByBatch: Array<{
      batchId: string;
      batchNumber: string;
      farmName: string;
      costPerBird: number;
    }>;
  };
}

export interface FarmerOperationsAnalytics {
  health: {
    totals: {
      naturalMortality: number;
      mortalityRate: number;
      initialBirds: number;
    };
    mortalityTrend: Array<{
      period: string;
      label: string;
      naturalDeaths: number;
    }>;
    mortalityByReason: Array<{
      reason: string;
      count: number;
      percentage: number;
    }>;
  };
  feed: {
    trend: Array<{
      period: string;
      label: string;
      quantity: number;
    }>;
    byBatch: Array<{
      batchId: string;
      batchNumber: string;
      farmName: string;
      quantity: number;
      cost: number;
      source: "inventory" | "expense" | "none";
    }>;
  };
  medicine: {
    byBatch: Array<{
      batchId: string;
      batchNumber: string;
      farmName: string;
      quantity: number;
      cost: number;
      source: "inventory" | "expense" | "none";
    }>;
  };
}

export const farmerAnalyticsQueryKeys = {
  all: ["farmer-analytics"] as const,
  overview: (params: FarmerAnalyticsOverviewParams) =>
    [...farmerAnalyticsQueryKeys.all, "overview", params] as const,
  finance: (params: FarmerAnalyticsOverviewParams) =>
    [...farmerAnalyticsQueryKeys.all, "finance", params] as const,
  flockComparison: (params: FarmerAnalyticsOverviewParams) =>
    [...farmerAnalyticsQueryKeys.all, "flock-comparison", params] as const,
  operations: (params: FarmerAnalyticsOverviewParams) =>
    [...farmerAnalyticsQueryKeys.all, "operations", params] as const,
};

export const useGetFarmerAnalyticsOverview = (
  params: FarmerAnalyticsOverviewParams
) => {
  return useQuery({
    queryKey: farmerAnalyticsQueryKeys.overview(params),
    queryFn: async (): Promise<{
      success: boolean;
      data: FarmerAnalyticsOverview;
    }> => {
      const response = await axiosInstance.get("/analytics/farmer/overview", {
        params,
      });
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
  });
};

export const useGetFarmerFinanceAnalytics = (
  params: FarmerAnalyticsOverviewParams
) => {
  return useQuery({
    queryKey: farmerAnalyticsQueryKeys.finance(params),
    queryFn: async (): Promise<{
      success: boolean;
      data: FarmerFinanceAnalytics;
    }> => {
      const response = await axiosInstance.get("/analytics/farmer/finance", {
        params,
      });
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
  });
};

export const useGetFarmerFlockComparisonAnalytics = (
  params: FarmerAnalyticsOverviewParams
) => {
  return useQuery({
    queryKey: farmerAnalyticsQueryKeys.flockComparison(params),
    queryFn: async (): Promise<{
      success: boolean;
      data: FarmerFlockComparisonAnalytics;
    }> => {
      const response = await axiosInstance.get(
        "/analytics/farmer/flock-comparison",
        {
          params,
        }
      );
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
  });
};

export const useGetFarmerOperationsAnalytics = (
  params: FarmerAnalyticsOverviewParams
) => {
  return useQuery({
    queryKey: farmerAnalyticsQueryKeys.operations(params),
    queryFn: async (): Promise<{
      success: boolean;
      data: FarmerOperationsAnalytics;
    }> => {
      const response = await axiosInstance.get("/analytics/farmer/operations", {
        params,
      });
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
  });
};
