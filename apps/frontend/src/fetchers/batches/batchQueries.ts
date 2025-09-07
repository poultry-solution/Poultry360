import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Batch, 
  CreateBatch, 
  UpdateBatch,
  BatchStatus,
  BatchResponse,
  BatchListResponse,
  BatchDetailResponse
} from "@myapp/shared-types";
import axiosInstance from "@/lib/axios";

// ==================== QUERY KEYS ====================
export const batchKeys = {
  all: ["batches"] as const,
  lists: () => [...batchKeys.all, "list"] as const,
  list: (filters: Record<string, any>) => [...batchKeys.lists(), filters] as const,
  details: () => [...batchKeys.all, "detail"] as const,
  detail: (id: string) => [...batchKeys.details(), id] as const,
  farmBatches: (farmId: string) => [...batchKeys.all, "farm", farmId] as const,
  analytics: (id: string) => [...batchKeys.detail(id), "analytics"] as const,
};

// ==================== QUERY HOOKS ====================

// Get all batches
export const useGetAllBatches = (params?: {
  page?: number;
  limit?: number;
  farmId?: string;
  status?: BatchStatus;
  search?: string;
}) => {
  return useQuery<BatchListResponse>({
    queryKey: batchKeys.list(params || {}),
    queryFn: async () => {
      const response = await axiosInstance.get("/batches", { params });
      console.log("Get All Batches", response.data);
      return response.data;
    },
  });
};

// Get farm batches
export const useGetFarmBatches = (farmId: string, params?: {
  status?: BatchStatus;
  page?: number;
  limit?: number;
}) => {
  return useQuery<BatchListResponse>({
    queryKey: [...batchKeys.farmBatches(farmId), params || {}],
    queryFn: async () => {
      const response = await axiosInstance.get(`/batches/farm/${farmId}`, { params });
      console.log("Get Farm Batches", response.data);
      return response.data;
    },
    enabled: !!farmId,
  });
};

// Get batch by ID
export const useGetBatchById = (id: string) => {
  return useQuery<BatchDetailResponse>({
    queryKey: batchKeys.detail(id),
    queryFn: async () => {
      const response = await axiosInstance.get(`/batches/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

// Get batch analytics
export const useGetBatchAnalytics = (id: string) => {
  return useQuery({
    queryKey: batchKeys.analytics(id),
    queryFn: async () => {
      const response = await axiosInstance.get(`/batches/${id}/analytics`);
      return response.data;
    },
    enabled: !!id,
  });
};

// ==================== MUTATION HOOKS ====================

// Create batch
export const useCreateBatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateBatch) => {
      const response = await axiosInstance.post("/batches", data);
      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate batch queries
      queryClient.invalidateQueries({ queryKey: batchKeys.lists() });
      if (data.data?.farmId) {
        queryClient.invalidateQueries({ queryKey: batchKeys.farmBatches(data.data.farmId) });
      }
    },
  });
};

// Update batch
export const useUpdateBatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateBatch }) => {
      const response = await axiosInstance.put(`/batches/${id}`, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate batch queries
      queryClient.invalidateQueries({ queryKey: batchKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: batchKeys.lists() });
      queryClient.invalidateQueries({ queryKey: batchKeys.analytics(variables.id) });
      
      // Invalidate farm batches if farmId changed
      if (data.data?.farmId) {
        queryClient.invalidateQueries({ queryKey: batchKeys.farmBatches(data.data.farmId) });
      }
    },
  });
};

// Update batch status
export const useUpdateBatchStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: BatchStatus }) => {
      const response = await axiosInstance.patch(`/batches/${id}/status`, { status });
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate batch queries
      queryClient.invalidateQueries({ queryKey: batchKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: batchKeys.lists() });
      queryClient.invalidateQueries({ queryKey: batchKeys.analytics(variables.id) });
    },
  });
};

// Delete batch
export const useDeleteBatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await axiosInstance.delete(`/batches/${id}`);
      return response.data;
    },
    onSuccess: (data, id) => {
      // Remove from cache and invalidate lists
      queryClient.removeQueries({ queryKey: batchKeys.detail(id) });
      queryClient.removeQueries({ queryKey: batchKeys.analytics(id) });
      queryClient.invalidateQueries({ queryKey: batchKeys.lists() });
      
      // Invalidate farm batches
      queryClient.invalidateQueries({ 
        queryKey: batchKeys.all,
        predicate: (query) => {
          return query.queryKey[0] === "batches" && 
                 query.queryKey[1] === "farm";
        }
      });
    },
  });
};
