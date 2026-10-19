import { refreshFarmerData } from "@/fetchers/farmer/refreshFarmerData";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";
import { CreateSale, CategoryType } from "@myapp/shared-types";
import { weightKeys } from "@/fetchers/weight/weightQueries";

// ==================== QUERY KEYS ====================

export const saleQueryKeys = {
  all: ["sales"] as const,
  lists: () => [...saleQueryKeys.all, "list"] as const,
  list: (params: any) => [...saleQueryKeys.lists(), params] as const,
  details: () => [...saleQueryKeys.all, "detail"] as const,
  detail: (id: string) => [...saleQueryKeys.details(), id] as const,
  batchSales: (batchId: string) =>
    [...saleQueryKeys.all, "batch", batchId] as const,
  batchSalesPage: (batchId: string, params: { page?: number; limit?: number }) =>
    [...saleQueryKeys.batchSales(batchId), "page", params] as const,
  categories: (type?: CategoryType) =>
    [...saleQueryKeys.all, "categories", type] as const,
  eggInventory: (batchId?: string | null) =>
    [...saleQueryKeys.all, "egg-inventory", batchId ?? "user"] as const,
  customers: () => ["customers", "sales"] as const,
  customerList: (params: any) => [...saleQueryKeys.customers(), "list", params] as const,
};

// ==================== QUERY HOOKS ====================

// Egg inventory response: dynamic types with quantities
export interface EggInventoryType {
  id: string;
  name: string;
  code: string;
  quantity: number;
}
export interface EggInventoryData {
  quantities: Record<string, number>;
  types: EggInventoryType[];
}

// Get egg inventory: pass batchId to get that batch's stock; omit for user-level inventory
export const useGetEggInventory = (options?: {
  batchId?: string | null;
  enabled?: boolean;
}) => {
  const batchId = options?.batchId;
  return useQuery<{ success: boolean; data: EggInventoryData }>({
    queryKey: saleQueryKeys.eggInventory(batchId ?? undefined),
    queryFn: async () => {
      const params = batchId ? { batchId } : {};
      const response = await axiosInstance.get("/egg-inventory", { params });
      return response.data;
    },
    enabled: options?.enabled !== false,
  });
};

// Get all sales with filtering
export const useGetSales = (
  params?: {
    page?: number;
    limit?: number;
    search?: string;
    farmId?: string;
    batchId?: string;
    customerId?: string;
    isCredit?: boolean;
    startDate?: string;
    endDate?: string;
    itemType?: string; // e.g., Chicken_Meat, EGGS, FEED, etc.
  },
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: saleQueryKeys.list(params),
    queryFn: async () => {
      const response = await axiosInstance.get("/sales", { params });
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: options?.enabled !== false,
  });
};

// Get all sale payments
export const useGetSalePayments = (
  params?: {
    page?: number;
    limit?: number;
    search?: string;
    farmId?: string;
    customerId?: string;
    startDate?: string;
    endDate?: string;
  },
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: [...saleQueryKeys.all, "payments", params],
    queryFn: async () => {
      const response = await axiosInstance.get("/sales/payments", { params });
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: options?.enabled !== false,
  });
};

// Get sale by ID
export const useGetSale = (id: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: saleQueryKeys.detail(id),
    queryFn: async () => {
      const response = await axiosInstance.get(`/sales/${id}`);
      return response.data;
    },
    enabled: options?.enabled === true && !!id,
    staleTime: 2 * 60 * 1000,
  });
};

// Get sales for a specific batch
export const useGetBatchSales = (
  batchId: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: saleQueryKeys.batchSales(batchId),
    queryFn: async () => {
      const response = await axiosInstance.get(`/sales/batch/${batchId}`);
      console.log("batch sales", response.data);
      return response.data;
    },
    enabled: options?.enabled !== false && !!batchId,
    staleTime: 2 * 60 * 1000,
  });
};

export const useGetBatchSalesPage = (
  batchId: string,
  params: { page?: number; limit?: number },
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: saleQueryKeys.batchSalesPage(batchId, params),
    queryFn: async () => {
      const response = await axiosInstance.get(`/sales/batch/${batchId}`, {
        params,
      });
      return response.data;
    },
    enabled: options?.enabled !== false && !!batchId,
    staleTime: 2 * 60 * 1000,
  });
};

// Get sales categories
export const useGetSalesCategories = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: saleQueryKeys.categories("SALES"),
    queryFn: async () => {
      const response = await axiosInstance.get("/sales/categories");
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: options?.enabled !== false,
  });
};

// ==================== MUTATION HOOKS ====================

