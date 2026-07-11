import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

// ==================== TYPES ====================

export type HatcheryBatchType = "PARENT_FLOCK" | "INCUBATION";
export type HatcheryBatchStatus = "ACTIVE" | "CLOSED";
export type HatcheryBatchExpenseType = "INVENTORY" | "MANUAL";

export interface HatcheryBatch {
  id: string;
  hatcheryOwnerId: string;
  type: HatcheryBatchType;
  status: HatcheryBatchStatus;
  code: string;
  name: string | null;
  startDate: string;
  endDate: string | null;
  notes: string | null;
  initialParents: number | null;
  currentParents: number | null;
  placedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    expenses: number;
    mortalities: number;
    eggProductions: number;
    eggSales: number;
    parentSales: number;
  };
}

export interface HatcheryBatchDetail extends HatcheryBatch {
  placements: HatcheryBatchPlacement[];
  summary: {
    totalMortality: number;
    totalExpenses: number;
    eggStock: HatcheryEggStockRow[];
    parentSalesCount: number;
    businessSnapshot?: {
      financial: {
        totalExpenses: number;
        eggSalesRevenue: number;
        parentSalesRevenue: number;
        chickSalesRevenue: number;
        totalRevenue: number;
        profitOrLoss: number;
      };
      production: {
        producedA: number;
        producedB: number;
        producedCull: number;
        producedTotal: number;
        soldTotal: number;
        unsoldTotal: number;
      };
      incubation: {
        incubationCount: number;
        eggsSetTotal: number;
        candlingLossTotal: number;
        fertileEggsTotal: number;
        weightedHatchabilityPct: number;
        weightedHatchOfTotalPct: number;
      };
    };
    costEngine?: {
      totalRelevantCost: number;
      producedTotal: number;
      saleableTotal: number;
      costPerProducedChick: number | null;
      costPerSaleableChick: number | null;
      saleableDefinition: "A_PLUS_B";
      status: "READY" | "INSUFFICIENT_DATA";
      warnings: string[];
    };
  };
}

export interface HatcheryBatchPlacement {
  id: string;
  batchId: string;
  inventoryItemId: string;
  quantity: number;
  createdAt: string;
  inventoryItem: {
    id: string;
    name: string;
    unit: string;
    unitPrice: number;
  };
}

export interface HatcheryBatchMortality {
  id: string;
  batchId: string;
  date: string;
  count: number;
  note: string | null;
  createdAt: string;
}

export interface HatcheryBatchExpense {
  id: string;
  batchId: string;
  date: string;
  type: HatcheryBatchExpenseType;
  category: string;
  itemName: string;
  quantity: number | null;
  unit: string | null;
  unitPrice: number | null;
  amount: number;
  note: string | null;
  inventoryItemId: string | null;
  inventoryTxnId: string | null;
  inventoryItem?: { id: string; name: string; unit: string } | null;
  createdAt: string;
}

