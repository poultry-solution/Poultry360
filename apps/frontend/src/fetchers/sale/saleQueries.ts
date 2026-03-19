import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";
import { CreateSale, UpdateSale, CategoryType } from "@myapp/shared-types";
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
  statistics: (params?: any) =>
    [...saleQueryKeys.all, "statistics", params] as const,
  categories: (type?: CategoryType) =>
    [...saleQueryKeys.all, "categories", type] as const,
  eggInventory: (batchId?: string | null) =>
    [...saleQueryKeys.all, "egg-inventory", batchId ?? "user"] as const,
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

// Get sales statistics
export const useGetSalesStatistics = (
  params?: {
    farmId?: string;
    batchId?: string;
    startDate?: string;
    endDate?: string;
  },
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: saleQueryKeys.statistics(params),
    queryFn: async () => {
      const response = await axiosInstance.get("/sales/statistics", { params });
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: options?.enabled !== false,
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
      // Invalidate and refetch sales lists
      queryClient.invalidateQueries({ queryKey: saleQueryKeys.lists() });

      // Invalidate statistics
      queryClient.invalidateQueries({ queryKey: saleQueryKeys.statistics() });

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

// Update sale
export const useUpdateSale = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateSale & { itemType?: string };
    }) => {
      const response = await axiosInstance.put(`/sales/${id}`, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch the specific sale
      queryClient.invalidateQueries({
        queryKey: saleQueryKeys.detail(variables.id),
      });

      // Invalidate sales lists
      queryClient.invalidateQueries({ queryKey: saleQueryKeys.lists() });

      // Invalidate statistics
      queryClient.invalidateQueries({ queryKey: saleQueryKeys.statistics() });

      // If batchId is provided, invalidate batch sales
      if (variables.data.batchId) {
        queryClient.invalidateQueries({
          queryKey: saleQueryKeys.batchSales(variables.data.batchId),
        });
      }

      // If farmId is provided, invalidate farm-related queries
      if (variables.data.farmId) {
        queryClient.invalidateQueries({
          queryKey: ["farms", "detail", variables.data.farmId],
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
      // Remove the sale from cache
      queryClient.removeQueries({ queryKey: saleQueryKeys.detail(id) });

      // Invalidate sales lists
      queryClient.invalidateQueries({ queryKey: saleQueryKeys.lists() });

      // Invalidate statistics
      queryClient.invalidateQueries({ queryKey: saleQueryKeys.statistics() });

      // Invalidate batch sales (we don't know which batch, so invalidate all)
      queryClient.invalidateQueries({
        queryKey: [...saleQueryKeys.all, "batch"],
      });
    },
  });
};

// Add payment to sale
export const useAddSalePayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      saleId,
      data,
    }: {
      saleId: string;
      data: {
        amount: number;
        date?: string;
        description?: string;
        receiptUrl?: string;
      };
    }) => {
      const response = await axiosInstance.post(
        `/sales/${saleId}/payments`,
        data
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch the specific sale
      queryClient.invalidateQueries({
        queryKey: saleQueryKeys.detail(variables.saleId),
      });

      // Invalidate sales lists
      queryClient.invalidateQueries({ queryKey: saleQueryKeys.lists() });

      // Invalidate statistics
      queryClient.invalidateQueries({ queryKey: saleQueryKeys.statistics() });

      // Invalidate customers for sales (to refresh customer balances after payment)
      queryClient.invalidateQueries({ queryKey: ["customers", "sales"] });

      // If the sale has a customer, also invalidate that specific customer
      if (data?.data?.customerId) {
        queryClient.invalidateQueries({
          queryKey: ["customers", "detail", data.data.customerId],
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
      queryClient.invalidateQueries({ queryKey: [...saleQueryKeys.all, "payments"] });
      queryClient.invalidateQueries({ queryKey: saleQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: saleQueryKeys.statistics() });
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
      queryClient.invalidateQueries({ queryKey: saleQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: saleQueryKeys.statistics() });
      queryClient.invalidateQueries({ queryKey: ["customers", "sales"] });
      queryClient.invalidateQueries({
        queryKey: ["customers", "detail", variables.customerId],
      });
      queryClient.invalidateQueries({ queryKey: ["sale-payments"] });
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

// Sales dashboard hook
export const useSalesDashboard = (params?: {
  farmId?: string;
  batchId?: string;
  startDate?: string;
  endDate?: string;
}) => {
  const salesQuery = useGetSales(params);
  const statisticsQuery = useGetSalesStatistics(params);
  const categoriesQuery = useGetSalesCategories();

  return {
    sales: salesQuery.data?.data || [],
    statistics: statisticsQuery.data?.data,
    categories: categoriesQuery.data?.data || [],
    isLoading:
      salesQuery.isLoading ||
      statisticsQuery.isLoading ||
      categoriesQuery.isLoading,
    error: salesQuery.error || statisticsQuery.error || categoriesQuery.error,
    refetch: () => {
      salesQuery.refetch();
      statisticsQuery.refetch();
      categoriesQuery.refetch();
    },
  };
};

// Batch sales management hook
export const useBatchSalesManagement = (
  batchId: string,
  options?: { enabled?: boolean }
) => {
  const queryClient = useQueryClient();
  const batchSalesQuery = useGetBatchSales(batchId, options);
  const categoriesQuery = useGetSalesCategories();
  const createSaleMutation = useCreateSale();
  const updateSaleMutation = useUpdateSale();
  const deleteSaleMutation = useDeleteSale();
  const addPaymentMutation = useAddSalePayment();

  // Helper: invalidate weights for this batch
  const invalidateWeights = () => {
    if (batchId) {
      queryClient.invalidateQueries({ queryKey: weightKeys.byBatch(batchId) });
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
    updateSale: async (vars: any) => {
      const res = await updateSaleMutation.mutateAsync(vars);
      invalidateWeights();
      return res;
    },
    deleteSale: async (id: string) => {
      const res = await deleteSaleMutation.mutateAsync(id);
      invalidateWeights();
      return res;
    },
    addPayment: addPaymentMutation.mutateAsync,

    // Mutation states
    isCreating: createSaleMutation.isPending,
    isUpdating: updateSaleMutation.isPending,
    isDeleting: deleteSaleMutation.isPending,
    isAddingPayment: addPaymentMutation.isPending,

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
  const updateSaleMutation = useUpdateSale();
  const deleteSaleMutation = useDeleteSale();
  const addPaymentMutation = useAddSalePayment();
  const createCategoryMutation = useCreateSalesCategory();

  return {
    sales: salesQuery.data?.data || [],
    pagination: salesQuery.data?.pagination,
    categories: categoriesQuery.data?.data || [],
    isLoading: salesQuery.isLoading || categoriesQuery.isLoading,
    error: salesQuery.error || categoriesQuery.error,

    // Mutations
    createSale: createSaleMutation.mutateAsync,
    updateSale: updateSaleMutation.mutateAsync,
    deleteSale: deleteSaleMutation.mutateAsync,
    addPayment: addPaymentMutation.mutateAsync,
    createCategory: createCategoryMutation.mutateAsync,

    // Mutation states
    isCreating: createSaleMutation.isPending,
    isUpdating: updateSaleMutation.isPending,
    isDeleting: deleteSaleMutation.isPending,
    isAddingPayment: addPaymentMutation.isPending,
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

// Sales analytics hook
export const useSalesAnalytics = (params?: {
  farmId?: string;
  batchId?: string;
  startDate?: string;
  endDate?: string;
}) => {
  const statisticsQuery = useGetSalesStatistics(params);
  const salesQuery = useGetSales({ ...params, limit: 100 }); // Get more data for analytics

  return {
    statistics: statisticsQuery.data?.data,
    recentSales: salesQuery.data?.data || [],
    isLoading: statisticsQuery.isLoading || salesQuery.isLoading,
    error: statisticsQuery.error || salesQuery.error,
    refetch: () => {
      statisticsQuery.refetch();
      salesQuery.refetch();
    },
  };
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
      queryClient.invalidateQueries({ queryKey: ["customers", "detail", vars.customerId] });
      queryClient.invalidateQueries({ queryKey: ["customers", "sales"] });
    },
  });
};
