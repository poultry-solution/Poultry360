import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

// ==================== TYPES ====================

export interface FarmerVerificationRequest {
  id: string;
  farmerId: string;
  dealerId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectedCount: number;
  lastRejectedAt?: string;
  acknowledgedAt?: string;
  createdAt: string;
  updatedAt: string;
  dealer?: {
    id: string;
    name: string;
    contact: string;
    address?: string;
    owner?: {
      name: string;
      phone: string;
    };
  };
}

export interface ConnectedDealer {
  id: string;
  name: string;
  contact: string;
  address?: string;
  connectedAt: string;
  connectedVia: "VERIFICATION" | "MANUAL";
  dealerFarmerId: string;
  owner?: {
    name: string;
    phone: string;
  };
}

interface CreateVerificationRequestInput {
  dealerId: string;
}

interface VerificationRequestsResponse {
  success: boolean;
  data: FarmerVerificationRequest[];
}

interface VerificationRequestResponse {
  success: boolean;
  data: FarmerVerificationRequest;
  message?: string;
}

interface ConnectedDealersResponse {
  success: boolean;
  data: ConnectedDealer[];
}

// ==================== QUERY KEYS ====================

export const farmerVerificationKeys = {
  all: ["farmer-verification"] as const,
  requests: () => [...farmerVerificationKeys.all, "requests"] as const,
  dealers: () => [...farmerVerificationKeys.all, "dealers"] as const,
  dealer: (id: string) => [...farmerVerificationKeys.all, "dealer", id] as const,
};

// ==================== QUERIES ====================

// Get farmer's verification requests
export const useGetFarmerVerificationRequests = (options?: { enabled?: boolean }) => {
  return useQuery<VerificationRequestsResponse>({
    queryKey: farmerVerificationKeys.requests(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<VerificationRequestsResponse>(
        "/verification/farmers/verification-requests"
      );
      return data;
    },
    enabled: options?.enabled !== false,
  });
};

// Get farmer's connected dealers
export const useGetFarmerDealers = () => {
  return useQuery<ConnectedDealersResponse>({
    queryKey: farmerVerificationKeys.dealers(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<ConnectedDealersResponse>(
        "/verification/farmers/dealers"
      );
      return data;
    },
  });
};

// Get dealer details for farmer
export const useGetDealerDetailsForFarmer = (dealerId: string, enabled = true) => {
  return useQuery({
    queryKey: [...farmerVerificationKeys.all, "dealer", dealerId],
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/verification/farmers/dealers/${dealerId}`);
      return data;
    },
    enabled: enabled && !!dealerId,
  });
};

// ==================== MUTATIONS ====================

// Create verification request
export const useCreateFarmerVerificationRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateVerificationRequestInput) => {
      const { data } = await axiosInstance.post<VerificationRequestResponse>(
        "/verification/farmers/verification-requests",
        input
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: farmerVerificationKeys.requests() });
      queryClient.invalidateQueries({ queryKey: farmerVerificationKeys.dealers() });
    },
  });
};

// Acknowledge verification request (mark message as seen)
export const useAcknowledgeFarmerVerificationRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axiosInstance.post<VerificationRequestResponse>(
        `/verification/farmers/verification-requests/${id}/acknowledge`
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: farmerVerificationKeys.requests() });
    },
  });
};