export interface HatcheryEggType {
  id: string;
  hatcheryOwnerId: string;
  name: string;
  isHatchable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HatcheryEggProductionLine {
  id: string;
  productionId: string;
  eggTypeId: string;
  count: number;
  eggType: {
    id: string;
    name: string;
    isHatchable: boolean;
  };
}

export interface HatcheryEggProduction {
  id: string;
  batchId: string;
  date: string;
  note: string | null;
  lines: HatcheryEggProductionLine[];
  createdAt: string;
}

export interface HatcheryEggStockRow {
  id: string;
  batchId: string;
  eggTypeId: string;
  currentStock: number;
  updatedAt: string;
  batch?: { id: string; code: string; name: string | null; status: HatcheryBatchStatus };
  eggType: { id: string; name: string; isHatchable: boolean };
}

export interface HatcheryEggSale {
  id: string;
  batchId: string;
  eggTypeId: string;
  date: string;
  count: number;
  unitPrice: number;
  amount: number;
  partyId: string | null;
  party?: { id: string; name: string; phone: string } | null;
  note: string | null;
  createdAt: string;
  eggType: { id: string; name: string; isHatchable: boolean };
}

export interface HatcheryParentSale {
  id: string;
  batchId: string;
  date: string;
  count: number;
  totalWeightKg: number;
  avgWeightKg: number;
  ratePerKg: number;
  amount: number;
  partyId: string | null;
  party?: { id: string; name: string; phone: string } | null;
  note: string | null;
  createdAt: string;
}

// ==================== QUERY KEYS ====================

export const hatcheryBatchKeys = {
  all: ["hatcheryBatches"] as const,
  lists: () => [...hatcheryBatchKeys.all, "list"] as const,
  list: (filters: Record<string, any>) =>
    [...hatcheryBatchKeys.lists(), filters] as const,
  detail: (id: string) => [...hatcheryBatchKeys.all, "detail", id] as const,
  mortalities: (batchId: string) =>
    [...hatcheryBatchKeys.all, batchId, "mortalities"] as const,
  expenses: (batchId: string) =>
    [...hatcheryBatchKeys.all, batchId, "expenses"] as const,
  eggProductions: (batchId: string) =>
    [...hatcheryBatchKeys.all, batchId, "egg-productions"] as const,
  eggSales: (batchId: string) =>
    [...hatcheryBatchKeys.all, batchId, "egg-sales"] as const,
  parentSales: (batchId: string) =>
    [...hatcheryBatchKeys.all, batchId, "parent-sales"] as const,
  eggInventory: (filters: Record<string, any>) =>
    ["hatcheryEggInventory", filters] as const,
  eggTypes: () => ["hatcheryEggTypes"] as const,
};

// ==================== HOOKS ====================

// Batch list
export function useHatcheryBatches(filters: {
  type?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
} = {}) {
  return useQuery({
    queryKey: hatcheryBatchKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.type) params.set("type", filters.type);
      if (filters.status) params.set("status", filters.status);
      if (filters.search) params.set("search", filters.search);
      if (filters.page) params.set("page", String(filters.page));
      if (filters.limit) params.set("limit", String(filters.limit));
      const { data } = await axiosInstance.get(`/hatchery/batches?${params}`);
      return data as { batches: HatcheryBatch[]; total: number; page: number; limit: number };
    },
  });
}

// Batch detail
export function useHatcheryBatch(id: string) {
  return useQuery({
    queryKey: hatcheryBatchKeys.detail(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/hatchery/batches/${id}`);
      return data as HatcheryBatchDetail;
    },
    enabled: !!id,
  });
}

// Create batch
export function useCreateHatcheryBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      type: HatcheryBatchType;
      startDate: string;
      notes?: string;
      placements: { inventoryItemId: string; quantity: number }[];
    }) => {
      const { data } = await axiosInstance.post("/hatchery/batches", payload);
      return data as HatcheryBatch;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hatcheryBatchKeys.lists() });
    },
  });
}

// Update batch
export function useUpdateHatcheryBatch(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name?: string; notes?: string }) => {
      const { data } = await axiosInstance.put(`/hatchery/batches/${id}`, payload);
      return data as HatcheryBatch;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hatcheryBatchKeys.detail(id) });
      qc.invalidateQueries({ queryKey: hatcheryBatchKeys.lists() });
    },
  });
}

// Close batch
export function useCloseHatcheryBatch(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await axiosInstance.post(`/hatchery/batches/${id}/close`);
      return data as HatcheryBatch;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hatcheryBatchKeys.detail(id) });
      qc.invalidateQueries({ queryKey: hatcheryBatchKeys.lists() });
    },
  });
}

// Reopen batch
export function useReopenHatcheryBatch(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await axiosInstance.post(`/hatchery/batches/${id}/reopen`);
      return data as HatcheryBatch;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hatcheryBatchKeys.detail(id) });
      qc.invalidateQueries({ queryKey: hatcheryBatchKeys.lists() });
    },
  });
}

// Delete batch (password-confirmed on backend)
export function useDeleteHatcheryBatch(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { password: string }) => {
      const { data } = await axiosInstance.delete(`/hatchery/batches/${id}`, {
        data: payload,
      });
      return data as { success: boolean };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hatcheryBatchKeys.lists() });
      qc.removeQueries({ queryKey: hatcheryBatchKeys.detail(id) });
    },
  });
}

// Mortality
export function useHatcheryMortalities(batchId: string) {
  return useQuery({
    queryKey: hatcheryBatchKeys.mortalities(batchId),
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/hatchery/batches/${batchId}/mortalities`);
      return data as HatcheryBatchMortality[];
    },
    enabled: !!batchId,
  });
}

