import { useQuery } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

export const companyAnalyticsKeys = {
  all: ["company-analytics"] as const,
  analytics: (period?: string) => [...companyAnalyticsKeys.all, "analytics", period] as const,
};

export interface CompanyAnalytics {
  overview: {
    totalSales: number;
    totalRevenue: number;
    totalOutstanding: number;
    totalPayments: number;
  };
  trends: {
    revenueTrends: Array<{
      date: string;
      revenue: number;
      salesCount: number;
    }>;
    monthlyComparison: {
      currentMonth: {
        revenue: number;
        salesCount: number;
      };
      previousMonth: {
        revenue: number;
        salesCount: number;
      };
      growth: number;
    };
  };
  salesByDealer: Array<{
    dealerId: string;
    dealerName: string;
    dealerContact: string;
    totalAmount: number;
    totalSales: number;
  }>;
  productPerformance: Array<{
    productId: string;
    productName: string;
    productType: string;
    unit: string;
    totalQuantity: number;
    totalAmount: number;
    saleCount: number;
  }>;
  consignments: {
    byStatus: Array<{
      status: string;
      count: number;
      totalAmount: number;
    }>;
  };
  payments: {
    byMethod: Array<{
      method: string;
      totalAmount: number;
      count: number;
    }>;
  };
  topAccounts: Array<{
    dealerId: string;
    dealerName: string;
    dealerContact: string;
    balance: number;
    totalSales: number;
    totalPayments: number;
  }>;
}

export const useGetCompanyAnalytics = (period?: string) => {
  const queryString = period ? `?period=${period}` : "";

  return useQuery({
    queryKey: companyAnalyticsKeys.analytics(period),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ success: boolean; data: CompanyAnalytics }>(
        `/company/analytics${queryString}`
      );
      return data.data;
    },
  });
};
