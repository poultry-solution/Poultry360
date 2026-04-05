import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

// ── Query keys ────────────────────────────────────────────────────────────────

export const cashInHandKeys = {
  all: ["dealer-cash-in-hand"] as const,
  today: () => [...cashInHandKeys.all, "today"] as const,
  history: () => [...cashInHandKeys.all, "history"] as const,
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CashMovement {
  id: string;
  direction: "IN" | "OUT";
  amount: number;
  partyName: string;
  notes: string | null;
  createdAt: string;
}

export interface TodayData {
  needsSetup: true;
  todayBs: string;
}

export interface TodayLedger {
  needsSetup: false;
  todayBs: string;
  opening: number;
  closing: number;
  isClosed: boolean;
  closedAt: string | null;
  movements: CashMovement[];
}

export type TodayResponse = TodayData | TodayLedger;

export interface HistoryDay {
  bsDate: string;
  openingSnapshot: number;
  closingSnapshot: number;
  source: "USER" | "SYSTEM";
  closedAt: string;
  movementsCount: number;
}

export interface AddMovementInput {
  direction: "IN" | "OUT";
  amount: number;
  partyName: string;
  notes?: string;
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useGetCashToday() {
  return useQuery<TodayResponse>({
    queryKey: cashInHandKeys.today(),
    queryFn: async () => {
      const res = await axiosInstance.get("/dealer/cash-in-hand/today");
      return res.data.data;
    },
    staleTime: 30_000,
  });
}

export function useGetCashHistory() {
  return useQuery<HistoryDay[]>({
    queryKey: cashInHandKeys.history(),
    queryFn: async () => {
      const res = await axiosInstance.get("/dealer/cash-in-hand/history");
      return res.data.data;
    },
  });
}

export function useSetupCashBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (initialOpening: number) => {
      await axiosInstance.post("/dealer/cash-in-hand/setup", { initialOpening });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: cashInHandKeys.all }),
  });
}

export function useAddCashMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AddMovementInput) => {
      await axiosInstance.post("/dealer/cash-in-hand/movements", input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: cashInHandKeys.today() }),
  });
}

export function useDeleteCashMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (movementId: string) => {
      await axiosInstance.delete(`/dealer/cash-in-hand/movements/${encodeURIComponent(movementId)}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cashInHandKeys.today() });
      qc.invalidateQueries({ queryKey: ["cash-in-hand-closed-day"] });
    },
  });
}

export function useCloseCashDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await axiosInstance.post("/dealer/cash-in-hand/close-day");
      return res.data.data as { bsDate: string; opening: number; closing: number; alreadyClosed: boolean };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cashInHandKeys.today() });
      qc.invalidateQueries({ queryKey: cashInHandKeys.history() });
    },
  });
}
