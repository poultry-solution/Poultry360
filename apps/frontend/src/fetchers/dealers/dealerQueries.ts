import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CreateDealer,
  UpdateDealer,
  TransactionType,
} from "@myapp/shared-types";
import axiosInstance from "@/lib/axios";

// ==================== QUERY KEYS ====================
export const dealerKeys = {
  all: ["dealers"] as const,
  lists: () => [...dealerKeys.all, "list"] as const,
  list: (filters: Record<string, any>) =>
    [...dealerKeys.lists(), filters] as const,
  details: () => [...dealerKeys.all, "detail"] as const,
  detail: (id: string) => [...dealerKeys.details(), id] as const,
  statistics: () => [...dealerKeys.all, "statistics"] as const,
  transactions: (id: string) =>
    [...dealerKeys.detail(id), "transactions"] as const,
};

// ==================== QUERY HOOKS ====================

// Get all dealers
export const useGetAllDealers = (params?: {
  page?: number;
  limit?: number;
  search?: string;
}) => {
  return useQuery<{
    success: boolean;
    data: any;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>({
    queryKey: dealerKeys.list(params || {}),
    queryFn: async () => {
      const response = await axiosInstance.get("/dealers", { params });
      console.log(response.data);
      return response.data;
    },
  });
};

// Get dealer statistics
export const useGetDealerStatistics = () => {
  return useQuery<{
    success: boolean;
    data: any;
  }>({
    queryKey: dealerKeys.statistics(),
    queryFn: async () => {
      const response = await axiosInstance.get("/dealers/statistics");
      return response.data;
    },
  });
};

// Get dealer by ID
export const useGetDealerById = (id: string) => {
  return useQuery<{
    success: boolean;
    data: any;
  }>({
    queryKey: dealerKeys.detail(id),
    queryFn: async () => {
      const response = await axiosInstance.get(`/dealers/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

// Get dealer transactions
export const useGetDealerTransactions = (
  id: string,
  params?: {
    page?: number;
    limit?: number;
    type?: TransactionType;
    startDate?: string;
    endDate?: string;
  }
) => {
  return useQuery<{
    success: boolean;
    data: any;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>({
    queryKey: [...dealerKeys.transactions(id), params || {}],
    queryFn: async () => {
      const response = await axiosInstance.get(`/dealers/${id}/transactions`, {
        params,
      });
      return response.data;
    },
    enabled: !!id,
  });
};

// ==================== MUTATION HOOKS ====================

// Create dealer
export const useCreateDealer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateDealer) => {
      const response = await axiosInstance.post("/dealers", data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate dealer queries
      queryClient.invalidateQueries({ queryKey: dealerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dealerKeys.statistics() });
    },
  });
};

// Update dealer
export const useUpdateDealer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateDealer }) => {
      const response = await axiosInstance.put(`/dealers/${id}`, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate dealer queries
      queryClient.invalidateQueries({
        queryKey: dealerKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: dealerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dealerKeys.statistics() });
    },
  });
};

// Delete dealer
export const useDeleteDealer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await axiosInstance.delete(`/dealers/${id}`);
      return response.data;
    },
    onSuccess: (data, id) => {
      // Remove from cache and invalidate lists
      queryClient.removeQueries({ queryKey: dealerKeys.detail(id) });
      queryClient.removeQueries({ queryKey: dealerKeys.transactions(id) });
      queryClient.invalidateQueries({ queryKey: dealerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dealerKeys.statistics() });
    },
  });
};

// Add dealer transaction
export const useAddDealerTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      dealerId,
      data,
    }: {
      dealerId: string;
      data: {
        type: TransactionType;
        amount: number;
        quantity?: number;
        itemName?: string;
        date: string;
        description?: string;
        reference?: string;
        unitPrice?: number;
      };
    }) => {
      const response = await axiosInstance.post(
        `/dealers/${dealerId}/transactions`,
        data
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate dealer queries
      queryClient.invalidateQueries({
        queryKey: dealerKeys.detail(variables.dealerId),
      });
      queryClient.invalidateQueries({
        queryKey: dealerKeys.transactions(variables.dealerId),
      });
      queryClient.invalidateQueries({ queryKey: dealerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dealerKeys.statistics() });
    },
  });
};

// Delete dealer transaction
export const useDeleteDealerTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      dealerId,
      transactionId,
      password,
    }: {
      dealerId: string;
      transactionId: string;
      password: string;
    }) => {
      const response = await axiosInstance.delete(
        `/dealers/${dealerId}/transactions/${transactionId}`,
        { data: { password } }
      );
      return response.data;
    },
    onSuccess: (_, { dealerId }) => {
      queryClient.invalidateQueries({ queryKey: dealerKeys.detail(dealerId) });
      queryClient.invalidateQueries({ queryKey: dealerKeys.transactions(dealerId) });
      queryClient.invalidateQueries({ queryKey: dealerKeys.statistics() });
    },
  });
};
