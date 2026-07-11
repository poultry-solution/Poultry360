import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

export const adminPaymentApprovalsKeys = {
  all: ["admin-account-approvals"] as const,
  lists: () => [...adminPaymentApprovalsKeys.all, "list"] as const,
  list: (filters: string) =>
    [...adminPaymentApprovalsKeys.lists(), { filters }] as const,
};

export type AccountApprovalState =
  | "PENDING_PAYMENT"
  | "PAYMENT_APPROVED"
  | "PAYMENT_REJECTED";

export interface AdminAccountApproval {
  userId: string;
  userName: string;
  phone: string;
  role: string;
  companyName: string | null;
  state: AccountApprovalState;
  rejectionReason: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  requestedAt: string;
}

export interface AdminAccountApprovalsFilters {
  page?: number;
  limit?: number;
  status?: AccountApprovalState;
  role?: "OWNER" | "MANAGER" | "DOCTOR" | "DEALER" | "COMPANY" | "HATCHERY";
  search?: string;
}

export interface AdminAccountApprovalsResponse {
  success: boolean;
  data: AdminAccountApproval[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const useGetAdminAccountApprovals = (
  filters: AdminAccountApprovalsFilters = {},
  options?: { enabled?: boolean }
) => {
  const queryString = new URLSearchParams(
    Object.entries(filters)
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  ).toString();

  const shouldFetch =
    (options?.enabled ?? true) &&
    (!filters.search || filters.search.length >= 2);

  return useQuery<AdminAccountApprovalsResponse>({
    queryKey: adminPaymentApprovalsKeys.list(queryString),
    queryFn: async () => {
      const { data } = await axiosInstance.get<AdminAccountApprovalsResponse>(
        `/admin/payment-approvals?${queryString}`
      );
      return data;
    },
    enabled: shouldFetch,
    staleTime: 3000,
    refetchOnWindowFocus: false,
  });
};

export const useApproveAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data } = await axiosInstance.post(
        `/admin/payment-approvals/${userId}/approve`
      );
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: adminPaymentApprovalsKeys.lists(),
      });
    },
  });
};

export const useRejectAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      userId: string;
      rejectionReason: string;
    }) => {
      const { data } = await axiosInstance.post(
        `/admin/payment-approvals/${payload.userId}/reject`,
        { rejectionReason: payload.rejectionReason }
      );
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: adminPaymentApprovalsKeys.lists(),
      });
    },
  });
};
