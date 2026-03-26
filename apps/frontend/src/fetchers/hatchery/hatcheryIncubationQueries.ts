import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

// ==================== TYPES ====================

export type IncubationStage = "SETTER" | "CANDLING" | "HATCHER" | "COMPLETED";
export type IncubationLossType = "INFERTILE" | "EARLY_DEAD" | "LATE_DEAD" | "UNHATCHED" | "WEAK_CULL";
export type ChickGrade = "A" | "B" | "CULL";

export interface IncubationBatch {
  id: string;
  hatcheryOwnerId: string;
  parentBatchId: string;
  hatchableEggTypeId: string;
  stage: IncubationStage;
  code: string;
  name: string | null;
  startDate: string;
  eggsSetCount: number;
  setterAt: string | null;
  candledAt: string | null;
  transferredAt: string | null;
  hatchedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  parentBatch?: { id: string; code: string; name: string | null };
  _count?: { losses: number; hatchResults: number; chickSales: number };
}

export interface IncubationBatchDetail extends IncubationBatch {
  eggMoves: EggMove[];
  chickStocks: ChickStock[];
  summary: {
    eggsSet: number;
    candlingLoss: number;
    fertileEggs: number;
    totalHatched: number;
    totalHatchedA: number;
    totalHatchedB: number;
    totalCull: number;
    hatchability: number;
    hatchOfTotal: number;
    totalSalesCount: number;
    totalSalesRevenue: number;
  };
}

export interface EggMove {
  id: string;
  incubationBatchId: string;
  parentBatchId: string;
  eggTypeId: string;
  count: number;
  date: string;
  eggType: { id: string; name: string };
}

export interface IncubationLoss {
  id: string;
  incubationBatchId: string;
  type: IncubationLossType;
  date: string;
  count: number;
  note: string | null;
  createdAt: string;
}

export interface HatchResult {
  id: string;
  incubationBatchId: string;
  date: string;
  hatchedA: number;
  hatchedB: number;
  cull: number;
  lateDead: number;
  unhatched: number;
  note: string | null;
  createdAt: string;
}

export interface ChickStock {
  id: string;
  incubationBatchId: string;
  grade: ChickGrade;
  currentStock: number;
}

export interface ChickSale {
  id: string;
  incubationBatchId: string;
  grade: ChickGrade;
  date: string;
  count: number;
  unitPrice: number;
  amount: number;
  partyId: string | null;
  party?: { id: string; name: string; phone: string } | null;
  note: string | null;
  inventoryItemId: string | null;
  createdAt: string;
}

export interface HatchableStock {
  stock: number;
  eggTypeName: string | null;
  eggTypeId: string | null;
}

// ==================== KEYS ====================

export const incubationKeys = {
  all: ["hatchery-incubations"] as const,
  list: (filters?: Record<string, string>) =>
    [...incubationKeys.all, "list", filters ?? {}] as const,
  detail: (id: string) => [...incubationKeys.all, "detail", id] as const,
  losses: (id: string) => [...incubationKeys.all, id, "losses"] as const,
  hatchResults: (id: string) => [...incubationKeys.all, id, "hatch-results"] as const,
  chickSales: (id: string) => [...incubationKeys.all, id, "chick-sales"] as const,
  hatchableStock: (batchId: string) =>
    ["hatchery-hatchable-stock", batchId] as const,
};

// ==================== HOOKS ====================

export function useIncubationBatches(params?: {
  parentBatchId?: string;
  stage?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: incubationKeys.list(params as any),
    queryFn: async () => {
      const { data } = await axiosInstance.get("/hatchery/incubations", { params });
      return data as { batches: IncubationBatch[]; total: number; page: number; limit: number };
    },
  });
}

