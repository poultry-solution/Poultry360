import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

// ==================== TYPES ====================

export type HatcheryInventoryItemType =
  | "FEED"
  | "MEDICINE"
  | "CHICKS"
  | "OTHER";

export type HatcheryInventoryTxnType = "PURCHASE" | "USAGE" | "ADJUSTMENT";

export interface HatcheryInventoryItem {
  id: string;
  hatcheryOwnerId: string;
  itemType: HatcheryInventoryItemType;
  name: string;
  unit: string;
  unitPrice: number;
  supplierKey: string;
  currentStock: number;
  minStock: number | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HatcheryInventoryTxn {
  id: string;
  itemId: string;
  type: HatcheryInventoryTxnType;
  quantity: number;
  unitPrice: number | null;
  amount: number | null;
  date: string;
  note: string | null;
  sourceSupplierTxnId: string | null;
  createdAt: string;
}

// ==================== QUERY KEYS ====================

export const hatcheryInventoryKeys = {
  all: ["hatcheryInventory"] as const,
  lists: () => [...hatcheryInventoryKeys.all, "list"] as const,
  list: (filters: Record<string, any>) =>
    [...hatcheryInventoryKeys.lists(), filters] as const,
  table: (itemType?: string) =>
    [...hatcheryInventoryKeys.all, "table", itemType ?? "all"] as const,
  details: () => [...hatcheryInventoryKeys.all, "detail"] as const,
  detail: (id: string) => [...hatcheryInventoryKeys.details(), id] as const,
  statistics: () => [...hatcheryInventoryKeys.all, "statistics"] as const,
  lowStock: () => [...hatcheryInventoryKeys.all, "lowStock"] as const,
  byType: (t: string) => [...hatcheryInventoryKeys.all, "byType", t] as const,
};

// ==================== QUERIES ====================

export const useGetHatcheryInventory = (params?: {
  itemType?: HatcheryInventoryItemType;
  includeEmpty?: boolean;
  search?: string;
}) => {
  return useQuery({
    queryKey: hatcheryInventoryKeys.list(params ?? {}),
    queryFn: async () => {
      const res = await axiosInstance.get("/hatchery/inventory", { params });
      return res.data;
    },
  });
};

export const useGetHatcheryInventoryTable = (
  itemType?: HatcheryInventoryItemType
) => {
  return useQuery({
    queryKey: hatcheryInventoryKeys.table(itemType),
    queryFn: async () => {
      const res = await axiosInstance.get("/hatchery/inventory/table", {
        params: itemType ? { itemType } : {},
      });
      return res.data;
    },
  });
};

export const useGetHatcheryInventoryStatistics = () => {
  return useQuery({
    queryKey: hatcheryInventoryKeys.statistics(),
    queryFn: async () => {
      const res = await axiosInstance.get("/hatchery/inventory/statistics");
      return res.data;
    },
  });
};

export const useGetHatcheryLowStock = () => {
  return useQuery({
    queryKey: hatcheryInventoryKeys.lowStock(),
    queryFn: async () => {
      const res = await axiosInstance.get("/hatchery/inventory/low-stock");
      return res.data;
    },
  });
};

export const useGetHatcheryInventoryByType = (
  itemType: HatcheryInventoryItemType | null
) => {
  return useQuery({
    queryKey: hatcheryInventoryKeys.byType(itemType ?? ""),
    queryFn: async () => {
      if (!itemType) throw new Error("itemType required");
      const res = await axiosInstance.get(
        `/hatchery/inventory/type/${itemType}`
      );
      return res.data;
    },
    enabled: !!itemType,
  });
};

export const useGetHatcheryInventoryItem = (id: string | null) => {
  return useQuery({
    queryKey: hatcheryInventoryKeys.detail(id ?? ""),
    queryFn: async () => {
      if (!id) throw new Error("ID required");
      const res = await axiosInstance.get(`/hatchery/inventory/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
};

// ==================== MUTATIONS ====================

export const useCreateHatcheryInventoryItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      itemType: HatcheryInventoryItemType;
      name: string;
      unit?: string;
      unitPrice?: number;
      minStock?: number;
    }) => {
      const res = await axiosInstance.post("/hatchery/inventory", data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hatcheryInventoryKeys.all });
    },
  });
};

export const useUpdateHatcheryInventoryItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; unit?: string; minStock?: number | null };
    }) => {
      const res = await axiosInstance.put(`/hatchery/inventory/${id}`, data);
      return res.data;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: hatcheryInventoryKeys.all });
      qc.invalidateQueries({ queryKey: hatcheryInventoryKeys.detail(id) });
    },
  });
};

export const useDeleteHatcheryInventoryItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await axiosInstance.delete(`/hatchery/inventory/${id}`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hatcheryInventoryKeys.all });
    },
  });
};

export const useReorderHatcheryInventoryItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      quantity,
      date,
      note,
    }: {
      id: string;
      quantity: number;
      date: string;
      note?: string;
    }) => {
      const res = await axiosInstance.post(`/hatchery/inventory/${id}/reorder`, {
        quantity,
        date,
        note,
      });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hatcheryInventoryKeys.all });
      qc.invalidateQueries({ queryKey: ["hatcherySuppliers"] });
    },
  });
};

export const useRecordHatcheryInventoryUsage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      quantity,
      date,
      note,
    }: {
      id: string;
      quantity: number;
      date: string;
      note?: string;
    }) => {
      const res = await axiosInstance.post(
        `/hatchery/inventory/${id}/usage`,
        { quantity, date, note }
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hatcheryInventoryKeys.all });
    },
  });
};
