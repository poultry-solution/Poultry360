import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

// ==================== TYPES ====================

export interface DealerFarmerRequest {
  id: string;
  farmerId: string;
  dealerId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectedCount: number;
  lastRejectedAt?: string;
  acknowledgedAt?: string;
  createdAt: string;
  updatedAt: string;
  farmer?: {
    id: string;
    name: string;
    phone: string;
    status: string;
  };
}

export interface ConnectedFarmer {
  id: string;
  name: string;
  phone: string;
  status: string;
  connectedAt: string;
  connectedVia: "VERIFICATION" | "MANUAL";
  dealerFarmerId: string;
}

interface FarmerRequestsResponse {
  success: boolean;
  data: DealerFarmerRequest[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface FarmerRequestResponse {
  success: boolean;
  data: DealerFarmerRequest;
  message?: string;
}

interface ConnectedFarmersResponse {
  success: boolean;
  data: ConnectedFarmer[];
}

interface GetFarmerRequestsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

// ==================== QUERY KEYS ====================

export const dealerFarmerKeys = {
  all: ["dealer-farmers"] as const,
  requests: (params?: GetFarmerRequestsParams) => 
    [...dealerFarmerKeys.all, "requests", params] as const,
  farmers: () => [...dealerFarmerKeys.all, "farmers"] as const,
  farmer: (id: string) => [...dealerFarmerKeys.all, "farmer", id] as const,
};

// ==================== QUERIES ====================

// Get dealer's farmer verification requests (with filters)
export const useGetDealerFarmerRequests = (params?: GetFarmerRequestsParams) => {
  return useQuery<FarmerRequestsResponse>({
    queryKey: dealerFarmerKeys.requests(params),
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append("page", params.page.toString());
      if (params?.limit) queryParams.append("limit", params.limit.toString());
      if (params?.search) queryParams.append("search", params.search);
      if (params?.status) queryParams.append("status", params.status);

      const { data } = await axiosInstance.get<FarmerRequestsResponse>(
        `/verification/dealers/farmer-requests?${queryParams.toString()}`
      );
      return data;
    },
  });
};

// Get dealer's connected farmers
export const useGetConnectedFarmers = () => {
  return useQuery<ConnectedFarmersResponse>({
    queryKey: dealerFarmerKeys.farmers(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<ConnectedFarmersResponse>(
        "/verification/dealers/farmers"
      );
      return data;
    },
  });
};

// ==================== MUTATIONS ====================

// Approve farmer verification request
export const useApproveFarmerRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axiosInstance.post<FarmerRequestResponse>(
        `/verification/dealers/farmer-requests/${id}/approve`
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dealerFarmerKeys.all });
    },
  });
};

// Reject farmer verification request
export const useRejectFarmerRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axiosInstance.post<FarmerRequestResponse>(
        `/verification/dealers/farmer-requests/${id}/reject`
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dealerFarmerKeys.all });
    },
  });
};