export function useIncubationBatch(id: string) {
  return useQuery({
    queryKey: incubationKeys.detail(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/hatchery/incubations/${id}`);
      return data as IncubationBatchDetail;
    },
    enabled: !!id,
  });
}

export function useHatchableStock(batchId: string) {
  return useQuery({
    queryKey: incubationKeys.hatchableStock(batchId),
    queryFn: async () => {
      const { data } = await axiosInstance.get(
        `/hatchery/parent-batches/${batchId}/hatchable-stock`
      );
      return data as HatchableStock;
    },
    enabled: !!batchId,
  });
}

export function useCreateIncubationBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      parentBatchId: string;
      startDate: string;
      eggsSetCount: number;
      notes?: string;
      name?: string;
    }) => {
      const { data } = await axiosInstance.post("/hatchery/incubations", payload);
      return data as IncubationBatch;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: incubationKeys.all });
    },
  });
}

// ─── Candling ────────────────────────────────────────────────────────────────

export function useIncubationLosses(incubationBatchId: string) {
  return useQuery({
    queryKey: incubationKeys.losses(incubationBatchId),
    queryFn: async () => {
      const { data } = await axiosInstance.get(
        `/hatchery/incubations/${incubationBatchId}/losses`
      );
      return data as IncubationLoss[];
    },
    enabled: !!incubationBatchId,
  });
}

export function useRecordCandling(incubationBatchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      date: string;
      infertile?: number;
      earlyDead?: number;
      note?: string;
    }) => {
      const { data } = await axiosInstance.post(
        `/hatchery/incubations/${incubationBatchId}/candling`,
        payload
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: incubationKeys.detail(incubationBatchId) });
      qc.invalidateQueries({ queryKey: incubationKeys.losses(incubationBatchId) });
    },
  });
}

// ─── Transfer ────────────────────────────────────────────────────────────────

export function useTransferToHatcher(incubationBatchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { date: string }) => {
      const { data } = await axiosInstance.post(
        `/hatchery/incubations/${incubationBatchId}/transfer`,
        payload
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: incubationKeys.detail(incubationBatchId) });
    },
  });
}

// ─── Hatch Results ────────────────────────────────────────────────────────────

export function useHatchResults(incubationBatchId: string) {
  return useQuery({
    queryKey: incubationKeys.hatchResults(incubationBatchId),
    queryFn: async () => {
      const { data } = await axiosInstance.get(
        `/hatchery/incubations/${incubationBatchId}/hatch-results`
      );
      return data as HatchResult[];
    },
    enabled: !!incubationBatchId,
  });
}

export function useAddHatchResult(incubationBatchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      date: string;
      hatchedA?: number;
      hatchedB?: number;
      cull?: number;
      lateDead?: number;
      unhatched?: number;
      note?: string;
    }) => {
      const { data } = await axiosInstance.post(
        `/hatchery/incubations/${incubationBatchId}/hatch-results`,
        payload
      );
      return data as HatchResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: incubationKeys.detail(incubationBatchId) });
      qc.invalidateQueries({ queryKey: incubationKeys.hatchResults(incubationBatchId) });
    },
  });
}

export function useDeleteHatchResult(incubationBatchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (hatchResultId: string) => {
      await axiosInstance.delete(
        `/hatchery/incubations/${incubationBatchId}/hatch-results/${hatchResultId}`
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: incubationKeys.detail(incubationBatchId) });
      qc.invalidateQueries({ queryKey: incubationKeys.hatchResults(incubationBatchId) });
    },
  });
}

// ─── Chick Sales ─────────────────────────────────────────────────────────────

export function useChickSales(incubationBatchId: string) {
  return useQuery({
    queryKey: incubationKeys.chickSales(incubationBatchId),
    queryFn: async () => {
      const { data } = await axiosInstance.get(
        `/hatchery/incubations/${incubationBatchId}/chick-sales`
      );
      return data as ChickSale[];
    },
    enabled: !!incubationBatchId,
  });
}

export function useAddChickSale(incubationBatchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      grade: ChickGrade;
      date: string;
      count: number;
      unitPrice: number;
      partyId?: string;
      note?: string;
    }) => {
      const { data } = await axiosInstance.post(
        `/hatchery/incubations/${incubationBatchId}/chick-sales`,
        payload
      );
      return data as ChickSale;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: incubationKeys.detail(incubationBatchId) });
      qc.invalidateQueries({ queryKey: incubationKeys.chickSales(incubationBatchId) });
      qc.invalidateQueries({ queryKey: ["hatchery-parties"] });
    },
  });
}

export function useDeleteChickSale(incubationBatchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (saleId: string) => {
      await axiosInstance.delete(
        `/hatchery/incubations/${incubationBatchId}/chick-sales/${saleId}`
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: incubationKeys.detail(incubationBatchId) });
      qc.invalidateQueries({ queryKey: incubationKeys.chickSales(incubationBatchId) });
      qc.invalidateQueries({ queryKey: ["hatchery-parties"] });
    },
  });
}