export function useAddHatcheryMortality(batchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { date: string; count: number; note?: string }) => {
      const { data } = await axiosInstance.post(`/hatchery/batches/${batchId}/mortalities`, payload);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hatcheryBatchKeys.mortalities(batchId) });
      qc.invalidateQueries({ queryKey: hatcheryBatchKeys.detail(batchId) });
    },
  });
}

export function useDeleteHatcheryMortality(batchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (mortalityId: string) => {
      await axiosInstance.delete(`/hatchery/batches/${batchId}/mortalities/${mortalityId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hatcheryBatchKeys.mortalities(batchId) });
      qc.invalidateQueries({ queryKey: hatcheryBatchKeys.detail(batchId) });
    },
  });
}

// Expenses
export function useHatcheryExpenses(batchId: string) {
  return useQuery({
    queryKey: hatcheryBatchKeys.expenses(batchId),
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/hatchery/batches/${batchId}/expenses`);
      return data as HatcheryBatchExpense[];
    },
    enabled: !!batchId,
  });
}

export function useAddHatcheryExpense(batchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      date: string;
      type: HatcheryBatchExpenseType;
      category: string;
      inventoryItemId?: string;
      quantity?: number;
      itemName?: string;
      unit?: string;
      unitPrice?: number;
      amount?: number;
      note?: string;
    }) => {
      const { data } = await axiosInstance.post(`/hatchery/batches/${batchId}/expenses`, payload);
      return data as HatcheryBatchExpense;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hatcheryBatchKeys.expenses(batchId) });
      qc.invalidateQueries({ queryKey: hatcheryBatchKeys.detail(batchId) });
    },
  });
}

export function useDeleteHatcheryExpense(batchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (expenseId: string) => {
      await axiosInstance.delete(`/hatchery/batches/${batchId}/expenses/${expenseId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hatcheryBatchKeys.expenses(batchId) });
      qc.invalidateQueries({ queryKey: hatcheryBatchKeys.detail(batchId) });
    },
  });
}

// Egg productions
export function useHatcheryEggProductions(batchId: string) {
  return useQuery({
    queryKey: hatcheryBatchKeys.eggProductions(batchId),
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/hatchery/batches/${batchId}/egg-productions`);
      return data as HatcheryEggProduction[];
    },
    enabled: !!batchId,
  });
}

export function useAddHatcheryEggProduction(batchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      date: string;
      note?: string;
      lines: { eggTypeId: string; count: number }[];
    }) => {
      const { data } = await axiosInstance.post(`/hatchery/batches/${batchId}/egg-productions`, payload);
      return data as HatcheryEggProduction;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hatcheryBatchKeys.eggProductions(batchId) });
      qc.invalidateQueries({ queryKey: hatcheryBatchKeys.detail(batchId) });
      qc.invalidateQueries({ queryKey: ["hatcheryEggInventory"] });
    },
  });
}

export function useDeleteHatcheryEggProduction(batchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (productionId: string) => {
      await axiosInstance.delete(`/hatchery/batches/${batchId}/egg-productions/${productionId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hatcheryBatchKeys.eggProductions(batchId) });
      qc.invalidateQueries({ queryKey: hatcheryBatchKeys.detail(batchId) });
      qc.invalidateQueries({ queryKey: ["hatcheryEggInventory"] });
    },
  });
}

// Egg sales
export function useHatcheryEggSales(batchId: string) {
  return useQuery({
    queryKey: hatcheryBatchKeys.eggSales(batchId),
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/hatchery/batches/${batchId}/egg-sales`);
      return data as HatcheryEggSale[];
    },
    enabled: !!batchId,
  });
}

