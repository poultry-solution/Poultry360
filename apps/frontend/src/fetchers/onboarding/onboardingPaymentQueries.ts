import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

export const onboardingPaymentKeys = {
  context: () => ["onboarding-payment", "context"] as const,
  history: () => ["onboarding-payment", "history"] as const,
};

export type OnboardingPaymentState =
  | "PENDING_PAYMENT"
  | "PENDING_REVIEW"
  | "PAYMENT_REJECTED"
  | "PAYMENT_APPROVED";

export interface OnboardingPaymentContext {
  userRole: string;
  state: OnboardingPaymentState;
  lockedUntilApproved: boolean;
  trialEndsAt: string | null;
  trialDurationDays: number;
  trialActive: boolean;
  amountNpr: number;
  qr: {
    qrImageUrl: string | null;
    qrText: string;
    phoneDisplay: string;
    accountHint: string;
  };
  rejectionReason: string | null;
}

export interface OnboardingPaymentSubmission {
  id: string;
  amountNpr: number;
  receiptUrl: string;
  notes?: string | null;
  status: string;
  createdAt: string;
  reviewedAt?: string | null;
  reviewerId?: string | null;
  rejectionReason?: string | null;
}

export const useGetOnboardingPaymentContext = () => {
  return useQuery({
    queryKey: onboardingPaymentKeys.context(),
    queryFn: async () => {
      const { data } = await axiosInstance.get(
        "/onboarding/payment/context"
      );
      return data.data as OnboardingPaymentContext;
    },
  });
};

export const useGetOnboardingPaymentHistory = () => {
  return useQuery({
    queryKey: onboardingPaymentKeys.history(),
    queryFn: async () => {
      const { data } = await axiosInstance.get(
        "/onboarding/payment/history"
      );
      return data.data as { submissions: OnboardingPaymentSubmission[] };
    },
  });
};

export const useSubmitOnboardingPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      receiptUrl: string;
      notes?: string;
    }) => {
      const { data } = await axiosInstance.post(
        "/onboarding/payment/submit",
        payload
      );
      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: onboardingPaymentKeys.context(),
        }),
        queryClient.invalidateQueries({
          queryKey: onboardingPaymentKeys.history(),
        }),
      ]);
    },
  });
};

export const useStartOnboardingTrial = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await axiosInstance.post(
        "/onboarding/payment/start-trial"
      );
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: onboardingPaymentKeys.context(),
      });
    },
  });
};

