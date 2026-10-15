import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";
import { refreshFarmerData } from "@/fetchers/farmer/refreshFarmerData";
import type { BatchStatRow, FcrStatus } from "@/fetchers/analytics/farmerAnalyticsQueries";

// ==================== TYPES ====================

export interface FarmBasic {
  id: string;
  name: string;
  capacity: number;
  description: string | null;
  createdAt: string;
  /** Present on the plain list (farm pickers). */
  _count?: { batches: number };
}

/** Farms page row: birds alive and batch counts. */
export interface FarmListRow extends FarmBasic {
  birdsAlive: number;
  running: number;
  total: number;
}

export interface FarmInput {
  name: string;
  capacity: number;
  description?: string | null;
}

/** Farm page. Money is null when this staff account can't see money. */
export interface FarmSummary {
  farm: { id: string; name: string; capacity: number; description: string | null };
  canDelete: boolean;
  showMoney: boolean;
  tiles: {
    birdsAlive: number;
    runningBatches: number;
    totalBatches: number;
    fcr: number | null;
    fcrIsOld: boolean;
    fcrBatches: number;
    sales: number | null;
    costs: number | null;
    profit: number | null;
  };
  batches: Array<
    Omit<BatchStatRow, "sales" | "costs" | "profit" | "costPerBird" | "profitPerBird"> & {
      sales: number | null;
      costs: number | null;
      profit: number | null;
      costPerBird: number | null;
      profitPerBird: number | null;
      fcrStatus: FcrStatus | null;
    }
  >;
}

// ==================== QUERY KEYS ====================
export const farmKeys = {
  all: ["farms"] as const,
  myFarms: () => [...farmKeys.all, "my-farms"] as const,
  summary: (id: string) => [...farmKeys.all, "summary", id] as const,
};

// ==================== QUERIES ====================

/**
 * The account's farms. With `params` (page/limit): the Farms page rows with birds alive
 * and batch counts. Without: a plain list for farm pickers.
 */
export function useGetUserFarms(
  type?: "all",
  params?: { page?: number; limit?: number },
  options?: { enabled?: boolean }
) {
  return useQuery<{
    success: boolean;
    data: FarmListRow[] & FarmBasic[];
    pagination?: { page: number; limit: number; total: number; totalPages: number };
  }>({
    queryKey: [...farmKeys.myFarms(), { ...params }],
    queryFn: async () => {
      const response = await axiosInstance.get("/farms/my-farms", { params });
      return response.data;
    },
    enabled: options?.enabled !== false,
  });
}

export const useGetFarmSummary = (id: string) =>
  useQuery<FarmSummary>({
    queryKey: farmKeys.summary(id),
    queryFn: async () => {
      const response = await axiosInstance.get(`/farms/${id}/summary`);
      return response.data.data;
    },
    enabled: !!id,
  });

// ==================== MUTATIONS ====================
// A farm change can show up anywhere (pickers, Analytics, batches, Home), so refresh it all.

export const useCreateFarm = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: FarmInput) => (await axiosInstance.post("/farms", data)).data,
    onSuccess: () => refreshFarmerData(queryClient),
  });
};

export const useUpdateFarm = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FarmInput }) =>
      (await axiosInstance.put(`/farms/${id}`, data)).data,
    onSuccess: () => refreshFarmerData(queryClient),
  });
};

export const useDeleteFarm = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) =>
      (await axiosInstance.delete(`/farms/${id}`, { data: { password } })).data,
    onSuccess: (_data, { id }) => {
      queryClient.removeQueries({ queryKey: farmKeys.summary(id) });
      refreshFarmerData(queryClient);
    },
  });
};
