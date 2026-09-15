import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";
import { inventoryKeys } from "@/fetchers/inventory/inventoryQueries";
import { farmerProductKeys } from "./farmerProductQueries";
import type {
  CreateMaterialProductionInput,
  MaterialProductionRun,
} from "@/fetchers/production/materialProductionTypes";

export type FarmerProductionRun = MaterialProductionRun;
export type CreateFarmerProductionInput = CreateMaterialProductionInput;

export const farmerProductionKeys = {
  all: ["farmerProduction"] as const,
  list: (params: Record<string, unknown>) =>
    ["farmerProduction", "list", params] as const,
};

export function useGetFarmerProduction(
  params: { page?: number; limit?: number; search?: string } = {}
) {
  return useQuery({
    queryKey: farmerProductionKeys.list(params),
    queryFn: async () => {
      const { data } = await axiosInstance.get("/farmer/production", { params });
      return data as {
        success: boolean;
        data: FarmerProductionRun[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      };
    },
  });
}

export function useCreateFarmerProduction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateFarmerProductionInput) => {
      const { data } = await axiosInstance.post("/farmer/production", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: farmerProductionKeys.all });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      queryClient.invalidateQueries({ queryKey: farmerProductKeys.all });
    },
  });
}

export function useDeleteFarmerProduction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axiosInstance.delete(`/farmer/production/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: farmerProductionKeys.all });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      queryClient.invalidateQueries({ queryKey: farmerProductKeys.all });
    },
  });
}
