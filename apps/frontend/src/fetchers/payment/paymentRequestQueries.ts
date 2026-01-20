import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";

// ==================== QUERY KEYS ====================
export const paymentRequestKeys = {
  all: ["paymentRequests"] as const,
  dealer: () => [...paymentRequestKeys.all, "dealer"] as const,
  dealerList: (filters: Record<string, any>) =>
    [...paymentRequestKeys.dealer(), "list", filters] as const,
  dealerDetail: (id: string) => [...paymentRequestKeys.dealer(), "detail", id] as const,
  dealerStats: () => [...paymentRequestKeys.dealer(), "stats"] as const,
  farmer: () => [...paymentRequestKeys.all, "farmer"] as const,
  farmerList: (filters: Record<string, any>) =>
    [...paymentRequestKeys.farmer(), "list", filters] as const,
  farmerDetail: (id: string) => [...paymentRequestKeys.farmer(), "detail", id] as const,
  farmerStats: () => [...paymentRequestKeys.farmer(), "stats"] as const,
};

// ==================== TYPES ====================
export interface PaymentRequest {
  id: string;
  requestNumber: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  amount: number;
  description: string | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  proofOfPaymentUrl: string | null;
  paymentDate: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  dealerSale: {
    id: string;
    invoiceNumber: string | null;
    totalAmount: number;
    paidAmount: number;
    dueAmount: number | null;
    date: string;
  };
  dealer?: {
    id: string;
    name: string;
    contact: string;
    address: string | null;
  };
  farmer?: {
    id: string;
    name: string;
    phone: string;
  };
  customer?: {
    id: string;
    name: string;
    phone: string;
  };
}

export interface PaymentRequestsResponse {
  success: boolean;
  data: PaymentRequest[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaymentRequestStatistics {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
  pendingAmount: number;
}

// ==================== DEALER HOOKS ====================

// Get dealer payment requests
export const useGetDealerPaymentRequests = (
  filters: { status?: string; page?: number; limit?: number } = {},
  options?: { enabled?: boolean }
) => {
  return useQuery<PaymentRequestsResponse>({
    queryKey: paymentRequestKeys.dealerList(filters),
    queryFn: async () => {
      const response = await axiosInstance.get("/dealer/payment-requests", {
        params: filters,
      });
      return response.data;
    },
    enabled: options?.enabled ?? true,
  });
};

// Get single dealer payment request
export const useGetDealerPaymentRequest = (
  id: string,
  options?: { enabled?: boolean }
) => {
  return useQuery<{ success: boolean; data: PaymentRequest }>({
    queryKey: paymentRequestKeys.dealerDetail(id),
    queryFn: async () => {
      const response = await axiosInstance.get(`/dealer/payment-requests/${id}`);
      return response.data;
    },
    enabled: options?.enabled !== false && !!id,
  });
};

// Get dealer payment request statistics
export const useGetDealerPaymentRequestStatistics = (
  options?: { enabled?: boolean }
) => {
  return useQuery<{ success: boolean; data: PaymentRequestStatistics }>({
    queryKey: paymentRequestKeys.dealerStats(),
    queryFn: async () => {
      const response = await axiosInstance.get("/dealer/payment-requests/statistics");
      return response.data;
    },
    enabled: options?.enabled ?? true,
  });
};

// Approve payment request
export const useApprovePaymentRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (requestId: string) => {
      const response = await axiosInstance.post(
        `/dealer/payment-requests/${requestId}/approve`
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentRequestKeys.dealer() });
    },
  });
};

// Reject payment request
export const useRejectPaymentRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { requestId: string; rejectionReason: string }) => {
      const response = await axiosInstance.post(
        `/dealer/payment-requests/${data.requestId}/reject`,
        { rejectionReason: data.rejectionReason }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentRequestKeys.dealer() });
    },
  });
};

// ==================== FARMER HOOKS ====================

// Get farmer payment requests
export const useGetFarmerPaymentRequests = (
  filters: { status?: string; page?: number; limit?: number } = {},
  options?: { enabled?: boolean }
) => {
  return useQuery<PaymentRequestsResponse>({
    queryKey: paymentRequestKeys.farmerList(filters),
    queryFn: async () => {
      const response = await axiosInstance.get("/farmer/payment-requests", {
        params: filters,
      });
      return response.data;
    },
    enabled: options?.enabled ?? true,
  });
};

// Get single farmer payment request
export const useGetFarmerPaymentRequest = (
  id: string,
  options?: { enabled?: boolean }
) => {
  return useQuery<{ success: boolean; data: PaymentRequest }>({
    queryKey: paymentRequestKeys.farmerDetail(id),
    queryFn: async () => {
      const response = await axiosInstance.get(`/farmer/payment-requests/${id}`);
      return response.data;
    },
    enabled: options?.enabled !== false && !!id,
  });
};

// Get farmer payment request statistics
export const useGetFarmerPaymentRequestStatistics = (
  options?: { enabled?: boolean }
) => {
  return useQuery<{ success: boolean; data: PaymentRequestStatistics }>({
    queryKey: paymentRequestKeys.farmerStats(),
    queryFn: async () => {
      const response = await axiosInstance.get("/farmer/payment-requests/statistics");
      return response.data;
    },
    enabled: options?.enabled ?? true,
  });
};

// Create payment request
export const useCreatePaymentRequest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      dealerSaleId: string;
      amount: number;
      paymentDate?: string;
      paymentReference?: string;
      paymentMethod?: string;
      description?: string;
    }) => {
      const response = await axiosInstance.post("/farmer/payment-requests", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentRequestKeys.farmer() });
    },
  });
};
