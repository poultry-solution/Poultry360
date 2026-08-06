import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";
import { toast } from "sonner";

// ==================== TYPES ====================

export type StaffStatus = "ACTIVE" | "STOPPED" | "ARCHIVED";
export type StaffStatusFilter = StaffStatus | "ALL";

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

export interface StaffSummary {
  totalStaff: number;
  activeStaff: number;
  stoppedStaff: number;
  archivedStaff: number;
  totalSalaryExpense: number;
  totalSalaryPayments: number;
  remainingBalance: number;
}

export interface StaffDetail extends StaffItem {
  salaries: StaffSalary[];
  payments: StaffPayment[];
}

export type TransactionItem =
  | { type: "accrual"; bsYear: number; bsMonth: number; amount: number; monthStartAD: string }
  | { type: "payment"; id: string; amount: number; paidAt: string; note: string | null; receiptImageUrl: string | null };

// ==================== QUERY KEYS ====================

const staffBase = (owner: "farmer" | "dealer" | "hatchery") => ["staff", owner] as const;
export const staffKeys = {
  all: (owner: "farmer" | "dealer" | "hatchery") => staffBase(owner),
  list: (owner: "farmer" | "dealer" | "hatchery", status: StaffStatusFilter = "ALL") =>
    [...staffBase(owner), "list", status] as const,
  summary: (owner: "farmer" | "dealer" | "hatchery") => [...staffBase(owner), "summary"] as const,
  detail: (owner: "farmer" | "dealer" | "hatchery", id: string) => [...staffBase(owner), "detail", id] as const,
  transactions: (owner: "farmer" | "dealer" | "hatchery", id: string) => [...staffBase(owner), "transactions", id] as const,
};

function staffPath(owner: "farmer" | "dealer" | "hatchery") {
  return `/${owner}/staff`;
}

// ==================== QUERIES ====================

export function useStaffList(owner: "farmer" | "dealer" | "hatchery", status: StaffStatusFilter = "ALL") {
  return useQuery({
    queryKey: staffKeys.list(owner, status),
    queryFn: async () => {
      const params = status === "ALL" ? undefined : { status };
      const { data } = await axiosInstance.get<{ success: boolean; data: StaffItem[] }>(staffPath(owner), {
        params,
      });
      return data;
    },
  });
}

export function useStaffSummary(owner: "farmer" | "dealer" | "hatchery") {
  return useQuery({
    queryKey: staffKeys.summary(owner),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ success: boolean; data: StaffSummary }>(
        `${staffPath(owner)}/summary`
      );
      return data;
    },
  });
}

export function useStaffById(owner: "farmer" | "dealer" | "hatchery", id: string | null) {
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

export function useStaffTransactions(owner: "farmer" | "dealer" | "hatchery", id: string | null) {
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

export function useCreateStaff(owner: "farmer" | "dealer" | "hatchery") {
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
      qc.invalidateQueries({ queryKey: staffKeys.summary(owner) });
      toast.success("Staff added");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Failed to add staff");
    },
  });
}

export function useUpdateStaff(owner: "farmer" | "dealer" | "hatchery") {
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
      qc.invalidateQueries({ queryKey: staffKeys.summary(owner) });
      qc.invalidateQueries({ queryKey: staffKeys.detail(owner, id) });
      qc.invalidateQueries({ queryKey: staffKeys.transactions(owner, id) });
      toast.success("Updated");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Update failed");
    },
  });
}

export function useStopStaff(owner: "farmer" | "dealer" | "hatchery") {
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
      qc.invalidateQueries({ queryKey: staffKeys.summary(owner) });
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

export function useAddStaffPayment(owner: "farmer" | "dealer" | "hatchery") {
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
      qc.invalidateQueries({ queryKey: staffKeys.summary(owner) });
      qc.invalidateQueries({ queryKey: staffKeys.detail(owner, staffId) });
      qc.invalidateQueries({ queryKey: staffKeys.transactions(owner, staffId) });
      toast.success("Payment recorded");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Failed to record payment");
    },
  });
}

export function useArchiveStaff(owner: "farmer" | "dealer" | "hatchery") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axiosInstance.patch<{ success: boolean; data: StaffDetail; message?: string }>(
        `${staffPath(owner)}/${id}/archive`
      );
      return data;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: staffKeys.all(owner) });
      qc.invalidateQueries({ queryKey: staffKeys.summary(owner) });
      qc.invalidateQueries({ queryKey: staffKeys.detail(owner, id) });
      qc.invalidateQueries({ queryKey: staffKeys.transactions(owner, id) });
      toast.success("Staff archived");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Failed to archive staff");
    },
  });
}
