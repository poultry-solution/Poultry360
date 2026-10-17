import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";
import { toast } from "sonner";

// ==================== TYPES ====================

export type StaffStatus = "ACTIVE" | "STOPPED";
export type StaffStatusFilter = StaffStatus | "ALL";
export type StaffPayType = "MONTHLY" | "DAILY";
export type StaffPayTypeFilter = StaffPayType | "ALL";
export type AttendanceStatus = "PRESENT" | "ABSENT" | "HALF_DAY";
export type StaffOwner = "farmer" | "dealer" | "hatchery" | "company";

export interface StaffSalary {
  id: string;
  staffId: string;
  /** Per month for MONTHLY staff, per day for DAILY staff. */
  rate: number;
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

export interface StaffAttendance {
  id: string;
  staffId: string;
  date: string;
  status: Exclude<AttendanceStatus, "PRESENT">;
}

export interface StaffItem {
  id: string;
  ownerId: string;
  name: string;
  payType: StaffPayType;
  startDate: string;
  endDate: string | null;
  status: StaffStatus;
  createdAt: string;
  updatedAt: string;
  balance: number;
  /** Rate in effect today: per month or per day by pay type. */
  currentRate: number;
}

export interface StaffSummary {
  totalStaff: number;
  activeStaff: number;
  stoppedStaff: number;
  monthlyStaff: number;
  dailyStaff: number;
  totalSalaryExpense: number;
  totalSalaryPayments: number;
  remainingBalance: number;
}

export interface StaffDetail extends StaffItem {
  salaries: StaffSalary[];
  payments: StaffPayment[];
  attendance: StaffAttendance[];
}

export type TransactionItem =
  | {
      type: "accrual";
      bsYear: number;
      bsMonth: number;
      amount: number;
      monthStartAD: string;
      /** Half days count as 0.5. */
      workedDays: number;
      daysInMonth: number;
      dailyRate: number;
      absentDays: number;
      halfDays: number;
    }
  | { type: "payment"; id: string; amount: number; paidAt: string; note: string | null; receiptImageUrl: string | null };

// ==================== QUERY KEYS ====================

const staffBase = (owner: StaffOwner) => ["staff", owner] as const;
export const staffKeys = {
  all: (owner: StaffOwner) => staffBase(owner),
  list: (owner: StaffOwner, status: StaffStatusFilter = "ALL", payType: StaffPayTypeFilter = "ALL") =>
    [...staffBase(owner), "list", status, payType] as const,
  summary: (owner: StaffOwner) => [...staffBase(owner), "summary"] as const,
  detail: (owner: StaffOwner, id: string) => [...staffBase(owner), "detail", id] as const,
  transactions: (owner: StaffOwner, id: string) => [...staffBase(owner), "transactions", id] as const,
};

function staffPath(owner: StaffOwner) {
  return `/${owner}/staff`;
}

// ==================== QUERIES ====================

export function useStaffList(
  owner: StaffOwner,
  status: StaffStatusFilter = "ALL",
  payType: StaffPayTypeFilter = "ALL"
) {
  return useQuery({
    queryKey: staffKeys.list(owner, status, payType),
    queryFn: async () => {
      const params = {
        ...(status === "ALL" ? {} : { status }),
        ...(payType === "ALL" ? {} : { payType }),
      };
      const { data } = await axiosInstance.get<{ success: boolean; data: StaffItem[] }>(staffPath(owner), {
        params,
      });
      return data;
    },
  });
}

export function useStaffSummary(owner: StaffOwner) {
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

export function useStaffById(owner: StaffOwner, id: string | null) {
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

export function useStaffTransactions(owner: StaffOwner, id: string | null) {
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
  payType: StaffPayType;
  startDate: string;
  rate: number;
}

export interface UpdateStaffBody {
  name?: string;
  /** Correcting a wrong joining date; accrual recomputes from it. */
  startDate?: string;
  /** A new rate from `effectiveFrom`; replaces a rate that starts on the same day. */
  rate?: number;
  effectiveFrom?: string;
}

/** Everything that shows a staff balance changes together. */
function invalidateStaff(qc: ReturnType<typeof useQueryClient>, owner: StaffOwner, id: string) {
  qc.invalidateQueries({ queryKey: staffKeys.all(owner) });
  qc.invalidateQueries({ queryKey: staffKeys.detail(owner, id) });
  qc.invalidateQueries({ queryKey: staffKeys.transactions(owner, id) });
}

export function useCreateStaff(owner: StaffOwner) {
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

export function useUpdateStaff(owner: StaffOwner) {
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

export function useStopStaff(owner: StaffOwner) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, endDate }: { id: string; endDate: string }) => {
      const { data } = await axiosInstance.patch<{ success: boolean; data: StaffDetail }>(
        `${staffPath(owner)}/${id}/stop`,
        { endDate }
      );
      return data;
    },
    onSuccess: (_, { id }) => {
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

export function useAddStaffPayment(owner: StaffOwner) {
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

export function useDeleteStaffPayment(owner: StaffOwner) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ staffId, paymentId }: { staffId: string; paymentId: string }) => {
      const { data } = await axiosInstance.delete<{
        success: boolean;
        data: { paymentId: string; staffId: string };
      }>(
        `${staffPath(owner)}/${staffId}/payments/${paymentId}`
      );
      return data;
    },
    onSuccess: (_, { staffId }) => {
      qc.invalidateQueries({ queryKey: staffKeys.all(owner) });
      qc.invalidateQueries({ queryKey: staffKeys.summary(owner) });
      qc.invalidateQueries({ queryKey: staffKeys.detail(owner, staffId) });
      qc.invalidateQueries({ queryKey: staffKeys.transactions(owner, staffId) });
      toast.success("Payment deleted");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Failed to delete payment");
    },
  });
}

