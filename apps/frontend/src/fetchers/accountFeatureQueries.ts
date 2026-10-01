import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";
import { useAuthStore } from "@/common/store/store";

export const ACCOUNT_FEATURE_KEYS = {
  SELF_FEED_PRODUCTION: "SELF_FEED_PRODUCTION",
  DEALER_STAFF_OPERATIONS: "DEALER_STAFF_OPERATIONS",
  HATCHERY_STAFF_OPERATIONS: "HATCHERY_STAFF_OPERATIONS",
  FARMER_STAFF_OPERATIONS: "FARMER_STAFF_OPERATIONS",
  FARMER_PURCHASE_BILL_UPLOAD: "FARMER_PURCHASE_BILL_UPLOAD",
  HATCHERY_PURCHASE_BILL_UPLOAD: "HATCHERY_PURCHASE_BILL_UPLOAD",
  DEALER_PURCHASE_BILL_UPLOAD: "DEALER_PURCHASE_BILL_UPLOAD",
  COMPANY_PURCHASE_BILL_UPLOAD: "COMPANY_PURCHASE_BILL_UPLOAD",
  COMPANY_STAFF_OPERATIONS: "COMPANY_STAFF_OPERATIONS",
  DEALER_SUPPLIER_SETTLEMENT_SALES: "DEALER_SUPPLIER_SETTLEMENT_SALES",
  DEALER_BROILER_SALES_AND_SETTLEMENTS: "DEALER_BROILER_SALES_AND_SETTLEMENTS",
} as const;

export type AccountFeatureKey =
  (typeof ACCOUNT_FEATURE_KEYS)[keyof typeof ACCOUNT_FEATURE_KEYS];

export interface AccountFeature {
  key: AccountFeatureKey;
  name: string;
  description: string;
  enabled: boolean;
  updatedAt: string | null;
}

export const accountFeatureQueryKeys = {
  all: ["account-features"] as const,
  account: (accountId: string) =>
    [...accountFeatureQueryKeys.all, accountId] as const,
};

export function useGetAccountFeatures(options?: { enabled?: boolean }) {
  const accountId = useAuthStore((state) => state.user?.id ?? "");
  return useQuery({
    queryKey: accountFeatureQueryKeys.account(accountId),
    queryFn: async () => {
      const { data } = await axiosInstance.get<{
        success: boolean;
        data: AccountFeature[];
      }>("/account-features");
      return data;
    },
    enabled: Boolean(accountId) && (options?.enabled ?? true),
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useAccountFeature(
  featureKey: AccountFeatureKey,
  options?: { enabled?: boolean },
) {
  const query = useGetAccountFeatures(options);
  const feature = query.data?.data.find((item) => item.key === featureKey);
  return {
    ...query,
    feature,
    isEnabled: feature?.enabled === true,
  };
}

export function useUpdateCurrentAccountFeature() {
  const queryClient = useQueryClient();
  const accountId = useAuthStore((state) => state.user?.id ?? "");

  return useMutation({
    mutationFn: async ({
      featureKey,
      enabled,
    }: {
      featureKey: AccountFeatureKey;
      enabled: boolean;
    }) => {
      const { data } = await axiosInstance.put(
        `/account-features/${featureKey}`,
        { enabled },
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: accountFeatureQueryKeys.account(accountId),
      });
    },
  });
}
