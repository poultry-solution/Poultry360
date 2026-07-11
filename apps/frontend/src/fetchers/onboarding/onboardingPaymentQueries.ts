import { useQuery } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

export const onboardingPaymentKeys = {
  status: () => ["onboarding", "status"] as const,
};

export type OnboardingPaymentState =
  | "PENDING_PAYMENT"
  | "PENDING_REVIEW"
  | "PAYMENT_REJECTED"
  | "PAYMENT_APPROVED";

export interface OnboardingStatus {
  userRole: string;
  state: OnboardingPaymentState;
  lockedUntilApproved: boolean;
  rejectionReason: string | null;
}

export const useGetOnboardingStatus = () => {
  return useQuery({
    queryKey: onboardingPaymentKeys.status(),
    queryFn: async () => {
      const { data } = await axiosInstance.get("/onboarding/payment/status");
      return data.data as OnboardingStatus;
    },
  });
};
