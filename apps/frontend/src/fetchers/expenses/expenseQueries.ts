import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/lib/axios";
import {
  CreateExpense,
  UpdateExpense,
  CategoryType,
} from "@myapp/shared-types";

// ==================== EXPENSE QUERY HOOKS ====================

export const useGetExpenses = (params?: {
  page?: number;
  limit?: number;
  search?: string;
  farmId?: string;
  batchId?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  categoryType?: CategoryType;
}) => {
  return useQuery({
    queryKey: ["expenses", params],
    queryFn: async () => {
      const response = await axiosInstance.get("/expenses", { params });
      console.log("response.data in useGetExpenses", response.data);
      return response.data;
    },
  });
};

export const useGetExpenseById = (id: string) => {
  return useQuery({
    queryKey: ["expenses", id],
    queryFn: async () => {
      const response = await axiosInstance.get(`/expenses/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

export const useGetBatchExpenses = (
  batchId: string,
  params?: {
    page?: number;
    limit?: number;
    categoryType?: CategoryType;
  }
) => {
  return useQuery({
    queryKey: ["expenses", "batch", batchId, params],
    queryFn: async () => {
      const response = await axiosInstance.get(`/expenses/batch/${batchId}`, {
        params,
      });
      console.log("response.data in useGetBatchExpenses", response.data);
      return response.data;
    },
    enabled: !!batchId,
  });
};

export const useGetExpenseStatistics = (params?: {
  farmId?: string;
  batchId?: string;
  startDate?: string;
  endDate?: string;
}) => {
  return useQuery({
    queryKey: ["expenses", "statistics", params],
    queryFn: async () => {
      const response = await axiosInstance.get("/expenses/statistics", {
        params,
      });
      return response.data;
    },
  });
};

export const useGetExpenseCategories = (type?: CategoryType) => {
  return useQuery({
    queryKey: ["expenses", "categories", type],
    queryFn: async () => {
      const response = await axiosInstance.get("/expenses/categories", {
        params: type ? { type } : undefined,
      });
      return response.data;
    },
  });
};

export const useCreateExpenseCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const response = await axiosInstance.post("/expenses/categories", data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch expense categories
      queryClient.invalidateQueries({ queryKey: ["expenses", "categories"] });
    },
  });
};

// ==================== EXPENSE MUTATION HOOKS ====================

export const useCreateExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateExpense) => {
      const response = await axiosInstance.post("/expenses", data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch expense-related queries
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["farms"] });
    },
  });
};

export const useUpdateExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateExpense }) => {
      const response = await axiosInstance.put(`/expenses/${id}`, data);
      return response.data;
    },
    onSuccess: (_, { id }) => {
      // Invalidate and refetch expense-related queries
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expenses", id] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["farms"] });
    },
  });
};

export const useDeleteExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await axiosInstance.delete(`/expenses/${id}`);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch expense-related queries
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["farms"] });
    },
  });
};

// ==================== CONVENIENCE HOOKS ====================

export const useExpenseDashboard = (farmId?: string, batchId?: string) => {
  const expensesQuery = useGetExpenses({
    farmId,
    batchId,
    limit: 10,
  });
  const statisticsQuery = useGetExpenseStatistics({ farmId, batchId });
  const categoriesQuery = useGetExpenseCategories();

  return {
    expenses: expensesQuery.data?.data || [],
    statistics: statisticsQuery.data?.data,
    categories: categoriesQuery.data?.data || [],
    isLoading:
      expensesQuery.isLoading ||
      statisticsQuery.isLoading ||
      categoriesQuery.isLoading,
    error:
      expensesQuery.error || statisticsQuery.error || categoriesQuery.error,
  };
};

export const useBatchExpenseManagement = (batchId: string) => {
  const batchExpensesQuery = useGetBatchExpenses(batchId);
  const categoriesQuery = useGetExpenseCategories("EXPENSE");
  const createExpenseMutation = useCreateExpense();
  const updateExpenseMutation = useUpdateExpense();
  const deleteExpenseMutation = useDeleteExpense();

  return {
    expenses: batchExpensesQuery.data?.data || [],
    categories: categoriesQuery.data?.data || [],
    isLoading: batchExpensesQuery.isLoading || categoriesQuery.isLoading,
    error: batchExpensesQuery.error || categoriesQuery.error,
    createExpense: createExpenseMutation.mutateAsync,
    updateExpense: updateExpenseMutation.mutateAsync,
    deleteExpense: deleteExpenseMutation.mutateAsync,
    isCreating: createExpenseMutation.isPending,
    isUpdating: updateExpenseMutation.isPending,
    isDeleting: deleteExpenseMutation.isPending,
  };
};
