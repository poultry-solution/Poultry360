import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { EggType, CreateEggType, UpdateEggType } from "@myapp/shared-types";
import axiosInstance from "@/common/lib/axios";
import { saleQueryKeys } from "@/fetchers/sale/saleQueries";

export const eggTypeKeys = {
  all: ["egg-types"] as const,
  lists: () => [...eggTypeKeys.all, "list"] as const,
};

export const useGetEggTypes = (options?: { enabled?: boolean }) => {
  return useQuery<{ success: boolean; data: EggType[] }>({
    queryKey: eggTypeKeys.lists(),
    queryFn: async () => {
      const response = await axiosInstance.get("/egg-types");
      return response.data;
    },
    enabled: options?.enabled !== false,
  });
};

export const useCreateEggType = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateEggType) => {
      const response = await axiosInstance.post("/egg-types", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eggTypeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: saleQueryKeys.eggInventory() });
    },
  });
};

export const useUpdateEggType = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateEggType }) => {
      const response = await axiosInstance.put(`/egg-types/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eggTypeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: saleQueryKeys.eggInventory() });
    },
  });
};

export const useDeleteEggType = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await axiosInstance.delete(`/egg-types/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eggTypeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: saleQueryKeys.eggInventory() });
    },
  });
};
