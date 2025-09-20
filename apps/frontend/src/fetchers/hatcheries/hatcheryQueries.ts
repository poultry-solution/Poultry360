import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/lib/axios";
import {
  CreateHatchery,
  UpdateHatchery,
  CreateEntityTransaction,
  TransactionType,
} from "@myapp/shared-types";

const API_BASE = "http://localhost:8081/api/v1";

// ==================== QUERY KEYS ====================

export const hatcheryKeys = {
  all: ["hatcheries"] as const,
  lists: () => [...hatcheryKeys.all, "list"] as const,
  list: (filters: Record<string, any>) =>
    [...hatcheryKeys.lists(), filters] as const,
  details: () => [...hatcheryKeys.all, "detail"] as const,
  detail: (id: string) => [...hatcheryKeys.details(), id] as const,
  statistics: () => [...hatcheryKeys.all, "statistics"] as const,
  transactions: (id: string) =>
    [...hatcheryKeys.all, "transactions", id] as const,
};

// ==================== QUERY HOOKS ====================

export const useGetAllHatcheries = (filters?: {
  page?: number;
  limit?: number;
  search?: string;
}) => {
  return useQuery({
    queryKey: hatcheryKeys.list(filters || {}),
    queryFn: async (): Promise<{ data: any[] }> => {
      const params = new URLSearchParams();
      if (filters?.page) params.append("page", filters.page.toString());
      if (filters?.limit) params.append("limit", filters.limit.toString());
      if (filters?.search) params.append("search", filters.search);

      const response = await axiosInstance.get(
        `${API_BASE}/hatcheries?${params.toString()}`
      );
      return response.data;
    },
  });
};

export const useGetHatcheryStatistics = () => {
  return useQuery({
    queryKey: hatcheryKeys.statistics(),
    queryFn: async (): Promise<{ data: any }> => {
      const response = await axiosInstance.get(
        `${API_BASE}/hatcheries/statistics`
      );
      return response.data;
    },
  });
};

export const useGetHatcheryById = (id: string | null) => {
  return useQuery({
    queryKey: hatcheryKeys.detail(id || ""),
    queryFn: async (): Promise<{ data: any }> => {
      const response = await axiosInstance.get(`${API_BASE}/hatcheries/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

export const useGetHatcheryTransactions = (
  id: string | null,
  filters?: {
    page?: number;
    limit?: number;
    type?: TransactionType;
    startDate?: string;
    endDate?: string;
  }
) => {
  return useQuery({
    queryKey: [...hatcheryKeys.transactions(id || ""), filters],
    queryFn: async (): Promise<{ data: any[] }> => {
      const params = new URLSearchParams();
      if (filters?.page) params.append("page", filters.page.toString());
      if (filters?.limit) params.append("limit", filters.limit.toString());
      if (filters?.type) params.append("type", filters.type);
      if (filters?.startDate) params.append("startDate", filters.startDate);
      if (filters?.endDate) params.append("endDate", filters.endDate);

      const response = await axiosInstance.get(
        `${API_BASE}/hatcheries/${id}/transactions?${params.toString()}`
      );
      return response.data;
    },
    enabled: !!id,
  });
};

// ==================== MUTATION HOOKS ====================

export const useCreateHatchery = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateHatchery) => {
      const response = await axiosInstance.post(`${API_BASE}/hatcheries`, data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate hatchery queries
      queryClient.invalidateQueries({ queryKey: hatcheryKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: hatcheryKeys.statistics(),
      });
    },
  });
};

export const useUpdateHatchery = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateHatchery }) => {
      const response = await axiosInstance.put(`/hatcheries/${id}`, data);
      return response.data;
    },
    onSuccess: (_, { id }) => {
      // Invalidate hatchery queries
      queryClient.invalidateQueries({ queryKey: hatcheryKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: hatcheryKeys.detail(id),
      });
      queryClient.invalidateQueries({
        queryKey: hatcheryKeys.statistics(),
      });
    },
  });
};

export const useDeleteHatchery = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await axiosInstance.delete(
        `${API_BASE}/hatcheries/${id}`
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate hatchery queries
      queryClient.invalidateQueries({ queryKey: hatcheryKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: hatcheryKeys.statistics(),
      });
    },
  });
};

export const useAddHatcheryTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      hatcheryId,
      data,
    }: {
      hatcheryId: string;
      data: CreateEntityTransaction & {
        // 🔗 NEW: Optional payment data for single request
        paymentAmount?: number;
        paymentDescription?: string;
      };
    }) => {
      const response = await axiosInstance.post(
        `${API_BASE}/hatcheries/${hatcheryId}/transactions`,
        data
      );
      return response.data;
    },
    onSuccess: (_, { hatcheryId }) => {
      // Invalidate hatchery queries
      queryClient.invalidateQueries({ queryKey: hatcheryKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: hatcheryKeys.detail(hatcheryId),
      });
      queryClient.invalidateQueries({
        queryKey: hatcheryKeys.transactions(hatcheryId),
      });
      queryClient.invalidateQueries({
        queryKey: hatcheryKeys.statistics(),
      });
    },
  });
};

export const useDeleteHatcheryTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      hatcheryId,
      transactionId,
      password,
    }: {
      hatcheryId: string;
      transactionId: string;
      password: string;
    }) => {
      const response = await axiosInstance.delete(
        `${API_BASE}/hatcheries/${hatcheryId}/transactions/${transactionId}`,
        { data: { password } }
      );
      return response.data;
    },
    onSuccess: (_, { hatcheryId }) => {
      queryClient.invalidateQueries({ queryKey: hatcheryKeys.detail(hatcheryId) });
      queryClient.invalidateQueries({ queryKey: hatcheryKeys.transactions(hatcheryId) });
      queryClient.invalidateQueries({ queryKey: hatcheryKeys.statistics() });
    },
  });
};
