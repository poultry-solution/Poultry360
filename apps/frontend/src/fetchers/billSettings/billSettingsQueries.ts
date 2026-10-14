import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BillDetails, BillSettingsInput, BillSettingsResponse } from "@myapp/shared-types";
import axiosInstance from "@/common/lib/axios";

export const billSettingsKey = ["bill-settings"] as const;

/** Bill details for the current business (staff get their owner's). */
export const useGetBillSettings = (options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: billSettingsKey,
    queryFn: async (): Promise<BillSettingsResponse> => {
      const { data } = await axiosInstance.get("/bill-settings");
      return data.data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });

export const useUpdateBillSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: BillSettingsInput): Promise<BillSettingsResponse> => {
      const { data } = await axiosInstance.put("/bill-settings", input);
      return data.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(billSettingsKey, data);
    },
  });
};

export type { BillDetails };
