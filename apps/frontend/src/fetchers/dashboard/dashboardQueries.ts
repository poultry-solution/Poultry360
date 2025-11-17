import { useQuery } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

// ==================== QUERY KEYS ====================

export const dashboardQueryKeys = {
  all: ["dashboard"] as const,
  overview: () => [...dashboardQueryKeys.all, "overview"] as const,
  financialSummary: (period?: string) =>
    [...dashboardQueryKeys.all, "financial-summary", period] as const,
  performanceMetrics: () =>
    [...dashboardQueryKeys.all, "performance-metrics"] as const,
  moneyToReceive: (page?: number, limit?: number) =>
    [...dashboardQueryKeys.all, "money-to-receive", page, limit] as const,
  moneyToPay: (page?: number, limit?: number) =>
    [...dashboardQueryKeys.all, "money-to-pay", page, limit] as const,
  batchPerformance: (status?: string, sortBy?: string, sortOrder?: string) =>
    [
      ...dashboardQueryKeys.all,
      "batch-performance",
      status,
      sortBy,
      sortOrder,
    ] as const,
};

// ==================== TYPES ====================

export interface DashboardOverview {
  totalFarms: number;
  activeBatches: number;
  completedBatches: number;
  lifetimeProfit: number;
  monthlyRevenue: number;
  monthlyRevenueGrowth: number;
  moneyToReceive: number;
  moneyToGive: number;
  totalExpenses: number;
  recentActivity: Array<{
    id: string;
    type: "expense" | "sale" | "batch";
    title: string;
    description: string;
    timestamp: string;
    farmName: string;
  }>;
}

export interface DashboardFinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  revenueByCategory: Array<{
    categoryId: string;
    categoryName: string;
    amount: number;
    count: number;
  }>;
  expensesByCategory: Array<{
    categoryId: string;
    categoryName: string;
    amount: number;
    count: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    revenue: number;
    expenses: number;
  }>;
}

export interface DashboardPerformanceMetrics {
  averageBatchProfit: number;
  averageBatchDuration: number;
  mortalityRate: number;
  feedConversionRatio: number;
  topPerformingFarms: Array<{
    farmId: string;
    farmName: string;
    totalBatches: number;
    totalProfit: number;
    averageProfit: number;
  }>;
  batchPerformance: Array<{
    batchId: string;
    batchNumber: string;
    farmName: string;
    initialChicks: number;
    totalExpenses: number;
    totalSales: number;
    profit: number;
    mortality: number;
    mortalityRate: number;
    duration: number;
    profitPerBird: number;
  }>;
}

// ==================== QUERY HOOKS ====================

// Get dashboard overview
export const useGetDashboardOverview = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: dashboardQueryKeys.overview(),
    queryFn: async (): Promise<{
      success: boolean;
      data: DashboardOverview;
    }> => {
      const response = await axiosInstance.get("/dashboard/overview");
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    enabled: options?.enabled === true,
  });
};

