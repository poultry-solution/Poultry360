import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

// Query keys
export const dealerCartKeys = {
  all: ["dealer-cart"] as const,
  lists: () => [...dealerCartKeys.all, "list"] as const,
  list: (companyId: string) => [...dealerCartKeys.lists(), companyId] as const,
};

// Types
export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  createdAt: Date;
  updatedAt: Date;
  product: {
    id: string;
    name: string;
    description?: string;
    type: string;
    unit: string;
    price: number;
    currentStock: number;
    imageUrl?: string;
  };
}

export interface DealerCart {
  id: string;
  dealerId: string;
  companyId: string;
  items: CartItem[];
  total: number;
  company: {
    id: string;
    name: string;
    address?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface AddToCartInput {
  companyId: string;
  productId: string;
  quantity: number;
}

export interface UpdateCartItemInput {
  itemId: string;
  quantity: number;
}

export interface CheckoutInput {
  companyId: string;
  notes?: string;
}

// Get cart for a company
export const useGetDealerCart = (companyId: string) => {
  return useQuery({
    queryKey: dealerCartKeys.list(companyId),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ success: boolean; data: DealerCart }>(
        `/dealer/cart/${companyId}`
      );
      return data.data;
    },
    enabled: !!companyId,
  });
};

// Add item to cart
export const useAddToCart = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddToCartInput) => {
      const { data } = await axiosInstance.post("/dealer/cart/items", input);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: dealerCartKeys.list(variables.companyId),
      });
    },
  });
};

// Update cart item quantity
export const useUpdateCartItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, quantity }: UpdateCartItemInput) => {
      const { data } = await axiosInstance.put(`/dealer/cart/items/${itemId}`, {
        quantity,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dealerCartKeys.lists() });
    },
  });
};

// Remove item from cart
export const useRemoveCartItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const { data } = await axiosInstance.delete(`/dealer/cart/items/${itemId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dealerCartKeys.lists() });
    },
  });
};

// Clear entire cart
export const useClearCart = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (companyId: string) => {
      const { data } = await axiosInstance.delete(`/dealer/cart/${companyId}`);
      return data;
    },
    onSuccess: (_, companyId) => {
      queryClient.invalidateQueries({
        queryKey: dealerCartKeys.list(companyId),
      });
    },
  });
};

// Checkout cart (create consignment)
export const useCheckoutCart = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ companyId, notes }: CheckoutInput) => {
      const { data } = await axiosInstance.post(
        `/dealer/cart/${companyId}/checkout`,
        { notes }
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: dealerCartKeys.list(variables.companyId),
      });
      // Also invalidate consignments query
      queryClient.invalidateQueries({ queryKey: ["consignments"] });
    },
  });
};