/**
 * Permanently delete a staff member and, via cascade, their salary history and
 * payments. Password goes in the request body, which axios puts under `data`
 * for DELETE.
 */
export function useDeleteStaff(owner: StaffOwner) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      const { data } = await axiosInstance.delete<{ success: boolean; message?: string }>(
        `${staffPath(owner)}/${id}`,
        { data: { password } }
      );
      return data;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: staffKeys.all(owner) });
      qc.invalidateQueries({ queryKey: staffKeys.summary(owner) });
      qc.removeQueries({ queryKey: staffKeys.detail(owner, id) });
      qc.removeQueries({ queryKey: staffKeys.transactions(owner, id) });
      toast.success("Staff deleted");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Failed to delete staff");
    },
  });
}

export function useResumeStaff(owner: StaffOwner) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axiosInstance.patch<{ success: boolean; data: StaffDetail }>(
        `${staffPath(owner)}/${id}/resume`
      );
      return data;
    },
    onSuccess: (_, id) => {
      invalidateStaff(qc, owner, id);
      toast.success("Staff restarted");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Failed to restart staff");
    },
  });
}

export function useUpdateSalaryRate(owner: StaffOwner) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      staffId,
      salaryId,
      body,
    }: {
      staffId: string;
      salaryId: string;
      body: { rate: number; effectiveFrom?: string };
    }) => {
      const { data } = await axiosInstance.put<{ success: boolean; data: StaffDetail }>(
        `${staffPath(owner)}/${staffId}/salaries/${salaryId}`,
        body
      );
      return data;
    },
    onSuccess: (_, { staffId }) => {
      invalidateStaff(qc, owner, staffId);
      toast.success("Salary updated");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Failed to update salary");
    },
  });
}

export function useDeleteSalaryRate(owner: StaffOwner) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ staffId, salaryId }: { staffId: string; salaryId: string }) => {
      const { data } = await axiosInstance.delete<{ success: boolean; data: StaffDetail }>(
        `${staffPath(owner)}/${staffId}/salaries/${salaryId}`
      );
      return data;
    },
    onSuccess: (_, { staffId }) => {
      invalidateStaff(qc, owner, staffId);
      toast.success("Salary removed");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Failed to remove salary");
    },
  });
}

/** Marks one day. No success toast: attendance is tapped day by day. */
export function useSetStaffAttendance(owner: StaffOwner) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ staffId, date, status }: { staffId: string; date: string; status: AttendanceStatus }) => {
      const { data } = await axiosInstance.put<{ success: boolean; data: StaffDetail }>(
        `${staffPath(owner)}/${staffId}/attendance`,
        { date, status }
      );
      return data;
    },
    onSuccess: (_, { staffId }) => {
      invalidateStaff(qc, owner, staffId);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Failed to save attendance");
    },
  });
}
