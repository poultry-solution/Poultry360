import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";
import {
  InventoryItem,
  CreateInventoryItem,
  UpdateInventoryItem,
  InventoryTransaction,
  CreateInventoryTransaction,
  InventoryUsage,
  CreateInventoryUsage,
  InventoryItemType,
} from "@myapp/shared-types";

// ==================== QUERY KEYS ====================
export const inventoryKeys = {
  all: ["inventory"] as const,
  lists: () => [...inventoryKeys.all, "list"] as const,
  list: (filters: Record<string, any>) =>
    [...inventoryKeys.lists(), filters] as const,
  details: () => [...inventoryKeys.all, "detail"] as const,
  detail: (id: string) => [...inventoryKeys.details(), id] as const,
  statistics: () => [...inventoryKeys.all, "statistics"] as const,
  lowStock: () => [...inventoryKeys.all, "lowStock"] as const,
  byType: (itemType: InventoryItemType) =>
    [...inventoryKeys.all, "byType", itemType] as const,
  transactions: (itemId: string) =>
    [...inventoryKeys.all, "transactions", itemId] as const,
  usages: (itemId: string) => [...inventoryKeys.all, "usages", itemId] as const,
};

// ==================== INVENTORY ITEMS QUERIES ====================

// Get all inventory items
export const useGetInventoryItems = (params?: {
  page?: number;
  limit?: number;
  search?: string;
  itemType?: InventoryItemType;
  lowStock?: boolean;
}) => {
  return useQuery({
    queryKey: inventoryKeys.list(params || {}),
    queryFn: async () => {
      const response = await axiosInstance.get("/inventory", { params });
      return response.data;
    },
  });
};

// Get inventory statistics
export const useGetInventoryStatistics = () => {
  return useQuery({
    queryKey: inventoryKeys.statistics(),
    queryFn: async () => {
      const response = await axiosInstance.get("/inventory/statistics");
      return response.data;
    },
  });
};

// Get inventory table data
export const useGetInventoryTableData = (itemType?: InventoryItemType) => {
  return useQuery({
    queryKey: [...inventoryKeys.all, "table", itemType],
    queryFn: async () => {
      const params = itemType ? { itemType } : {};
      const response = await axiosInstance.get("/inventory/table", { params });
      console.log("response.data in useGetInventoryTableData", response.data);
      return response.data;
    },
  });
};

// Get low stock items
export const useGetLowStockItems = () => {
  return useQuery({
    queryKey: inventoryKeys.lowStock(),
    queryFn: async () => {
      const response = await axiosInstance.get("/inventory/low-stock");
      return response.data;
    },
  });
};

// Get inventory by type
export const useGetInventoryByType = (itemType: InventoryItemType) => {
  return useQuery({
    queryKey: inventoryKeys.byType(itemType),
    queryFn: async () => {
      const response = await axiosInstance.get(`/inventory/type/${itemType}`);
      return response.data;
    },
    enabled: !!itemType,
  });
};

// Get inventory item by ID
export const useGetInventoryItem = (id: string) => {
  return useQuery({
    queryKey: inventoryKeys.detail(id),
    queryFn: async () => {
      const response = await axiosInstance.get(`/inventory/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

// ==================== INVENTORY TRANSACTIONS QUERIES ====================

// Get inventory transactions
export const useGetInventoryTransactions = (
  itemId: string,
  params?: {
    page?: number;
    limit?: number;
    type?: string;
    startDate?: string;
    endDate?: string;
  }
) => {
  return useQuery({
    queryKey: inventoryKeys.transactions(itemId),
    queryFn: async () => {
      const response = await axiosInstance.get(
        `/inventory/${itemId}/transactions`,
        { params }
      );
      return response.data;
    },
    enabled: !!itemId,
  });
};

// ==================== INVENTORY USAGE QUERIES ====================

// Get inventory usages
export const useGetInventoryUsages = (
  itemId: string,
  params?: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }
) => {
  return useQuery({
    queryKey: inventoryKeys.usages(itemId),
    queryFn: async () => {
      const response = await axiosInstance.get(`/inventory/${itemId}/usage`, {
        params,
      });
      return response.data;
    },
    enabled: !!itemId,
  });
};

// ==================== INVENTORY ITEMS MUTATIONS ====================

// Create inventory item
export const useCreateInventoryItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateInventoryItem) => {
      const response = await axiosInstance.post("/inventory", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.statistics() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lowStock() });
    },
  });
};

// Update inventory item
export const useUpdateInventoryItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateInventoryItem;
    }) => {
      const response = await axiosInstance.put(`/inventory/${id}`, data);
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.statistics() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lowStock() });
    },
  });
};

// Delete inventory item
export const useDeleteInventoryItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await axiosInstance.delete(`/inventory/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.statistics() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lowStock() });
    },
  });
};

