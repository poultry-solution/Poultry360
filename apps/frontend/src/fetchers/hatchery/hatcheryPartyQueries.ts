import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HatcheryParty {
  id: string;
  hatcheryOwnerId: string;
  name: string;
  phone: string;
  address: string | null;
  openingBalance: string | number;
  balance: string | number;
  createdAt: string;
  updatedAt: string;
}

export interface HatcheryPartyDetail extends HatcheryParty {
  salesCount: number;
  totalSales: string | number;
  totalPayments: string | number;
}

export interface HatcheryPartyTxn {
  id: string;
  partyId: string;
  type: "SALE" | "PAYMENT" | "ADJUSTMENT" | "OPENING_BALANCE";
  date: string;
  amount: string | number;
  balanceAfter: string | number;
  sourceType: string | null;
  sourceId: string | null;
  note: string | null;
  createdAt: string;
}

export interface HatcheryPartyPayment {
  id: string;
  partyId: string;
  date: string;
  amount: string | number;
  method: string | null;
  note: string | null;
  createdAt: string;
}

// ─── List / Create Parties ────────────────────────────────────────────────────

export function useHatcheryParties(search?: string) {
  return useQuery({
    queryKey: ["hatchery-parties", search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      params.set("limit", "100");
      const { data } = await axiosInstance.get(`/hatchery/parties?${params}`);
      return data as { parties: HatcheryParty[]; total: number };
    },
  });
}

export function useCreateHatcheryParty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      phone: string;
      address?: string;
      openingBalance?: number;
    }) => {
      const { data } = await axiosInstance.post("/hatchery/parties", payload);
      return data as HatcheryParty;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hatchery-parties"] }),
  });
}

// ─── Party detail ─────────────────────────────────────────────────────────────

export function useHatcheryParty(id: string) {
  return useQuery({
    queryKey: ["hatchery-party", id],
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/hatchery/parties/${id}`);
      return data as HatcheryPartyDetail;
    },
    enabled: !!id,
  });
}

// ─── Txns ─────────────────────────────────────────────────────────────────────

export function useHatcheryPartyTxns(partyId: string) {
  return useQuery({
    queryKey: ["hatchery-party-txns", partyId],
    queryFn: async () => {
      const { data } = await axiosInstance.get(
        `/hatchery/parties/${partyId}/txns?limit=200`
      );
      return data as { txns: HatcheryPartyTxn[]; total: number };
    },
    enabled: !!partyId,
  });
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export function useHatcheryPartyPayments(partyId: string) {
  return useQuery({
    queryKey: ["hatchery-party-payments", partyId],
    queryFn: async () => {
      const { data } = await axiosInstance.get(
        `/hatchery/parties/${partyId}/payments?limit=200`
      );
      return data as { payments: HatcheryPartyPayment[]; total: number };
    },
    enabled: !!partyId,
  });
}

export function useAddHatcheryPartyPayment(partyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      date: string;
      amount: number;
      method?: string;
      note?: string;
    }) => {
      const { data } = await axiosInstance.post(
        `/hatchery/parties/${partyId}/payments`,
        payload
      );
      return data as HatcheryPartyPayment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hatchery-party", partyId] });
      qc.invalidateQueries({ queryKey: ["hatchery-party-payments", partyId] });
      qc.invalidateQueries({ queryKey: ["hatchery-party-txns", partyId] });
      qc.invalidateQueries({ queryKey: ["hatchery-parties"] });
    },
  });
}

export function useDeleteHatcheryPartyPayment(partyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (paymentId: string) => {
      await axiosInstance.delete(
        `/hatchery/parties/${partyId}/payments/${paymentId}`
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hatchery-party", partyId] });
      qc.invalidateQueries({ queryKey: ["hatchery-party-payments", partyId] });
      qc.invalidateQueries({ queryKey: ["hatchery-party-txns", partyId] });
      qc.invalidateQueries({ queryKey: ["hatchery-parties"] });
    },
  });
}