// Create sale
export const useCreateSale = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: CreateSale & { birdsCount?: number; itemType?: string }
    ) => {
      const response = await axiosInstance.post("/sales", data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      refreshFarmerData(queryClient);
      // Home tiles and the profit-per-batch graph read from the dashboard.
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      // Invalidate and refetch sales lists
      queryClient.invalidateQueries({ queryKey: saleQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: saleQueryKeys.customers() });


      // If batchId is provided, invalidate batch sales
      if (variables.batchId) {
        queryClient.invalidateQueries({
          queryKey: saleQueryKeys.batchSales(variables.batchId),
        });
        // Also refresh batch detail and analytics to reflect current birds
        queryClient.invalidateQueries({
          queryKey: ["batches", "detail", variables.batchId],
        });
        queryClient.invalidateQueries({
          queryKey: ["batches", "analytics", variables.batchId],
        });
        queryClient.invalidateQueries({
          queryKey: ["batches", "detail", variables.batchId, "fcr-history"],
        });
      }

      // If farmId is provided, invalidate farm-related queries
      if (variables.farmId) {
        queryClient.invalidateQueries({
          queryKey: ["farms", "detail", variables.farmId],
        });
      }
    },
  });
};

// Delete sale
export const useDeleteSale = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await axiosInstance.delete(`/sales/${id}`);
      return response.data;
    },
    onSuccess: (data, id) => {
      refreshFarmerData(queryClient);
      // Home tiles and the profit-per-batch graph read from the dashboard.
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      // Remove the sale from cache
      queryClient.removeQueries({ queryKey: saleQueryKeys.detail(id) });

      // Invalidate sales lists
      queryClient.invalidateQueries({ queryKey: saleQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: saleQueryKeys.customers() });


      // Invalidate batch sales (we don't know which batch, so invalidate all)
      queryClient.invalidateQueries({
        queryKey: [...saleQueryKeys.all, "batch"],
      });
      const batchId = data?.data?.batchId;
      if (batchId) {
        queryClient.invalidateQueries({
          queryKey: ["batches", "detail", batchId],
        });
      }
    },
  });
};

export const useSoftDeleteCustomerPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      customerId,
      transactionId,
      password,
    }: {
      customerId: string;
      transactionId: string;
      password: string;
    }) => {
      const response = await axiosInstance.delete(
        `/sales/customers/${customerId}/payments/${transactionId}`,
        { data: { password } }
      );
      return response.data;
    },
    onSuccess: (_data, variables) => {
      // Reversing a payment bumps customer.balance back up; the analytics
      // "Money to receive" tile needs to reflect the new balance.
      refreshFarmerData(queryClient);
      // Home tiles and the profit-per-batch graph read from the dashboard.
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      // Deleting a receipt made from a sale payment also changes that sale.
      queryClient.invalidateQueries({ queryKey: saleQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: ["customers", "sales"] });
      queryClient.invalidateQueries({
        queryKey: ["customers", "detail", variables.customerId],
      });
    },
  });
};

export const useAddCustomerPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      customerId,
      data,
    }: {
      customerId: string;
      data: {
        amount: number;
        date?: string;
        description?: string;
        reference?: string;
        receiptUrl?: string;
      };
    }) => {
      const response = await axiosInstance.post(
        `/sales/customers/${customerId}/payments`,
        data
      );
      return response.data;
    },
    onSuccess: (_data, variables) => {
      // Account-level customer payments change customer.balance; analytics
      // "Money to receive" tile needs to refresh.
      refreshFarmerData(queryClient);
      // Home tiles and the profit-per-batch graph read from the dashboard.
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: saleQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ["customers", "sales"] });
      queryClient.invalidateQueries({ queryKey: [...saleQueryKeys.all, "payments"] });
      queryClient.invalidateQueries({
        queryKey: ["customers", "detail", variables.customerId],
      });
    },
  });
};

// Create sales category
export const useCreateSalesCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const response = await axiosInstance.post("/sales/categories", data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch sales categories
      queryClient.invalidateQueries({
        queryKey: saleQueryKeys.categories("SALES"),
      });
    },
  });
};

// ==================== COMBINED HOOKS ====================

// Batch sales management hook
export const useBatchSalesManagement = (
  batchId: string,
  options?: { enabled?: boolean }
) => {
  const queryClient = useQueryClient();
  const batchSalesQuery = useGetBatchSales(batchId, options);
  const categoriesQuery = useGetSalesCategories();
  const createSaleMutation = useCreateSale();
  const deleteSaleMutation = useDeleteSale();

  // Helper: invalidate weights for this batch
  const invalidateWeights = () => {
    if (batchId) {
      queryClient.invalidateQueries({ queryKey: weightKeys.byBatch(batchId) });
      queryClient.invalidateQueries({ queryKey: ["batches", "detail", batchId] });
    }
  };

  return {
    sales: batchSalesQuery.data?.data || [],
    categories: categoriesQuery.data?.data || [],
    isLoading: batchSalesQuery.isLoading || categoriesQuery.isLoading,
    error: batchSalesQuery.error || categoriesQuery.error,

    // Mutations
    createSale: async (data: any) => {
      const res = await createSaleMutation.mutateAsync(data);
      invalidateWeights();
      return res;
    },
    deleteSale: async (id: string) => {
      const res = await deleteSaleMutation.mutateAsync(id);
      invalidateWeights();
      return res;
    },

    // Mutation states
    isCreating: createSaleMutation.isPending,
    isDeleting: deleteSaleMutation.isPending,

    // Refetch
    refetch: () => {
      batchSalesQuery.refetch();
      categoriesQuery.refetch();
    },
  };
};

