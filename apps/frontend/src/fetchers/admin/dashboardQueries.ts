import { useQuery } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

export const adminDashboardKeys = {
  all: ["admin-dashboard"] as const,
  overview: () => [...adminDashboardKeys.all, "overview"] as const,
};

export type AdminDashboardRole =
  | "OWNER"
  | "MANAGER"
  | "DOCTOR"
  | "DEALER"
  | "COMPANY"
  | "HATCHERY";

export interface AdminDashboardOverview {
  asOf: string;
  accounts: {
    total: number;
    active: number;
    newToday: number;
    newLast30Days: number;
    byRole: Array<{ role: AdminDashboardRole; count: number }>;
  };
  farms: {
    total: number;
    totalCapacity: number;
    newLast30Days: number;
  };
  batches: {
    total: number;
    active: number;
    completed: number;
    newLast30Days: number;
  };
  birds: {
    placedInActiveBatches: number;
    currentInActiveBatches: number;
    mortalityInActiveBatches: number;
  };
  queue: {
    pendingAccountApprovals: number;
    pendingReviews: number;
    demoEnquiriesLast30Days: number;
    contactRequestsLast30Days: number;
    activityLast24Hours: number;
  };
  recentAccounts: Array<{
    id: string;
    name: string;
    role: AdminDashboardRole;
    companyName: string | null;
    status: string;
    createdAt: string;
  }>;
  recentActivity: Array<{
    id: string;
    actorName: string;
    actorRole: string | null;
    description: string;
    targetType: string;
    createdAt: string;
  }>;
}

interface AdminDashboardOverviewResponse {
  success: boolean;
  data: AdminDashboardOverview;
}

export function useGetAdminDashboardOverview(options?: { enabled?: boolean }) {
  return useQuery<AdminDashboardOverviewResponse>({
    queryKey: adminDashboardKeys.overview(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<AdminDashboardOverviewResponse>(
        "/admin/dashboard/overview"
      );
      return data;
    },
    enabled: options?.enabled ?? true,
    staleTime: 3000,
    refetchOnWindowFocus: false,
  });
}
