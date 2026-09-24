import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";
import type {
  AccountFeature,
  AccountFeatureKey,
} from "@/fetchers/accountFeatureQueries";
import { adminDashboardKeys } from "@/fetchers/admin/dashboardQueries";
import { adminFinanceKeys } from "@/fetchers/admin/adminFinanceQueries";

// ==================== QUERY KEYS ====================
export const adminUserKeys = {
  all: ["admin-users"] as const,
  lists: () => [...adminUserKeys.all, "list"] as const,
  list: (filters: string) =>
    [...adminUserKeys.lists(), { filters }] as const,
  details: () => [...adminUserKeys.all, "detail"] as const,
  detail: (id: string) => [...adminUserKeys.details(), id] as const,
  usage: (id: string) => [...adminUserKeys.detail(id), "usage"] as const,
};

// ==================== TYPES ====================
export interface AdminUser {
  id: string;
  name: string;
  phone: string;
  role: string;
  status: string;
  isTestAccount: boolean;
  paymentStatus: "PAID" | "NOT_PAID";
  companyName: string | null;
  CompanyFarmLocation: string | null;
  isOnline: boolean;
  lastSeen: string | null;
  createdAt: string;
  _count: {
    ownedFarms: number;
    managedFarms: number;
    doctorConversations: number;
  };
  ownedFarms: Array<{ id: string; name: string }>;
  managedFarms: Array<{ id: string; name: string }>;
}

export interface AdminUserFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: "ACTIVE" | "INACTIVE" | "PENDING_VERIFICATION";
  role?: "OWNER" | "MANAGER" | "DOCTOR" | "DEALER" | "COMPANY" | "HATCHERY";
}

