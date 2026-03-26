import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

// ==================== TYPES ====================

export type HatcherySupplierTxnType =
  | "PURCHASE"
  | "PAYMENT"
  | "ADJUSTMENT"
  | "OPENING_BALANCE";

export type HatcheryPurchaseCategory =
  | "FEED"
  | "MEDICINE"
  | "CHICKS"
  | "OTHER";

export interface HatcherySupplier {
  id: string;
  hatcheryOwnerId: string;
  name: string;
  contact: string | null;
  address: string | null;
  openingBalance: number;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

export interface HatcherySupplierPurchaseItem {
  id: string;
  txnId: string;
  itemName: string;
  quantity: number;
  freeQuantity: number;
  unit: string;
  unitPrice: number;
  totalAmount: number;
}

export interface HatcherySupplierTxn {
  id: string;
  supplierId: string;
  type: HatcherySupplierTxnType;
  amount: number;
  balanceAfter: number;
  date: string;
  note: string | null;
  purchaseCategory: HatcheryPurchaseCategory | null;
  receiptImageUrl: string | null;
  reference: string | null;
  items: HatcherySupplierPurchaseItem[];
  createdAt: string;
}

export interface AddPurchaseItem {
  itemName: string;
  quantity: number;
  freeQuantity?: number;
  unit: string;
  unitPrice: number;
  totalAmount: number;
}

// ==================== QUERY KEYS ====================

export const hatcherySupplierKeys = {
  all: ["hatcherySuppliers"] as const,
  lists: () => [...hatcherySupplierKeys.all, "list"] as const,
  list: (filters: Record<string, any>) =>
    [...hatcherySupplierKeys.lists(), filters] as const,
  details: () => [...hatcherySupplierKeys.all, "detail"] as const,
  detail: (id: string) => [...hatcherySupplierKeys.details(), id] as const,
  statistics: () => [...hatcherySupplierKeys.all, "statistics"] as const,
  transactions: (id: string) =>
    [...hatcherySupplierKeys.all, "transactions", id] as const,
};

// ==================== QUERIES ====================

export const useGetHatcherySuppliers = (filters?: {
  page?: number;
  limit?: number;
  search?: string;
}) => {
  return useQuery({
    queryKey: hatcherySupplierKeys.list(filters ?? {}),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.page) params.append("page", String(filters.page));
      if (filters?.limit) params.append("limit", String(filters.limit));
      if (filters?.search) params.append("search", filters.search);
      const res = await axiosInstance.get(
        `/hatchery/suppliers?${params.toString()}`
      );
      return res.data;
    },
  });
};

export const useGetHatcherySupplierStatistics = () => {
  return useQuery({
    queryKey: hatcherySupplierKeys.statistics(),
    queryFn: async () => {
      const res = await axiosInstance.get("/hatchery/suppliers/statistics");
      return res.data;
    },
  });
};