// Sales management hook for general sales page
export const useSalesManagement = (params?: {
  page?: number;
  limit?: number;
  search?: string;
  farmId?: string;
  batchId?: string;
  customerId?: string;
  isCredit?: boolean;
  startDate?: string;
  endDate?: string;
}) => {
  const salesQuery = useGetSales(params);
  const categoriesQuery = useGetSalesCategories();
  const createSaleMutation = useCreateSale();
  const deleteSaleMutation = useDeleteSale();
  const createCategoryMutation = useCreateSalesCategory();

  return {
    sales: salesQuery.data?.data || [],
    pagination: salesQuery.data?.pagination,
    summary: salesQuery.data?.summary,
    categories: categoriesQuery.data?.data || [],
    isLoading: salesQuery.isLoading || categoriesQuery.isLoading,
    error: salesQuery.error || categoriesQuery.error,

    // Mutations
    createSale: createSaleMutation.mutateAsync,
    deleteSale: deleteSaleMutation.mutateAsync,
    createCategory: createCategoryMutation.mutateAsync,

    // Mutation states
    isCreating: createSaleMutation.isPending,
    isDeleting: deleteSaleMutation.isPending,
    isCreatingCategory: createCategoryMutation.isPending,

    // Refetch
    refetch: () => {
      salesQuery.refetch();
      categoriesQuery.refetch();
    },
  };
};

// Customer sales hook
export const useCustomerSales = (customerId: string) => {
  return useGetSales({ customerId });
};

// Credit sales hook
export const useCreditSales = (params?: {
  page?: number;
  limit?: number;
  farmId?: string;
  startDate?: string;
  endDate?: string;
}) => {
  return useGetSales({ ...params, isCredit: true });
};

// Cash sales hook
export const useCashSales = (params?: {
  page?: number;
  limit?: number;
  farmId?: string;
  startDate?: string;
  endDate?: string;
}) => {
  return useGetSales({ ...params, isCredit: false });
};

// ==================== CUSTOMER QUERIES ====================

export const useGetCustomersForSales = (
  search?: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: ["customers", "sales", search],
    queryFn: () =>
      axiosInstance.get(
        `/sales/customers${search ? `?search=${encodeURIComponent(search)}` : ""}`
      ),
    select: (response) => response.data.data,
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: options?.enabled === true,
  });
};

export const useGetCustomersForSalesPage = (
  params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    hasBalance?: string;
  },
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: saleQueryKeys.customerList(params),
    queryFn: async () => {
      const response = await axiosInstance.get("/sales/customers", { params });
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
    enabled: options?.enabled !== false,
  });
};

// Get customer by ID
export const useGetCustomer = (id: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ["customers", "detail", id],
    queryFn: async () => {
      const response = await axiosInstance.get(`/sales/customers/${id}`);
      return response.data;
    },
    enabled: options?.enabled === true && !!id,
    staleTime: 2 * 60 * 1000,
  });
};

// Create customer
export const useCreateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      phone: string;
      category?: string;
      address?: string;
    }) => {
      const response = await axiosInstance.post("/sales/customers", data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate customers list
      queryClient.invalidateQueries({ queryKey: ["customers", "sales"] });
    },
  });
};

// Update customer
export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: {
        name?: string;
        phone?: string;
        category?: string;
        address?: string;
      };
    }) => {
      const response = await axiosInstance.put(`/sales/customers/${id}`, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate customers list and specific customer
      queryClient.invalidateQueries({ queryKey: ["customers", "sales"] });
      queryClient.invalidateQueries({
        queryKey: ["customers", "detail", variables.id],
      });
    },
  });
};

// Delete customer
export const useDeleteCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await axiosInstance.delete(`/sales/customers/${id}`);
      return response.data;
    },
    onSuccess: (data, id) => {
      // Remove customer from cache and invalidate lists
      queryClient.removeQueries({ queryKey: ["customers", "detail", id] });
      queryClient.invalidateQueries({ queryKey: ["customers", "sales"] });
    },
  });
};

export const useSetCustomerOpeningBalance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      customerId,
      openingBalance,
      notes,
      date,
    }: {
      customerId: string;
      openingBalance: number;
      notes?: string;
      date?: string;
    }) => {
      const response = await axiosInstance.post(`/sales/customers/${customerId}/opening-balance`, {
        openingBalance,
        notes,
        ...(date ? { date } : {}),
      });
      return response.data;
    },
    onSuccess: (_data, vars) => {
      // Home tiles and the profit-per-batch graph read from the dashboard.
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["customers", "detail", vars.customerId] });
      queryClient.invalidateQueries({ queryKey: ["customers", "sales"] });
    },
  });
};
