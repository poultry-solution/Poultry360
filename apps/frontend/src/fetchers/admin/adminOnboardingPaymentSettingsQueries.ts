import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

export const adminOnboardingPaymentSettingsKeys = {
  all: ["admin-onboarding-payment-settings"] as const,
  detail: () => [...adminOnboardingPaymentSettingsKeys.all, "detail"] as const,
};

export interface AdminOnboardingPaymentSettings {
  ownerAmountNpr: number;
  managerAmountNpr: number;
  dealerAmountNpr: number;
  companyAmountNpr: number;
  hatcheryAmountNpr: number;
  qrImageUrl: string | null;
  qrText: string | null;
  phoneDisplay: string;
  accountHint: string;
  updatedAt: string;
}

interface AdminOnboardingPaymentSettingsResponse {
  success: boolean;
  data: AdminOnboardingPaymentSettings;
}

export interface UpdateAdminOnboardingPaymentSettingsPayload {
  ownerAmountNpr: number;
  managerAmountNpr: number;
  dealerAmountNpr: number;
  companyAmountNpr: number;
  hatcheryAmountNpr: number;
  qrImageUrl: string;
  qrText?: string;
  phoneDisplay: string;
  accountHint: string;
}

export const useGetAdminOnboardingPaymentSettings = () => {
  return useQuery<AdminOnboardingPaymentSettingsResponse>({
    queryKey: adminOnboardingPaymentSettingsKeys.detail(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<AdminOnboardingPaymentSettingsResponse>(
        "/admin/onboarding-payment-settings"
      );
      return data;
    },
  });
};

export const useUpdateAdminOnboardingPaymentSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateAdminOnboardingPaymentSettingsPayload) => {
      const { data } = await axiosInstance.put(
        "/admin/onboarding-payment-settings",
        payload
      );
      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: adminOnboardingPaymentSettingsKeys.all,
        }),
        queryClient.invalidateQueries({
          queryKey: ["onboarding-payment", "context"],
        }),
      ]);
    },
  });
};
