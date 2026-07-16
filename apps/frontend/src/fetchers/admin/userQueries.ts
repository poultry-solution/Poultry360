import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

// ==================== QUERY KEYS ====================
export const adminUserKeys = {
  all: ["admin-users"] as const,
  lists: () => [...adminUserKeys.all, "list"] as const,
  list: (filters: string) =>
    [...adminUserKeys.lists(), { filters }] as const,
  details: () => [...adminUserKeys.all, "detail"] as const,
  detail: (id: string) => [...adminUserKeys.details(), id] as const,
};

// ==================== TYPES ====================
export interface AdminUser {
  id: string;
  name: string;
  phone: string;
  role: string;
  status: string;
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
  role?: "OWNER" | "MANAGER" | "DOCTOR" | "DEALER" | "COMPANY";
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
      .filter(([_, v]) => v !== undefined)
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
  companyName: string | null;
  CompanyFarmLocation: string | null;
  isOnline: boolean;
  lastSeen: string | null;
  language: string;
  calendarType: string;
  createdAt: string;
  updatedAt: string;
  ownedFarms: Array<{
    id: string;
    name: string;
    capacity: number;
    description: string | null;
    createdAt: string;
    _count: { batches: number };
  }>;
  managedFarms: Array<{
    id: string;
    name: string;
    capacity: number;
    description: string | null;
    createdAt: string;
    _count: { batches: number };
  }>;
  dealerConnections: Array<{
    connectedAt: string;
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

export interface AdminUserDetailResponse {
  success: boolean;
  data: AdminUserDetail;
}

export interface HardDeleteAdminUserInput {
  id: string;
  password: string;
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

export const useHardDeleteAdminUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, password }: HardDeleteAdminUserInput) => {
      const { data } = await axiosInstance.delete(`/admin/users/${id}`, {
        data: { password },
      });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: adminUserKeys.lists() });
      queryClient.removeQueries({ queryKey: adminUserKeys.detail(variables.id) });
    },
  });
};
