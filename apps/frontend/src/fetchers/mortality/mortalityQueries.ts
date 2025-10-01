import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CreateMortality, UpdateMortality } from "@myapp/shared-types";
import axiosInstance from "@/lib/axios";

// ==================== TYPES ====================
export interface Mortality {
  id: string;
  date: Date;
  count: number;
  reason: string | null;
  batchId: string;
  saleId: string | null;
  createdAt: Date;
  updatedAt: Date;
  batch?: {
    id: string;
    batchNumber: string;
    status: string;
    farm: {
      id: string;
      name: string;
    };
  };
}

export interface MortalityListResponse {
  success: boolean;
  data: Mortality[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface MortalityDetailResponse {
  success: boolean;
  data: Mortality;
}

export interface MortalityStatisticsResponse {
  success: boolean;
  data: {
    totalMortalities: number;
    totalCount: number;
    byReason: Array<{
      reason: string;
      count: number;
      percentage: number;
    }>;
    byBatch: Array<{
      batchId: string;
      batchNumber: string;
      count: number;
      percentage: number;
    }>;
    currentMonthCount: number;
  };
}

export interface BatchMortalitiesResponse {
  success: boolean;
  data: Mortality[];
  statistics: {
    totalRecords: number;
    totalMortality: number;
    currentBirds: number;
    mortalityRate: string;
    reasonBreakdown: Record<string, { count: number; totalBirds: number }>;
  };
}

// ==================== QUERY KEYS ====================
export const mortalityKeys = {
  all: ["mortalities"] as const,
  lists: () => [...mortalityKeys.all, "list"] as const,
  list: (filters: Record<string, any>) =>
    [...mortalityKeys.lists(), filters] as const,
  details: () => [...mortalityKeys.all, "detail"] as const,
  detail: (id: string) => [...mortalityKeys.details(), id] as const,
  batchMortalities: (batchId: string) =>
    [...mortalityKeys.all, "batch", batchId] as const,
  statistics: (filters?: Record<string, any>) =>
    [...mortalityKeys.all, "statistics", filters || {}] as const,
};

// ==================== QUERY HOOKS ====================

// Get all mortalities
export const useGetAllMortalities = (
  params?: {
    page?: number;
    limit?: number;
    batchId?: string;
    farmId?: string;
    startDate?: string;
    endDate?: string;
    reason?: string;
  },
  options?: { enabled?: boolean }
) => {
  return useQuery<MortalityListResponse>({
    queryKey: mortalityKeys.list(params || {}),
    queryFn: async () => {
      const response = await axiosInstance.get("/mortalities", { params });
      console.log("Get All Mortalities", response.data);
      return response.data;
    },
    enabled: options?.enabled !== false,
  });
};

// Get mortality by ID
export const useGetMortalityById = (
  id: string,
  options?: { enabled?: boolean }
) => {
  return useQuery<MortalityDetailResponse>({
    queryKey: mortalityKeys.detail(id),
    queryFn: async () => {
      const response = await axiosInstance.get(`/mortalities/${id}`);
      console.log("Get Mortality By ID", response.data);
      return response.data;
    },
    enabled: options?.enabled !== false && !!id,
  });
};

// Get batch mortalities
export const useGetBatchMortalities = (
  batchId: string,
  options?: { enabled?: boolean }
) => {
  return useQuery<BatchMortalitiesResponse>({
    queryKey: mortalityKeys.batchMortalities(batchId),
    queryFn: async () => {
      const response = await axiosInstance.get(`/mortalities/batch/${batchId}`);
      console.log("Get Batch Mortalities", response.data);
      return response.data;
    },
    enabled: options?.enabled !== false && !!batchId,
  });
};

// Get mortality statistics
export const useGetMortalityStatistics = (
  params?: {
    farmId?: string;
    batchId?: string;
    startDate?: string;
    endDate?: string;
  },
  options?: { enabled?: boolean }
) => {
  return useQuery<MortalityStatisticsResponse>({
    queryKey: mortalityKeys.statistics(params),
    queryFn: async () => {
      const response = await axiosInstance.get("/mortalities/statistics", {
        params,
      });
      console.log("Get Mortality Statistics", response.data);
      return response.data;
    },
    enabled: options?.enabled !== false,
  });
};

// ==================== MUTATION HOOKS ====================

// Create mortality
export const useCreateMortality = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: CreateMortality
    ): Promise<MortalityDetailResponse> => {
      const response = await axiosInstance.post("/mortalities", data);
      return response.data as MortalityDetailResponse;
    },
    onSuccess: (data) => {
      // Invalidate mortality queries
      queryClient.invalidateQueries({ queryKey: mortalityKeys.lists() });
      queryClient.invalidateQueries({ queryKey: mortalityKeys.statistics() });

      // Invalidate batch mortalities if batchId exists
      if (data.data?.batchId) {
        queryClient.invalidateQueries({
          queryKey: mortalityKeys.batchMortalities(data.data.batchId),
        });
        // Also invalidate batch queries since mortality affects batch data
        queryClient.invalidateQueries({
          queryKey: ["batches", "detail", data.data.batchId],
        });
        queryClient.invalidateQueries({
          queryKey: ["batches", "analytics", data.data.batchId],
        });
      }
    },
  });
};

// Update mortality
export const useUpdateMortality = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateMortality }) => {
      const response = await axiosInstance.put(`/mortalities/${id}`, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate mortality queries
      queryClient.invalidateQueries({
        queryKey: mortalityKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: mortalityKeys.lists() });
      queryClient.invalidateQueries({ queryKey: mortalityKeys.statistics() });

      // Invalidate batch mortalities if batchId exists
      if (data.data?.batchId) {
        queryClient.invalidateQueries({
          queryKey: mortalityKeys.batchMortalities(data.data.batchId),
        });
        // Also invalidate batch queries
        queryClient.invalidateQueries({
          queryKey: ["batches", "detail", data.data.batchId],
        });
        queryClient.invalidateQueries({
          queryKey: ["batches", "analytics", data.data.batchId],
        });
      }
    },
  });
};

// Delete mortality
export const useDeleteMortality = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await axiosInstance.delete(`/mortalities/${id}`);
      return response.data;
    },
    onSuccess: (data, id) => {
      // Remove from cache and invalidate lists
      queryClient.removeQueries({ queryKey: mortalityKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: mortalityKeys.lists() });
      queryClient.invalidateQueries({ queryKey: mortalityKeys.statistics() });

      // Invalidate batch mortalities
      queryClient.invalidateQueries({
        queryKey: mortalityKeys.all,
        predicate: (query) => {
          return (
            query.queryKey[0] === "mortalities" && query.queryKey[1] === "batch"
          );
        },
      });

      // Invalidate batch queries
      queryClient.invalidateQueries({
        queryKey: ["batches"],
        predicate: (query) => {
          return query.queryKey[0] === "batches";
        },
      });
    },
  });
};
