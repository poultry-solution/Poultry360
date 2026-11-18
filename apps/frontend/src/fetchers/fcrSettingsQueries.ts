import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";
import { useAuthStore } from "@/common/store/store";

/** The account's cFCR standard. Every broiler batch uses it, so batches compare fairly. */
export interface FarmerFcrSettings {
  targetWeightKg: number;
  correctionFactorPerKg: number;
  /** true = the account has not changed the standard (2.0 kg, 0.25 per kg). */
  isDefault: boolean;
}

export const CFCR_DEFAULT_TARGET_KG = 2;
export const CFCR_DEFAULT_CORRECTION_PER_KG = 0.25;
export const CFCR_TARGET_MIN_KG = 1;
export const CFCR_TARGET_MAX_KG = 4;
export const CFCR_CORRECTION_MAX = 1;

export const fcrSettingsQueryKeys = {
  all: ["farmer-fcr-settings"] as const,
  account: (accountId: string) => [...fcrSettingsQueryKeys.all, accountId] as const,
};

export function useGetFarmerFcrSettings(options?: { enabled?: boolean }) {
  const accountId = useAuthStore((state) => state.user?.id ?? "");
  return useQuery({
    queryKey: fcrSettingsQueryKeys.account(accountId),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{ success: boolean; data: FarmerFcrSettings }>(
        "/farmer/fcr-settings",
      );
      return data.data;
    },
    enabled: Boolean(accountId) && (options?.enabled ?? true),
    staleTime: 60_000,
  });
}

export function useUpdateFarmerFcrSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { targetWeightKg: number; correctionFactorPerKg: number }) => {
      const { data } = await axiosInstance.put<{ success: boolean; data: FarmerFcrSettings }>(
        "/farmer/fcr-settings",
        input,
      );
      return data.data;
    },
    onSuccess: () => {
      // cFCR of every batch changes, so refresh everything that shows it.
      queryClient.invalidateQueries({ queryKey: fcrSettingsQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["farmer-analytics"] });
    },
  });
}
