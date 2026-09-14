import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";
import { hatcheryInventoryKeys } from "./hatcheryInventoryQueries";

export interface HatcheryManufacturedProduct {
  id: string;
  hatcheryOwnerId: string;
  name: string;
  unit: string;
  minStock: number | null;
  deletedAt: string | null;
  currentStock: number;
  lotCount: number;
  createdAt: string;
  updatedAt: string;
}

export const hatcheryProductKeys = {
  all: ["hatcheryProducts"] as const,
  list: (params: Record<string, unknown>) => ["hatcheryProducts", "list", params] as const,
};

export function useGetHatcheryProducts(params: { search?: string; page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: hatcheryProductKeys.list(params),
    queryFn: async () => {
      const { data } = await axiosInstance.get("/hatchery/products", { params });
      return data as { success: boolean; data: HatcheryManufacturedProduct[]; pagination: { page: number; limit: number; total: number; totalPages: number } };
    },
  });
}

export function useCreateHatcheryProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; unit: string; minStock?: number }) => {
      const { data } = await axiosInstance.post("/hatchery/products", input);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hatcheryProductKeys.all });
      qc.invalidateQueries({ queryKey: hatcheryInventoryKeys.all });
    },
  });
}

export function useUpdateHatcheryProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: { name?: string; unit?: string; minStock?: number | null } }) => {
      const { data } = await axiosInstance.put(`/hatchery/products/${id}`, input);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: hatcheryProductKeys.all }),
  });
}

export function useArchiveHatcheryProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axiosInstance.delete(`/hatchery/products/${id}`);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hatcheryProductKeys.all });
      qc.invalidateQueries({ queryKey: hatcheryInventoryKeys.all });
    },
  });
}
