import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

export const dealerPurchaseRequestKeys = {
  all: ["dealer-purchase-requests"] as const,
  lists: () => [...dealerPurchaseRequestKeys.all, "list"] as const,
  list: (params?: any) => [...dealerPurchaseRequestKeys.lists(), params] as const,
  details: () => [...dealerPurchaseRequestKeys.all, "detail"] as const,
  detail: (id: string) => [...dealerPurchaseRequestKeys.details(), id] as const,
  statistics: () => [...dealerPurchaseRequestKeys.all, "statistics"] as const,
};

export const useGetDealerPurchaseRequests = (params?: {
  page?: number;
  limit?: number;
  status?: string;
  farmerId?: string;
}) => {
  return useQuery({
    queryKey: dealerPurchaseRequestKeys.list(params),
    queryFn: async () => {
      const { data } = await axiosInstance.get("/dealer/purchase-requests", {
        params,
      });
      return data;
    },
  });
};

export const useGetDealerPurchaseRequestById = (
  id: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: dealerPurchaseRequestKeys.detail(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get(
        `/dealer/purchase-requests/${id}`
      );
      return data;
    },
    enabled: (options?.enabled !== false) && !!id,
  });
};

export const useGetDealerPurchaseRequestStats = () => {
  return useQuery({
    queryKey: dealerPurchaseRequestKeys.statistics(),
    queryFn: async () => {
      const { data } = await axiosInstance.get(
        "/dealer/purchase-requests/statistics"
      );
      return data;
    },
  });
};

export const useApprovePurchaseRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      requestId,
      discount,
    }: {
      requestId: string;
      discount?: { type: "PERCENT" | "FLAT"; value: number };
    }) => {
      const { data } = await axiosInstance.post(
        `/dealer/purchase-requests/${requestId}/approve`,
        { discount }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: dealerPurchaseRequestKeys.all,
      });
      queryClient.invalidateQueries({ queryKey: ["dealer-products"] });
      queryClient.invalidateQueries({ queryKey: ["dealer-sales"] });
      queryClient.invalidateQueries({ queryKey: ["dealer-ledger"] });
    },
  });
};

export const useRejectPurchaseRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      requestId,
      rejectionReason,
    }: {
      requestId: string;
      rejectionReason?: string;
    }) => {
      const { data } = await axiosInstance.post(
        `/dealer/purchase-requests/${requestId}/reject`,
        { rejectionReason }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: dealerPurchaseRequestKeys.all,
      });
    },
  });
};
