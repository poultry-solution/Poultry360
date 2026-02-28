import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

// Query keys
export const dealerProductKeys = {
  all: ["dealer-products"] as const,
  lists: () => [...dealerProductKeys.all, "list"] as const,
  list: (filters: string) => [...dealerProductKeys.lists(), { filters }] as const,
  details: () => [...dealerProductKeys.all, "detail"] as const,
  detail: (id: string) => [...dealerProductKeys.details(), id] as const,
  inventory: () => [...dealerProductKeys.all, "inventory"] as const,
};

// Types
export interface UnitConversion {
  unitName: string;
  conversionFactor: number;
}

export interface DealerProduct {
  id: string;
  name: string;
  description?: string;
  type: string;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  currentStock: number;
  minStock?: number;
  sku?: string;
  dealerId: string;
  companyProductId?: string;
  companyProduct?: any;
  unitConversions?: UnitConversion[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDealerProductInput {
  name: string;
  description?: string;
  type: string;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  currentStock?: number;
  minStock?: number;
  sku?: string;
  companyProductId?: string;
}

export interface UpdateDealerProductInput extends Partial<CreateDealerProductInput> {}

export interface DealerProductsResponse {
  success: boolean;
  data: DealerProduct[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface InventorySummaryResponse {
  success: boolean;
  data: {
    totalProducts: number;
    lowStockProducts: number;
    outOfStockProducts: number;
    totalInventoryValue: number;
    productsByType: Array<{
      type: string;
      _count: number;
    }>;
  };
}

// Get dealer products
export const useGetDealerProducts = (params?: {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  lowStock?: boolean;
}) => {
  const queryString = new URLSearchParams(
    Object.entries(params || {})
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  ).toString();

  return useQuery({
    queryKey: dealerProductKeys.list(queryString),
    queryFn: async () => {
      const { data } = await axiosInstance.get<DealerProductsResponse>(
        `/dealer/products?${queryString}`
      );
      console.log("Dealer products data:", data);
      return data;
    },
  });
};

// Get dealer product by ID
export const useGetDealerProductById = (id: string) => {
  return useQuery({
    queryKey: dealerProductKeys.detail(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/dealer/products/${id}`);
      console.log("Dealer product by ID data:", data);
      return data;
    },
    enabled: !!id,
  });
};

// Get inventory summary
export const useGetInventorySummary = () => {
  return useQuery({
    queryKey: dealerProductKeys.inventory(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<InventorySummaryResponse>(
        "/dealer/products/inventory/summary"
      );
      console.log("Inventory summary data:", data);
      return data;
    },
  });
};

// Create dealer product
export const useCreateDealerProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateDealerProductInput) => {
      const { data } = await axiosInstance.post("/dealer/products", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dealerProductKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dealerProductKeys.inventory() });
    },
  });
};

// Update dealer product
export const useUpdateDealerProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateDealerProductInput & { id: string }) => {
      const { data } = await axiosInstance.put(`/dealer/products/${id}`, input);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: dealerProductKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dealerProductKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: dealerProductKeys.inventory() });
    },
  });
};

// Delete dealer product
export const useDeleteDealerProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axiosInstance.delete(`/dealer/products/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dealerProductKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dealerProductKeys.inventory() });
    },
  });
};

// Adjust product stock
export const useAdjustProductStock = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      quantity,
      type,
      description,
      reference,
    }: {
      id: string;
      quantity: number;
      type: string;
      description?: string;
      reference?: string;
    }) => {
      const { data } = await axiosInstance.post(`/dealer/products/${id}/adjust-stock`, {
        quantity,
        type,
        description,
        reference,
      });
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: dealerProductKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dealerProductKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: dealerProductKeys.inventory() });
    },
  });
};

