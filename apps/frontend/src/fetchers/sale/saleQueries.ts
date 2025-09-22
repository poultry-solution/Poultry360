import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/lib/axios";
import { CreateSale, UpdateSale, CategoryType } from "@myapp/shared-types";

// ==================== QUERY KEYS ====================

export const saleQueryKeys = {
  all: ["sales"] as const,
  lists: () => [...saleQueryKeys.all, "list"] as const,
  list: (params: any) => [...saleQueryKeys.lists(), params] as const,
  details: () => [...saleQueryKeys.all, "detail"] as const,
  detail: (id: string) => [...saleQueryKeys.details(), id] as const,
  batchSales: (batchId: string) => [...saleQueryKeys.all, "batch", batchId] as const,
  statistics: (params?: any) => [...saleQueryKeys.all, "statistics", params] as const,
  categories: (type?: CategoryType) => [...saleQueryKeys.all, "categories", type] as const,
};

// ==================== QUERY HOOKS ====================

// Get all sales with filtering
export const useGetSales = (params?: {
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
  return useQuery({
    queryKey: saleQueryKeys.list(params),
    queryFn: async () => {
      const response = await axiosInstance.get("/sales", { params });
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Get sale by ID
export const useGetSale = (id: string) => {
  return useQuery({
    queryKey: saleQueryKeys.detail(id),
    queryFn: async () => {
      const response = await axiosInstance.get(`/sales/${id}`);
      return response.data;
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
};

// Get sales for a specific batch
export const useGetBatchSales = (batchId: string) => {
  return useQuery({
    queryKey: saleQueryKeys.batchSales(batchId),
    queryFn: async () => {
      const response = await axiosInstance.get(`/sales/batch/${batchId}`);
      console.log("batch sales", response.data);
      return response.data;
    },
    enabled: !!batchId,
    staleTime: 2 * 60 * 1000,
  });
};

// Get sales statistics
export const useGetSalesStatistics = (params?: {
  farmId?: string;
  batchId?: string;
  startDate?: string;
  endDate?: string;
}) => {
  return useQuery({
    queryKey: saleQueryKeys.statistics(params),
    queryFn: async () => {
      const response = await axiosInstance.get("/sales/statistics", { params });
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Get sales categories
export const useGetSalesCategories = () => {
  return useQuery({
    queryKey: saleQueryKeys.categories("SALES"),
    queryFn: async () => {
      const response = await axiosInstance.get("/sales/categories");
      return response.data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// ==================== MUTATION HOOKS ====================

// Create sale
export const useCreateSale = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSale & { birdsCount?: number }) => {
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
          queryKey: saleQueryKeys.batchSales(variables.batchId) 
        });
        // Also refresh batch detail and analytics to reflect current birds
        queryClient.invalidateQueries({ queryKey: ["batches", "detail", variables.batchId] });
        queryClient.invalidateQueries({ queryKey: ["batches", "analytics", variables.batchId] });
      }
      
      // If farmId is provided, invalidate farm-related queries
      if (variables.farmId) {
        queryClient.invalidateQueries({ 
          queryKey: ["farms", "detail", variables.farmId] 
        });
      }
    },
  });
};

// Update sale
export const useUpdateSale = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateSale }) => {
      const response = await axiosInstance.put(`/sales/${id}`, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch the specific sale
      queryClient.invalidateQueries({ queryKey: saleQueryKeys.detail(variables.id) });
      
      // Invalidate sales lists
      queryClient.invalidateQueries({ queryKey: saleQueryKeys.lists() });
      
      // Invalidate statistics
      queryClient.invalidateQueries({ queryKey: saleQueryKeys.statistics() });
      
      // If batchId is provided, invalidate batch sales
      if (variables.data.batchId) {
        queryClient.invalidateQueries({ 
          queryKey: saleQueryKeys.batchSales(variables.data.batchId) 
        });
      }
      
      // If farmId is provided, invalidate farm-related queries
      if (variables.data.farmId) {
        queryClient.invalidateQueries({ 
          queryKey: ["farms", "detail", variables.data.farmId] 
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
      queryClient.invalidateQueries({ queryKey: [...saleQueryKeys.all, "batch"] });
    },
  });
};

// Add payment to sale
export const useAddSalePayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      saleId, 
      data 
    }: { 
      saleId: string; 
      data: { 
        amount: number; 
        date?: string; 
        description?: string; 
      } 
    }) => {
      const response = await axiosInstance.post(`/sales/${saleId}/payments`, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch the specific sale
      queryClient.invalidateQueries({ queryKey: saleQueryKeys.detail(variables.saleId) });
      
      // Invalidate sales lists
      queryClient.invalidateQueries({ queryKey: saleQueryKeys.lists() });
      
      // Invalidate statistics
      queryClient.invalidateQueries({ queryKey: saleQueryKeys.statistics() });
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
      queryClient.invalidateQueries({ queryKey: saleQueryKeys.categories("SALES") });
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
    isLoading: salesQuery.isLoading || statisticsQuery.isLoading || categoriesQuery.isLoading,
    error: salesQuery.error || statisticsQuery.error || categoriesQuery.error,
    refetch: () => {
      salesQuery.refetch();
      statisticsQuery.refetch();
      categoriesQuery.refetch();
    },
  };
};

// Batch sales management hook
export const useBatchSalesManagement = (batchId: string) => {
  const batchSalesQuery = useGetBatchSales(batchId);
  const categoriesQuery = useGetSalesCategories();
  const createSaleMutation = useCreateSale();
  const updateSaleMutation = useUpdateSale();
  const deleteSaleMutation = useDeleteSale();
  const addPaymentMutation = useAddSalePayment();

  return {
    sales: batchSalesQuery.data?.data || [],
    categories: categoriesQuery.data?.data || [],
    isLoading: batchSalesQuery.isLoading || categoriesQuery.isLoading,
    error: batchSalesQuery.error || categoriesQuery.error,
    
    // Mutations
    createSale: createSaleMutation.mutateAsync,
    updateSale: updateSaleMutation.mutateAsync,
    deleteSale: deleteSaleMutation.mutateAsync,
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

export const useGetCustomersForSales = (search?: string) => {
  return useQuery({
    queryKey: ["customers", "sales", search],
    queryFn: () => axiosInstance.get(`/sales/customers${search ? `?search=${encodeURIComponent(search)}` : ""}`),
    select: (response) => response.data.data,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};
