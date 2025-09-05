import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Batch, 
  CreateBatch, 
  UpdateBatch,
  BatchStatus 
} from "@myapp/shared-types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

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
  return useQuery({
    queryKey: batchKeys.list(params || {}),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.append("page", params.page.toString());
      if (params?.limit) searchParams.append("limit", params.limit.toString());
      if (params?.farmId) searchParams.append("farmId", params.farmId);
      if (params?.status) searchParams.append("status", params.status);
      if (params?.search) searchParams.append("search", params.search);

      const response = await fetch(`${API_BASE}/batches?${searchParams}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch batches");
      return response.json();
    },
  });
};

// Get farm batches
export const useGetFarmBatches = (farmId: string, params?: {
  status?: BatchStatus;
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: [...batchKeys.farmBatches(farmId), params || {}],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.append("status", params.status);
      if (params?.page) searchParams.append("page", params.page.toString());
      if (params?.limit) searchParams.append("limit", params.limit.toString());

      const response = await fetch(`${API_BASE}/batches/farm/${farmId}?${searchParams}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch farm batches");
      return response.json();
    },
    enabled: !!farmId,
  });
};

// Get batch by ID
export const useGetBatchById = (id: string) => {
  return useQuery({
    queryKey: batchKeys.detail(id),
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/batches/${id}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch batch");
      return response.json();
    },
    enabled: !!id,
  });
};

// Get batch analytics
export const useGetBatchAnalytics = (id: string) => {
  return useQuery({
    queryKey: batchKeys.analytics(id),
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/batches/${id}/analytics`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch batch analytics");
      return response.json();
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
      const response = await fetch(`${API_BASE}/batches`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create batch");
      return response.json();
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
      const response = await fetch(`${API_BASE}/batches/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update batch");
      return response.json();
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
      const response = await fetch(`${API_BASE}/batches/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed to update batch status");
      return response.json();
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
      const response = await fetch(`${API_BASE}/batches/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete batch");
      return response.json();
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
