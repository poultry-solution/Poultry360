import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

export const adminPaymentApprovalsKeys = {
  all: ["admin-payment-approvals"] as const,
  lists: () => [...adminPaymentApprovalsKeys.all, "list"] as const,
  list: (filters: string) =>
    [...adminPaymentApprovalsKeys.lists(), { filters }] as const,
};

export type PaymentSubmissionStatus =
  | "PENDING_REVIEW"
  | "APPROVED"
  | "REJECTED";

export interface AdminPaymentApproval {
  id: string;
  userId: string;
  userName: string;
  phone: string;
  roleAtSubmission: string;
  amountNpr: number;
  receiptUrl: string;
  notes?: string | null;
  status: PaymentSubmissionStatus;
  createdAt: string;
  reviewedAt?: string | null;
  reviewerId?: string | null;
  rejectionReason: string | null;
  onboardingState: string | null;
}

export interface AdminPaymentApprovalsFilters {
  page?: number;
  limit?: number;
  status?: PaymentSubmissionStatus;
  role?: "OWNER" | "MANAGER" | "DOCTOR" | "DEALER" | "COMPANY" | "HATCHERY";
  search?: string;
}

export interface AdminPaymentApprovalsResponse {
  success: boolean;
  data: AdminPaymentApproval[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const useGetAdminPaymentApprovals = (
  filters: AdminPaymentApprovalsFilters = {},
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

  return useQuery<AdminPaymentApprovalsResponse>({
    queryKey: adminPaymentApprovalsKeys.list(queryString),
    queryFn: async () => {
      const { data } = await axiosInstance.get<AdminPaymentApprovalsResponse>(
        `/admin/payment-approvals?${queryString}`
      );
      return data;
    },
    enabled: shouldFetch,
    staleTime: 3000,
    refetchOnWindowFocus: false,
  });
};

export const useApprovePaymentSubmission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (submissionId: string) => {
      const { data } = await axiosInstance.post(
        `/admin/payment-approvals/${submissionId}/approve`
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

export const useRejectPaymentSubmission = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      submissionId: string;
      rejectionReason: string;
    }) => {
      const { data } = await axiosInstance.post(
        `/admin/payment-approvals/${payload.submissionId}/reject`,
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

