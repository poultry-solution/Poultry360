import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

export const dealerSettingsKeys = {
  all: ["dealer-settings"] as const,
  paymentDirection: () => [...dealerSettingsKeys.all, "payment-direction"] as const,
};

export interface DealerPaymentDirectionSettingsResponse {
  success: boolean;
  data: {
    paymentDirectionEnabled: boolean;
  };
}

export const useGetDealerPaymentDirectionSetting = () => {
  return useQuery({
    queryKey: dealerSettingsKeys.paymentDirection(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<DealerPaymentDirectionSettingsResponse>(
        "/dealer/settings/payment-direction",
      );
      return data;
    },
    // A failed or missing setting is handled as disabled by the screens.
    staleTime: 30_000,
  });
};

export const useUpdateDealerPaymentDirectionSetting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentDirectionEnabled: boolean) => {
      const { data } = await axiosInstance.patch<DealerPaymentDirectionSettingsResponse>(
        "/dealer/settings/payment-direction",
        { paymentDirectionEnabled },
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: dealerSettingsKeys.paymentDirection(),
      });
    },
  });
};
