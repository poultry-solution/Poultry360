import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";
import { hatcheryInventoryKeys } from "./hatcheryInventoryQueries";
import { hatcheryProductKeys } from "./hatcheryProductQueries";
import type {
  CreateMaterialProductionInput,
  MaterialProductionRun,
} from "@/fetchers/production/materialProductionTypes";

export type HatcheryProductionRun = MaterialProductionRun;
export type CreateHatcheryProductionInput = CreateMaterialProductionInput;

export const hatcheryProductionKeys = {
  all: ["hatcheryProduction"] as const,
  list: (params: Record<string, unknown>) => ["hatcheryProduction", "list", params] as const,
};

export function useGetHatcheryProduction(params: { page?: number; limit?: number; search?: string } = {}) {
  return useQuery({
    queryKey: hatcheryProductionKeys.list(params),
    queryFn: async () => {
      const { data } = await axiosInstance.get("/hatchery/production", { params });
      return data as { success: boolean; data: HatcheryProductionRun[]; pagination: { page: number; limit: number; total: number; totalPages: number } };
    },
  });
}

export function useCreateHatcheryProduction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateHatcheryProductionInput) => {
      const { data } = await axiosInstance.post("/hatchery/production", input);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hatcheryProductionKeys.all });
      qc.invalidateQueries({ queryKey: hatcheryInventoryKeys.all });
      qc.invalidateQueries({ queryKey: hatcheryProductKeys.all });
    },
  });
}

export function useDeleteHatcheryProduction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axiosInstance.delete(`/hatchery/production/${id}`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hatcheryProductionKeys.all });
      qc.invalidateQueries({ queryKey: hatcheryInventoryKeys.all });
      qc.invalidateQueries({ queryKey: hatcheryProductKeys.all });
    },
  });
}
