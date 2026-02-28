import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

export const farmerCartKeys = {
  all: ["farmer-cart"] as const,
  lists: () => [...farmerCartKeys.all, "list"] as const,
  list: (dealerId: string) => [...farmerCartKeys.lists(), dealerId] as const,
};

export const farmerCatalogKeys = {
  all: ["farmer-dealer-catalog"] as const,
  list: (dealerId: string, params?: any) =>
    [...farmerCatalogKeys.all, dealerId, params] as const,
};

// ==================== CATALOG ====================

export const useGetDealerCatalogProducts = (
  dealerId: string,
  params?: { page?: number; limit?: number; search?: string; type?: string }
) => {
  return useQuery({
    queryKey: farmerCatalogKeys.list(dealerId, params),
    queryFn: async () => {
      const { data } = await axiosInstance.get(
        `/farmer/cart/catalog/${dealerId}/products`,
        { params }
      );
      return data;
    },
    enabled: !!dealerId,
  });
};

// ==================== CART ====================

export const useGetFarmerCart = (dealerId: string) => {
  return useQuery({
    queryKey: farmerCartKeys.list(dealerId),
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/farmer/cart/${dealerId}`);
      return data.data;
    },
    enabled: !!dealerId,
  });
};

export const useAddToFarmerCart = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      dealerId: string;
      productId: string;
      quantity: number;
      unit?: string;
    }) => {
      const { data } = await axiosInstance.post("/farmer/cart/items", input);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: farmerCartKeys.list(variables.dealerId),
      });
    },
  });
};

export const useUpdateFarmerCartItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      itemId,
      quantity,
    }: {
      itemId: string;
      quantity: number;
    }) => {
      const { data } = await axiosInstance.put(
        `/farmer/cart/items/${itemId}`,
        { quantity }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: farmerCartKeys.lists() });
    },
  });
};

export const useRemoveFarmerCartItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (itemId: string) => {
      const { data } = await axiosInstance.delete(
        `/farmer/cart/items/${itemId}`
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: farmerCartKeys.lists() });
    },
  });
};

export const useClearFarmerCart = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dealerId: string) => {
      const { data } = await axiosInstance.delete(`/farmer/cart/${dealerId}`);
      return data;
    },
    onSuccess: (_, dealerId) => {
      queryClient.invalidateQueries({
        queryKey: farmerCartKeys.list(dealerId),
      });
    },
  });
};

export const useCheckoutFarmerCart = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      dealerId,
      notes,
    }: {
      dealerId: string;
      notes?: string;
    }) => {
      const { data } = await axiosInstance.post(
        `/farmer/cart/${dealerId}/checkout`,
        { notes }
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: farmerCartKeys.list(variables.dealerId),
      });
      queryClient.invalidateQueries({
        queryKey: ["farmer-purchase-requests"],
      });
    },
  });
};
