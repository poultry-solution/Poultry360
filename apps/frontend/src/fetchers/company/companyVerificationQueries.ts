import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

// ==================== TYPES ====================

export interface CompanyVerificationRequest {
  id: string;
  dealerId: string;
  companyId: string;
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
      id: string;
      name: string;
      phone: string;
      status: string;
    };
  };
  company?: {
    id: string;
    name: string;
    address?: string;
  };
}

interface VerificationRequestsResponse {
  success: boolean;
  data: CompanyVerificationRequest[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface VerificationRequestResponse {
  success: boolean;
  data: CompanyVerificationRequest;
  message?: string;
}

interface CompanyVerificationFilters {
  status?: "PENDING" | "APPROVED" | "REJECTED";
  page?: number;
  limit?: number;
  search?: string;
}

// ==================== QUERY KEYS ====================

export const companyVerificationKeys = {
  all: ["company-verification"] as const,
  requests: (filters?: CompanyVerificationFilters) =>
    [...companyVerificationKeys.all, "requests", filters] as const,
  request: (id: string) => [...companyVerificationKeys.all, "request", id] as const,
  pendingCount: () => [...companyVerificationKeys.all, "pending-count"] as const,
};

// ==================== QUERIES ====================

// Get company's verification requests
export const useGetCompanyVerificationRequests = (
  filters: CompanyVerificationFilters = {},
  options?: { enabled?: boolean }
) => {
  const queryString = new URLSearchParams(
    Object.entries(filters)
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  ).toString();

  return useQuery<VerificationRequestsResponse>({
    queryKey: companyVerificationKeys.requests(filters),
    queryFn: async () => {
      const { data } = await axiosInstance.get<VerificationRequestsResponse>(
        `/verification/companies/verification-requests?${queryString}`
      );
      return data;
    },
    enabled: true, // Will be overridden by options if provided
    ...options,
  });
};

// Get pending requests count for badge
export const useGetPendingVerificationCount = () => {
  return useQuery({
    queryKey: companyVerificationKeys.pendingCount(),
    queryFn: async () => {
      const { data } = await axiosInstance.get<VerificationRequestsResponse>(
        "/verification/companies/verification-requests?status=PENDING&limit=1"
      );
      return data.pagination?.total || 0;
    },
  });
};

// ==================== MUTATIONS ====================

// Approve verification request
export const useApproveVerificationRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axiosInstance.post<VerificationRequestResponse>(
        `/verification/companies/verification-requests/${id}/approve`
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyVerificationKeys.all });
    },
  });
};

// Reject verification request
export const useRejectVerificationRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axiosInstance.post<VerificationRequestResponse>(
        `/verification/companies/verification-requests/${id}/reject`
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyVerificationKeys.all });
    },
  });
};
