import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";
import { toast } from "sonner";

// ==================== TYPES ====================

export type StaffStatus = "ACTIVE" | "STOPPED";

export interface StaffSalary {
  id: string;
  staffId: string;
  monthlyAmount: number;
  effectiveFrom: string;
  createdAt: string;
}

export interface StaffPayment {
  id: string;
  staffId: string;
  amount: number;
  paidAt: string;
  note: string | null;
  receiptImageUrl: string | null;
  createdAt: string;
}

export interface StaffItem {
  id: string;
  ownerId: string;
  name: string;
  startDate: string;
  endDate: string | null;
  status: StaffStatus;
  createdAt: string;
  updatedAt: string;
  balance: number;
  currentMonthlySalary: number;
}

export interface StaffDetail extends StaffItem {
  salaries: StaffSalary[];
  payments: StaffPayment[];
}

export type TransactionItem =
  | { type: "accrual"; bsYear: number; bsMonth: number; amount: number; monthStartAD: string }
  | { type: "payment"; id: string; amount: number; paidAt: string; note: string | null; receiptImageUrl: string | null };

// ==================== QUERY KEYS ====================

const staffBase = (owner: "farmer" | "dealer") => ["staff", owner] as const;
export const staffKeys = {
  all: (owner: "farmer" | "dealer") => staffBase(owner),
  list: (owner: "farmer" | "dealer") => [...staffBase(owner), "list"] as const,
  detail: (owner: "farmer" | "dealer", id: string) => [...staffBase(owner), "detail", id] as const,
  transactions: (owner: "farmer" | "dealer", id: string) => [...staffBase(owner), "transactions", id] as const,
};

function staffPath(owner: "farmer" | "dealer") {
  return `/${owner}/staff`;
}

// ==================== QUERIES ====================

export function useStaffList(owner: "farmer" | "dealer") {
  return useQuery({
    queryKey: staffKeys.list(owner),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ success: boolean; data: StaffItem[] }>(staffPath(owner));
      return data;
    },
  });
}

export function useStaffById(owner: "farmer" | "dealer", id: string | null) {
  return useQuery({
    queryKey: staffKeys.detail(owner, id ?? ""),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ success: boolean; data: StaffDetail }>(
        `${staffPath(owner)}/${id}`
      );
      return data;
    },
    enabled: !!id,
  });
}

export function useStaffTransactions(owner: "farmer" | "dealer", id: string | null) {
  return useQuery({
    queryKey: staffKeys.transactions(owner, id ?? ""),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{
        success: boolean;
        data: { transactions: TransactionItem[]; balance: number };
      }>(`${staffPath(owner)}/${id}/transactions`);
      return data;
    },
    enabled: !!id,
  });
}

// ==================== MUTATIONS ====================

export interface CreateStaffBody {
  name: string;
  startDate: string;
  monthlySalary: number;
}

export interface UpdateStaffBody {
  name?: string;
  monthlySalary?: number;
  effectiveFrom?: string;
}

export function useCreateStaff(owner: "farmer" | "dealer") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateStaffBody) => {
      const { data } = await axiosInstance.post<{ success: boolean; data: StaffDetail }>(
        staffPath(owner),
        body
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: staffKeys.all(owner) });
      toast.success("Staff added");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Failed to add staff");
    },
  });
}

export function useUpdateStaff(owner: "farmer" | "dealer") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdateStaffBody }) => {
      const { data } = await axiosInstance.put<{ success: boolean; data: StaffDetail }>(
        `${staffPath(owner)}/${id}`,
        body
      );
      return data;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: staffKeys.all(owner) });
      qc.invalidateQueries({ queryKey: staffKeys.detail(owner, id) });
      qc.invalidateQueries({ queryKey: staffKeys.transactions(owner, id) });
      toast.success("Updated");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Update failed");
    },
  });
}

export function useStopStaff(owner: "farmer" | "dealer") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axiosInstance.patch<{ success: boolean; data: StaffDetail }>(
        `${staffPath(owner)}/${id}/stop`
      );
      return data;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: staffKeys.all(owner) });
      qc.invalidateQueries({ queryKey: staffKeys.detail(owner, id) });
      qc.invalidateQueries({ queryKey: staffKeys.transactions(owner, id) });
      toast.success("Staff stopped");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Failed to stop staff");
    },
  });
}

export interface AddPaymentBody {
  amount: number;
  paidAt: string;
  note?: string;
  receiptImageUrl?: string;
}

export function useAddStaffPayment(owner: "farmer" | "dealer") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ staffId, body }: { staffId: string; body: AddPaymentBody }) => {
      const { data } = await axiosInstance.post<{ success: boolean; data: StaffDetail }>(
        `${staffPath(owner)}/${staffId}/payments`,
        body
      );
      return data;
    },
    onSuccess: (_, { staffId }) => {
      qc.invalidateQueries({ queryKey: staffKeys.all(owner) });
      qc.invalidateQueries({ queryKey: staffKeys.detail(owner, staffId) });
      qc.invalidateQueries({ queryKey: staffKeys.transactions(owner, staffId) });
      toast.success("Payment recorded");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Failed to record payment");
    },
  });
}
