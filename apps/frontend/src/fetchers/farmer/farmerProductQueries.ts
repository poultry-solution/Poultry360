import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";
import { inventoryKeys } from "@/fetchers/inventory/inventoryQueries";

export type FarmerProductOutputType =
  | "FEED"
  | "MEDICINE"
  | "EQUIPMENT"
  | "RAW_MATERIAL"
  | "OTHER";

export interface FarmerManufacturedProduct {
  id: string;
  farmerId: string;
  name: string;
  unit: string;
  outputItemType: FarmerProductOutputType;
  minStock: number | null;
  deletedAt: string | null;
  currentStock: number;
  unitCost: number | null;
  lotCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FarmerProductInput {
  name: string;
  unit: string;
  outputItemType: FarmerProductOutputType;
  minStock?: number | null;
}

export const farmerProductKeys = {
  all: ["farmerProducts"] as const,
  list: (params: Record<string, unknown>) =>
    ["farmerProducts", "list", params] as const,
};

export function useGetFarmerProducts(
  params: { search?: string; page?: number; limit?: number } = {}
) {
  return useQuery({
    queryKey: farmerProductKeys.list(params),
    queryFn: async () => {
      const { data } = await axiosInstance.get("/farmer/products", { params });
      return data as {
        success: boolean;
        data: FarmerManufacturedProduct[];
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

export function useCreateFarmerProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: FarmerProductInput) => {
      const { data } = await axiosInstance.post("/farmer/products", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: farmerProductKeys.all });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
}

export function useUpdateFarmerProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<FarmerProductInput> }) => {
      const { data } = await axiosInstance.put(`/farmer/products/${id}`, input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: farmerProductKeys.all });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
}

export function useArchiveFarmerProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axiosInstance.delete(`/farmer/products/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: farmerProductKeys.all });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
}
