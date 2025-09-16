import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CreateMedicineSupplier,
  UpdateMedicineSupplier,
  TransactionType,
} from "@myapp/shared-types";
import axiosInstance from "@/lib/axios";

// ==================== QUERY KEYS ====================

export const medicalSupplierKeys = {
  all: ["medicalSuppliers"] as const,
  lists: () => [...medicalSupplierKeys.all, "list"] as const,
  list: (filters: Record<string, any>) =>
    [...medicalSupplierKeys.lists(), filters] as const,
  details: () => [...medicalSupplierKeys.all, "detail"] as const,
  detail: (id: string) => [...medicalSupplierKeys.details(), id] as const,
  statistics: () => [...medicalSupplierKeys.all, "statistics"] as const,
  transactions: (id: string) =>
    [...medicalSupplierKeys.all, "transactions", id] as const,
};

// ==================== QUERIES ====================

// Get all medical suppliers
export const useGetAllMedicalSuppliers = (filters?: {
  page?: number;
  limit?: number;
  search?: string;
}) => {
  return useQuery({
    queryKey: medicalSupplierKeys.list(filters || {}),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.page) params.append("page", filters.page.toString());
      if (filters?.limit) params.append("limit", filters.limit.toString());
      if (filters?.search) params.append("search", filters.search);

      const response = await axiosInstance.get(
        `/medical-suppliers?${params.toString()}`
      );
      return response.data;
    },
  });
};

// Get medical supplier statistics
export const useGetMedicalSupplierStatistics = () => {
  return useQuery({
    queryKey: medicalSupplierKeys.statistics(),
    queryFn: async () => {
      const response = await axiosInstance.get("/medical-suppliers/statistics");
      return response.data;
    },
  });
};

// Get medical supplier by ID
export const useGetMedicalSupplierById = (id: string | null) => {
  return useQuery({
    queryKey: medicalSupplierKeys.detail(id || ""),
    queryFn: async () => {
      if (!id) throw new Error("Medical supplier ID is required");
      const response = await axiosInstance.get(`/medical-suppliers/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

// Get medical supplier transactions
export const useGetMedicalSupplierTransactions = (
  id: string | null,
  filters?: {
    page?: number;
    limit?: number;
    type?: TransactionType;
    startDate?: string;
    endDate?: string;
  }
) => {
  return useQuery({
    queryKey: [...medicalSupplierKeys.transactions(id || ""), filters || {}],
    queryFn: async () => {
      if (!id) throw new Error("Medical supplier ID is required");
      const params = new URLSearchParams();
      if (filters?.page) params.append("page", filters.page.toString());
      if (filters?.limit) params.append("limit", filters.limit.toString());
      if (filters?.type) params.append("type", filters.type);
      if (filters?.startDate) params.append("startDate", filters.startDate);
      if (filters?.endDate) params.append("endDate", filters.endDate);

      const response = await axiosInstance.get(
        `/medical-suppliers/${id}/transactions?${params.toString()}`
      );
      return response.data;
    },
    enabled: !!id,
  });
};

// ==================== MUTATIONS ====================

// Create medical supplier
export const useCreateMedicalSupplier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateMedicineSupplier) => {
      const response = await axiosInstance.post("/medical-suppliers", data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate medical supplier queries
      queryClient.invalidateQueries({ queryKey: medicalSupplierKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: medicalSupplierKeys.statistics(),
      });
    },
  });
};

// Update medical supplier
export const useUpdateMedicalSupplier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateMedicineSupplier;
    }) => {
      const response = await axiosInstance.put(
        `/medical-suppliers/${id}`,
        data
      );
      return response.data;
    },
    onSuccess: (_, { id }) => {
      // Invalidate medical supplier queries
      queryClient.invalidateQueries({ queryKey: medicalSupplierKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: medicalSupplierKeys.detail(id),
      });
      queryClient.invalidateQueries({
        queryKey: medicalSupplierKeys.statistics(),
      });
    },
  });
};

// Delete medical supplier
export const useDeleteMedicalSupplier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await axiosInstance.delete(`/medical-suppliers/${id}`);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate medical supplier queries
      queryClient.invalidateQueries({ queryKey: medicalSupplierKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: medicalSupplierKeys.statistics(),
      });
    },
  });
};

// Add medical supplier transaction
export const useAddMedicalSupplierTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      supplierId,
      data,
    }: {
      supplierId: string;
      data: {
        type: TransactionType;
        amount: number;
        quantity?: number;
        itemName?: string;
        date: string;
        description?: string;
        reference?: string;
      };
    }) => {
      const response = await axiosInstance.post(
        `/medical-suppliers/${supplierId}/transactions`,
        data
      );
      return response.data;
    },
    onSuccess: (_, { supplierId }) => {
      // Invalidate medical supplier queries
      queryClient.invalidateQueries({ queryKey: medicalSupplierKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: medicalSupplierKeys.detail(supplierId),
      });
      queryClient.invalidateQueries({
        queryKey: medicalSupplierKeys.transactions(supplierId),
      });
      queryClient.invalidateQueries({
        queryKey: medicalSupplierKeys.statistics(),
      });
    },
  });
};

// Delete medical supplier transaction
export const useDeleteMedicalSupplierTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      supplierId,
      transactionId,
      password,
    }: {
      supplierId: string;
      transactionId: string;
      password: string;
    }) => {
      const response = await axiosInstance.delete(
        `/medical-suppliers/${supplierId}/transactions/${transactionId}`,
        { data: { password } }
      );
      return response.data;
    },
    onSuccess: (_, { supplierId }) => {
      queryClient.invalidateQueries({ queryKey: medicalSupplierKeys.detail(supplierId) });
      queryClient.invalidateQueries({ queryKey: medicalSupplierKeys.transactions(supplierId) });
      queryClient.invalidateQueries({ queryKey: medicalSupplierKeys.statistics() });
    },
  });
};