export interface AdminUsersResponse {
  success: boolean;
  data: AdminUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ==================== QUERY HOOKS ====================

// Get all users
export const useGetAdminUsers = (
  filters: AdminUserFilters = {},
  options?: { enabled?: boolean }
) => {
  const queryString = new URLSearchParams(
    Object.entries(filters)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  ).toString();

  const shouldFetch =
    (options?.enabled ?? true) &&
    (!filters.search || filters.search.length >= 2);

  return useQuery<AdminUsersResponse>({
    queryKey: adminUserKeys.list(queryString),
    queryFn: async () => {
      const { data } = await axiosInstance.get<AdminUsersResponse>(
        `/admin/users?${queryString}`
      );
      return data;
    },
    staleTime: 3000,
    enabled: shouldFetch,
    refetchOnWindowFocus: false,
  });
};

// ==================== USER DETAIL TYPES ====================
export interface AdminUserDetail {
  id: string;
  name: string;
  phone: string;
  role: string;
  status: string;
  isTestAccount: boolean;
  paymentStatus: "PAID" | "NOT_PAID";
  adminNotes: string | null;
  companyName: string | null;
  CompanyFarmLocation: string | null;
  isOnline: boolean;
  lastSeen: string | null;
  language: string;
  calendarType: string;
  createdAt: string;
  updatedAt: string;
  accountFeatures: AccountFeature[];
  accountPayments: AdminAccountPayment[];
  ownedFarms: Array<{
    id: string;
    name: string;
    capacity: number;
    description: string | null;
    createdAt: string;
    currentBirds: number;
    activeInitialBirds: number;
    _count: { batches: number };
    batches: Array<{
      id: string;
      batchNumber: string;
      batchType: "BROILER" | "LAYERS";
      status: "ACTIVE" | "COMPLETED";
      initialChicks: number;
      currentBirds: number;
    }>;
  }>;
  managedFarms: Array<{
    id: string;
    name: string;
    capacity: number;
    description: string | null;
    createdAt: string;
    currentBirds: number;
    activeInitialBirds: number;
    _count: { batches: number };
    batches: Array<{
      id: string;
      batchNumber: string;
      batchType: "BROILER" | "LAYERS";
      status: "ACTIVE" | "COMPLETED";
      initialChicks: number;
      currentBirds: number;
    }>;
  }>;
  dealerAccounts: Array<{
    accountCreatedAt: string;
    dealer: {
      id: string;
      name: string;
      contact: string;
      address: string | null;
    };
  }>;
  dealer: {
    id: string;
    name: string;
    contact: string;
    address: string | null;
  } | null;
  company: {
    id: string;
    name: string;
    address: string | null;
  } | null;
  doctorConversations: Array<{
    id: string;
    subject: string | null;
    status: string;
    createdAt: string;
    farmer: { id: string; name: string; phone: string };
  }>;
}

export interface AdminAccountPayment {
  id: string;
  type: "INITIAL" | "MAINTENANCE";
  amount: number;
  paidAt: string;
  createdAt: string;
}

export interface AdminUserDetailResponse {
  success: boolean;
  data: AdminUserDetail;
}

export interface AdminAccountUsageMetric {
  key: string;
  label: string;
  total: number;
  last30Days: number;
}

export interface AdminAccountUsageSummary {
  accountId: string;
  role: string;
  asOf: string;
  recentSince: string;
  metrics: AdminAccountUsageMetric[];
}

export interface AdminAccountUsageResponse {
  success: boolean;
  data: AdminAccountUsageSummary;
}

export interface HardDeleteAdminUserInput {
  id: string;
  password: string;
  confirmation: string;
}

export interface CreateAdminAccountPaymentInput {
  accountId: string;
  type: AdminAccountPayment["type"];
  amount: number;
  paidAt: string;
}

export interface UpdateAdminUserFeatureInput {
  accountId: string;
  featureKey: AccountFeatureKey;
  enabled: boolean;
}

// Get user by ID
export const useGetAdminUserById = (id: string) => {
  return useQuery<AdminUserDetailResponse>({
    queryKey: adminUserKeys.detail(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get<AdminUserDetailResponse>(
        `/admin/users/${id}`
      );
      return data;
    },
    enabled: !!id,
  });
};

export const useGetAdminAccountUsage = (
  id: string,
  options?: { enabled?: boolean }
) => {
  return useQuery<AdminAccountUsageResponse>({
    queryKey: adminUserKeys.usage(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get<AdminAccountUsageResponse>(
        `/admin/users/${id}/usage`
      );
      return data;
    },
    enabled: Boolean(id) && (options?.enabled ?? true),
    staleTime: 3000,
    refetchOnWindowFocus: false,
  });
};

export const useHardDeleteAdminUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, password, confirmation }: HardDeleteAdminUserInput) => {
      const { data } = await axiosInstance.delete(`/admin/users/${id}`, {
        data: { password, confirmation },
      });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: adminUserKeys.lists() });
      queryClient.invalidateQueries({ queryKey: adminDashboardKeys.all });
      queryClient.invalidateQueries({ queryKey: adminFinanceKeys.all });
      queryClient.removeQueries({ queryKey: adminUserKeys.detail(variables.id) });
    },
  });
};

export const useCreateAdminAccountPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ accountId, ...input }: CreateAdminAccountPaymentInput) => {
      const { data } = await axiosInstance.post(`/admin/users/${accountId}/payments`, input);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: adminUserKeys.detail(variables.accountId) });
      queryClient.invalidateQueries({ queryKey: adminUserKeys.lists() });
      queryClient.invalidateQueries({ queryKey: adminFinanceKeys.all });
    },
  });
};

export const useUpdateAdminTestAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ accountId, isTestAccount }: { accountId: string; isTestAccount: boolean }) => {
      const { data } = await axiosInstance.patch(`/admin/users/${accountId}/test-account`, { isTestAccount });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: adminUserKeys.detail(variables.accountId) });
      queryClient.invalidateQueries({ queryKey: adminUserKeys.lists() });
      queryClient.invalidateQueries({ queryKey: adminFinanceKeys.all });
    },
  });
};

export const useUpdateAdminNotes = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ accountId, adminNotes }: { accountId: string; adminNotes: string }) => {
      const { data } = await axiosInstance.patch(`/admin/users/${accountId}/admin-notes`, { adminNotes });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: adminUserKeys.detail(variables.accountId) });
    },
  });
};

export const useUpdateAdminUserFeature = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      accountId,
      featureKey,
      enabled,
    }: UpdateAdminUserFeatureInput) => {
      const { data } = await axiosInstance.put(
        `/admin/users/${accountId}/features/${featureKey}`,
        { enabled }
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: adminUserKeys.detail(variables.accountId),
      });
    },
  });
};
