import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

export const farmerCashInHandKeys = {
  all: ["farmer-cash-in-hand"] as const,
  today: () => [...farmerCashInHandKeys.all, "today"] as const,
  history: () => [...farmerCashInHandKeys.all, "history"] as const,
};

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

export function useGetFarmerCashToday() {
  return useQuery<TodayResponse>({
    queryKey: farmerCashInHandKeys.today(),
    queryFn: async () => {
      const res = await axiosInstance.get("/farmer/cash-in-hand/today");
      return res.data.data;
    },
    staleTime: 30_000,
  });
}

export function useGetFarmerCashHistory() {
  return useQuery<HistoryDay[]>({
    queryKey: farmerCashInHandKeys.history(),
    queryFn: async () => {
      const res = await axiosInstance.get("/farmer/cash-in-hand/history");
      return res.data.data;
    },
  });
}

export function useSetupFarmerCashBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (initialOpening: number) => {
      await axiosInstance.post("/farmer/cash-in-hand/setup", { initialOpening });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: farmerCashInHandKeys.all }),
  });
}

export function useAddFarmerCashMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AddMovementInput) => {
      await axiosInstance.post("/farmer/cash-in-hand/movements", input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: farmerCashInHandKeys.today() }),
  });
}

export function useCloseFarmerCashDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await axiosInstance.post("/farmer/cash-in-hand/close-day");
      return res.data.data as { bsDate: string; opening: number; closing: number; alreadyClosed: boolean };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: farmerCashInHandKeys.today() });
      qc.invalidateQueries({ queryKey: farmerCashInHandKeys.history() });
    },
  });
}
