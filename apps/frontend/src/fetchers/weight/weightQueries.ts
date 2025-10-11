import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

// ==================== QUERY KEYS ====================
export const weightKeys = {
  all: ["weights"] as const,
  byBatch: (batchId: string) => [...weightKeys.all, "batch", batchId] as const,
  list: (batchId: string, filters?: Record<string, any>) =>
    [...weightKeys.byBatch(batchId), "list", filters || {}] as const,
  chart: (batchId: string) => [...weightKeys.byBatch(batchId), "chart"] as const,
};

// ==================== TYPES (lightweight for fetchers) ====================
export type WeightRecord = {
  id: string;
  date: string;
  avgWeight: number;
  sampleCount: number;
  source: "MANUAL" | "SALE" | "SYSTEM";
  notes?: string | null;
  createdAt: string;
};

export type GetWeightsResponse = {
  success: true;
  data: {
    weights: WeightRecord[];
    currentWeight: number | null;
    growthMetrics: {
      growthRate: number | null;
      totalGrowth: number | null;
      daysActive: number | null;
      recordCount: number;
    };
  };
};

export type AddWeightPayload = {
  date: string | Date;
  avgWeight: number;
  sampleCount: number;
  notes?: string;
};

export type UpdateWeightPayload = Partial<AddWeightPayload>;

// ==================== QUERY HOOKS ====================

// Get weight history + metrics
export const useGetWeights = (
  batchId: string,
  params?: { startDate?: string; endDate?: string; source?: "MANUAL" | "SALE" | "SYSTEM" },
  options?: { enabled?: boolean }
) => {
  return useQuery<GetWeightsResponse>({
    queryKey: weightKeys.list(batchId, params || {}),
    queryFn: async () => {
      const response = await axiosInstance.get(`/batches/${batchId}/weights`, {
        params,
      });
      console.log("Weights data", response.data);
      return response.data as GetWeightsResponse;
    },
    enabled: (options?.enabled !== false) && !!batchId,
  });
};

// Get growth chart data
export const useGetGrowthChart = (batchId: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: weightKeys.chart(batchId),
    queryFn: async () => {
      const response = await axiosInstance.get(`/batches/${batchId}/growth-chart`);
      console.log("Growth chart data", response.data);
      return response.data as { success: boolean; data: Array<{ date: string; weight: number; source: string }> };
    },
    enabled: (options?.enabled !== false) && !!batchId,
  });
};

// ==================== MUTATION HOOKS ====================

// Add manual weight
export const useAddWeight = (batchId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AddWeightPayload): Promise<{ success: boolean; data: WeightRecord }> => {
      const response = await axiosInstance.post(`/batches/${batchId}/weights`, payload);
      return response.data as { success: boolean; data: WeightRecord };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: weightKeys.byBatch(batchId) });
    },
  });
};

// Update manual weight (only MANUAL allowed by backend)
export const useUpdateWeight = (batchId: string, weightId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateWeightPayload): Promise<{ success: boolean; data: WeightRecord }> => {
      const response = await axiosInstance.put(`/batches/${batchId}/weights/${weightId}`, payload);
      return response.data as { success: boolean; data: WeightRecord };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: weightKeys.byBatch(batchId) });
    },
  });
};

// Delete manual weight
export const useDeleteWeight = (batchId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (weightId: string): Promise<{ success: boolean; message: string }> => {
      const response = await axiosInstance.delete(`/batches/${batchId}/weights/${weightId}`);
      return response.data as { success: boolean; message: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: weightKeys.byBatch(batchId) });
    },
  });
};
