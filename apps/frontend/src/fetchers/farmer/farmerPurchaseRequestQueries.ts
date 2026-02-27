import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

export const farmerPurchaseRequestKeys = {
  all: ["farmer-purchase-requests"] as const,
  lists: () => [...farmerPurchaseRequestKeys.all, "list"] as const,
  list: (params?: any) => [...farmerPurchaseRequestKeys.lists(), params] as const,
  details: () => [...farmerPurchaseRequestKeys.all, "detail"] as const,
  detail: (id: string) => [...farmerPurchaseRequestKeys.details(), id] as const,
  statistics: () => [...farmerPurchaseRequestKeys.all, "statistics"] as const,
};

export const useGetFarmerPurchaseRequests = (params?: {
  page?: number;
  limit?: number;
  status?: string;
  dealerId?: string;
}) => {
  return useQuery({
    queryKey: farmerPurchaseRequestKeys.list(params),
    queryFn: async () => {
      const { data } = await axiosInstance.get("/farmer/purchase-requests", {
        params,
      });
      return data;
    },
  });
};

export const useGetFarmerPurchaseRequestById = (
  id: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: farmerPurchaseRequestKeys.detail(id),
    queryFn: async () => {
      const { data } = await axiosInstance.get(
        `/farmer/purchase-requests/${id}`
      );
      return data;
    },
    enabled: (options?.enabled !== false) && !!id,
  });
};

export const useGetFarmerPurchaseRequestStats = () => {
  return useQuery({
    queryKey: farmerPurchaseRequestKeys.statistics(),
    queryFn: async () => {
      const { data } = await axiosInstance.get(
        "/farmer/purchase-requests/statistics"
      );
      return data;
    },
  });
};