// Get dashboard financial summary
export const useGetDashboardFinancialSummary = (
  period?: "month" | "quarter" | "year",
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: dashboardQueryKeys.financialSummary(period),
    queryFn: async (): Promise<{
      success: boolean;
      data: DashboardFinancialSummary;
    }> => {
      const response = await axiosInstance.get("/dashboard/financial-summary", {
        params: { period },
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: options?.enabled === true,
  });
};

// Get dashboard performance metrics
export const useGetDashboardPerformanceMetrics = (options?: {
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: dashboardQueryKeys.performanceMetrics(),
    queryFn: async (): Promise<{
      success: boolean;
      data: DashboardPerformanceMetrics;
    }> => {
      const response = await axiosInstance.get(
        "/dashboard/performance-metrics"
      );
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: options?.enabled === true,
  });
};

// ==================== UTILITY HOOKS ====================

// Combined dashboard data hook
export const useDashboardData = () => {
  const overview = useGetDashboardOverview({ enabled: true });
  const financialSummary = useGetDashboardFinancialSummary("month", {
    enabled: true,
  });
  const performanceMetrics = useGetDashboardPerformanceMetrics({
    enabled: true,
  });

  return {
    overview,
    financialSummary,
    performanceMetrics,
    isLoading:
      overview.isLoading ||
      financialSummary.isLoading ||
      performanceMetrics.isLoading,
    error: overview.error || financialSummary.error || performanceMetrics.error,
  };
};

// Dashboard statistics for home page
export const useDashboardStats = () => {
  const {
    data: overviewData,
    isLoading,
    error,
  } = useGetDashboardOverview({ enabled: true });

  return {
    data: overviewData?.data,
    isLoading,
    error,
    // Computed values
    lifetimeProfit: overviewData?.data?.lifetimeProfit || 0,
    monthlyRevenue: overviewData?.data?.monthlyRevenue || 0,
    monthlyRevenueGrowth: overviewData?.data?.monthlyRevenueGrowth || 0,
    moneyToReceive: overviewData?.data?.moneyToReceive || 0,
    moneyToGive: overviewData?.data?.moneyToGive || 0,
    totalExpenses: overviewData?.data?.totalExpenses || 0,
    recentActivity: overviewData?.data?.recentActivity || [],
  };
};

// ==================== ADDITIONAL TYPES ====================

export interface MoneyToReceiveDetails {
  totalAmount: number;
  totalCustomers: number;
  customers: Array<{
    customerId: string;
    customerName: string;
    customerPhone: string;
    totalBalance: number;
    totalDueAmount: number;
    salesCount: number;
    lastSaleDate: string;
    sales: Array<{
      saleId: string;
      amount: number;
      dueAmount: number;
      date: string;
      farmName: string;
      categoryName: string;
    }>;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface MoneyToPayDetails {
  totalAmount: number;
  totalSuppliers: number;
  suppliers: Array<{
    supplierId: string;
    supplierName: string;
    supplierContact: string;
    supplierAddress: string | null;
    supplierType: "DEALER" | "HATCHERY" | "MEDICAL_SUPPLIER";
    outstandingAmount: number;
    thisMonthAmount: number;
    totalTransactions: number;
    lastTransactionDate: string | null;
    recentTransactions: Array<{
      transactionId: string;
      type: string;
      amount: number;
      date: string;
      description: string | null;
      itemName: string | null;
    }>;
  }>;
  summary: {
    totalDealers: number;
    totalHatcheries: number;
    totalMedicalSuppliers: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface BatchPerformanceItem {
  id: string;
  batchNumber: string;
  farmName: string;
  status: "ACTIVE" | "COMPLETED";
  startDate: string;
  days: number;
  mortality: number;
  mortalityRate: string;
  fcr: string;
  expenses: number;
  salesAmount: number;
  avgWeight: string;
  profitLoss: number;
  initialChicks: number;
}

// ==================== ADDITIONAL QUERY HOOKS ====================

// Get money to receive details
export const useGetMoneyToReceiveDetails = (
  page = 1,
  limit = 10,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: dashboardQueryKeys.moneyToReceive(page, limit),
    queryFn: async (): Promise<{
      success: boolean;
      data: MoneyToReceiveDetails;
    }> => {
      const response = await axiosInstance.get("/dashboard/money-to-receive", {
        params: { page, limit },
      });
      console.log("🔄 Money to receive details response:", response.data);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: options?.enabled === true,
  });
};

// Get money to pay details
export const useGetMoneyToPayDetails = (
  page = 1,
  limit = 10,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: dashboardQueryKeys.moneyToPay(page, limit),
    queryFn: async (): Promise<{
      success: boolean;
      data: MoneyToPayDetails;
    }> => {
      const response = await axiosInstance.get("/dashboard/money-to-pay", {
        params: { page, limit },
      });
      console.log("🔄 Money to pay details response:", response.data);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: options?.enabled === true,
  });
};

// Get batch performance list
export const useGetBatchPerformance = (
  status?: "ACTIVE" | "COMPLETED",
  sortBy?: string,
  sortOrder?: "asc" | "desc",
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: dashboardQueryKeys.batchPerformance(status, sortBy, sortOrder),
    queryFn: async (): Promise<{
      success: boolean;
      data: BatchPerformanceItem[];
    }> => {
      const params: any = {};
      if (status) params.status = status;
      if (sortBy) params.sortBy = sortBy;
      if (sortOrder) params.sortOrder = sortOrder;

      const response = await axiosInstance.get("/dashboard/batch-performance", {
        params,
      });
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: options?.enabled === true,
  });
};
