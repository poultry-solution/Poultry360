import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

// ==================== QUERY KEYS ====================
export const adminDealerKeys = {
  all: ["admin-dealers"] as const,
  lists: () => [...adminDealerKeys.all, "list"] as const,
  list: (filters: string) =>
    [...adminDealerKeys.lists(), { filters }] as const,
  details: () => [...adminDealerKeys.all, "detail"] as const,
  detail: (id: string) => [...adminDealerKeys.details(), id] as const,
};

// ==================== TYPES ====================
export interface AdminDealer {
  id: string;
  name: string;
  contact: string;
  address: string | null;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
  owner: {
    id: string;
    name: string;
    phone: string;
    status: string;
    createdAt: Date;
  };
  companies?: Array<{
    id: string;
    name: string;
  }>;
  _count: {
    products: number;
    sales: number;
    consignmentsFrom: number;
    consignmentsTo: number;
    ledgerEntries: number;
    paymentRequests: number;
  };
  managers?: Array<{
    id: string;
    name: string;
    phone: string;
    status: string;
  }>;
}

export interface CreateDealerInput {
  ownerName: string;
  ownerPhone: string;
  ownerPassword: string;
  dealerName: string;
  dealerContact: string;
  dealerAddress?: string;
  companyId?: string | null;
  ownerStatus?: "ACTIVE" | "INACTIVE" | "PENDING_VERIFICATION";
}

export interface UpdateDealerInput {
  ownerName?: string;
  ownerPhone?: string;
  ownerPassword?: string;
  dealerName?: string;
  dealerContact?: string;
  dealerAddress?: string;
  companyId?: string | null;
  ownerStatus?: "ACTIVE" | "INACTIVE" | "PENDING_VERIFICATION";
}

export interface DealersResponse {
  success: boolean;
  data: AdminDealer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DealerResponse {
  success: boolean;
  data: AdminDealer;
}

export interface AdminDealerFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: "ACTIVE" | "INACTIVE" | "PENDING_VERIFICATION";
}

// ==================== QUERY HOOKS ====================

// Get all dealers
export const useGetAdminDealers = (filters: AdminDealerFilters = {}) => {
  const queryString = new URLSearchParams(
    Object.entries(filters)
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  ).toString();

  return useQuery<DealersResponse>({
    queryKey: adminDealerKeys.list(queryString),
    queryFn: async () => {
      const { data } = await axiosInstance.get<DealersResponse>(
        `/admin/dealers?${queryString}`
      );
      return data;
    },
  });
};

// Get dealer by ID
export const useGetAdminDealerById = (id: string) => {
  return useQuery<DealerResponse>({
    queryKey: adminDealerKeys.detail(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get<DealerResponse>(
        `/admin/dealers/${id}`
      );
      return data;
    },
    enabled: !!id,
  });
};

// ==================== MUTATION HOOKS ====================

// Create dealer
export const useCreateAdminDealer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateDealerInput) => {
      const { data } = await axiosInstance.post("/admin/dealers", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminDealerKeys.lists() });
    },
  });
};

// Update dealer
export const useUpdateAdminDealer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: UpdateDealerInput & { id: string }) => {
      const { data } = await axiosInstance.put(`/admin/dealers/${id}`, input);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: adminDealerKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: adminDealerKeys.detail(variables.id),
      });
    },
  });
};

// Delete dealer
export const useDeleteAdminDealer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axiosInstance.delete(`/admin/dealers/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminDealerKeys.lists() });
    },
  });
};