export const useGetHatcherySupplierById = (id: string | null) => {
  return useQuery({
    queryKey: hatcherySupplierKeys.detail(id ?? ""),
    queryFn: async () => {
      if (!id) throw new Error("ID required");
      const res = await axiosInstance.get(`/hatchery/suppliers/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
};

export const useGetHatcherySupplierTransactions = (
  id: string | null,
  filters?: { page?: number; limit?: number; type?: string }
) => {
  return useQuery({
    queryKey: [
      ...hatcherySupplierKeys.transactions(id ?? ""),
      filters ?? {},
    ],
    queryFn: async () => {
      if (!id) throw new Error("ID required");
      const params = new URLSearchParams();
      if (filters?.page) params.append("page", String(filters.page));
      if (filters?.limit) params.append("limit", String(filters.limit));
      if (filters?.type) params.append("type", filters.type);
      const res = await axiosInstance.get(
        `/hatchery/suppliers/${id}/transactions?${params.toString()}`
      );
      return res.data;
    },
    enabled: !!id,
  });
};

// ==================== MUTATIONS ====================

export const useCreateHatcherySupplier = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      contact?: string;
      address?: string;
    }) => {
      const res = await axiosInstance.post("/hatchery/suppliers", data);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hatcherySupplierKeys.lists() });
      qc.invalidateQueries({ queryKey: hatcherySupplierKeys.statistics() });
    },
  });
};

export const useUpdateHatcherySupplier = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; contact?: string; address?: string };
    }) => {
      const res = await axiosInstance.put(`/hatchery/suppliers/${id}`, data);
      return res.data;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: hatcherySupplierKeys.lists() });
      qc.invalidateQueries({ queryKey: hatcherySupplierKeys.detail(id) });
      qc.invalidateQueries({ queryKey: hatcherySupplierKeys.statistics() });
    },
  });
};

export const useDeleteHatcherySupplier = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await axiosInstance.delete(`/hatchery/suppliers/${id}`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hatcherySupplierKeys.lists() });
      qc.invalidateQueries({ queryKey: hatcherySupplierKeys.statistics() });
    },
  });
};

export const useSetHatcherySupplierOpeningBalance = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      supplierId,
      amount,
      date,
      note,
    }: {
      supplierId: string;
      amount: number;
      date: string;
      note?: string;
    }) => {
      const res = await axiosInstance.post(
        `/hatchery/suppliers/${supplierId}/opening-balance`,
        { amount, date, note }
      );
      return res.data;
    },
    onSuccess: (_, { supplierId }) => {
      qc.invalidateQueries({ queryKey: hatcherySupplierKeys.detail(supplierId) });
      qc.invalidateQueries({ queryKey: hatcherySupplierKeys.lists() });
      qc.invalidateQueries({ queryKey: hatcherySupplierKeys.statistics() });
    },
  });
};

export const useAddHatcherySupplierPurchase = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      supplierId,
      category,
      items,
      date,
      note,
    }: {
      supplierId: string;
      category: HatcheryPurchaseCategory;
      items: AddPurchaseItem[];
      date: string;
      note?: string;
    }) => {
      const res = await axiosInstance.post(
        `/hatchery/suppliers/${supplierId}/transactions`,
        { type: "PURCHASE", category, items, date, note }
      );
      return res.data;
    },
    onSuccess: (_, { supplierId }) => {
      qc.invalidateQueries({ queryKey: hatcherySupplierKeys.detail(supplierId) });
      qc.invalidateQueries({ queryKey: hatcherySupplierKeys.lists() });
      qc.invalidateQueries({ queryKey: hatcherySupplierKeys.statistics() });
      qc.invalidateQueries({ queryKey: ["hatcheryInventory"] });
    },
  });
};

export const useAddHatcherySupplierPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      supplierId,
      amount,
      date,
      note,
      reference,
      receiptImageUrl,
    }: {
      supplierId: string;
      amount: number;
      date: string;
      note?: string;
      reference?: string;
      receiptImageUrl?: string;
    }) => {
      const res = await axiosInstance.post(
        `/hatchery/suppliers/${supplierId}/transactions`,
        { type: "PAYMENT", amount, date, note, reference, receiptImageUrl }
      );
      return res.data;
    },
    onSuccess: (_, { supplierId }) => {
      qc.invalidateQueries({ queryKey: hatcherySupplierKeys.detail(supplierId) });
      qc.invalidateQueries({ queryKey: hatcherySupplierKeys.lists() });
      qc.invalidateQueries({ queryKey: hatcherySupplierKeys.statistics() });
    },
  });
};

export const useDeleteHatcherySupplierTransaction = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      supplierId,
      txnId,
      password,
    }: {
      supplierId: string;
      txnId: string;
      password: string;
    }) => {
      const res = await axiosInstance.delete(
        `/hatchery/suppliers/${supplierId}/transactions/${txnId}`,
        { data: { password } }
      );
      return res.data;
    },
    onSuccess: (_, { supplierId }) => {
      qc.invalidateQueries({ queryKey: hatcherySupplierKeys.detail(supplierId) });
      qc.invalidateQueries({ queryKey: hatcherySupplierKeys.lists() });
      qc.invalidateQueries({ queryKey: hatcherySupplierKeys.statistics() });
      qc.invalidateQueries({ queryKey: ["hatcheryInventory"] });
    },
  });
};