export function useAddHatcheryEggSale(batchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      eggTypeId: string;
      date: string;
      count: number;
      unitPrice: number;
      partyId?: string;
      note?: string;
    }) => {
      const { data } = await axiosInstance.post(`/hatchery/batches/${batchId}/egg-sales`, payload);
      return data as HatcheryEggSale;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hatcheryBatchKeys.eggSales(batchId) });
      qc.invalidateQueries({ queryKey: hatcheryBatchKeys.detail(batchId) });
      qc.invalidateQueries({ queryKey: ["hatcheryEggInventory"] });
      qc.invalidateQueries({ queryKey: ["hatchery-parties"] });
    },
  });
}

export function useDeleteHatcheryEggSale(batchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (saleId: string) => {
      await axiosInstance.delete(`/hatchery/batches/${batchId}/egg-sales/${saleId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hatcheryBatchKeys.eggSales(batchId) });
      qc.invalidateQueries({ queryKey: hatcheryBatchKeys.detail(batchId) });
      qc.invalidateQueries({ queryKey: ["hatcheryEggInventory"] });
      qc.invalidateQueries({ queryKey: ["hatchery-parties"] });
    },
  });
}

// Parent sales
export function useHatcheryParentSales(batchId: string) {
  return useQuery({
    queryKey: hatcheryBatchKeys.parentSales(batchId),
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/hatchery/batches/${batchId}/parent-sales`);
      return data as HatcheryParentSale[];
    },
    enabled: !!batchId,
  });
}

export function useAddHatcheryParentSale(batchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      date: string;
      count: number;
      totalWeightKg: number;
      ratePerKg: number;
      partyId?: string;
      note?: string;
    }) => {
      const { data } = await axiosInstance.post(`/hatchery/batches/${batchId}/parent-sales`, payload);
      return data as HatcheryParentSale;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hatcheryBatchKeys.parentSales(batchId) });
      qc.invalidateQueries({ queryKey: hatcheryBatchKeys.detail(batchId) });
      qc.invalidateQueries({ queryKey: ["hatchery-parties"] });
    },
  });
}

export function useDeleteHatcheryParentSale(batchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (saleId: string) => {
      await axiosInstance.delete(`/hatchery/batches/${batchId}/parent-sales/${saleId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hatcheryBatchKeys.parentSales(batchId) });
      qc.invalidateQueries({ queryKey: hatcheryBatchKeys.detail(batchId) });
      qc.invalidateQueries({ queryKey: ["hatchery-parties"] });
    },
  });
}

// Egg inventory (global batch-wise)
export function useHatcheryEggInventory(filters: { batchId?: string; typeId?: string } = {}) {
  return useQuery({
    queryKey: hatcheryBatchKeys.eggInventory(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.batchId) params.set("batchId", filters.batchId);
      if (filters.typeId) params.set("typeId", filters.typeId);
      const { data } = await axiosInstance.get(`/hatchery/batches/egg-inventory?${params}`);
      return data as HatcheryEggStockRow[];
    },
  });
}

// Egg types
export function useHatcheryEggTypes() {
  return useQuery({
    queryKey: hatcheryBatchKeys.eggTypes(),
    queryFn: async () => {
      const { data } = await axiosInstance.get("/hatchery/egg-types");
      return data as HatcheryEggType[];
    },
  });
}

export function useCreateHatcheryEggType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; isHatchable?: boolean }) => {
      const { data } = await axiosInstance.post("/hatchery/egg-types", payload);
      return data as HatcheryEggType;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hatcheryBatchKeys.eggTypes() });
    },
  });
}

export function useUpdateHatcheryEggType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data } = await axiosInstance.put(`/hatchery/egg-types/${id}`, { name });
      return data as HatcheryEggType;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hatcheryBatchKeys.eggTypes() });
    },
  });
}

export function useDeleteHatcheryEggType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await axiosInstance.delete(`/hatchery/egg-types/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hatcheryBatchKeys.eggTypes() });
    },
  });
}