// ==================== INVENTORY TRANSACTIONS MUTATIONS (FOR TESTING) ====================

// Add inventory transaction
export const useAddInventoryTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      data,
    }: {
      itemId: string;
      data: CreateInventoryTransaction;
    }) => {
      const response = await axiosInstance.post(
        `/inventory/${itemId}/transactions`,
        data
      );
      return response.data;
    },
    onSuccess: (_, { itemId }) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.detail(itemId) });
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.transactions(itemId),
      });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.statistics() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lowStock() });
    },
  });
};

// ==================== INVENTORY USAGE MUTATIONS (FOR TESTING) ====================

// Record inventory usage
export const useRecordInventoryUsage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      data,
    }: {
      itemId: string;
      data: CreateInventoryUsage;
    }) => {
      const response = await axiosInstance.post(
        `/inventory/${itemId}/usage`,
        data
      );
      return response.data;
    },
    onSuccess: (_, { itemId }) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.detail(itemId) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.usages(itemId) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.statistics() });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.lowStock() });
    },
  });
};

// ==================== UTILITY HOOKS ====================

// Get inventory items by type with automatic refetch
export const useInventoryByType = (itemType: InventoryItemType) => {
  const query = useGetInventoryByType(itemType);

  console.log(query.data)
  return {
    ...query,
    items: query.data?.data || [],
    isLoading: query.isLoading,
    error: query.error,
  };
};

// Get low stock items with automatic refetch
export const useLowStockItems = () => {
  const query = useGetLowStockItems();

  return {
    ...query,
    items: query.data?.data || [],
    isLoading: query.isLoading,
    error: query.error,
  };
};

// Get inventory statistics with automatic refetch
export const useInventoryStats = () => {
  const query = useGetInventoryStatistics();

  return {
    ...query,
    stats: query.data?.data || null,
    isLoading: query.isLoading,
    error: query.error,
  };
};

// ==================== COMBINED HOOKS ====================

const feed = "FEED" as const;
const medicine = "MEDICINE" as const;
const chicks = "CHICKS" as const;

// Get inventory dashboard data
export const useInventoryDashboard = () => {
  const stats = useGetInventoryStatistics();
  const lowStock = useGetLowStockItems();
  const feedItems = useGetInventoryByType(feed);
  const medicineItems = useGetInventoryByType(medicine);
  const chicksItems = useGetInventoryByType(chicks);
  const tableData = useGetInventoryTableData();

  return {
    stats: stats.data?.data,
    lowStockItems: lowStock.data?.data || [],
    feedItems: feedItems.data?.data || [],
    medicineItems: medicineItems.data?.data || [],
    chicksItems: chicksItems.data?.data || [],
    tableData: tableData.data?.data || [],
    isLoading:
      stats.isLoading ||
      lowStock.isLoading ||
      feedItems.isLoading ||
      medicineItems.isLoading ||
      chicksItems.isLoading ||
      tableData.isLoading,
    error:
      stats.error ||
      lowStock.error ||
      feedItems.error ||
      medicineItems.error ||
      chicksItems.error ||
      tableData.error,
  };
};
