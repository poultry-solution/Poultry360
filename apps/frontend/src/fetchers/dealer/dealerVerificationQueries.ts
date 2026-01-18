import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

// ==================== TYPES ====================

export interface DealerVerificationRequest {
  id: string;
  dealerId: string;
  companyId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectedCount: number;
  lastRejectedAt?: string;
  acknowledgedAt?: string;
  createdAt: string;
  updatedAt: string;
  company?: {
    id: string;
    name: string;
    address?: string;
    owner?: {
      name: string;
      phone: string;
    };
  };
  dealer?: {
    id: string;
    name: string;
    contact: string;
    address?: string;
    owner?: {
      id: string;
      name: string;
      phone: string;
      status: string;
    };
  };
}

export interface DealerCompany {
  id: string;
  name: string;
  address?: string;
  connectedAt: string;
  verificationRequestId: string;
  owner?: {
    name: string;
    phone: string;
  };
}

interface CreateVerificationRequestInput {
  companyId: string;
}

interface VerificationRequestsResponse {
  success: boolean;
  data: DealerVerificationRequest[];
}

interface VerificationRequestResponse {
  success: boolean;
  data: DealerVerificationRequest;
  message?: string;
}

interface DealerCompaniesResponse {
  success: boolean;
  data: DealerCompany[];
}

// ==================== QUERY KEYS ====================

export const dealerVerificationKeys = {
  all: ["dealer-verification"] as const,
  requests: () => [...dealerVerificationKeys.all, "requests"] as const,
  companies: () => [...dealerVerificationKeys.all, "companies"] as const,
  request: (id: string) => [...dealerVerificationKeys.all, "request", id] as const,
};

// ==================== QUERIES ====================

// Get dealer's verification requests
export const useGetDealerVerificationRequests = (options?: { enabled?: boolean }) => {
  return useQuery<VerificationRequestsResponse>({
    queryKey: dealerVerificationKeys.requests(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<VerificationRequestsResponse>(
        "/verification/dealers/verification-requests"
      );
      return data;
    },
    enabled: options?.enabled !== false,
  });
};

// Get dealer's approved companies
export const useGetDealerCompanies = () => {
  return useQuery<DealerCompaniesResponse>({
    queryKey: dealerVerificationKeys.companies(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<DealerCompaniesResponse>(
        "/verification/dealers/companies"
      );
      return data;
    },
  });
};

// Get company details for dealer
export const useGetCompanyDetailsForDealer = (companyId: string, enabled = true) => {
  return useQuery({
    queryKey: [...dealerVerificationKeys.all, "company", companyId],
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/verification/dealers/companies/${companyId}`);
      return data;
    },
    enabled: enabled && !!companyId,
  });
};

// ==================== MUTATIONS ====================

// Create verification request
export const useCreateDealerVerificationRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateVerificationRequestInput) => {
      const { data } = await axiosInstance.post<VerificationRequestResponse>(
        "/verification/dealers/verification-requests",
        input
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dealerVerificationKeys.requests() });
      queryClient.invalidateQueries({ queryKey: dealerVerificationKeys.companies() });
    },
  });
};

// Acknowledge verification request (mark message as seen)
export const useAcknowledgeVerificationRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axiosInstance.post<VerificationRequestResponse>(
        `/verification/dealers/verification-requests/${id}/acknowledge`
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dealerVerificationKeys.requests() });
    },
  });
};
